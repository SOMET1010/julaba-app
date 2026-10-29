/**
 * COMMUNE ET MARCHÉ DE LA MARCHANDE — retours terrain PIE, 07/10/2026.
 *
 * LE DÉFAUT QU'ON FERME. Dans le profil, « Marché » et « Commune » étaient du
 * texte libre : chacune écrivait le nom à sa façon, et le back-office ne
 * retrouvait pas ses propres marchés. Les deux champs deviennent des listes
 * issues du référentiel des marchés (`GET /marches`).
 *
 * POURQUOI LES COMMUNES VIENNENT DES MARCHÉS. `GET /admin-divisions/communes`
 * exige un `departement_id` : une liste plate demanderait une cascade
 * district → région → département → commune, quatre listes de texte pour une
 * femme qui ne lit pas. Les communes qui PORTENT un marché suffisent au profil,
 * et c'est ce qui permet de filtrer les marchés par commune sans désaccord de
 * libellé (`commune` d'un marché = `COALESCE(m.commune, z.nom)`).
 *
 * LA VALEUR ACTUELLE N'EST JAMAIS PERDUE. Un nom saisi avant la liste, ou un
 * marché retiré du référentiel, reste proposé en tête : ouvrir la fiche pour
 * corriger son téléphone ne doit pas effacer son marché.
 *
 * Module PUR : ni React, ni réseau.
 */
import type { MarchePublic } from './api/marches-api';

const enOrdre = (a: string, b: string) => a.localeCompare(b, 'fr');
const propre = (s: string | null | undefined) => (typeof s === 'string' ? s.trim() : '');

/** Les marchés ouverts : un marché désactivé au back-office ne se choisit plus. */
function marchesOuverts(marches: readonly MarchePublic[]): MarchePublic[] {
  return marches.filter((m) => m.actif !== false && propre(m.nom) !== '');
}

/** Les communes qui portent au moins un marché ouvert, sans doublon, dans l'ordre. */
export function communesDesMarches(marches: readonly MarchePublic[]): string[] {
  const vues = new Set<string>();
  for (const m of marchesOuverts(marches)) {
    const c = propre(m.commune);
    if (c) vues.add(c);
  }
  return [...vues].sort(enOrdre);
}

/** Les noms des marchés ouverts de la commune ; tous si la commune est vide. */
export function marchesDeLaCommune(marches: readonly MarchePublic[], commune: string): string[] {
  const cible = propre(commune);
  const noms = new Set<string>();
  for (const m of marchesOuverts(marches)) {
    if (!cible || propre(m.commune) === cible) noms.add(propre(m.nom));
  }
  return [...noms].sort(enOrdre);
}

/** La liste proposée : la valeur actuelle en tête si le référentiel ne la connaît pas. */
export function optionsAvecValeurActuelle(options: readonly string[], valeur: string): string[] {
  const actuelle = propre(valeur);
  if (!actuelle || options.includes(actuelle)) return [...options];
  return [actuelle, ...options];
}

export interface ListesDuProfil {
  /** Vide = référentiel injoignable : le champ redevient une saisie libre. */
  communes: string[];
  marches: string[];
}

/** Les deux listes du profil, le marché filtré par la commune choisie. */
export function listesDuProfil(marches: readonly MarchePublic[], commune: string, marche: string): ListesDuProfil {
  const communes = communesDesMarches(marches);
  if (communes.length === 0) return { communes: [], marches: [] };
  const dansLaCommune = marchesDeLaCommune(marches, commune);
  return {
    communes: optionsAvecValeurActuelle(communes, commune),
    marches: dansLaCommune.length === 0 ? [] : optionsAvecValeurActuelle(dansLaCommune, marche),
  };
}
