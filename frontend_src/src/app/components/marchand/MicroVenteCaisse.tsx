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
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle, Keyboard, Loader, Mic, Volume2 } from 'lucide-react';
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
import { apparierProduit, noterRefusCreation } from '../../services/venteVocale';
import { vendreVocalUnifie } from '../../services/vendreVocalUnifie';
import { produitPourVente } from '../../services/preselectionVente';
import { AJOUT_PANIER } from '../../services/dialoguesTata';
import type { LigneProvisoire } from '../../services/ligneProvisoire';
import { guidageVocal } from '../../utils/accessMode';
import { vibrerSucces } from '../../utils/haptique';
import { SaisieGuidee } from './SaisieGuidee';
import tantieImg from '../../../assets/images/tantie-vente-vocale.png';

/** Orange « voix » du design system JULABA — la couleur du micro, et d'elle seule. */
const ORANGE = '#F68A1F';
const VERT = '#1E7A3A';

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
}

export function MicroVenteCaisse({ produitPreselectionne = null }: Props) {
  const { lang: selectedLang } = useLangPref();
  const navigate = useNavigate();
  const { user, currentSession, getTodayStats, speak } = useApp();
  const {
    enregistrerDepense, refreshTransactions, stats: caisseStats,
    products, addProduct, addToCart,
  } = useCaisse();

  // Dernière phrase prononcée par Tata. Sert au bouton « réécouter » : si la
  // marchande n'a pas saisi ce qui a été compris, elle doit pouvoir le
  // réentendre — sinon son seul recours est de refaire la vente.
  const dernierePhraseRef = useRef<string>('');
  const direEtRetenir = useCallback((texte: string) => {
    dernierePhraseRef.current = texte;
    speak(texte);
  }, [speak]);

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
    if (guidageVocal()) speak(AJOUT_PANIER);
    setSaisieOuverte(false);
  };

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
    confirmationBypassIntents: ['vendre'],
    offlineLocalIntents: ['vendre'],
    onAction: async (data) => {
      // `uniteParlee` : l'unité RÉELLEMENT prononcée (« un TAS de piment »).
      // Sans elle, reprendre le prix du catalogue peut être faux — un tas
      // n'est pas un kilo, et l'écart se paie sur l'argent de la marchande.
      const vendreUnifie = (nomParle: string | undefined, quantite: number, montant: number, uniteParlee?: string | null) =>
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
        }, uniteParlee);

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
        vendreUnifie(produitPourVente(action.produit, produitPreselectionne), quantite, montant, extraire(data.transcript || '').uniteParlee);
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
            direEtRetenir("Je n'ai pas compris combien tu as dépensé. Redis-moi le montant.");
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
          direEtRetenir("Je n'ai pas compris combien tu as dépensé. Redis-moi le montant.");
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
  const introLigne = useCallback(() => (
    produitPreselectionne
      ? `Appuie sur le micro, et dis ce que tu as vendu de ${produitPreselectionne.nom}.`
      : 'Que voulez-vous vendre ?'
  ), [produitPreselectionne]);

  useEffect(() => {
    if (!guidageVocal()) return;
    speak(introLigne());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois à l'arrivée sur la caisse, pas à chaque re-render
  }, []);

  // Oui → création au prix unitaire DICTÉ (elle le corrigera dans Mon stock si
  // besoin) ; stock 0. Non → refus mémorisé pour CE produit.
  const accepterCreation = async () => {
    if (!propositionProduit || creationEnCours) return;
    setCreationEnCours(true);
    try {
      await addProduct({ nom: propositionProduit.nom, prix: propositionProduit.prix, categorie: 'Autre', stock: 0, unite: 'unité' });
      vibrerSucces();
      if (guidageVocal()) speak(`C'est fait. ${propositionProduit.nom} est dans ta boutique.`);
    } catch {
      if (guidageVocal()) speak("Ça n'a pas marché. Tu pourras l'ajouter depuis Mon stock.");
    } finally {
      setCreationEnCours(false);
      setPropositionProduit(null);
    }
  };
  const refuserCreation = () => {
    if (!propositionProduit) return;
    try { noterRefusCreation(window.localStorage, propositionProduit.nom); } catch { /* ignore */ }
    if (guidageVocal()) speak("D'accord, on ne change rien.");
    setPropositionProduit(null);
  };

  const isRecording = state === 'listening';
  const isLoading = state === 'processing' || state === 'thinking';
  const isConfirming = state === 'confirming';
  const isError = state === 'error';
  const isDone = state === 'idle' && !!response;

  // La bulle de Tata : une QUESTION, pas une annonce. « Que voulez-vous
  // vendre ? » invite à répondre ; « je suis là pour vous aider » n'invite à
  // rien (arbitrage du 20/09/2026, maquette verte).
  const bulle = isRecording ? 'Je vous écoute'
    : isLoading ? 'Un instant…'
    : isSpeaking ? 'Tata parle…'
    : isError ? "Je n'ai pas compris"
    : produitPreselectionne ? `Dis ce que tu as vendu de ${produitPreselectionne.nom}`
    : 'Que voulez-vous vendre ?';

  return (
    <section
      aria-label="Vendre à la voix"
      style={{ background: '#F5EBDD', border: '1.5px solid rgba(175,91,35,0.18)', borderRadius: 24, padding: '18px 16px 16px', marginBottom: 18 }}
    >
      {/* LA QUESTION — écrite ET dite. Elle est écrite pour celle qui lit, et
          prononcée à l'arrivée pour celle qui ne lit pas : aucune information
          importante ne doit exister uniquement sous forme de texte. */}
      <p style={{ textAlign: 'center', fontSize: 22, fontWeight: 900, color: 'var(--encre)', margin: '0 0 14px' }}>
        {produitPreselectionne ? produitPreselectionne.nom : 'Que voulez-vous vendre ?'}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        {/* LE MICRO. Énorme, orange, au centre, et PERMANENT : il ne rétrécit
            pas, ne se déplace pas et ne disparaît à aucun moment de la vente
            — ni panier vide, ni panier plein, ni pendant l'encaissement. Un
            micro visible est une instruction fonctionnelle, pas une
            décoration ; celui-ci est câblé à `handleMicClick` du moteur monté
            juste au-dessus. */}
        <div style={{ position: 'relative', width: 132, height: 132, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {(isRecording || isSpeaking) && [1, 2, 3].map(ring => (
            <motion.div key={ring} style={{ position: 'absolute', borderRadius: '50%', width: 108 + ring * 10, height: 108 + ring * 10, border: `2px solid ${ORANGE}55` }}
              animate={{ scale: [1, 1.14, 1], opacity: [0.7, 0, 0.7] }}
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
              width: 108, height: 108, borderRadius: '50%', border: 'none', padding: 0,
              background: isRecording ? '#E14B2F' : `linear-gradient(150deg, ${ORANGE}, #E2741A)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: isLoading ? 'not-allowed' : 'pointer', position: 'relative', zIndex: 2,
              boxShadow: `0 8px 24px ${ORANGE}66`,
            }}>
            {isLoading ? (
              <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ display: 'flex' }}>
                <Loader size={44} color="white" />
              </motion.span>
            ) : isDone ? <CheckCircle size={46} color="white" />
              : isError ? <AlertCircle size={46} color="white" />
              : <Mic size={46} color="white" />}
          </motion.button>
        </div>

        {/* Tata — le visage et la bulle. Le haut-parleur de la bulle DIT ce
            qu'elle affiche : la bulle n'est pas une légende à lire. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <button type="button" onClick={() => speak(dernierePhraseRef.current || introLigne())}
            aria-label={dernierePhraseRef.current ? "Réécouter ce que Tata a compris" : 'Réécouter la question'}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: '1.5px solid rgba(175,91,35,0.18)', borderRadius: 16, padding: '9px 11px', cursor: 'pointer', fontFamily: 'inherit', minWidth: 0 }}>
            <Volume2 size={18} color={VERT} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--encre)', textAlign: 'left' }}>{bulle}</span>
          </button>
          <img src={tantieImg} alt="" aria-hidden="true"
            style={{ width: 54, height: 54, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0, border: '2px solid white' }} />
        </div>
      </div>

      {/* CE QUE TATA A COMPRIS — visible, et déjà dit par le moteur. */}
      {isRecording && liveTranscript && (
        <p style={{ textAlign: 'center', marginTop: 12, fontSize: 14, fontWeight: 700, color: 'var(--encre-3)' }}>« {liveTranscript} »</p>
      )}
      {!isRecording && transcript && (
        <div style={{ marginTop: 12, background: 'white', border: '1.5px solid #DDEFD9', borderRadius: 16, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={18} color={VERT} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--encre)' }}>J'ai compris : {transcript}</span>
        </div>
      )}
      {isError && error && (
        <div style={{ marginTop: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 16, padding: '10px 12px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#B91C1C', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Confirmation d'une action qui n'est PAS une vente (une dépense, par
          exemple) : « vendre » ne passe jamais par ici (bypass). */}
      <AnimatePresence>
        {isConfirming && pendingResponse && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ marginTop: 12, background: 'white', border: `2px solid ${ORANGE}`, borderRadius: 18, padding: 14 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--encre)', marginBottom: 12 }}>{pendingResponse.response || pendingResponse.reponse}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={cancelAction}
                style={{ flex: 1, padding: '12px 0', borderRadius: 14, fontWeight: 800, fontSize: 14, border: `2px solid ${ORANGE}`, color: ORANGE, background: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>Non</button>
              <button type="button" onClick={confirmAction}
                style={{ flex: 1, padding: '12px 0', borderRadius: 14, fontWeight: 800, fontSize: 14, color: 'white', background: ORANGE, cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}>Oui</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* « J'ajoute ce produit à ta boutique ? » */}
      <AnimatePresence>
        {propositionProduit && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ marginTop: 12, background: 'white', border: `2px solid ${ORANGE}`, borderRadius: 18, padding: 14 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--encre)', marginBottom: 12 }}>
              J'ajoute « {propositionProduit.nom} » à ta boutique à {propositionProduit.prix.toLocaleString('fr-FR')} F ?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={refuserCreation} disabled={creationEnCours}
                style={{ flex: 1, padding: '12px 0', borderRadius: 14, fontWeight: 800, fontSize: 14, border: `2px solid ${ORANGE}`, color: ORANGE, background: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>Non</button>
              <button type="button" onClick={accepterCreation} disabled={creationEnCours}
                style={{ flex: 1, padding: '12px 0', borderRadius: 14, fontWeight: 800, fontSize: 14, color: 'white', background: creationEnCours ? '#CBB9A8' : ORANGE, cursor: creationEnCours ? 'wait' : 'pointer', border: 'none', fontFamily: 'inherit' }}>
                {creationEnCours ? 'Un instant…' : 'Oui, ajoute'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(isDone || isError) && (
        <button type="button" onClick={reset}
          style={{ width: '100%', marginTop: 12, padding: '13px 0', borderRadius: 16, fontWeight: 800, fontSize: 14, color: 'white', background: ORANGE, cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}>
          Reparler à Tata
        </button>
      )}

      {/* LE REPLI, SUR LA MÊME SURFACE (arbitrage n°3). Il n'envoie plus vers
          un autre écran : la saisie guidée s'ouvre ici, et les photos des
          produits sont déjà juste en dessous, dans la grille de cette page. */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
        <button type="button" onClick={() => setSaisieOuverte(v => !v)}
          aria-label="Saisir sans parler"
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: saisieOuverte ? ORANGE : 'white', border: `1.5px solid ${saisieOuverte ? ORANGE : 'rgba(175,91,35,0.22)'}`, borderRadius: 14, padding: '11px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>
          <Keyboard size={18} color={saisieOuverte ? 'white' : 'var(--encre-3)'} />
          <span style={{ fontSize: 13, fontWeight: 800, color: saisieOuverte ? 'white' : 'var(--encre-3)' }}>Saisir sans parler</span>
        </button>
      </div>
      {saisieOuverte && (
        <div style={{ marginTop: 12 }}>
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
