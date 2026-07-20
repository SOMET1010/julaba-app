import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, MessageCircle, Mic, Keyboard, Headphones,
  Loader2, Brain, Volume2, CheckCircle2, AlertTriangle,
  Send, ArrowRight, RotateCcw, MicOff, History, ShieldCheck
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useLangPref } from '../../hooks/useLangPref';
import { useCaisse } from '../../contexts/CaisseContext';
import { useStock } from '../../contexts/StockContext';
import { useNavigate } from 'react-router';
import { useVoiceCore, type VoiceState as VoiceStep } from '../../hooks/useVoiceCore';
import { useObjectif } from '../../contexts/ObjectifContext';
import { stopAllAudio, stopChunkedSpeaking, preloadAudioContext } from '../../services/elevenlabs';
import { unlockAudioContextIOS } from '../../services/earlyAudioCache';
import { apiRequest } from '../../../imports/api-client';
import { API_URL } from '../../utils/api';
import tataLouImg from "../../../assets/images/tantie-portrait.png";
import tantieVenteImg from "../../../assets/images/tantie-vente-vocale.png";

interface TantieSagesseModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: 'marchand' | 'producteur' | 'cooperative' | 'cooperateur' | 'institution' | 'identificateur' | 'administrateur';
}

const ROLE_COLORS: Record<string, string> = {
  marchand: '#C46210', producteur: '#00563B', cooperative: '#2072AF',
  institution: '#702963', identificateur: '#9F8170',
};

const ROLE_SUGGESTIONS: Record<string, string[]> = {
  marchand: ["Aujourd'hui j'ai fait combien ?", "Je veux mettre un peu de cote", "Quelle est ma meilleure vente ?", "Voir mon stock"],
  producteur: ["Ma recolte vaut combien ?", "Declarer ma recolte de cacao", "Quel est mon meilleur produit ?", "Créer une plantation agricole"],
  cooperative: ["Combien de membres actifs ?", "Notre tresorerie est a combien ?", "Faire un achat groupe", "Qui n'a pas paye sa cotisation ?"],
  cooperateur: ["Combien de membres actifs ?", "Notre tresorerie est a combien ?", "Faire un achat groupe", "Qui n'a pas paye sa cotisation ?"],
  institution: ["Combien d'utilisateurs actifs ?", "Volume total des transactions ?", "Valider un compte", "Generer un rapport"],
  administrateur: ["Combien d'utilisateurs actifs ?", "Volume total des transactions ?", "Valider un compte", "Generer un rapport"],
  identificateur: ["Identifier un acteur", "Combien d'identifications ce mois ?", "Valider un dossier", "Rechercher un producteur"],
};

const STEP_CONFIG: Record<VoiceStep, { label: string; icon: React.ReactNode; color: string }> = {
  idle:         { label: '',                      icon: null,                                              color: '' },
  listening:  { label: "Je t'ecoute...",         icon: <Mic className="w-5 h-5" />,                      color: '#EF4444' },
  processing: { label: 'Je traite...',   icon: <Loader2 className="w-5 h-5 animate-spin" />,     color: '#F59E0B' },
  thinking:     { label: 'Tata Lou réfléchit...',    icon: <Brain className="w-5 h-5" />,                    color: '#8B5CF6' },
  speaking:     { label: 'Tata Lou te parle...',     icon: <Volume2 className="w-5 h-5 animate-pulse" />,    color: '#10B981' },
  confirming:   { label: 'Confirme l action...',    icon: <Volume2 className="w-5 h-5" />,                  color: '#F59E0B' },

  error:        { label: 'Aie, un souci...',       icon: <AlertTriangle className="w-5 h-5" />,            color: '#EF4444' },
};

function TantieSagesseVoice({ onClose, role }: Pick<TantieSagesseModalProps, 'onClose' | 'role'>) {
  const { user, currentSession, getTodayStats, openDay, closeDay } = useApp();
  const { lang: selectedLang } = useLangPref();
  const { enregistrerVente, refreshTransactions } = useCaisse();
  const stockCtx = useStock();
  const objectifCtx = useObjectif();
  const objectif = objectifCtx?.objectif ?? 0;
  const progression = objectifCtx?.progression ?? 0;
  const topStocks = (stockCtx.stocks || []).slice(0,3).map((s:any) => `${s.name}:${s.quantity}${s.unit}`).join(', ');
  const stats = getTodayStats ? getTodayStats() : { caisse: 0, ventes: 0, depenses: 0 };
  const navigate = useNavigate();
  const [mode, setMode] = useState<'ecrire' | 'parler'>('parler');
  const [inputValue, setInputValue] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const activeColor = ROLE_COLORS[role] || ROLE_COLORS.marchand;
  const suggestions = ROLE_SUGGESTIONS[role] || ROLE_SUGGESTIONS.marchand;

  const {
    state: step, response: result, transcript, error, recordingTime, history,
    startRecording, stopRecording, reset, resetHistory, handleMicClick, sendText,
    confirmAction, cancelAction, pendingResponse, isSpeaking,
  } = useVoiceCore({
    context: {
      prenom: user?.firstName || user?.prenoms || 'ma chere',
      genre: user?.genre || (user as any)?.sex || 'femme',
      userId: user?.id || '',
      lang: selectedLang,
      module: role,
      caisse: (stats as any).caisse || 0,
      ventes: (stats as any).ventes || 0,
      depenses: (stats as any).depenses || 0,
      sessionOpen: !!(currentSession?.opened),
      nombreVentes: (stats as any).nombreVentes || 0,
      topStocks: topStocks || '',
    } as any,
    onAction: async (data) => {
      const action = data.action;
      if (!action) {
        return;
      }
      try {
        if (action.type === 'vendre' && action.montant) {
          await enregistrerVente(
            action.montant,
            [{ nom: action.produit || 'Produit', quantite: action.quantite || 1, prix_unitaire: Math.round(action.montant / (action.quantite || 1)) }],
            'cash', 'Vente ' + (action.produit || 'vocale')
          );
          try { await refreshTransactions(); } catch (e) { void e; }
        } else if ((action.type === 'depense' || (action.montant && !action.type)) && action.montant) {
          await apiRequest(API_URL, '/caisse/depense', {
            method: 'POST',
            body: JSON.stringify({
              montant: action.montant,
              description: action.description || 'Dépense vocale',
            }),
          });
          try { await refreshTransactions(); } catch (e) { void e; }
        } else if (action.type === 'ajouter_stock' && action.produit && action.quantite) {
          const stocks = stockCtx.stocks || [];
          const found = stocks.find((s: any) =>
            s.name?.toLowerCase().includes((action.produit ?? '').toLowerCase()) ||
            s.nom?.toLowerCase().includes((action.produit ?? '').toLowerCase())
          );
          if (found) {
            const newQty = (found.quantite || 0) + Number(action.quantite);
            stockCtx.updateStock(found.id, { quantite: newQty });
          }
        } else if (action.type === 'ouvrir_journee') {
          const montant = action.montant || 0;
          await openDay(montant);
        } else if (action.type === 'fermer_journee') {
          await closeDay(action.montant || 0);
        } else if (action.type === 'marche' || action.type === 'voir_marche') {
          onClose();
          navigate('/' + role + '/marche');
        } else if (action.type === 'commandes') {
          onClose();
          navigate('/' + role + '/commandes');
        } else if (action.type === 'navigate' && action.path) {
          onClose();
          navigate(action.path);
        }
      } catch (e) {
        void e;
      }
    },
    onNavigate: (path) => {
      onClose();
      navigate(path);
    },
  });

  useEffect(() => {
    return () => {
      stopAllAudio();
      stopChunkedSpeaking();
    };
  }, []);

  const handleTextSubmit = useCallback(async () => {
    if (!inputValue.trim()) return;
    const text = inputValue.trim();
    setInputValue('');
    await sendText(text);
  }, [inputValue, sendText]);

  const handleSuggestionClick = useCallback(async (suggestion: string) => {
    setInputValue(suggestion);
    await sendText(suggestion);
  }, [sendText]);

  const isProcessing = !['idle', 'error'].includes(step);

  return (
        <motion.div
          className="fixed inset-0 z-[200]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div
            className="relative w-full h-full max-w-2xl mx-auto flex flex-col overflow-hidden"
            style={{ background: `linear-gradient(180deg, ${activeColor}F5 0%, ${activeColor}E0 50%, ${activeColor}CC 100%)` }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cercles décoratifs */}
            <div className="absolute inset-0 flex items-start justify-center pt-24 pointer-events-none">
              <motion.div className="absolute rounded-full border-2 border-white/20" style={{ width: '380px', height: '380px' }}
                animate={{ scale: step === 'listening' ? [1, 1.15, 1] : [1, 1.05, 1], opacity: step === 'listening' ? [0.4, 0.7, 0.4] : [0.3, 0.5, 0.3] }}
                transition={{ duration: step === 'listening' ? 1.2 : 4, repeat: Infinity, ease: 'easeInOut' }} />
              <motion.div className="absolute rounded-full border-2 border-white/15" style={{ width: '500px', height: '500px' }}
                animate={{ scale: step === 'listening' ? [1, 1.12, 1] : [1, 1.05, 1], opacity: step === 'listening' ? [0.3, 0.6, 0.3] : [0.2, 0.4, 0.2] }}
                transition={{ duration: step === 'listening' ? 1.5 : 5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }} />
            </div>

            {/* Bouton Fermer */}
            <motion.button onClick={() => { resetHistory(); onClose(); }}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center z-20 hover:bg-white/30"
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <X className="w-5 h-5 text-white" strokeWidth={2.5} />
            </motion.button>

            {/* Section haute — Avatar + Badge */}
            <div className="relative z-10 flex flex-col items-center pt-14 px-6">
              <div className="relative">
                {step !== 'idle' && (
                  <motion.div className="absolute -inset-4 rounded-full"
                    style={{ border: `3px solid ${STEP_CONFIG[step].color}`, opacity: 0.6 }}
                    animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }} />
                )}
                <motion.img src={tataLouImg} alt="Tata Lou" className="w-36 h-auto object-contain drop-shadow-2xl"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: step === 'speaking' ? [1, 1.04, 1] : step === 'listening' ? [1, 1.02, 1] : 1,
                    opacity: 1,
                    y: step === 'speaking' ? [0, -6, 0] : step === 'thinking' ? [0, -2, 0] : 0,
                    filter: step === 'speaking'
                      ? ['brightness(1)', 'brightness(1.15)', 'brightness(1)']
                      : 'brightness(1)',
                  }}
                  transition={
                    step === 'speaking' ? { duration: 0.5, repeat: Infinity, ease: 'easeInOut' }
                    : step === 'thinking' ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
                    : { delay: 0.2, type: 'spring', stiffness: 200 }
                  } />
              </div>

              {/* Particules émotionnelles pendant la parole */}
              {step === 'speaking' && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  {[0,1,2,3,4,5].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 rounded-full"
                      style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}
                      animate={{
                        x: [0, Math.cos(i * Math.PI * 2 / 6) * 80],
                        y: [0, Math.sin(i * Math.PI * 2 / 6) * 80],
                        opacity: [0, 0.8, 0],
                        scale: [0, 1.2, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.18,
                        ease: 'easeOut',
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Ondes sonores pendant la parole */}
              {step === 'speaking' && (
                <div className="flex items-center justify-center gap-1 mt-2">
                  {[0,1,2,3,4].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1 rounded-full bg-white/60"
                      animate={{ height: [6, 20 + i * 4, 6], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.08, ease: 'easeInOut' }}
                    />
                  ))}
                </div>
              )}

              <AnimatePresence mode="wait">
                {step !== 'idle' ? (
                  <motion.div key={step} className="mt-3 mb-2 px-5 py-2.5 rounded-full backdrop-blur-sm flex items-center gap-2.5"
                    style={{ backgroundColor: `${STEP_CONFIG[step].color}30`, border: `1.5px solid ${STEP_CONFIG[step].color}60` }}
                    initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.9 }}>
                    <span style={{ color: STEP_CONFIG[step].color }}>{STEP_CONFIG[step].icon}</span>
                    <span className="text-white font-semibold text-sm">{STEP_CONFIG[step].label}</span>
                  </motion.div>
                ) : (
                  <motion.div key="idle" className="mt-3 mb-2 px-5 py-2 rounded-full bg-white/20 backdrop-blur-sm"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-white" />
                      <span className="text-white font-medium text-sm">Tu peux dire:</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => { reset(); onClose(); navigate(`/${role}/support`); }}
                className="mb-3 flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/90 backdrop-blur-sm shadow-md"
                style={{ color: activeColor }}>
                <Headphones className="w-4 h-4" />
                <span className="text-sm font-bold" style={{ fontFamily: 'Calisga, serif' }}>Support & Aide Jùlaba</span>
              </motion.button>
            </div>

            {/* Section milieu — Résultats / Suggestions */}
            <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-2">

              {/* Transcription */}
              <AnimatePresence>
                {transcript && (
                  <motion.div className="mb-3 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-lg"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <p className="text-xs font-medium text-gray-400 mb-1">Ce que tu as dit :</p>
                    <p className="text-sm font-semibold text-gray-800">"{transcript}"</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Réponse */}
              <AnimatePresence>
                {result?.reponse && step !== 'thinking' && (
                  <motion.div className="mb-3 rounded-2xl p-4 shadow-lg border-2"
                    style={{ backgroundColor: `${activeColor}15`, borderColor: `${activeColor}40` }}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}>
                    <p className="text-xs font-medium mb-1" style={{ color: activeColor }}>Tata Lou :</p>
                    <p className="text-sm font-semibold text-gray-800 leading-relaxed">{result.reponse}</p>
                    {result.intent && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: activeColor }}>
                          {result.intent.replace(/_/g, ' ')}
                        </span>
                      </div>
                    )}
                    {result.navigate && step === 'idle' && (
                      <motion.button className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-white text-sm font-bold shadow-lg"
                        style={{ backgroundColor: activeColor }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => { reset(); onClose(); navigate(result.navigate!); }}>
                        <ArrowRight className="w-4 h-4" />Y aller maintenant
                      </motion.button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Erreur */}
              <AnimatePresence>
                {step === 'error' && (
                  <motion.div className="mb-3 bg-red-50 border-2 border-red-200 rounded-2xl p-4 shadow-lg"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-700">{error}</p>
                        <motion.button className="mt-2 flex items-center gap-1.5 text-xs font-bold text-red-600" onClick={reset} whileTap={{ scale: 0.95 }}>
                          <RotateCcw className="w-3.5 h-3.5" />Reessayer
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Historique vocal — 5 derniers échanges */}
              {showHistory && history.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="mb-4 rounded-2xl overflow-hidden border border-white/20"
                >
                  <div className="px-4 py-2 bg-white/10 flex items-center justify-between">
                    <p className="text-white/80 text-xs font-bold uppercase tracking-widest">
                      Historique ({Math.floor(history.length / 2)} échanges)
                    </p>
                    <button onClick={() => setShowHistory(false)} className="text-white/50 hover:text-white text-xs">✕</button>
                  </div>
                  <div className="max-h-48 overflow-y-auto px-3 py-2 space-y-2">
                    {history.slice(-10).map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs font-medium`}
                          style={{
                            background: msg.role === 'user'
                              ? 'rgba(255,255,255,0.25)'
                              : `${activeColor}40`,
                            color: 'white',
                          }}
                        >
                          {msg.role === 'assistant' && (
                            <span className="text-white/50 text-[10px] block mb-1">Tata Lou</span>
                          )}
                          {msg.content}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Suggestions */}
              {(step === 'idle') && (
                <div className="grid grid-cols-2 gap-3">
                  {suggestions.map((suggestion, index) => (
                    <motion.button key={suggestion} onClick={() => handleSuggestionClick(suggestion)} disabled={isProcessing}
                      className="relative bg-white/90 backdrop-blur-md rounded-3xl p-4 shadow-lg text-left group overflow-hidden disabled:opacity-50"
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + index * 0.08, type: 'spring', stiffness: 300, damping: 20 }}
                      whileHover={{ scale: 1.04, y: -3 }} whileTap={{ scale: 0.97 }}>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      <p className="text-sm font-semibold leading-snug" style={{ color: activeColor }}>{suggestion}</p>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Mode Ecrire */}
              {mode === 'ecrire' && step === 'idle' && (
                <motion.div className="mt-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="bg-white rounded-2xl p-3 shadow-lg flex items-center gap-3">
                    <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                      placeholder="Ecris ta question ici..."
                      className="flex-1 outline-none text-gray-700 placeholder:text-gray-400 text-sm bg-transparent"
                      disabled={isProcessing} />
                    <motion.button onClick={handleTextSubmit} disabled={!inputValue.trim() || isProcessing}
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                      style={{ backgroundColor: activeColor }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Send className="w-4 h-4 text-white" />
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Confirmation */}
            {step === 'confirming' && pendingResponse && (
              <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="mx-6 mb-3 rounded-2xl p-4 border-2" style={{background:'rgba(255,255,255,0.95)',borderColor:activeColor}}>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck style={{width:18,height:18,color:activeColor}} />
                  <p className="text-xs font-bold" style={{color:activeColor}}>Confirmer</p>
                </div>
                <p className="text-sm font-semibold text-gray-800 mb-3">{pendingResponse.response || pendingResponse.reponse}</p>
                {pendingResponse.resume_action && <p className="text-xs font-bold text-gray-400 mb-3">{pendingResponse.resume_action}</p>}
                <div className="flex gap-3">
                  <button onClick={cancelAction} style={{flex:1,padding:'10px 0',borderRadius:12,fontWeight:700,fontSize:14,border:`2px solid ${activeColor}`,color:activeColor,background:'white',cursor:'pointer'}}>Non</button>
                  <button onClick={confirmAction} style={{flex:1,padding:'10px 0',borderRadius:12,fontWeight:700,fontSize:14,color:'white',background:activeColor,cursor:'pointer',border:'none'}}>Oui</button>
                </div>
              </motion.div>
            )}

            {/* Section bas — Micro + boutons mode */}
            <div className="relative z-10 px-6 pb-8 pt-2 flex flex-col items-center gap-4">
              {mode === 'parler' && (
                <motion.div className="flex flex-col items-center"
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 250 }}>
                  <div className="relative">
                    {step === 'listening' && (
                      <>
                        <motion.div className="absolute inset-0 rounded-full bg-red-400/40" animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 1, repeat: Infinity }} />
                        <motion.div className="absolute inset-0 rounded-full bg-red-400/25" animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0.15 }} />
                        <motion.div className="absolute inset-0 rounded-full bg-red-400/15" animate={{ scale: [1, 2.1, 1], opacity: [0.3, 0, 0.3] }} transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }} />
                      </>
                    )}
                    {isProcessing && (
                      <motion.div className="absolute -inset-3 rounded-full"
                        style={{ border: `2px solid ${STEP_CONFIG[step].color}` }}
                        animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} />
                    )}
                    <motion.button
                      onClick={() => { stopAllAudio(); stopChunkedSpeaking(); handleMicClick(); }}
                      onTouchStart={() => { try { unlockAudioContextIOS(); preloadAudioContext(); } catch(e) {} }}
                      className="relative w-20 h-20 rounded-full shadow-2xl overflow-hidden"
                      style={{ border: `3px solid ${step === 'listening' ? '#EF4444' : isSpeaking ? activeColor : 'rgba(255,255,255,0.6)'}`, padding: 0 }}
                      whileTap={{ scale: 0.92 }}
                      animate={step === 'listening' ? { scale: [1, 1.06, 1] } : isSpeaking ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                      transition={(step === 'listening' || isSpeaking) ? { duration: 0.8, repeat: Infinity } : {}}>
                      {isProcessing && step !== 'listening' && step !== 'speaking'
                        ? <div style={{width:'100%',height:'100%',background:activeColor,display:'flex',alignItems:'center',justifyContent:'center'}}><Loader2 className="w-9 h-9 text-white animate-spin" strokeWidth={2.5} /></div>
                        : <img src={tantieVenteImg} alt="Tata Lou" style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top'}} />
                      }
                    </motion.button>
                  </div>
                  <motion.p className="mt-2 text-white/90 text-xs font-medium text-center"
                    animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2, repeat: Infinity }}>
                    {step === 'listening' ? "Appuie pour terminer" : isSpeaking ? "Appuie pour interrompre" : isProcessing ? STEP_CONFIG[step].label : "Appuie sur Tata Lou"}
                  </motion.p>
                </motion.div>
              )}

              <div className="flex gap-3 w-full">
                {history.length > 0 && (
                  <motion.button
                    onClick={() => setShowHistory(h => !h)}
                    className={`px-4 py-3.5 rounded-full font-semibold text-sm flex items-center justify-center gap-1.5 transition-all ${showHistory ? 'bg-white shadow-lg' : 'bg-white/20 backdrop-blur-sm text-white border border-white/30'}`}
                    style={showHistory ? { color: activeColor } : {}}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <History className="w-4 h-4" />
                    <span className="text-xs">{Math.floor(history.length / 2)}</span>
                  </motion.button>
                )}
                <motion.button onClick={() => { setMode('ecrire'); reset(); }}
                  className={`flex-1 px-5 py-3.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all ${mode === 'ecrire' ? 'bg-white shadow-lg' : 'bg-white/20 backdrop-blur-sm text-white border border-white/30'}`}
                  style={mode === 'ecrire' ? { color: activeColor } : {}}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Keyboard className="w-5 h-5" />Ecrire
                </motion.button>
                <motion.button onClick={() => setMode('parler')}
                  className={`flex-1 px-5 py-3.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all ${mode === 'parler' ? 'bg-white shadow-lg' : 'bg-white/20 backdrop-blur-sm text-white border border-white/30'}`}
                  style={mode === 'parler' ? { color: activeColor } : {}}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Mic className="w-5 h-5" />Parler
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
  );
}

export function TantieSagesseModal({ isOpen, onClose, role }: TantieSagesseModalProps) {
  return (
    <AnimatePresence>
      {isOpen && <TantieSagesseVoice onClose={onClose} role={role} />}
    </AnimatePresence>
  );
}
