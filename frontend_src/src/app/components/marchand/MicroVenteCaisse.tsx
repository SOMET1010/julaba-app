/**
 * LE MICRO DE LA CAISSE — VOIX-01, lot B (voie 2, arbitrage du 20/09/2026).
 *
 * CE QU'ON FERME. La voix savait COMMENCER une vente et la remplir, jamais la
 * terminer : elle vivait dans `VenteVocaleModal`, un écran séparé qui, une
 * fois la ligne au panier, renvoyait vers la caisse — où il n'y avait plus
 * aucun micro. « On peut commencer avec la voix et, à l'étape suivante, ne
 * plus avoir de fonctionnalité vocale » (Patrick, terrain du 20/09/2026).
 *
 * LA VOIE RETENUE (2, et non l'extraction d'un hook partagé) : le moteur
 * vocal CONVERGE vers la caisse au lieu d'être abstrait pour continuer à
 * alimenter deux surfaces. Ce composant a donc UN SEUL appelant — `POSCaisse`
 * — et c'est volontaire. Le jour où il en aurait deux, la dette VOIX-01
 * serait en train de se reformer ailleurs.
 *
 * POURQUOI UN FICHIER, ET PAS DU CODE DANS POSCaisse. La caisse fait déjà mille
 * lignes d'argent : panier, coupures, monnaie, encaissement. Le moteur vocal y
 * tiendrait, mais plus personne ne verrait la frontière entre ce qui parle et
 * ce qui écrit de l'argent. Ici, la frontière est un fichier : ce composant
 * REMPLIT le panier (`addToCart`), il n'encaisse jamais.
 *
 * UN MICRO QUI MARCHE, PAS UN MICRO AFFICHÉ. `POSCaisse` portait ce
 * commentaire : « PAS DE MICROPHONE ICI, ET C'EST VOLONTAIRE » — il y en avait
 * eu un, décoratif ; la marchande parlait, rien n'arrivait. Le remède n'était
 * pas « aucun micro », c'était « un seul, et il marche ». Ce composant monte
 * le moteur ET le bouton ensemble : l'un ne peut pas exister sans l'autre.
 *
 * L'ENCAISSEMENT PASSE PAR ICI, MAIS NE S'Y FAIT PAS (VOIX-01, lot C). Le
 * moteur reconnaît aussi « encaisse », « combien elle doit », « oui valide »
 * et « non ». Ce composant les TRANSMET à la caisse (`onIntentionEncaissement`)
 * et s'arrête là : il ne connaît ni le total, ni le montant reçu, ni la
 * primitive de paiement. La machine qui relit le compte et la seule fonction
 * qui écrit de l'argent vivent dans POSCaisse — la frontière de ce fichier
 * reste : remplir le panier, jamais encaisser.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, AudioLines, CheckCircle, Keyboard, Loader, Mic, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { useLangPref } from '../../hooks/useLangPref';
import { useVoiceCore } from '../../hooks/useVoiceCore';
import { useApp } from '../../contexts/AppContext';
import { useCaisse } from '../../contexts/CaisseContext';
import { useRaccourcis } from '../../contexts/RaccourcisContext';
import { useObjectif } from '../../contexts/ObjectifContext';
import { useStock, type StockItem } from '../../contexts/StockContext';
import { extraire } from '../../voice-offline/extraction';
import { intentLocal, intentLocalCaisse } from '../../voice-offline/localIntent';
import { INTENTIONS_ENCAISSEMENT, estIntentionEncaissement, type IntentionEncaissement } from '../../voice-offline/grammaireEncaissement';
import { apparierProduit, noterRefusCreation } from '../../services/venteVocale';
import { vendreVocalUnifie } from '../../services/vendreVocalUnifie';
import { produitPourVente } from '../../services/preselectionVente';
import { useSpeakMessage } from '../../i18n/voice/speakMessage';
import { t } from '../../i18n/voice/runtime';
import type { LigneProvisoire } from '../../services/ligneProvisoire';
import { guidageVocal } from '../../utils/accessMode';
import { vibrerSucces } from '../../utils/haptique';
import { SaisieGuidee } from './SaisieGuidee';
import tataAccueil from '../../../assets/redesign/tata-accueil.webp';

// PLUS AUCUNE COULEUR EN DUR ICI (VOIX-01, lot F). Le lot B avait recopié
// l'orange et le vert de la planche dans ce fichier : deux sources de vérité
// pour une même valeur. La charte de la caisse vit dans styles/commerce.css
// (`--caisse-*`) — garde-fou : caisseCharte.test.mts.
//
// Les icônes lucide prennent une TAILLE en nombre (attribut SVG), pas une
// variable CSS : la planche dit 24 px, on le recopie ici, une fois.
const ICONE = 24;
// LE MICRO DOMINE LE PREMIER ÉCRAN (retour de Patrick, passe F2) : « dans la
// cible, la question et le micro orange dominent immédiatement ; dans le
// rendu, le micro ressemble encore à un contrôle parmi d'autres. Ce n'est
// pas cosmétique : c'est l'action principale. » Puis UI-03 : « conserver le
// micro comme action dominante, mais supprimer l'espace inutile autour » —
// 124 px de bouton dans un halo de 140, icône de 52 : toujours la plus grande
// chose de l'écran, sans que la zone voix dépasse 270 px. Des nombres
// (attributs SVG et animation motion), pas des variables CSS — c'est la seule
// raison de les écrire ici.
const MICRO = 124;
const MICRO_HALO = 140;
const MICRO_ICONE = 52;

export interface ProduitPreselectionne {
  nom: string;
  prix: number;
  unite?: string;
  image?: string;
}

interface Props {
  /** Produit déjà choisi ailleurs (fiche produit de « Mon stock ») : on ne lui
   * fait pas redire un nom qu'elle vient de toucher. Arrive par l'état de
   * route, jamais par une variable globale — voir POSCaisse. */
  produitPreselectionne?: ProduitPreselectionne | null;
  /** Une phrase d'encaissement a été reconnue : la caisse en fait ce qu'elle
   * veut (relire, annoncer, annuler, ou appeler SA primitive de paiement).
   * Obligatoire, et c'est voulu : sans destinataire, ces phrases seraient
   * reconnues puis avalées en silence — « elle parle, rien n'arrive ». */
  onIntentionEncaissement: (intention: IntentionEncaissement) => void;
}

/**
 * UNE VENTE COMPRISE DONT LE PRIX MANQUE (21/09/2026, terrain).
 *
 * Le produit dicté n'est pas au catalogue — et celui d'une nouvelle marchande
 * est VIDE — ou il y est sans prix de vente. Ce composant ne sait pas demander
 * un prix ; la caisse, elle, a déjà le chemin qui le fait (chercher la
 * référence, « Quel est ton prix ? », puis adopter l'article au catalogue ET
 * au panier). Elle s'abonne donc à cette demande, et l'ouvre PRÉ-REMPLIE.
 *
 * POURQUOI UN CONTEXTE ET PAS UNE PROP. Le micro est rendu SANS AUCUNE
 * CONDITION, sur une ligne que le garde-fou `caisseMicroPermanent.test.mts`
 * lit au caractère près — c'est ce qui garantit qu'il ne disparaît à aucun
 * moment de la vente. On ne touche donc pas à cette ligne : l'abonnement
 * passe par le fournisseur ci-dessous, que la caisse monte au-dessus du micro,
 * comme elle monte déjà les providers Raccourcis et Objectif.
 *
 * Sans fournisseur, rien ne change : Tata explique qu'elle n'a pas le prix
 * (comportement d'avant), et aucune ligne n'entre au panier.
 */
export type DemandePrixVocal = (demande: {
  nom: string; quantite: number; unite: string | null;
  /** Pourquoi l'écran s'ouvre : prix introuvable, unité qui ne concorde pas,
   *  ou montant dicté dont on ne sait pas s'il vaut pour un ou pour tous. */
  raison?: 'prix_manquant' | 'unite_incompatible' | 'ambiguite_prix';
  /** Son montant, pour le cas `ambiguite_prix` : on le lui relit. */
  montant?: number;
}) => void;

const CtxDemandePrix = createContext<DemandePrixVocal | null>(null);

export function FournisseurDemandePrix({ demander, children }: { demander: DemandePrixVocal; children: React.ReactNode }) {
  return <CtxDemandePrix.Provider value={demander}>{children}</CtxDemandePrix.Provider>;
}

export function MicroVenteCaisse({ produitPreselectionne = null, onIntentionEncaissement }: Props) {
  const demanderPrixAuParent = useContext(CtxDemandePrix);
  const { lang: selectedLang } = useLangPref();
  const navigate = useNavigate();
  const { user, currentSession, getTodayStats, speak } = useApp();
  // Les phrases de Tata sont des CLÉS du catalogue i18n (lot langues) : ce
  // composant ne connaît plus le français. `speakMessage` résout la clé dans
  // la langue active et la remet au rendu vocal (contrat-audio.ts), dont le
  // défaut est ce même `speak`.
  const speakMessage = useSpeakMessage();
  // `cart` en LECTURE SEULE (lot F) : sert au seul rappel « Dis "encaisser"
  // pour terminer », affiché quand il y a quelque chose à encaisser. Ce
  // composant continue de REMPLIR le panier ; il ne le lit que pour le dire.
  const {
    enregistrerDepense, refreshTransactions, stats: caisseStats,
    products, addProduct, addToCart, cart,
  } = useCaisse();

  // Dernière phrase prononcée par Tata. Sert au bouton « réécouter » : si la
  // marchande n'a pas saisi ce qui a été compris, elle doit pouvoir le
  // réentendre — sinon son seul recours est de refaire la vente.
  const dernierePhraseRef = useRef<string>('');
  const direEtRetenir = useCallback((texte: string) => {
    dernierePhraseRef.current = texte;
    speak(texte);
  }, [speak]);
  const direEtRetenirMessage = useCallback((id: string, vars?: Record<string, string | number>) => {
    dernierePhraseRef.current = speakMessage(id, vars).texte;
  }, [speakMessage]);

  const objectifCtx = useObjectif();
  const objectif = objectifCtx?.objectif ?? 0;
  const progression = objectifCtx?.progression ?? 0;
  const stockCtx = useStock();
  const topStocks = (stockCtx.stocks || []).slice(0, 3)
    .map((s: StockItem) => `${s.produit}:${s.quantite}${s.unite}`).join(', ');
  const dernierProduit = (stockCtx.stocks || []).slice()
    .sort((a: StockItem, b: StockItem) => ((b.updatedAt && Date.parse(b.updatedAt)) || 0) - ((a.updatedAt && Date.parse(a.updatedAt)) || 0))[0]?.produit || '';
  const raccourcisCtx = useRaccourcis();
  const matchRaccourci = raccourcisCtx?.matchRaccourci ?? null;
  const stats = getTodayStats();

  // « J'ajoute ce produit à ta boutique ? » : après une vente d'un produit
  // inconnu, Tata propose de le créer. Refus mémorisé PAR produit.
  const [propositionProduit, setPropositionProduit] = useState<{ nom: string; prix: number } | null>(null);
  const [creationEnCours, setCreationEnCours] = useState(false);
  // Repli tactile — ABSORBÉ dans cette surface (arbitrage n°3 du 20/09/2026) :
  // il ne renvoie plus vers un écran séparé, il s'ouvre ici même.
  const [saisieOuverte, setSaisieOuverte] = useState(false);

  // La ligne confirmée va au PANIER, jamais encaissée ici.
  //
  // IMPORTANT — un SEUL appel mutateur de panier par ajout. addToCart et
  // updateCartItemPrice recalculent tous deux depuis le `cart` figé de la
  // closure du render : les enchaîner dans le même handler fait écraser
  // l'ajout par le second (panier vidé). On fixe donc le prix DICTÉ
  // directement dans le produit passé à addToCart (le négoce prime → on
  // neutralise la promo catalogue), sans second appel.
  const ajouterLigneAuPanier = (l: LigneProvisoire) => {
    const prixU = l.prixUnitaire ?? 0;
    // Total EXACT résolu par la ligne provisoire — en FCFA, 500/3 ne retombe
    // pas juste : `prixU` n'est qu'un unitaire arrondi, c'est `l.total` qui
    // doit faire foi pour le panier (CartItem.totalExact).
    const totalExact = l.total ?? undefined;
    const prod = l.produitId ? products.find(p => p.id === l.produitId) : null;
    if (prod) {
      // Produit APPARIÉ : vrai produit (prix d'achat → marge réelle, stock
      // décrémenté à l'encaissement), au prix dicté.
      addToCart({ ...prod, prix: prixU > 0 ? prixU : prod.prix, prix_promo: null, promo_fin: null }, l.quantite, totalExact, 'vocal');
    } else {
      // Produit inconnu → ligne libre (comme « Autre article »).
      addToCart({ id: 'libre-' + l.id, nom: l.nomAffiche, prix: prixU, categorie: 'Autre', stock: 0, unite: l.unite }, l.quantite, totalExact, 'vocal');
    }
    vibrerSucces();
    toast.success(`C'est dans le panier : ${l.quantite} × ${l.nomAffiche}`);
    if (guidageVocal()) speakMessage('TATA_AJOUT_PANIER');
    setSaisieOuverte(false);
  };

  /**
   * LA VENTE DICTÉE PART AU PANIER — un seul chemin, deux appelants.
   *
   * `uniteParlee` : l'unité RÉELLEMENT prononcée (« un TAS de piment »). Sans
   * elle, reprendre le prix du catalogue peut être faux — un tas n'est pas un
   * kilo, et l'écart se paie sur l'argent de la marchande.
   *
   * Hissée hors de `onAction` (21/09/2026) : la relecture de caisse (voir
   * l'effet plus bas) l'appelle aussi, et il ne doit exister qu'UNE façon
   * d'ajouter une vente dictée au panier.
   */
  const vendreUnifie = (nomParle: string | undefined, quantite: number, montant: number, uniteParlee?: string | null, lectureDictee?: 'unitaire' | 'total' | null) =>
    vendreVocalUnifie(nomParle, quantite, montant, {
      products,
      addToCart,
      speak: direEtRetenir,
      vibrerSucces,
      notifierAjoutPanier: (message) => toast.success(message),
      proposerCreationProduit: (p) => setPropositionProduit(p),
      stockage: window.localStorage,
      estEnLigne: () => navigator.onLine !== false,
      planifier: (effet, delaiMs) => setTimeout(effet, delaiMs),
      guidageVocalActif: () => guidageVocal(),
      creerIdLigne: () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`),
      // AUCUN PRIX TROUVÉ → ON LE DEMANDE, on ne se tait pas. La caisse ouvre
      // son écran « Autre article » PRÉ-REMPLI (nom et quantité dits) et pose
      // la question ; la ligne n'entrera au panier qu'une fois le prix donné.
      // Voir FournisseurDemandePrix, plus haut dans ce fichier.
      demanderPrix: demanderPrixAuParent
        ? ({ nom, quantite: qteDite, unite, raison, montant: montantDit }) => {
          setSaisieOuverte(false);
          demanderPrixAuParent({ nom, quantite: qteDite, unite, raison, montant: montantDit });
        }
        : undefined,
      // AUCUN ÉCRAN DE PRIX AU-DESSUS → ON NE SE TAIT PAS POUR AUTANT.
      // Sans fournisseur (caisse montée sans `FournisseurDemandePrix`) et avec
      // le guidage vocal coupé, cette vente comprise se terminait en silence
      // absolu sous le bandeau « J'ai compris ». Ici, le repli tactile de
      // CETTE surface s'ouvre et la phrase — celle du catalogue i18n, résolue
      // par vendreVocalUnifie, jamais réécrite ici — s'affiche.
      signalerBlocage: ({ texte }) => {
        setSaisieOuverte(true);
        toast.warning(texte);
        dernierePhraseRef.current = texte; // « réécouter » la dit, même différée
      },
    }, uniteParlee, lectureDictee);

  const {
    state, response, pendingResponse, transcript, liveTranscript, error,
    handleMicClick, reset, confirmAction, cancelAction, isSpeaking,
  } = useVoiceCore({
    maxRecordingSeconds: 60,
    context: {
      caisse: stats.caisse || 0, ventes: stats.ventes || 0, depenses: caisseStats?.cahierJour || 0,
      sessionOpen: !!(currentSession?.opened),
      prenom: user?.firstName || user?.prenoms || 'ma chere',
      genre: user?.genre || 'femme',
      userId: user?.id || '', lang: selectedLang, module: 'caisse',
      objectif: objectif || 0,
      progression: Math.round(progression || 0),
      nombreVentes: stats.nombreVentes || 0,
      topStocks: topStocks || '',
      dernierProduit: dernierProduit || '',
    },
    // « vendre » n'encaisse rien : il ajoute une ligne au panier PARTAGÉ, la
    // même fonction que le tactile. L'encaissement reste le bloc « Payer en
    // espèces » de cette même page. « vendre » n'attend pas de confirmation
    // orale et agit même hors ligne (panier local, aucune écriture serveur).
    //
    // Les intentions d'ENCAISSEMENT (lot C) sont dans les deux listes pour les
    // mêmes raisons, à une nuance près : elles ont bien une confirmation,
    // mais c'est celle de la machine (relecture du compte, puis « oui
    // valide »), pas le « oui/non » du moteur — les deux empilées, Tata
    // demanderait deux fois. Et elles n'écrivent rien elles-mêmes : quand
    // « oui valide » aboutit, c'est `handlePay` → `enregistrerVente` qui
    // écrit, avec sa propre file hors ligne, exactement comme le bouton.
    confirmationBypassIntents: ['vendre', ...INTENTIONS_ENCAISSEMENT],
    offlineLocalIntents: ['vendre', ...INTENTIONS_ENCAISSEMENT],
    onAction: async (data) => {
      // L'ENCAISSEMENT N'EST PAS À MOI. Transmis à la caisse, et on s'arrête :
      // pas de vente, pas de rafraîchissement, rien. Tout ce qui suit dans ce
      // gestionnaire remplit le panier ; une phrase d'encaissement n'y
      // touche pas.
      if (data.action?.type && estIntentionEncaissement(data.action.type)) { onIntentionEncaissement(data.action.type); return; }

      const action = data.action;
      if (action?.type === 'vendre') {
        // MONTANT FACULTATIF : le prix est résolu en aval par
        // vendreVocalUnifie, seul à disposer du catalogue. `0` y signifie
        // « rien n'a été dicté » ; un montant réellement prononcé prime.
        const brut = Number(action.montant);
        const montant = Number.isFinite(brut) && brut > 0 ? brut : 0;
        const quantite = action.quantite || 1;
        // LE PRODUIT DÉJÀ TOUCHÉ N'EST PAS À REDIRE (lot B2). Elle vient de
        // toucher « Tomate » dans Mon stock et dit « trois tas » : sans ce
        // repli, le moteur recevait `undefined`, n'appariait rien, et Tata
        // redemandait un prix que l'application connaissait déjà — panier
        // vide. La parole prime toujours : « deux kilos d'oignons » vend des
        // oignons. Seul le NOM est repris ; l'unité et le prix restent
        // l'affaire de resoudrePrixVocal (voir preselectionVente.ts).
        {
          // MÊME lecture, MÊME phrase : l'unité prononcée et ce que le montant
          // veut dire (« à » / « pour » / négociation) viennent de la même
          // extraction, jamais de deux relectures qui pourraient diverger.
          const lu = extraire(data.transcript || '');
          vendreUnifie(produitPourVente(action.produit, produitPreselectionne), quantite, montant, lu.uniteParlee, lu.lecturePrix);
        }
      } else if (action?.type === 'utiliser_raccourci') {
        const r = matchRaccourci ? matchRaccourci(action.declencheur || data.transcript || '') : null;
        if (r?.action?.type === 'vendre') {
          // Même sémantique panier que le « vendre » direct. Un raccourci qui
          // ne porte pas de prix laisse le catalogue le fournir, au lieu
          // d'être ignoré.
          const brutR = Number(r.action.montant);
          const montant = Number.isFinite(brutR) && brutR > 0 ? brutR : 0;
          const quantite = r.action.quantite || 1;
          // Même repli que la vente directe : un raccourci résolu en vente est
          // le même acte métier, il n'y a aucune raison qu'il oublie le
          // produit touché quand la vente directe s'en souvient.
          vendreUnifie(produitPourVente(r.action.produit, produitPreselectionne), quantite, montant);
        } else if (r?.action?.type === 'depense') {
          const montant = r.action.montant || 0;
          if (!montant || montant <= 0 || isNaN(montant)) {
            direEtRetenirMessage('TATA_DEPENSE_MONTANT_INCOMPRIS');
            return;
          }
          await enregistrerDepense(montant, r.action.description || r.nom);
        }
      } else if (action?.type === 'depense') {
        const montant = action.montant || 0;
        if (!montant || montant <= 0 || isNaN(montant)) {
          // LE SILENCE N'EST PAS UNE RÉPONSE. Elle dit « j'ai dépensé pour le
          // transport » sans chiffre, ou le bruit du marché couvre le
          // montant : sans cette phrase, rien ne s'affiche, rien ne se dit,
          // rien ne vibre — elle croit sa dépense notée. Aucun catalogue ne
          // peut fournir le prix d'une dépense : on ne peut que le redemander.
          direEtRetenirMessage('TATA_DEPENSE_MONTANT_INCOMPRIS');
          return;
        }
        await enregistrerDepense(montant, action.description || 'Dépense vocale');
      } else if (action?.type === 'consulter_ventes' || data.intent === 'consulter_ventes') {
        navigate('/marchand/ventes');
      } else if (action?.type === 'ajouter_stock' || data.intent === 'ajouter_stock') {
        navigate('/marchand/stock');
      }
      // `consulter_solde`, `ouvrir_journee` et `fermer_journee` menaient à
      // `/marchand/caisse` : on y EST déjà. Naviguer vers la page courante
      // remonterait l'écran en haut sans rien changer — on ne fait rien.
      try { await refreshTransactions(); } catch (e: any) { console.warn('[MicroVenteCaisse] refreshTransactions failed:', e?.message); }
    },
    onNavigate: (path) => { navigate(path); },
  });

  // Retour terrain : la marchande ne comprenait ni qu'il fallait appuyer, ni
  // pourquoi parler. Un mot dit à voix haute vaut mieux que la même
  // explication écrite en haut de l'écran — qu'elle ne lit pas.
  // Une clé et ses variables ; le texte résolu sert aussi à « réécouter ».
  const introMessage = useCallback((): [string, Record<string, string | number>] => (
    produitPreselectionne
      ? ['TATA_MICRO_INTRO_PRESELECTION', { produit: produitPreselectionne.nom }]
      : ['TATA_QUE_VENDRE', {}]
  ), [produitPreselectionne]);
  const introLigne = useCallback(() => t(...introMessage()), [introMessage]);

  useEffect(() => {
    if (!guidageVocal()) return;
    speakMessage(...introMessage());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois à l'arrivée sur la caisse, pas à chaque re-render
  }, []);

  /**
   * LA RELECTURE DE CAISSE — « cinq tomates » est une vente ici (21/09/2026).
   *
   * LE DÉFAUT, vu sur un vrai téléphone : Patrick dicte « cinq tomates ». Le
   * bandeau vert affiche « J'ai compris : Cinq tomates »… et il ne se passe
   * plus RIEN. La raison est dans `intentLocal` : l'extraction a bien vu le
   * produit et la quantité, mais aucun VERBE (« vends », « vendu ») n'a été
   * prononcé, alors l'énoncé est rendu `null` et jeté. Ses mots : « il ne
   * fais que ecrire ce que jai dis 3 tomates et cest tout ».
   *
   * Or une marchande ne dit pas « vends trois tomates ». Elle dit « trois
   * tomates » : sur CET écran, le verbe, c'est le geste d'avoir appuyé sur le
   * micro de sa caisse. C'est vrai ici et nulle part ailleurs — dans « Mon
   * stock » ou chez l'assistante, la même phrase ne veut pas dire vendre.
   *
   * POURQUOI ICI, ET PAS DANS LE MOTEUR. `intentLocal` sert toutes les
   * surfaces et son comportement est gelé par l'empreinte d'argent du lot
   * i18n ; `useVoiceCore` l'est par le garde-fou d'observabilité (seules des
   * lignes de journal peuvent y entrer). Cet écran-ci, lui, est fait pour
   * bouger — et c'est lui, et lui seul, qui porte cette lecture. Elle ne
   * s'applique QU'À CE QUE LE MOTEUR N'A PAS COMPRIS (`intentLocal` nul),
   * donc elle ne peut rien recouvrir ni doubler.
   *
   * ELLE N'ÉCRIT AUCUN ARGENT. Elle aboutit au même `vendreUnifie` que la
   * dictée ordinaire : sans montant dicté, le prix vient du catalogue, et
   * à défaut il est DEMANDÉ. Jamais une ligne à 0 F.
   */
  const dernierRelu = useRef<string>('');
  useEffect(() => {
    const texte = (transcript || '').trim();
    if (!texte || texte === dernierRelu.current) return;
    dernierRelu.current = texte;
    // Le moteur a compris : il a déjà agi, on ne repasse pas derrière lui.
    if (intentLocal(texte)) return;
    const local = intentLocalCaisse(texte);
    if (local?.action?.type !== 'vendre') return;
    const brut = Number(local.action.montant);
    const montant = Number.isFinite(brut) && brut > 0 ? brut : 0;
    const lu = extraire(texte);
    vendreUnifie(
      produitPourVente(local.action.produit, produitPreselectionne),
      local.action.quantite || 1,
      montant,
      lu.uniteParlee,
      lu.lecturePrix,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une relecture par transcription, pas à chaque rendu
  }, [transcript]);

  // Oui → création au prix unitaire DICTÉ (elle le corrigera dans Mon stock si
  // besoin) ; stock 0. Non → refus mémorisé pour CE produit.
  const accepterCreation = async () => {
    if (!propositionProduit || creationEnCours) return;
    setCreationEnCours(true);
    try {
      await addProduct({ nom: propositionProduit.nom, prix: propositionProduit.prix, categorie: 'Autre', stock: 0, unite: 'unité' });
      vibrerSucces();
      if (guidageVocal()) speakMessage('TATA_PRODUIT_AJOUTE_BOUTIQUE', { produit: propositionProduit.nom });
    } catch {
      if (guidageVocal()) speakMessage('TATA_AJOUT_BOUTIQUE_ECHEC');
    } finally {
      setCreationEnCours(false);
      setPropositionProduit(null);
    }
  };
  const refuserCreation = () => {
    if (!propositionProduit) return;
    try { noterRefusCreation(window.localStorage, propositionProduit.nom); } catch { /* ignore */ }
    if (guidageVocal()) speakMessage('TATA_ON_NE_CHANGE_RIEN');
    setPropositionProduit(null);
  };

  const isRecording = state === 'listening';
  const isLoading = state === 'processing' || state === 'thinking';
  const isConfirming = state === 'confirming';
  const isError = state === 'error';
  const isDone = state === 'idle' && !!response;

  // La bulle de Tata : une INVITATION à répondre, pas une annonce (arbitrage
  // du 20/09/2026, maquette verte). Au repos elle ne répète pas le grand titre
  // qui est juste au-dessus (UI-02) : « Dis-moi ce que tu vends » — et non
  // « Je vous écoute », parce que le micro n'écoute pas encore ; ce qui est DIT
  // à l'arrivée reste la question du titre (introLigne).
  const bulle = isRecording ? 'Je vous écoute'
    : isLoading ? 'Un instant…'
    : isSpeaking ? 'Tantie parle…'
    : isError ? "Je n'ai pas compris"
    : produitPreselectionne ? `Dis ce que tu as vendu de ${produitPreselectionne.nom}`
    : 'Dis-moi ce que tu vends';

  return (
    <section
      aria-label="Vendre à la voix"
      className="caisse-voice-guide"
      style={{ marginBottom: 'var(--caisse-esp-4)' }}
    >
      {/* LA QUESTION — écrite ET dite. Elle est écrite pour celle qui lit, et
          prononcée à l'arrivée pour celle qui ne lit pas : aucune information
          importante ne doit exister uniquement sous forme de texte.
          C'est le GRAND TITRE de la maquette (Inter semibold 28/34) : la seule
          question de l'écran, en plus gros que tout le reste. La marge
          question est posée sur une PASTILLE claire (.caisse-voice-question),
          détachée du fond de marché de la carte : à 390 px elle tient sur une
          ligne ; plus étroit, elle se coupe en deux lignes équilibrées
          (text-wrap: balance), jamais avec le « ? » orphelin. */}
      <h1 className="caisse-voice-question" style={{ font: 'var(--caisse-font-h1)', textWrap: 'balance' }}>
        {produitPreselectionne ? produitPreselectionne.nom : 'Que voulez-vous vendre ?'}
      </h1>

      <div className="caisse-voice-row">
        {/* LE MICRO. Énorme, orange, au centre, et PERMANENT : il ne rétrécit
            pas, ne se déplace pas et ne disparaît à aucun moment de la vente
            — ni panier vide, ni panier plein, ni pendant l'encaissement. Un
            micro visible est une instruction fonctionnelle, pas une
            décoration ; celui-ci est câblé à `handleMicClick` du moteur monté
            juste au-dessus. Le halo clair autour (maquette) est un disque
            orange à faible opacité : la même variable, aucune teinte dérivée
            écrite en dur. */}
        <div style={{ position: 'relative', width: MICRO_HALO, height: MICRO_HALO, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--caisse-orange-voix)', opacity: 0.18 }} />
          {(isRecording || isSpeaking) && [1, 2, 3].map(ring => (
            <motion.div key={ring} style={{ position: 'absolute', borderRadius: '50%', width: MICRO + ring * 12, height: MICRO + ring * 12, border: '2px solid var(--caisse-orange-voix)' }}
              animate={{ scale: [1, 1.14, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: ring * 0.25, ease: 'easeOut' }} />
          ))}
          <motion.button
            type="button"
            onClick={handleMicClick}
            disabled={isLoading}
            aria-label={isRecording ? 'Appuie pour terminer' : 'Appuie pour parler'}
            whileTap={{ scale: 0.93 }}
            onTouchStart={() => { try { const AC = window.AudioContext || (window as any).webkitAudioContext; const a = new AC(); if (a.state === 'suspended') a.resume(); } catch (e) { void e; } }}
            animate={isRecording ? { scale: [1, 1.04, 1] } : { scale: 1 }}
            transition={{ duration: 0.9, repeat: isRecording ? Infinity : 0 }}
            style={{
              width: MICRO, height: MICRO, borderRadius: '50%', border: 'none', padding: 0,
              background: isRecording ? 'var(--caisse-alerte)' : 'var(--caisse-orange-voix)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: isLoading ? 'not-allowed' : 'pointer', position: 'relative', zIndex: 2,
              boxShadow: '0 8px 24px var(--caisse-sable)',
            }}>
            {isLoading ? (
              <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ display: 'flex' }}>
                <Loader size={MICRO_ICONE} color="white" />
              </motion.span>
            ) : isDone ? <CheckCircle size={MICRO_ICONE} color="white" />
              : isError ? <AlertCircle size={MICRO_ICONE} color="white" />
              : <Mic size={MICRO_ICONE} color="white" strokeWidth={2.25} />}
          </motion.button>
        </div>

        {/* Tata — le visage et la bulle, comme la maquette : l'avatar en haut
            à droite, la bulle dessous avec son haut-parleur. Le haut-parleur
            DIT ce que la bulle affiche : la bulle n'est pas une légende à lire. */}
        <div className="caisse-voice-tata-side">
          {/* Tata en portrait DÉTOURÉ (92 × 102), et non plus en pastille de
              48 px : à la taille d'une icône, une photo de visage n'est plus
              un visage. */}
          <img src={tataAccueil} alt="" aria-hidden="true" className="caisse-voice-tata" />
          <button type="button" onClick={() => speak(dernierePhraseRef.current || introLigne())}
            aria-label={dernierePhraseRef.current ? "Réécouter ce que Tantie a compris" : 'Réécouter la question'}
            className="caisse-voice-bubble"
            style={{ gap: 'var(--caisse-esp-2)', borderRadius: 'var(--caisse-rayon-4)', borderTopRightRadius: 'var(--caisse-rayon-1)', padding: 'var(--caisse-esp-2) var(--caisse-esp-3)', minHeight: 'var(--caisse-cible-tactile)' }}>
            <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--caisse-succes)', color: 'var(--caisse-vert)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Volume2 size={ICONE} />
            </span>
            <span style={{ font: 'var(--caisse-font-texte)', fontWeight: 600, color: 'var(--encre)' }}>{bulle}</span>
          </button>
          {/* LE REPLI, SUR LA MÊME SURFACE (arbitrage n°3). Il n'envoie plus vers
              un autre écran : la saisie guidée s'ouvre ici, et les photos des
              produits sont déjà juste en dessous, dans la grille de cette page.
              SECONDAIRE (UI-03) : un lien discret sous la bulle, sans cadre —
              44 px de haut quand même, c'est un doigt qui le touche. */}
          <button type="button" onClick={() => setSaisieOuverte(v => !v)}
            aria-label="Choisir la vente à l’écran"
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--caisse-esp-1)', minHeight: 'var(--caisse-cible-tactile)', background: saisieOuverte ? 'var(--caisse-orange-voix)' : 'transparent', border: 'none', borderRadius: 'var(--caisse-rayon-3)', padding: '0 var(--caisse-esp-2)', cursor: 'pointer', fontFamily: 'inherit' }}>
            <Keyboard size={20} color={saisieOuverte ? 'white' : 'var(--caisse-gris-texte)'} />
            <span style={{ font: 'var(--caisse-font-legende)', fontSize: 14, lineHeight: '18px', fontWeight: 600, color: saisieOuverte ? 'white' : 'var(--caisse-gris-texte)', textDecoration: 'underline', textUnderlineOffset: 3 }}>Choisir à l’écran</span>
          </button>
        </div>
      </div>

      {/* CE QUE TATA A COMPRIS — visible, et déjà dit par le moteur. Le chip
          vert « J'ai compris : … » de la maquette. */}
      {isRecording && liveTranscript && (
        <p style={{ textAlign: 'center', marginTop: 'var(--caisse-esp-3)', font: 'var(--caisse-font-texte)', fontWeight: 600, color: 'var(--caisse-gris-texte)' }}>« {liveTranscript} »</p>
      )}
      {!isRecording && transcript && (
        <div style={{ marginTop: 'var(--caisse-esp-3)', background: 'var(--caisse-succes)', borderRadius: 'var(--caisse-rayon-4)', padding: 'var(--caisse-esp-2) var(--caisse-esp-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--caisse-esp-2)' }}>
          <CheckCircle size={ICONE} color="var(--caisse-vert)" style={{ flexShrink: 0 }} />
          <span style={{ font: 'var(--caisse-font-texte)', fontWeight: 600, color: 'var(--encre)' }}>J'ai compris : {transcript}</span>
        </div>
      )}
      {isError && error && (
        <div role="alert" style={{ marginTop: 'var(--caisse-esp-3)', background: 'white', border: '1px solid var(--caisse-alerte)', borderRadius: 'var(--caisse-rayon-4)', padding: 'var(--caisse-esp-2) var(--caisse-esp-3)' }}>
          <p style={{ font: 'var(--caisse-font-texte)', fontWeight: 600, color: 'var(--caisse-alerte)', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* « Dis "encaisser" pour terminer » — le rappel de la maquette, dès
          qu'il y a quelque chose à encaisser. Lecture seule du panier : ce
          composant ne décide rien de l'argent, il rappelle le mot qui le fait
          relire par la caisse (lot C). */}
      {cart.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--caisse-esp-1)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--caisse-esp-2)', background: 'var(--caisse-ivoire)', border: '1px solid var(--commerce-line)', borderRadius: 'var(--caisse-rayon-3)', padding: 'var(--caisse-esp-1) var(--caisse-esp-3)', font: 'var(--caisse-font-texte)', color: 'var(--encre)' }}>
            <AudioLines size={ICONE} color="var(--caisse-vert)" aria-hidden="true" style={{ flexShrink: 0 }} />
            <span>Dis <strong>« encaisser »</strong> pour terminer</span>
          </div>
        </div>
      )}

      {/* Confirmation d'une action qui n'est PAS une vente (une dépense, par
          exemple) : « vendre » ne passe jamais par ici (bypass). */}
      <AnimatePresence>
        {isConfirming && pendingResponse && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ marginTop: 'var(--caisse-esp-3)', background: 'white', border: '2px solid var(--caisse-orange-voix)', borderRadius: 'var(--caisse-rayon-4)', padding: 'var(--caisse-esp-4)' }}>
            <p style={{ font: 'var(--caisse-font-texte)', fontWeight: 600, color: 'var(--encre)', marginBottom: 'var(--caisse-esp-3)' }}>{pendingResponse.response || pendingResponse.reponse}</p>
            <div style={{ display: 'flex', gap: 'var(--caisse-esp-2)' }}>
              <button type="button" onClick={cancelAction}
                style={{ flex: 1, minHeight: 'var(--caisse-cible-tactile)', padding: 'var(--caisse-esp-3) 0', borderRadius: 'var(--caisse-rayon-3)', font: 'var(--caisse-font-bouton)', border: '2px solid var(--caisse-orange-voix)', color: 'var(--caisse-orange-voix)', background: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>Non</button>
              <button type="button" onClick={confirmAction}
                style={{ flex: 1, minHeight: 'var(--caisse-cible-tactile)', padding: 'var(--caisse-esp-3) 0', borderRadius: 'var(--caisse-rayon-3)', font: 'var(--caisse-font-bouton)', color: 'white', background: 'var(--caisse-orange-voix)', cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}>Oui</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* « J'ajoute ce produit à ta boutique ? » */}
      <AnimatePresence>
        {propositionProduit && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ marginTop: 'var(--caisse-esp-3)', background: 'white', border: '2px solid var(--caisse-orange-voix)', borderRadius: 'var(--caisse-rayon-4)', padding: 'var(--caisse-esp-4)' }}>
            <p style={{ font: 'var(--caisse-font-texte)', fontWeight: 600, color: 'var(--encre)', marginBottom: 'var(--caisse-esp-3)' }}>
              J'ajoute « {propositionProduit.nom} » à ta boutique à {propositionProduit.prix.toLocaleString('fr-FR')} F ?
            </p>
            <div style={{ display: 'flex', gap: 'var(--caisse-esp-2)' }}>
              <button type="button" onClick={refuserCreation} disabled={creationEnCours}
                style={{ flex: 1, minHeight: 'var(--caisse-cible-tactile)', padding: 'var(--caisse-esp-3) 0', borderRadius: 'var(--caisse-rayon-3)', font: 'var(--caisse-font-bouton)', border: '2px solid var(--caisse-orange-voix)', color: 'var(--caisse-orange-voix)', background: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>Non</button>
              <button type="button" onClick={accepterCreation} disabled={creationEnCours}
                style={{ flex: 1, minHeight: 'var(--caisse-cible-tactile)', padding: 'var(--caisse-esp-3) 0', borderRadius: 'var(--caisse-rayon-3)', font: 'var(--caisse-font-bouton)', color: 'white', background: creationEnCours ? 'var(--caisse-gris-texte)' : 'var(--caisse-orange-voix)', cursor: creationEnCours ? 'wait' : 'pointer', border: 'none', fontFamily: 'inherit' }}>
                {creationEnCours ? 'Un instant…' : 'Oui, ajoute'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(isDone || isError) && (
        <button type="button" onClick={reset}
          style={{ width: '100%', marginTop: 'var(--caisse-esp-3)', minHeight: 'var(--caisse-cible-tactile)', padding: 'var(--caisse-esp-3) 0', borderRadius: 'var(--caisse-rayon-4)', font: 'var(--caisse-font-bouton)', color: 'white', background: 'var(--caisse-orange-voix)', cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}>
          Parler encore à Tantie
        </button>
      )}

      {saisieOuverte && (
        <div style={{ marginTop: 'var(--caisse-esp-3)' }}>
          <SaisieGuidee
            onValider={ajouterLigneAuPanier}
            apparier={(nom) => {
              const p = apparierProduit(nom, products);
              return p ? { produitId: p.id, nomCatalogue: p.nom, prixCatalogue: p.prix ?? null, unite: p.unite || 'unité' } : null;
            }}
            initialProduit={produitPreselectionne?.nom}
            initialPrix={produitPreselectionne?.prix}
          />
        </div>
      )}
    </section>
  );
}
