import { useCallback, useEffect, useState } from 'react';
import * as catalogueApi from '../services/api/catalogue-maitre-api';
import { HttpError } from '../services/api/api-client';

/**
 * Référentiel maître (Odoo) côté marchande — OFFLINE-FIRST.
 *
 *     Odoo 19 ──(synchro admin)──> catalogue_maitre (Postgres) ──> CE CACHE
 *
 * et jamais « téléphone -> Odoo en direct ».
 *
 * TOUT LE RÉFÉRENTIEL EST CHARGÉ UNE FOIS, puis la recherche se fait EN
 * LOCAL. Deux raisons, et la seconde est la vraie :
 *
 * - interroger le serveur à chaque frappe serait inutilement bavard sur un
 *   réseau de marché ;
 * - surtout, une recherche serveur ne fonctionnerait PAS hors ligne. Or une
 *   marchande qui cherche « tomate » dans son propre catalogue ne devrait
 *   jamais dépendre du réseau pour cela. Ici, le réseau ne sert qu'à
 *   rafraîchir la liste ; l'absence de réseau coûte la FRAÎCHEUR, jamais
 *   l'usage.
 *
 * Le référentiel est COMMUN à toutes les marchandes (mêmes noms, mêmes
 * catégories) : son cache n'est donc pas cloisonné par utilisateur.
 * `adoptees`, en revanche, appartient à UNE marchande et l'est.
 */

export interface ReferenceMaitre {
  default_code: string;
  nom: string;
  categorie: string | null;
}

const CLE_CACHE = 'julaba_cache_catalogue_maitre';
const cleAdoptees = (userId?: string) => `julaba_cache_adoptees_${userId || 'anon'}`;

function lireCache<T>(cle: string, defaut: T): T {
  try {
    const brut = localStorage.getItem(cle);
    return brut ? (JSON.parse(brut) as T) : defaut;
  } catch {
    return defaut;
  }
}
function ecrireCache(cle: string, valeur: unknown): void {
  try { localStorage.setItem(cle, JSON.stringify(valeur)); } catch { /* quota, mode privé */ }
}

/** Retire accents et casse : « Aubergine N'Drowa » se trouve en tapant « ndrowa ». */
function normaliser(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export interface AdoptionDemande {
  default_code: string;
  prix: number;
  unite?: string;
  stock?: number;
}

export interface ResultatAdoption {
  ok: boolean;
  /** Produit créé, tel que le backend l'a enregistré. */
  produit?: { id: string; nom: string; prix: number; stock: number; unite: string; categorie: string; default_code: string };
  /** Message prêt à afficher — écrit pour une marchande, pas pour un journal technique. */
  message?: string;
  /** true quand la référence était déjà dans son catalogue (409). */
  deja?: boolean;
}

export function useCatalogueMaitre(userId?: string) {
  const [references, setReferences] = useState<ReferenceMaitre[]>(() => lireCache<ReferenceMaitre[]>(CLE_CACHE, []));
  const [adoptees, setAdoptees] = useState<string[]>(() => lireCache<string[]>(cleAdoptees(userId), []));
  const [chargement, setChargement] = useState(false);
  /** D'où vient ce qui est affiché : utile pour dire honnêtement à l'écran
   *  « liste hors ligne » plutôt que de laisser croire qu'elle est à jour. */
  const [source, setSource] = useState<'reseau' | 'cache' | 'vide'>(() =>
    lireCache<ReferenceMaitre[]>(CLE_CACHE, []).length ? 'cache' : 'vide',
  );

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const data = await catalogueApi.fetchCatalogueMaitre(200);
      const liste: ReferenceMaitre[] = (data.references || []).map((r) => ({
        default_code: String(r.default_code),
        nom: String(r.nom),
        categorie: r.categorie ?? null,
      }));
      setReferences(liste);
      ecrireCache(CLE_CACHE, liste);
      setSource('reseau');
    } catch {
      // Hors ligne ou serveur muet : on garde ce qu'on connaît déjà. Une
      // liste un peu ancienne vaut mieux qu'un écran vide au marché.
      const cache = lireCache<ReferenceMaitre[]>(CLE_CACHE, []);
      setReferences(cache);
      setSource(cache.length ? 'cache' : 'vide');
    } finally {
      setChargement(false);
    }
  }, []);

  const chargerAdoptees = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await catalogueApi.fetchProduitsAdoptes();
      const codes: string[] = data.codes || [];
      setAdoptees(codes);
      ecrireCache(cleAdoptees(userId), codes);
    } catch {
      setAdoptees(lireCache<string[]>(cleAdoptees(userId), []));
    }
  }, [userId]);

  useEffect(() => {
    void charger();
    void chargerAdoptees();
  }, [charger, chargerAdoptees]);

  /** Recherche LOCALE : fonctionne hors ligne, sans un appel par frappe. */
  const rechercher = useCallback(
    (terme: string, limite = 8): ReferenceMaitre[] => {
      const t = normaliser(terme.trim());
      if (!t) return [];
      const dejaPrises = new Set(adoptees);
      return references
        .filter((r) => normaliser(r.nom).includes(t) || normaliser(r.default_code).includes(t))
        // Ce qu'elle n'a pas encore d'abord : proposer en tête ce qu'elle
        // possède déjà ne l'aide pas, elle le cherchait dans sa caisse.
        .sort((a, b) => Number(dejaPrises.has(a.default_code)) - Number(dejaPrises.has(b.default_code)))
        .slice(0, limite);
    },
    [references, adoptees],
  );

  const estAdoptee = useCallback((code: string) => adoptees.includes(code), [adoptees]);

  /**
   * Adopte une référence : elle devient un article de CETTE marchande, au
   * prix qu'elle a posé.
   *
   * EXIGE LE RÉSEAU, et le dit franchement. L'adoption crée un produit côté
   * serveur ; contrairement à une vente, elle n'est pas mise en file
   * hors-ligne. Une vente perdue coûte de l'argent réel, d'où l'outbox ;
   * ajouter un article au catalogue peut attendre le retour du réseau, et
   * faire croire le contraire serait un mensonge d'interface.
   */
  const adopter = useCallback(
    async (demande: AdoptionDemande): Promise<ResultatAdoption> => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return { ok: false, message: 'Pas de réseau : tu pourras ajouter cet article dès qu\'il revient.' };
      }
      try {
        const data = await catalogueApi.adopterProduits(demande as unknown as Record<string, unknown>);
        const codes = [...new Set([...adoptees, demande.default_code])];
        setAdoptees(codes);
        ecrireCache(cleAdoptees(userId), codes);
        return { ok: true, produit: data.produit as ResultatAdoption['produit'] };
      } catch (e) {
        // `HttpError` PORTE le statut ET le corps : les deux réponses du
        // backend restent donc lisibles telles quelles. C'est ce qui permet de
        // converger sans perdre le message écrit pour une marchande.
        if (e instanceof HttpError) {
          const corps = e.body as { message?: string | string[] } | null;
          if (e.status === 409) {
            const m409 = corps?.message;
            return { ok: false, deja: true, message: (Array.isArray(m409) ? m409[0] : m409) || 'Cet article est déjà dans ton catalogue.' };
          }
          // Le backend renvoie déjà des messages écrits pour une marchande
          // (voir adopter-reference.dto.ts) : on les affiche tels quels plutôt
          // que de les remplacer par un « erreur » générique.
          const m = corps?.message;
          return { ok: false, message: (Array.isArray(m) ? m[0] : m) || 'Impossible d\'ajouter cet article.' };
        }
        return { ok: false, message: 'Réseau indisponible : réessaie dans un moment.' };
      }
    },
    [adoptees, userId],
  );

  return { references, adoptees, chargement, source, rechercher, estAdoptee, adopter, recharger: charger };
}
