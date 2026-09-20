/**
 * Vente guidée — SAISIE GUIDÉE SANS MICRO (repli tactile, SPEC §8).
 *
 * Retour terrain direct : un formulaire texte (labels + cases à remplir) n'est
 * PAS un repli voix-first valable pour une non-lectrice — c'est un aveu d'échec
 * qui revient au clavier classique. Le vrai pattern déjà validé ailleurs dans
 * l'app (numéro de téléphone / PIN à la connexion) : une image ou un gros
 * chiffre s'affiche, alimenté aussi bien par un tap que par la voix — jamais une
 * case de texte à lire pour savoir quoi taper.
 *
 * Ici : le produit se choisit en touchant sa photo (comme l'ajout de produit
 * dans Mon stock), la quantité et le prix se pilotent avec un gros chiffre +
 * boutons / clavier numérique — jamais un <input> texte nu.
 *
 * ET CHAQUE ÉTAPE SE DIT (VOIX-01, lot D). Sur `f0c965c`, cet écran ne
 * contenait aucun appel à `speak` : « Combien ? », « Prix (FCFA) », le gros
 * chiffre — tout n'existait que sous forme de texte, dans le repli emprunté
 * précisément parce que la dictée venait d'échouer. « Aucune étape importante
 * ne doit exister uniquement sous forme tactile » (doctrine du propriétaire).
 * Désormais Tata pose la question de l'étape en cours (au changement d'étape,
 * pas à chaque rendu), redit la quantité quand elle touche +/−, le prix quand
 * elle le tape, et un bouton « réécouter » redonne la dernière phrase. Les
 * questions sont celles des dialogues de Tata (`phraseQuantiteManquante`,
 * `phrasePrixManquant`) : la voix et le repli parlent la même langue.
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../contexts/AppContext';
import { guidageVocal } from '../../utils/accessMode';
import { quantiteAvecUnite } from '../../utils/unite.utils';
import { creerLigneProvisoire, type LigneProvisoire } from '../../services/ligneProvisoire';
import { phrasePrixManquant, phraseQuantiteManquante } from '../../services/dialoguesTata';
import { resoudreMessage, t } from '../../i18n/voice/runtime';
import { rendreMessage } from '../../i18n/voice/contrat-audio';
import { BoutonReecouter, ConfirmationLigne } from './ConfirmationLigne';
import { CATALOGUE_PRODUITS, getImageByNom, rechercherProduitCatalogue } from '../../data/catalogue-produits';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { vignetteProduit } from '../../utils/emojiTile';

const ORANGE = '#B74725';

/** Résultat d'appariement au catalogue (fourni par le parent, qui connaît les produits). */
export interface AppariementCatalogue {
  produitId: string;
  nomCatalogue: string;
  prixCatalogue: number | null;
  unite: string;
}

interface Props {
  /** Reçoit la ligne CONFIRMÉE (statut 'confirmee'). Le parent l'ajoute au panier. */
  onValider: (l: LigneProvisoire) => void;
  /** Apparie le nom tapé à un produit du catalogue (null si inconnu → ligne libre). */
  apparier?: (nom: string) => AppariementCatalogue | null;
  /** Produit déjà connu par le parent (ex. fiche produit ouverte) : pré-rempli pour
   * qu'il ne reste plus qu'à confirmer la quantité, plutôt que retaper le nom et le prix. */
  initialProduit?: string;
  initialPrix?: number;
}

const CHIFFRES_CLAVIER = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function SaisieGuidee({ onValider, apparier, initialProduit, initialPrix }: Props) {
  const [etape, setEtape] = useState<'saisie' | 'confirmation'>('saisie');
  const catalogueInitial = initialProduit ? rechercherProduitCatalogue(initialProduit) : null;
  const prixConnuInitial = initialPrix ?? catalogueInitial?.prixVente ?? null;

  const [produit, setProduit] = useState(initialProduit || '');
  const [quantite, setQuantite] = useState(1);
  const [prix, setPrix] = useState(prixConnuInitial != null ? String(prixConnuInitial) : '');
  const [mode, setMode] = useState<'unitaire' | 'total'>('unitaire');
  const [ligne, setLigne] = useState<LigneProvisoire | null>(null);
  // Clavier chiffres visible seulement s'il n'y a pas déjà un prix connu (catalogue
  // ou fiche produit) — la plupart du temps elle n'a RIEN à taper pour le prix.
  const [prixModifiable, setPrixModifiable] = useState(prixConnuInitial == null);
  // Repli rare : produit absent du catalogue-images → un mot à taper, pas plus.
  const [autreOuvert, setAutreOuvert] = useState(false);

  const produitImage = produit ? (rechercherProduitCatalogue(produit)?.image || getImageByNom(produit)) : '';
  const produitChoisi = produit.trim().length >= 2;

  // VOIX. Dernière phrase dite : garde l'effet d'étape contre les rendus
  // répétés et alimente « réécouter ». Le guidage automatique suit le profil
  // (muet seulement si elle a choisi « je lis ») ; réécouter parle toujours.
  const { speak } = useApp();
  const dernierePhraseRef = useRef('');
  const dire = (t: string) => {
    dernierePhraseRef.current = t;
    if (guidageVocal()) speak(t);
  };
  // Même règle, pour une CLÉ du catalogue i18n : résolue dans la langue
  // active, retenue pour « réécouter », remise au rendu vocal (défaut : speak).
  const direMessage = (id: string, vars?: Record<string, string | number>) => {
    const m = resoudreMessage(id, vars);
    dernierePhraseRef.current = m.texte;
    if (guidageVocal()) void rendreMessage(m, speak);
  };
  // L'unité sert à dire « 3 tas » plutôt que « 3 » — la même que celle qui
  // ira sur la ligne (apparier), pas une devinette.
  const uniteProduit = produitChoisi && apparier ? (apparier(produit)?.unite ?? null) : null;
  // La question de l'étape EN COURS. Quand elle tape un nom libre (« Pas dans
  // la liste »), on ne redit pas le nom à chaque lettre : « ce produit ».
  // Étape 1, dite : la photo est le geste, la voix le nomme (TATA_REPLI_TOUCHE_PHOTO).
  const questionEtape = !produitChoisi
    ? t('TATA_REPLI_TOUCHE_PHOTO')
    : `${phraseQuantiteManquante(autreOuvert ? '' : produit)} ${prixModifiable ? phrasePrixManquant() : t('TATA_REPLI_PRIX_CONNU', { montant: Math.round(parseInt(prix || '0', 10) || 0) })}`;
  // Posée au CHANGEMENT d'étape, jamais à chaque rendu — et pas pendant que
  // ConfirmationLigne est affichée : c'est elle qui parle alors.
  useEffect(() => {
    if (etape !== 'saisie') return;
    if (dernierePhraseRef.current !== questionEtape) dire(questionEtape);
  }, [etape, produitChoisi, prixModifiable, autreOuvert]); // eslint-disable-line react-hooks/exhaustive-deps -- la phrase est relue au moment où l'étape change

  const choisirProduit = (nom: string, prixVente: number) => {
    setProduit(nom);
    setPrix(String(prixVente));
    setPrixModifiable(false);
  };

  const changerProduit = () => {
    setProduit('');
    setPrix('');
    setPrixModifiable(true);
    setAutreOuvert(false);
  };

  // Le prix tapé se DIT à chaque touche (« 500 francs ») : la synthèse coupe
  // la phrase précédente, donc taper vite ne fait entendre que la dernière.
  const taperPrix = (valeur: string) => {
    setPrix(valeur);
    // Un montant à DIRE : « 1 500 francs », jamais « 1 500 F » (la synthèse lit « F » comme une lettre).
    if (valeur) direMessage('TATA_MONTANT_DEVISE', { montant: Math.round(parseInt(valeur, 10)) });
    else direMessage('TATA_PRIX_EFFACE');
  };
  const appuyerChiffre = (d: string) => taperPrix((prix === '0' ? d : prix + d).slice(0, 6));
  const effacerChiffre = () => taperPrix(prix.slice(0, -1));
  const changerQuantite = (q: number) => {
    setQuantite(q);
    dire(quantiteAvecUnite(q, uniteProduit));
  };

  const verifier = () => {
    const q = Math.max(1, quantite);
    const p = parseInt(prix || '0', 10) || 0;
    // Appariement catalogue : si le produit tapé est connu, la ligne porte son
    // productId (→ stock décrémenté et marge réelle à l'ajout au panier) et son unité.
    const match = apparier ? apparier(produit) : null;
    const l = creerLigneProvisoire(
      { nomParle: produit, quantite: q, montant: p > 0 ? p : null, prixExplicite: mode },
      match
        ? { produitId: match.produitId, nomCatalogue: match.nomCatalogue, prixCatalogue: match.prixCatalogue, unite: match.unite }
        : { produitId: null },
    );
    setLigne(l);
    setEtape('confirmation');
  };

  const recommencer = () => { setEtape('saisie'); setLigne(null); };

  if (etape === 'confirmation' && ligne) {
    return (
      <ConfirmationLigne
        ligne={ligne}
        onLigneChange={setLigne}
        onAnnuler={recommencer}
        onConfirmer={(l) => {
          onValider(l);
          setProduit(initialProduit || '');
          setQuantite(1);
          setPrix(prixConnuInitial != null ? String(prixConnuInitial) : '');
          setPrixModifiable(prixConnuInitial == null);
          recommencer();
        }}
      />
    );
  }

  const pret = produitChoisi && parseInt(prix || '0', 10) > 0;

  return (
    <div style={{ background: '#FFFCF7', border: '1.5px solid #F0E4D4', borderRadius: 20, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: ORANGE, letterSpacing: '0.05em', margin: 0 }}>SAISIR SANS PARLER</p>
        <BoutonReecouter phrase={() => dernierePhraseRef.current || questionEtape} />
      </div>

      {/* ÉTAPE 1 — PRODUIT : on touche une photo, jamais un nom à écrire. */}
      {!produitChoisi ? (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {CATALOGUE_PRODUITS.filter(p => p.nom !== 'Autre').map(p => (
              <motion.button key={p.nom} whileTap={{ scale: 0.94 }} onClick={() => choisirProduit(p.nom, p.prixVente)}
                style={{ border: '2px solid var(--trait)', borderRadius: 14, padding: 6, background: 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
                <ImageWithFallback src={p.image} alt={p.nom} fallbackSrc={vignetteProduit(p.nom)} style={{ width: '100%', aspectRatio: '1', borderRadius: 10, objectFit: 'cover' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--encre)' }}>{p.nom}</span>
              </motion.button>
            ))}
          </div>
          {!autreOuvert ? (
            <button type="button" onClick={() => setAutreOuvert(true)}
              style={{ marginTop: 10, background: 'none', border: 'none', color: 'var(--encre-4)', fontSize: 12, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}>
              Pas dans la liste ?
            </button>
          ) : (
            <input autoFocus value={produit} onChange={e => setProduit(e.target.value)} placeholder="Nom du produit"
              style={{ marginTop: 10, width: '100%', boxSizing: 'border-box', border: '1.5px solid #e5e0d8', borderRadius: 12, padding: '12px 14px', fontSize: 16, fontWeight: 700, color: 'var(--encre)', outline: 'none', fontFamily: 'inherit', background: 'white' }} />
          )}
        </div>
      ) : (
        // Produit choisi : confirmation en photo, pas en texte à relire.
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FFF3EB', border: `1.5px solid ${ORANGE}40`, borderRadius: 14, padding: '8px 10px' }}>
          {produitImage && <img src={produitImage} alt={produit} style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />}
          <span style={{ flex: 1, fontSize: 15, fontWeight: 800, color: '#1F2937' }}>{produit}</span>
          <button type="button" onClick={changerProduit}
            style={{ background: 'none', border: 'none', color: ORANGE, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
            Changer
          </button>
        </div>
      )}

      {produitChoisi && (<>
        {/* ÉTAPE 2 — QUANTITÉ : gros chiffre + boutons, jamais une case à remplir. */}
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--encre-4)', textAlign: 'center', margin: '0 0 8px' }}>Combien ?</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
            <motion.button whileTap={{ scale: 0.9 }} aria-label="Moins" onClick={() => changerQuantite(Math.max(1, quantite - 1))}
              style={{ width: 52, height: 52, borderRadius: 14, background: 'white', border: '1.5px solid #e5e0d8', fontSize: 26, fontWeight: 800, color: '#555', cursor: 'pointer', flexShrink: 0 }}>−</motion.button>
            <span style={{ fontSize: 42, fontWeight: 900, color: 'var(--encre)', minWidth: 60, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{quantite}</span>
            <motion.button whileTap={{ scale: 0.9 }} aria-label="Plus" onClick={() => changerQuantite(quantite + 1)}
              style={{ width: 52, height: 52, borderRadius: 14, background: ORANGE, border: 'none', fontSize: 26, fontWeight: 800, color: 'white', cursor: 'pointer', flexShrink: 0 }}>+</motion.button>
          </div>
        </div>

        {/* ÉTAPE 3 — PRIX : préconnu et affiché en gros la plupart du temps ; sinon
            clavier numérique — le même principe que le code à la connexion. */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--encre-4)' }}>Prix (FCFA)</span>
            {!prixModifiable && (
              <button type="button" onClick={() => { setPrix(''); setPrixModifiable(true); }}
                style={{ background: 'none', border: 'none', color: ORANGE, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                Changer
              </button>
            )}
          </div>
          <div style={{ textAlign: 'center', fontSize: 36, fontWeight: 900, color: prix ? 'var(--encre)' : '#c7bfb2', fontVariantNumeric: 'tabular-nums', marginBottom: prixModifiable ? 10 : 0 }}>
            {prix || '—'}{prix ? ' F' : ''}
          </div>
          {prixModifiable && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {CHIFFRES_CLAVIER.map(d => (
                <button key={d} type="button" onClick={() => appuyerChiffre(d)}
                  style={{ minHeight: 52, borderRadius: 12, border: '1.5px solid #e5e0d8', background: 'white', fontSize: 20, fontWeight: 800, color: 'var(--encre)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {d}
                </button>
              ))}
              <button type="button" onClick={() => taperPrix('')}
                style={{ minHeight: 52, borderRadius: 12, border: '1.5px solid #e5e0d8', background: 'white', fontSize: 14, fontWeight: 800, color: '#888', cursor: 'pointer', fontFamily: 'inherit' }}>
                C
              </button>
              <button type="button" onClick={() => appuyerChiffre('0')}
                style={{ minHeight: 52, borderRadius: 12, border: '1.5px solid #e5e0d8', background: 'white', fontSize: 20, fontWeight: 800, color: 'var(--encre)', cursor: 'pointer', fontFamily: 'inherit' }}>
                0
              </button>
              <button type="button" onClick={effacerChiffre} aria-label="Effacer un chiffre"
                style={{ minHeight: 52, borderRadius: 12, border: '1.5px solid #e5e0d8', background: 'white', fontSize: 16, fontWeight: 800, color: '#888', cursor: 'pointer', fontFamily: 'inherit' }}>
                ⌫
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {(['unitaire', 'total'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); direMessage(m === 'unitaire' ? 'TATA_PRIX_D_UN_SEUL' : 'TATA_PRIX_DU_TOUT'); }}
              style={{ flex: 1, minHeight: 44, borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                border: `1.5px solid ${mode === m ? ORANGE : '#e5e0d8'}`, background: mode === m ? '#FDE9D6' : 'white', color: mode === m ? ORANGE : '#888' }}>
              {m === 'unitaire' ? "Prix d'un" : 'Prix du tout'}
            </button>
          ))}
        </div>

        <motion.button whileTap={{ scale: 0.97 }} disabled={!pret} onClick={verifier}
          style={{ minHeight: 52, borderRadius: 16, fontWeight: 800, fontSize: 16, border: 'none', fontFamily: 'inherit',
            background: pret ? ORANGE : '#e0d5c8', color: 'white', cursor: pret ? 'pointer' : 'default' }}>
          Vérifier
        </motion.button>
      </>)}
    </div>
  );
}
