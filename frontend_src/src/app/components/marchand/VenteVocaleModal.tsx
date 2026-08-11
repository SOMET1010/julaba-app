import React, { useEffect, useState, useCallback } from "react";
import { useLangPref } from "../../hooks/useLangPref";
import { useVoiceCore } from "../../hooks/useVoiceCore";
import { usePredictiveTTS } from "../../services/predictiveTTS";
import { motion, AnimatePresence } from "motion/react";
import { X, Loader, CheckCircle, AlertCircle, ShieldCheck, WifiOff, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";
import { useApp } from "../../contexts/AppContext";
import { useRaccourcis } from "../../contexts/RaccourcisContext";
import { useCaisse } from "../../contexts/CaisseContext";
import { useObjectif, ObjectifProvider } from "../../contexts/ObjectifContext";
import { useStock, type StockItem } from "../../contexts/StockContext";
import { InstallerOffline } from "../../voice-offline/InstallerOffline";
import { apparierProduit, construireLigneVocale, doitProposerCreation, noterRefusCreation } from "../../services/venteVocale";
import { guidageVocal } from "../../utils/accessMode";
import { vibrerSucces } from "../../utils/haptique";
import tantieImg from "../../../assets/images/tantie-vente-vocale.png";

const P = "#C66A2C";
const PD = "#A0541F";
const PL = "#F5E6D8";

interface Props { isOpen: boolean; onClose: () => void; }

export function VenteVocaleModal({ isOpen, onClose }: Props) {
  const { lang: selectedLang } = useLangPref();
  const navigate = useNavigate();
  const { user, currentSession, getTodayStats, setIsModalOpen, speak } = useApp();
  const { enregistrerVente, enregistrerDepense, refreshTransactions, stats: caisseStats, products, updateProduct, addProduct } = useCaisse();
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
  useEffect(() => {
    const on = () => setIsOnline(true); const off = () => setIsOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const { state, response, pendingResponse, transcript, liveTranscript, error, volume,
    handleMicClick, reset, resetHistory, confirmAction, cancelAction, isSpeaking, sendText,
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
    // Vente vocale UNIFIÉE avec le panier (Phase 5, lot 1) : le produit dicté est
    // apparié au catalogue → la ligne porte productId, total (source de vérité)
    // et prix d'achat unitaire (marge réelle), et le stock est décrémenté comme
    // à la caisse. Sans appariement, la vente passe quand même (ligne libre).
    onAction: async (data) => {
      const vendreUnifie = async (nomParle: string | undefined, quantite: number, montant: number, note: string) => {
        const produitCat = apparierProduit(nomParle || "", products);
        const ligne = construireLigneVocale({ nomParle, quantite, montant, produit: produitCat });
        await enregistrerVente(montant, [ligne], "cash", note);
        if (produitCat) {
          // Décrément optimiste, comme POSCaisse. S'il échoue (hors-ligne…), la
          // vente reste enregistrée ; le stock se resynchronisera au rechargement.
          try { await updateProduct(produitCat.id, { stock: Math.max(0, (produitCat.stock || 0) - quantite) }); }
          catch (e: any) { console.warn("[VenteVocaleModal] décrément stock impossible:", e?.message); }
        } else {
          // Produit inconnu : proposer de l'ajouter à la boutique (en ligne
          // seulement — la création parle au serveur). La question arrive APRÈS
          // la confirmation parlée de la vente, pour ne pas parler par-dessus.
          try {
            if (navigator.onLine !== false && doitProposerCreation(window.localStorage, nomParle, products)) {
              const nomPropre = (nomParle || '').trim();
              setTimeout(() => {
                setPropositionProduit({ nom: nomPropre, prix: ligne.prix });
                if (guidageVocal()) speak(`Je ne connais pas ${nomPropre} dans ta boutique. Je l'ajoute ?`);
              }, 2200);
            }
          } catch { /* jamais bloquant */ }
        }
      };
      const action = data.action;
      if (action?.type === "vendre") {
        // #4 : ne plus abandonner en silence (Tata Nanti Lou disait « c'est enregistré »
        // alors que rien n'était sauvé). On remonte une erreur explicite.
        if (!currentSession?.opened) throw new Error("Ouvre ta journée d'abord pour enregistrer une vente.");
        const montant = action.montant || 0;
        const quantite = action.quantite || 1;
        if (!montant || montant <= 0 || isNaN(montant)) return;
        await vendreUnifie(action.produit, quantite, montant, "Vente " + (action.produit || "vocale"));
      } else if (action?.type === "utiliser_raccourci") {
        const r = matchRaccourci ? matchRaccourci(action.declencheur || data.transcript || "") : null;
        if (r?.action?.type === "vendre") {
          if (!currentSession?.opened) throw new Error("Ouvre ta journée d'abord pour enregistrer une vente.");
          const montant = r.action.montant || 0;
          const quantite = r.action.quantite || 1;
          if (!montant || montant <= 0 || isNaN(montant)) return;
          await vendreUnifie(r.action.produit, quantite, montant, r.nom);
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

  usePredictiveTTS({ module: "caisse", sessionOpen: !!(currentSession?.opened), hasVentes: (stats.ventes || 0) > 0, prenom: user?.prenoms || "ma chere", recentIntents: response ? [response.intent] : [] });
  // #2 : pendingCount/isReplaying viennent de l'UNIQUE file de useVoiceCore
  // (plus de seconde instance qui rejouait la file en double à la reconnexion).
  useEffect(() => { if (!isOpen) resetHistory(); }, [isOpen, resetHistory]);
  useEffect(() => { if (!isOpen) setPropositionProduit(null); }, [isOpen]);

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
  const examples = [
    { text: "J'ai vendu 3 tomates à 500 F", desc: "Enregistrer une vente", highlight: true },
    { text: "Combien j'ai fait ?", desc: "Consulter le solde", highlight: false },
    { text: "Ajoute 10 piments au stock", desc: "Mettre à jour l'inventaire", highlight: false },
    { text: "Ouvre ma journée", desc: "Démarrer la caisse", highlight: false },
  ];
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

          {/* HERO */}
          <div className="relative flex flex-col items-center px-6 pt-4 pb-6"
            style={{ background: `linear-gradient(160deg,${P} 0%,${PD} 100%)` }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.35)", marginBottom: 12 }} />
            <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
              className="absolute top-3 right-4 w-8 h-8 rounded-full flex items-center justify-center"
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

            <AnimatePresence mode="wait">
              <motion.p key={isRecording && liveTranscript ? liveTranscript : state}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                style={{ color: "rgba(255,255,255,0.92)", fontSize: 15, fontWeight: 700, textAlign: "center", margin: 0 }}>
                {isRecording && liveTranscript ? `"${liveTranscript}"` : statusLabel}
              </motion.p>
            </AnimatePresence>

          </div>

          {/* CORPS BLANC */}
          <div className="px-5 py-5 flex flex-col gap-4">
            {transcript && (<motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 16, padding: "12px 14px" }}><p style={{ fontSize: 10, fontWeight: 700, color: "var(--encre-4)", letterSpacing: "0.1em", marginBottom: 4 }}>TU AS DIT</p><p style={{ fontSize: 14, fontWeight: 600, color: "#1F2937" }}>"{transcript}"</p></motion.div>)}
            {response && !isLoading && (<motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ background: PL, border: `1.5px solid ${P}30`, borderRadius: 16, padding: "12px 14px" }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><span style={{ fontSize: 18 }}>{intentEmoji[response.intent] || "💬"}</span><p style={{ fontSize: 10, fontWeight: 700, color: P, letterSpacing: "0.1em" }}>{response.intent.replace(/_/g, " ").toUpperCase()}</p></div><p style={{ fontSize: 14, fontWeight: 600, color: "#1F2937" }}>{response.response || response.reponse}</p>{response.action?.type === "vendre" && response.action.montant && (<div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${P}25` }}><p style={{ fontSize: 13, color: "var(--encre-3)" }}>{response.action.quantite}× {response.action.produit} =&nbsp;<strong style={{ color: P }}>{response.action.montant?.toLocaleString("fr-FR")} FCFA</strong></p></div>)}</motion.div>)}
            {propositionProduit && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ background: "#FFF8F0", border: `2px solid ${P}`, borderRadius: 20, padding: 16 }}>
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
            {isConfirming && pendingResponse && (<motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ background: "#FFF8F0", border: `2px solid ${P}`, borderRadius: 20, padding: 16 }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><ShieldCheck style={{ width: 18, height: 18, color: P }} /><p style={{ fontSize: 12, fontWeight: 700, color: P }}>Confirmer l'action</p></div><p style={{ fontSize: 14, fontWeight: 600, color: "#1F2937", marginBottom: 12 }}>{pendingResponse.response || pendingResponse.reponse}</p>{pendingResponse.resume_action && (<p style={{ fontSize: 11, fontWeight: 700, color: "var(--encre-4)", letterSpacing: "0.1em", marginBottom: 12 }}>{pendingResponse.resume_action}</p>)}<div style={{ display: "flex", gap: 10 }}><motion.button whileTap={{ scale: 0.97 }} onClick={cancelAction} style={{ flex: 1, padding: "12px 0", borderRadius: 14, fontWeight: 700, fontSize: 14, border: `2px solid ${P}`, color: P, background: "white", cursor: "pointer" }}>Non</motion.button><motion.button whileTap={{ scale: 0.97 }} onClick={confirmAction} style={{ flex: 1, padding: "12px 0", borderRadius: 14, fontWeight: 700, fontSize: 14, color: "white", background: `linear-gradient(135deg,${P},${PD})`, cursor: "pointer", border: "none" }}>Oui, confirmer</motion.button></div></motion.div>)}
            {(isDone || isError) && (<motion.button whileTap={{ scale: 0.97 }} onClick={reset} style={{ width: "100%", padding: "14px 0", borderRadius: 16, fontWeight: 700, fontSize: 14, color: "white", background: `linear-gradient(135deg,${P},${PD})`, cursor: "pointer", border: "none" }}>Reparler à Tata Nanti Lou</motion.button>)}
            {isIdle && (<div><p style={{ fontSize: 10, fontWeight: 700, color: "#C5C5C5", letterSpacing: "0.1em", marginBottom: 10 }}>CE QUE TU PEUX DIRE</p><div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{examples.map((ex, i) => (<motion.button key={i} whileTap={{ scale: 0.97 }} onClick={() => sendText(ex.text)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderRadius: 14, cursor: "pointer", background: ex.highlight ? "#FFF3EB" : "#F8F8F8", border: ex.highlight ? "1px solid #FDDEC4" : "1px solid #F0F0F0", textAlign: "left", width: "100%" }}><div style={{ flex: 1 }}><p style={{ fontSize: 15, fontWeight: 700, color: ex.highlight ? "#6B2400" : "#111", margin: 0 }}>{ex.text}</p><p style={{ fontSize: 12, color: ex.highlight ? "#C4703A" : "#999", margin: "3px 0 0" }}>{ex.desc}</p></div><ChevronRight style={{ color: ex.highlight ? "#C4703A" : "#D0D0D0", width: 16, height: 16, flexShrink: 0 }} /></motion.button>))}</div></div>)}
            {isIdle && (<div style={{ marginTop: 4 }}><InstallerOffline /></div>)}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}