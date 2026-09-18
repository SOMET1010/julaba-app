import React, { useEffect, useState, useCallback, useRef } from "react";
import { useLangPref } from "../../hooks/useLangPref";
import { useVoiceCore } from "../../hooks/useVoiceCore";
import { motion, AnimatePresence } from "motion/react";
import { X, Loader, CheckCircle, AlertCircle, ShieldCheck, WifiOff, Mic, Volume2, Keyboard, ShoppingBasket } from "lucide-react";
import { useNavigate } from "react-router";
import { useApp } from "../../contexts/AppContext";
import { useRaccourcis } from "../../contexts/RaccourcisContext";
import { useCaisse } from "../../contexts/CaisseContext";
import { useObjectif, ObjectifProvider } from "../../contexts/ObjectifContext";
import { useStock, type StockItem } from "../../contexts/StockContext";
import { resumeIncidentHorsLigne } from "../../voice-offline/incidentsHorsLigne";
import { apparierProduit, noterRefusCreation } from "../../services/venteVocale";
import { vendreVocalUnifie } from "../../services/vendreVocalUnifie";
import { guidageVocal } from "../../utils/accessMode";
import { vibrerSucces } from "../../utils/haptique";
import { SaisieGuidee } from "./SaisieGuidee";
import { AJOUT_PANIER } from "../../services/dialoguesTata";
import type { LigneProvisoire } from "../../services/ligneProvisoire";
import { toast } from "sonner";
import tantieImg from "../../../assets/images/tantie-vente-vocale.png";
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { vignetteProduit } from '../../utils/emojiTile';

const P = "#B74725";
const PD = "#A0541F";
const PL = "#F5E6D8";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Produit déjà sélectionné par la marchande (ex. depuis sa fiche) : évite de lui
   * faire redire un nom qu'elle vient de toucher — on ouvre direct la saisie guidée
   * avec le nom et le prix déjà remplis, il ne reste que la quantité à confirmer. */
  initialProduct?: { nom: string; prix: number; unite?: string; image?: string } | null;
}

export function VenteVocaleModal({ isOpen, onClose, initialProduct = null }: Props) {
  const { lang: selectedLang } = useLangPref();
  const navigate = useNavigate();
  const { user, currentSession, getTodayStats, setIsModalOpen, speak } = useApp();

  // Dernière phrase prononcée par Tata. Sert au bouton « réécouter » : si la
  // marchande n'a pas saisi ce qui a été compris, elle doit pouvoir le
  // réentendre — sinon son seul recours est de refaire la vente.
  const dernierePhraseRef = useRef<string>("");
  const direEtRetenir = useCallback(
    (texte: string) => {
      dernierePhraseRef.current = texte;
      speak(texte);
    },
    [speak],
  );
  const { enregistrerDepense, refreshTransactions, stats: caisseStats, products, addProduct, addToCart, syncEchecs, syncLettresMortes, purgerEchecSync, cart, getTotalCart } = useCaisse();
  const objectifCtx = useObjectif();
  const objectif = objectifCtx?.objectif ?? 0;
  const progression = objectifCtx?.progression ?? 0;
  const stockCtx = useStock();
  const topStocks = (stockCtx.stocks || []).slice(0,3).map((s: StockItem) => `${s.produit}:${s.quantite}${s.unite}`).join(', ');
  const dernierProduit = (stockCtx.stocks || []).slice().sort((a: StockItem, b: StockItem) => ((b.updatedAt && Date.parse(b.updatedAt)) || 0) - ((a.updatedAt && Date.parse(a.updatedAt)) || 0))[0]?.produit || '';
  const raccourcisCtx = useRaccourcis();
  const matchRaccourci = raccourcisCtx?.matchRaccourci ?? null;
  const stats = getTodayStats();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  // « J'ajoute ce produit à ta boutique ? » (unification vocale, lot 2) : après
  // une vente d'un produit inconnu, Tata propose de le créer — les prochaines
  // ventes seront alors appariées (stock, marge). Refus mémorisé PAR produit.
  const [propositionProduit, setPropositionProduit] = useState<{ nom: string; prix: number } | null>(null);
  const [creationEnCours, setCreationEnCours] = useState(false);
  // Repli tactile (SPEC §8) : « saisir sans parler » — même parcours guidé au doigt.
  const [saisieOuverte, setSaisieOuverte] = useState(false);
  // La ligne confirmée va au PANIER (jamais enregistrée ici) — l'encaissement reste
  // le chemin tactile existant.
  //
  // IMPORTANT — un SEUL appel mutateur de panier par ajout. addToCart et
  // updateCartItemPrice recalculent tous deux depuis le `cart` figé de la closure du
  // render : les enchaîner dans le même handler fait écraser l'ajout par le second
  // (panier vidé). On fixe donc le prix DICTÉ directement dans le produit passé à
  // addToCart (le négoce prime → on neutralise la promo catalogue), sans second appel.
  const ajouterLigneAuPanier = (l: LigneProvisoire) => {
    const prixU = l.prixUnitaire ?? 0;
    // Total EXACT résolu par la ligne provisoire (voir ligneProvisoire.ts) — en
    // FCFA, 500/3 ne retombe pas juste : `prixU` n'est qu'un unitaire arrondi,
    // c'est `l.total` qui doit faire foi pour le panier (CartItem.totalExact).
    const totalExact = l.total ?? undefined;
    const prod = l.produitId ? products.find(p => p.id === l.produitId) : null;
    if (prod) {
      // Produit APPARIÉ : vrai produit (prix d'achat → marge réelle, stock décrémenté
      // à l'encaissement), au prix dicté.
      addToCart({ ...prod, prix: prixU > 0 ? prixU : prod.prix, prix_promo: null, promo_fin: null }, l.quantite, totalExact, 'vocal');
    } else {
      // Produit inconnu → ligne libre (comme « Autre article »).
      addToCart({ id: 'libre-' + l.id, nom: l.nomAffiche, prix: prixU, categorie: 'Autre', stock: 0, unite: l.unite }, l.quantite, totalExact, 'vocal');
    }
    vibrerSucces();
    toast.success(`C'est dans le panier : ${l.quantite} × ${l.nomAffiche}`);
    if (guidageVocal()) speak(AJOUT_PANIER);
  };
  useEffect(() => {
    const on = () => setIsOnline(true); const off = () => setIsOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const { state, response, pendingResponse, transcript, liveTranscript, error, volume,
    handleMicClick, reset, resetHistory, confirmAction, cancelAction, isSpeaking,
    pendingCount, isReplaying,
  } = useVoiceCore({
    maxRecordingSeconds: 60,
    context: {
      caisse: stats.caisse || 0, ventes: stats.ventes || 0, depenses: caisseStats?.cahierJour || 0,
      sessionOpen: !!(currentSession?.opened),
      prenom: user?.firstName || user?.prenoms || "ma chere",
      genre: user?.genre || "femme",
      userId: user?.id || "", lang: selectedLang, module: "caisse",
      objectif: objectif || 0,
      progression: Math.round(progression || 0),
      nombreVentes: stats.nombreVentes || 0,
      topStocks: topStocks || '',
      dernierProduit: dernierProduit || '',
    },
    // Vente vocale = AJOUT AU PANIER (Convergence voix/tactile POS, Lot 2) :
    // « vendre » n'encaisse plus rien directement — le produit dicté est
    // apparié au catalogue → addToCart au prix dicté, prix d'achat conservé
    // (marge réelle à l'encaissement futur). Sans appariement, ligne libre.
    // L'encaissement reste exclusivement le bouton tactile « Payer en
    // espèces » (POSCaisse.handlePay). Voir confirmationBypassIntents/
    // offlineLocalIntents ci-dessous : « vendre » n'attend plus de
    // confirmation orale et agit immédiatement même hors ligne (panier
    // local, aucune écriture serveur).
    confirmationBypassIntents: ['vendre'],
    offlineLocalIntents: ['vendre'],
    onAction: async (data) => {
      // Extraction mécanique (Lot 1) puis changement de sémantique (Lot 2) :
      // la logique vit dans services/vendreVocalUnifie.ts, testée en isolation.
      // Cet adaptateur ne fait que reboucler les dépendances déjà disponibles
      // dans cette closure sur l'interface injectée du module.
      const vendreUnifie = (nomParle: string | undefined, quantite: number, montant: number) =>
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
        });
      const action = data.action;
      if (action?.type === "vendre") {
        const montant = action.montant || 0;
        const quantite = action.quantite || 1;
        if (!montant || montant <= 0 || isNaN(montant)) return;
        // Simple ajout au panier (Lot 2) : le contrôle « journée ouverte »
        // n'a plus sa place ici — il ne protège qu'un encaissement réel, qui
        // n'a pas lieu à cet endroit (voir POSCaisse.handlePay). Le chemin
        // guidé (ajouterLigneAuPanier) n'a jamais eu ce contrôle non plus.
        vendreUnifie(action.produit, quantite, montant);
      } else if (action?.type === "utiliser_raccourci") {
        const r = matchRaccourci ? matchRaccourci(action.declencheur || data.transcript || "") : null;
        if (r?.action?.type === "vendre") {
          // Même sémantique panier que le « vendre » direct ci-dessus — un
          // raccourci résolu en vente ne fait qu'ajouter une ligne, jamais
          // d'encaissement (même remarque : pas de contrôle journée ouverte
          // ici). `confirmationBypassIntents` ne couvre pas l'intention
          // « utiliser_raccourci » elle-même (un raccourci peut aussi
          // résoudre en dépense, qui doit rester confirmée) — la confirmation
          // orale reste donc demandée pour ce chemin, mais son texte fixe
          // (confirmAction(), useVoiceCore.ts) a été rendu générique pour ne
          // plus jamais affirmer « vente enregistrée » quand ce n'est qu'un
          // ajout au panier.
          const montant = r.action.montant || 0;
          const quantite = r.action.quantite || 1;
          if (!montant || montant <= 0 || isNaN(montant)) return;
          vendreUnifie(r.action.produit, quantite, montant);
        } else if (r?.action?.type === "depense") {
          const montant = r.action.montant || 0;
          if (!montant || montant <= 0 || isNaN(montant)) return;
          await enregistrerDepense(montant, r.action.description || r.nom);
        }
      } else if (action?.type === "depense") {
        const montant = action.montant || 0;
        if (!montant || montant <= 0 || isNaN(montant)) return;
        await enregistrerDepense(montant, action.description || "Dépense vocale");
      } else if (action?.type === "consulter_solde" || data.intent === "consulter_solde") {
        navigate('/marchand/caisse');
        onClose();
      } else if (action?.type === "consulter_ventes" || data.intent === "consulter_ventes") {
        navigate('/marchand/ventes');
        onClose();
      } else if (action?.type === "ajouter_stock" || data.intent === "ajouter_stock") {
        navigate('/marchand/stock');
        onClose();
      } else if (action?.type === "ouvrir_journee" || data.intent === "ouvrir_journee") {
        navigate('/marchand/caisse');
        onClose();
      } else if (action?.type === "fermer_journee" || data.intent === "fermer_journee") {
        navigate('/marchand/caisse');
        onClose();
      }
      try { await refreshTransactions(); } catch (e: any) { console.warn('[VenteVocaleModal] refreshTransactions failed:', e?.message); }
    },
    onNavigate: (path) => { navigate(path); onClose(); },
  });

  // #2 : pendingCount/isReplaying viennent de l'UNIQUE file de useVoiceCore
  // (plus de seconde instance qui rejouait la file en double à la reconnexion).
  useEffect(() => { if (!isOpen) resetHistory(); }, [isOpen, resetHistory]);
  useEffect(() => { if (!isOpen) { setPropositionProduit(null); setSaisieOuverte(false); } }, [isOpen]);
  // Retour terrain : la marchande ne comprenait ni qu'il fallait appuyer sur la
  // photo, ni pourquoi parler à « Tata Nanti Lou ». Un mot dit à voix haute à
  // l'ouverture vaut mieux que les mêmes explications écrites en haut de l'écran.
  const introLigne = useCallback(() => (
    initialProduct
      ? `Appuie sur moi, et dis ce que tu as vendu de ${initialProduct.nom}.`
      : "Bonjour, je suis Tata Nanti Lou. Appuie sur moi et dis ce que tu as vendu."
  ), [initialProduct]);
  useEffect(() => {
    if (!isOpen || !guidageVocal()) return;
    speak(introLigne());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ne parler qu'à l'ouverture, pas à chaque re-render
  }, [isOpen]);

  // Oui → création avec le prix unitaire DICTÉ (elle le corrigera dans Mon stock
  // si besoin) ; stock 0 (à compléter). Non → refus mémorisé pour CE produit.
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
  useEffect(() => { setIsModalOpen(isOpen); return () => setIsModalOpen(false); }, [isOpen, setIsModalOpen]);

  const isRecording = state === "listening";
  const isLoading = state === "processing" || state === "thinking";
  const isConfirming = state === "confirming";
  const isError = state === "error";
  const isDone = state === "idle" && !!response;
  const isIdle = state === "idle" && !response;

  const intentEmoji: Record<string, string> = { vendre: "🛒", consulter_solde: "💰", consulter_ventes: "📊", ajouter_stock: "📦", ouvrir_journee: "☀️", fermer_journee: "🌙", depense: "📒", commandes: "📋", marche: "🏪", keiwa: "💳", inconnu: "🤔" };
  const bars = Array.from({ length: 11 }, (_, i) => {
    const active = isRecording || isSpeaking;
    const baseH = isRecording ? Math.max(6, (volume / 100) * 40 + Math.sin(i * 0.8) * 10) : isSpeaking ? Math.max(5, 20 + Math.sin(i * 1.4) * 12) : 3;
    return { delay: i * 0.07, height: baseH, active };
  });

  const statusLabel = isRecording ? "Appuie pour terminer"
    : isSpeaking ? "Tata Nanti Lou répond..."
    : isLoading ? liveTranscript || "Analyse en cours..."
    : isDone ? "Message enregistré !"
    : isError ? "Erreur — réessaie"
    : "Appuie sur Tata Nanti Lou pour parler";

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-end justify-center"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
          className="w-full bg-white overflow-hidden"
          style={{ borderRadius: "28px 28px 0 0", maxWidth: 420, maxHeight: "92vh", overflowY: "auto", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}>

          {isReplaying && (<motion.div initial={{ height: 0 }} animate={{ height: "auto" }} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500"><motion.div className="w-2 h-2 rounded-full bg-white" animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 0.7 }} /><p className="text-white text-xs font-bold">{pendingCount} message(s) en attente...</p></motion.div>)}
          {!isOnline && (<motion.div initial={{ height: 0 }} animate={{ height: "auto" }} className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500"><WifiOff className="w-3 h-3 text-white" /><p className="text-white text-xs font-bold">Hors-ligne — messages sauvegardés</p></motion.div>)}
          {syncEchecs > 0 && (
            <div aria-live="polite" className="px-4 py-3" style={{ background: "#FFF7ED", borderBottom: "1px solid #FED7AA" }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#9A3412", margin: 0 }}>
                {syncEchecs} opération{syncEchecs > 1 ? "s" : ""} à vérifier
              </p>
              {syncLettresMortes.slice(0, 2).map((incident) => (
                <div key={incident.id} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                  <AlertCircle aria-hidden="true" style={{ width: 16, height: 16, color: "#C2410C", flexShrink: 0 }} />
                  <p style={{ flex: 1, fontSize: 12, lineHeight: 1.35, color: "#7C2D12", margin: 0 }}>
                    {resumeIncidentHorsLigne(incident)}
                  </p>
                  <button
                    onClick={async () => { await purgerEchecSync(incident.id); toast.success("Opération retirée après vérification."); }}
                    style={{ border: "1px solid #FDBA74", borderRadius: 10, background: "white", color: "#9A3412", fontSize: 12, fontWeight: 800, padding: "7px 9px", cursor: "pointer", flexShrink: 0 }}
                  >
                    Retirer
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* HERO */}
          <div className="relative flex flex-col items-center px-6 pt-4 pb-6"
            style={{ background: `linear-gradient(160deg,${P} 0%,${PD} 100%)` }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.35)", marginBottom: 12 }} />
            <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
              // w-11 (44px) : c'est le bouton qui FERME la vente vocale. Mesure a
              // 390x844 : 32x32, sous la regle des 44px.
              className="absolute top-3 right-4 w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.2)" }}>
              <X className="w-4 h-4 text-white" />
            </motion.button>

            {/* Bouton Tata Nanti Lou — photo pleine */}
            <div className="relative flex items-center justify-center mb-4" style={{ width: 150, height: 150 }}>
              {/* Anneaux pulse */}
              {(isRecording || isSpeaking) && [1, 2, 3].map((ring) => (
                <motion.div key={ring} className="absolute rounded-full"
                  style={{ width: 100 + ring * 20, height: 100 + ring * 20, border: `1.5px solid rgba(255,255,255,${0.35 / ring})` }}
                  animate={{ scale: [1, 1.15, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: ring * 0.25, ease: "easeOut" }} />
              ))}

              {/* Photo Tata Nanti Lou = bouton */}
              <motion.button whileTap={{ scale: 0.93 }} onClick={handleMicClick}
                onTouchStart={() => { try { const AC = window.AudioContext || (window as any).webkitAudioContext; const a = new AC(); if (a.state === "suspended") a.resume(); } catch (e) { void e; } }}
                disabled={isLoading}
                style={{
                  width: 112, height: 112, borderRadius: "50%",
                  overflow: "hidden", padding: 0, border: "none", cursor: isLoading ? "not-allowed" : "pointer",
                  boxShadow: isRecording
                    ? "0 0 0 4px #EF4444, 0 8px 28px rgba(0,0,0,0.3)"
                    : isSpeaking
                    ? `0 0 0 4px ${P}, 0 8px 28px rgba(0,0,0,0.3)`
                    : "0 0 0 3px rgba(255,255,255,0.6), 0 8px 28px rgba(0,0,0,0.25)",
                  position: "relative", zIndex: 2,
                }}
                animate={isRecording ? { scale: [1, 1.04, 1] } : isSpeaking ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                transition={{ duration: 0.9, repeat: (isRecording || isSpeaking) ? Infinity : 0 }}>
                {isLoading ? (
                  <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg,${P},${PD})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                      <Loader style={{ width: 40, height: 40, color: "white" }} />
                    </motion.div>
                  </div>
                ) : isDone ? (
                  <div style={{ width: "100%", height: "100%", position: "relative" }}>
                    <img src={tantieImg} alt="Tata Nanti Lou" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                    <div style={{ position: "absolute", inset: 0, background: "rgba(22,163,74,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <CheckCircle style={{ width: 40, height: 40, color: "white" }} />
                    </div>
                  </div>
                ) : isError ? (
                  <div style={{ width: "100%", height: "100%", position: "relative" }}>
                    <img src={tantieImg} alt="Tata Nanti Lou" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                    <div style={{ position: "absolute", inset: 0, background: "rgba(239,68,68,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <AlertCircle style={{ width: 40, height: 40, color: "white" }} />
                    </div>
                  </div>
                ) : (
                  <img src={tantieImg} alt="Tata Nanti Lou" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                )}
              </motion.button>

              {/* Badge micro : sans lui, la photo se lit comme un simple portrait — on ne
                  devine pas qu'il faut appuyer dessus pour parler (retour terrain). Icône
                  universelle, indépendante de la lecture. pointerEvents:none pour ne jamais
                  intercepter le tap destiné au bouton en dessous. */}
              {!isLoading && !isDone && !isError && (
                <div aria-hidden="true" style={{
                  position: "absolute", right: 4, bottom: 8, width: 34, height: 34, borderRadius: "50%",
                  background: P, border: "3px solid white", display: "flex", alignItems: "center", justifyContent: "center",
                  zIndex: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.3)", pointerEvents: "none",
                }}>
                  <Mic size={16} color="white" />
                </div>
              )}
            </div>

            <p style={{ color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", marginBottom: 10 }}>TATA NANTI LOU</p>

            {/* Waveform */}
            <div className="flex items-center justify-center gap-1 mb-3" style={{ height: 24 }}>
              {bars.map((bar, i) => (
                <motion.div key={i} style={{ width: 3, borderRadius: 6, background: `rgba(255,255,255,${bar.active ? 0.85 : 0.2})` }}
                  animate={{ height: bar.active ? [3, bar.height, 3] : [3, 3, 3] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: bar.delay, ease: "easeInOut" }} />
              ))}
            </div>

            {/* Retour terrain sans appel : « l'écran n'est pas pour quelqu'un qui sait
                lire ». Ce texte de statut redisait par écrit ce que le message vocal
                d'ouverture + le badge micro montrent déjà — masqué à l'accueil ; gardé
                pour les autres états où il y a une vraie info neuve (ex. transcription
                en direct pendant qu'elle parle, utile à qui peut la relire). */}
            {!isIdle && (
              <AnimatePresence mode="wait">
                <motion.p key={isRecording && liveTranscript ? liveTranscript : state}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  style={{ color: "rgba(255,255,255,0.92)", fontSize: 15, fontWeight: 700, textAlign: "center", margin: 0 }}>
                  {isRecording && liveTranscript ? `"${liveTranscript}"` : statusLabel}
                </motion.p>
              </AnimatePresence>
            )}

          </div>

          {/* CORPS BLANC */}
          <div className="px-5 py-5 flex flex-col gap-4">
            {/* Retour terrain sans appel : « l'écran n'est pas pour quelqu'un qui sait
                lire » — aucune phrase visible n'est admise ici. Le produit déjà choisi
                (fiche produit) se montre en PHOTO + un gros chiffre (le prix), jamais en
                étiquette à lire. Le nom reste en attribut d'accessibilité (aria-label),
                pas à l'écran. */}
            {isIdle && initialProduct && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                aria-label={`Produit sélectionné : ${initialProduct.nom}`}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, background: PL, border: `1.5px solid ${P}40`, borderRadius: 16, padding: "10px 14px" }}>
                {initialProduct.image && (
                  <ImageWithFallback src={initialProduct.image} alt={initialProduct.nom} fallbackSrc={vignetteProduit(initialProduct.nom)} style={{ width: 44, height: 44, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
                )}
                <span style={{ fontSize: 26, fontWeight: 900, color: P, fontVariantNumeric: "tabular-nums" }}>
                  {initialProduct.prix.toLocaleString("fr-FR")} F
                </span>
              </motion.div>
            )}
            {transcript && (<motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 16, padding: "12px 14px" }}><p style={{ fontSize: 10, fontWeight: 700, color: "var(--encre-4)", letterSpacing: "0.1em", marginBottom: 4 }}>TU AS DIT</p><p style={{ fontSize: 14, fontWeight: 600, color: "#1F2937" }}>"{transcript}"</p></motion.div>)}
            {response && !isLoading && (<motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ background: PL, border: `1.5px solid ${P}30`, borderRadius: 16, padding: "12px 14px" }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><span style={{ fontSize: 18 }}>{intentEmoji[response.intent] || "💬"}</span><p style={{ fontSize: 10, fontWeight: 700, color: P, letterSpacing: "0.1em" }}>{response.intent.replace(/_/g, " ").toUpperCase()}</p></div><p style={{ fontSize: 14, fontWeight: 600, color: "#1F2937" }}>{response.response || response.reponse}</p>{response.action?.type === "vendre" && response.action.montant && (<div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${P}25` }}><p style={{ fontSize: 13, color: "var(--encre-3)" }}>{response.action.quantite}× {response.action.produit} =&nbsp;<strong style={{ color: P }}>{response.action.montant?.toLocaleString("fr-FR")} FCFA</strong></p></div>)}</motion.div>)}
            {propositionProduit && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ background: "#F6F0E4", border: `2px solid ${P}`, borderRadius: 20, padding: 16 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#1F2937", marginBottom: 12 }}>
                  J'ajoute « {propositionProduit.nom} » à ta boutique à {propositionProduit.prix.toLocaleString("fr-FR")} F ?
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={refuserCreation} disabled={creationEnCours}
                    style={{ flex: 1, padding: "12px 0", borderRadius: 14, fontWeight: 700, fontSize: 14, border: `2px solid ${P}`, color: P, background: "white", cursor: "pointer" }}>
                    Non
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={accepterCreation} disabled={creationEnCours}
                    style={{ flex: 1, padding: "12px 0", borderRadius: 14, fontWeight: 700, fontSize: 14, color: "white", background: creationEnCours ? "#CBB9A8" : `linear-gradient(135deg,${P},${PD})`, cursor: creationEnCours ? "wait" : "pointer", border: "none" }}>
                    {creationEnCours ? "Un instant…" : "Oui, ajoute"}
                  </motion.button>
                </div>
              </motion.div>
            )}
            {isError && error && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 16, padding: "12px 14px" }}><p style={{ fontSize: 13, fontWeight: 600, color: "#B91C1C" }}>{error}</p></motion.div>)}
            {isConfirming && pendingResponse && (<motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ background: "#F6F0E4", border: `2px solid ${P}`, borderRadius: 20, padding: 16 }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><ShieldCheck style={{ width: 18, height: 18, color: P }} /><p style={{ fontSize: 12, fontWeight: 700, color: P }}>Confirmer l'action</p></div><p style={{ fontSize: 14, fontWeight: 600, color: "#1F2937", marginBottom: 12 }}>{pendingResponse.response || pendingResponse.reponse}</p>{pendingResponse.resume_action && (<p style={{ fontSize: 11, fontWeight: 700, color: "var(--encre-4)", letterSpacing: "0.1em", marginBottom: 12 }}>{pendingResponse.resume_action}</p>)}<div style={{ display: "flex", gap: 10 }}><motion.button whileTap={{ scale: 0.97 }} onClick={cancelAction} style={{ flex: 1, padding: "12px 0", borderRadius: 14, fontWeight: 700, fontSize: 14, border: `2px solid ${P}`, color: P, background: "white", cursor: "pointer" }}>Non</motion.button><motion.button whileTap={{ scale: 0.97 }} onClick={confirmAction} style={{ flex: 1, padding: "12px 0", borderRadius: 14, fontWeight: 700, fontSize: 14, color: "white", background: `linear-gradient(135deg,${P},${PD})`, cursor: "pointer", border: "none" }}>Oui, confirmer</motion.button></div></motion.div>)}
            {(isDone || isError) && (<motion.button whileTap={{ scale: 0.97 }} onClick={reset} style={{ width: "100%", padding: "14px 0", borderRadius: 16, fontWeight: 700, fontSize: 14, color: "white", background: `linear-gradient(135deg,${P},${PD})`, cursor: "pointer", border: "none" }}>Reparler à Tata Nanti Lou</motion.button>)}
            {/* Rangée d'icônes SEULES — aucun mot imprimé. Nom de l'action en aria-label
                pour l'accessibilité, jamais affiché. Les exemples écrits et le bandeau
                « la voix marche dans l'appli installée » ont été retirés : ce sont des
                PHRASES à lire, incompatibles avec cet écran (retour terrain direct). */}
            {isIdle && (() => {
              const nbItemsPanier = cart.reduce((s, i) => s + i.quantite, 0);
              const iconBtn = (key: string, label: string, icon: React.ReactNode, onClick: () => void, active = false, badge?: number) => (
                <motion.button key={key} whileTap={{ scale: 0.92 }} onClick={onClick} aria-label={label} title={label}
                  style={{ position: "relative", width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
                    border: `1.5px solid ${active ? P : "#EDE7DE"}`, background: active ? P : "white",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  {icon}
                  {badge != null && badge > 0 && (
                    <span aria-hidden="true" style={{ position: "absolute", top: -4, right: -4, minWidth: 20, height: 20, padding: "0 4px", borderRadius: 10,
                      background: "#0E7A47", color: "white", fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white" }}>
                      {badge}
                    </span>
                  )}
                </motion.button>
              );
              return (
                <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
                  {iconBtn(
                    "reecouter",
                    dernierePhraseRef.current ? "Réécouter ce que j'ai compris" : "Réécouter l'explication",
                    <Volume2 size={22} color={P} />,
                    () => speak(dernierePhraseRef.current || introLigne()),
                  )}
                  {iconBtn("saisir", "Saisir sans parler", <Keyboard size={22} color={saisieOuverte ? "white" : P} />, () => setSaisieOuverte(v => !v), saisieOuverte)}
                  {iconBtn("caisse", "Caisse complète", <ShoppingBasket size={22} color={nbItemsPanier > 0 ? "#0E7A47" : P} />, () => { navigate('/marchand/caisse'); onClose(); }, false, nbItemsPanier)}
                </div>
              );
            })()}
            {isIdle && saisieOuverte && (
              <SaisieGuidee
                onValider={ajouterLigneAuPanier}
                apparier={(nom) => {
                  const p = apparierProduit(nom, products);
                  return p ? { produitId: p.id, nomCatalogue: p.nom, prixCatalogue: p.prix ?? null, unite: p.unite || 'unité' } : null;
                }}
                initialProduit={initialProduct?.nom}
                initialPrix={initialProduct?.prix}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
