import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Delete } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useCaisse } from '../../contexts/CaisseContext';
import { useVoiceCore } from '../../hooks/useVoiceCore';
import { SubPageLayout } from '../layout/SubPageLayout';
import { TATA_LOU_BLEU as TATA_BLEU, DEPENSE_IMG } from '../../assets/cloudinary-images';

const P = '#AF5B23';
const BG = '#FFF2E9';

const QUICK_ACTIONS = [
  { id:'transport',   label:'Transports',  img: DEPENSE_IMG.transport },
  { id:'repas',       label:'Nourritures', img: DEPENSE_IMG.nourriture },
  { id:'taxe_mairie', label:'Taxe mairie', img: DEPENSE_IMG.taxe_mairie },
];

const OTHER_CATS = [
  'Loyer', 'Famille', 'Tontine', 'Santé',
  'Téléphone', 'Marchandise', 'École', 'Autre',
];

function getVocalHint(): string {
  const h = new Date().getHours();
  if (h >= 5  && h < 10) return '"Petit déjeuner 500 francs"';
  if (h >= 10 && h < 12) return '"Transport marché 300 francs"';
  if (h >= 12 && h < 14) return '"Repas midi 1 500 francs"';
  if (h >= 14 && h < 17) return '"Taxe mairie 2 000 francs"';
  if (h >= 17 && h < 20) return '"Transport retour 500 francs"';
  return '"Dépense famille 3 000 francs"';
}

export function DepenseForm() {
  const navigate = useNavigate();
  const { speak, reloadTransactions, user } = useApp();
  const { enregistrerDepense, transactions } = useCaisse();
  const [step, setStep]               = useState<1|2>(1);
  const [description, setDescription] = useState('');
  const [montant, setMontant]         = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  // Verrou SYNCHRONE anti double-clic (l'état React ne bloque qu'au render suivant).
  const enregEnCoursRef = useRef(false);
  const [showOthers, setShowOthers]   = useState(false);
  const vocalHint = useMemo(() => getVocalHint(), []);

  const { startRecording, stopRecording, isListening, confirmAction, cancelAction, pendingResponse, state: voiceState } = useVoiceCore({
    context: { module: 'depense', prenom: user?.firstName || 'ma chère', genre: (user as any)?.genre || 'femme', userId: user?.id },
    onAction: async (data) => {
      const a = data.action as any;
      const depenseOk =
        a?.type === 'depense' && a.montant != null && Number(a.montant) > 0;
      if (depenseOk) {
        const desc = String(a.description || a.categorie || '').trim() || 'Dépense';
        const montant = Number(a.montant);
        try {
          await enregistrerDepense(montant, desc);
          await reloadTransactions();
          await speak('Dépense enregistrée');
          setDescription('');
          setMontant('');
          setStep(1);
        } catch (error) {
          await speak('Erreur, réessaie');
        }
        return;
      }
      if (data.action) {
        if (a.categorie || a.description) setDescription(a.description || a.categorie || '');
        if (a.montant) { setMontant(String(a.montant)); setStep(2); }
      }
      if (data.transcript) setDescription(data.transcript);
    },
    onError: () => { speak('Problème avec le micro — réessaie'); },
  });

  const handleMic = () => { if (isListening) stopRecording(); else startRecording(); };
  const isConfirming = voiceState === 'confirming';

  const handleKey = (k: string) => {
    if (k === '<') { setMontant(p => p.slice(0, -1)); return; }
    if (k === '000') { setMontant(p => p === '0' || p === '' ? p : p + '000'); return; }
    if (montant.length >= 8) return;
    setMontant(p => p === '0' ? k : p + k);
  };

  const handleSave = async () => {
    if (enregEnCoursRef.current) return; // anti double-clic (synchrone)
    if (!description.trim() || !montant || montant === '0') return;
    const m = Number(montant);
    if (!m || m <= 0 || isNaN(m)) return;
    enregEnCoursRef.current = true;
    setIsProcessing(true);
    try {
      await enregistrerDepense(m, description.trim());
      await reloadTransactions();
      speak('Dépense de ' + m.toLocaleString() + ' francs enregistrée');
      navigate(-1);
    } catch (e: any) { console.warn('[DepenseForm] handleSave failed:', e?.message); speak("Erreur lors de l'enregistrement"); }
    finally { enregEnCoursRef.current = false; setIsProcessing(false); }
  };

  const montantNum = montant ? Number(montant) : 0;
  const montantColor = montantNum === 0 ? P : montantNum <= 2000 ? '#1D9E75' : montantNum > 20000 ? '#E24B4A' : P;
  const montantHint = montantNum > 20000 ? 'Montant élevé — vérifie !' : montantNum > 0 && montantNum <= 2000 ? 'Petit montant' : '';
  const canProceed = description.trim().length > 0;
  const canSave = canProceed && montant && montant !== '0';
  const derniereDepense = useMemo(() => {
    const desc = description.trim().toLowerCase();
    if (!desc) return null;
    const tx = [...(transactions || [])]
      .filter((t: any) => t.type === 'depense')
      .sort((a: any, b: any) => String(b.date || '').localeCompare(String(a.date || '')))
      .find((t: any) => String(t.description || '').toLowerCase().includes(desc));
    return tx ? Number(tx.montant || 0) : null;
  }, [transactions, description]);

  // ══════════════════════════════════════════════════════════
  // STEP 1
  // ══════════════════════════════════════════════════════════
  const PC = '#C46210';
  if (isConfirming && pendingResponse) return (
    <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div style={{background:'white',borderRadius:'24px 24px 0 0',padding:24,width:'100%',maxWidth:420}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={PC} strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="10 16 12 18 16 14"/></svg>
          <p style={{fontSize:13,fontWeight:700,color:PC,margin:0}}>Confirmer la dépense</p>
        </div>
        <p style={{fontSize:16,fontWeight:600,color:'#1F2937',marginBottom:8}}>{pendingResponse.response || pendingResponse.reponse}</p>
        {pendingResponse.resume_action && <p style={{fontSize:12,fontWeight:700,color:'#9CA3AF',marginBottom:16}}>{pendingResponse.resume_action}</p>}
        <div style={{display:'flex',gap:10}}>
          <button onClick={cancelAction} style={{flex:1,padding:'14px 0',borderRadius:14,fontWeight:700,fontSize:15,border:'2px solid '+PC,color:PC,background:'white',cursor:'pointer'}}>Non</button>
          <button onClick={confirmAction} style={{flex:1,padding:'14px 0',borderRadius:14,fontWeight:700,fontSize:15,color:'white',background:PC,cursor:'pointer',border:'none'}}>Oui, enregistrer</button>
        </div>
      </div>
    </div>
  );

  if (step === 1) return (
    <SubPageLayout
      role="marchand"
      title="Quelle dépense ?"
      rightContent={
        <motion.button whileTap={{ scale:0.9 }} onClick={() => navigate('/marchand/alertes')}
          style={{ width:38, height:38, borderRadius:13, background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.28)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span style={{ position:'absolute', top:8, right:8, width:7, height:7, background:'#FFD166', borderRadius:'50%', border:'1.5px solid #8f4418' }} />
        </motion.button>
      }
      bottomAction={
        <div style={{ flexShrink:0, padding:'12px 14px 28px', background:BG, borderTop:'1px solid #EDE7DE' }}>
          <motion.button whileTap={{ scale:0.97 }} onClick={() => { if (canProceed) setStep(2); }}
            style={{ width:'100%', background: canProceed ? P : '#E0E0E0', color: canProceed ? 'white' : '#aaa', border:'none', borderRadius:20, padding:'17px 0', fontSize:16, fontWeight:800, cursor: canProceed ? 'pointer' : 'default', fontFamily:'inherit', boxShadow: canProceed ? `0 4px 16px ${P}55` : 'none', transition:'all 0.2s' }}>
            + Noter une dépense
          </motion.button>
        </div>
      }
    >
      <div style={{ flex:1, overflowY:'auto', padding:'16px 0 16px', display:'flex', flexDirection:'column', gap:14 }}>

        {/* ACTIONS RAPIDES */}
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:P, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Actions rapides</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {QUICK_ACTIONS.map((q, i) => (
              <motion.button key={q.id} whileTap={{ scale:0.94 }}
                onClick={() => { setDescription(q.label); setStep(2); }}
                style={{ borderRadius:16, overflow:'hidden', border:`2px solid ${description===q.label ? P : 'transparent'}`, cursor:'pointer', padding:0, position:'relative', height:110, fontFamily:'inherit' }}>
                <img src={q.img} alt={q.label} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0) 30%,rgba(0,0,0,0.65) 100%)' }} />
                <motion.div style={{ position:'absolute', top:0, left:0, width:'40%', height:'100%', background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)', pointerEvents:'none' }}
                  animate={{ x:['-130%','-130%','-130%','280%'], opacity:[0,0,1,0] }}
                  transition={{ duration:4.5, repeat:Infinity, ease:'linear', times:[0,0.70,0.72,1], delay: i * 1.3 }} />
                {description===q.label && (
                  <div style={{ position:'absolute', top:6, right:6, width:20, height:20, borderRadius:'50%', background:P, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><polyline points="1,4 3.5,6.5 9,1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )}
                <div style={{ position:'absolute', bottom:7, left:0, right:0, textAlign:'center', fontSize:11, fontWeight:800, color:'white', textShadow:'0 1px 3px rgba(0,0,0,0.4)' }}>{q.label}</div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* CHAMP MANUEL */}
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'#aaa', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>Ou décris ta dépense</div>
          <div style={{ background:'white', border:`1.5px solid ${canProceed ? P : '#EDE7DE'}`, borderRadius:14, padding:'12px 14px', display:'flex', alignItems:'center', gap:10, transition:'border-color 0.2s' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={canProceed ? P : '#aaa'} strokeWidth="2" strokeLinecap="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canProceed) setStep(2); }}
              placeholder='Ex: "Médicaments", "Électricité"...'
              style={{ flex:1, border:'none', outline:'none', fontSize:13, color:'#333', background:'transparent', fontFamily:'inherit' }}
            />
            {description && (
              <motion.button whileTap={{ scale:0.9 }} onClick={() => setDescription('')}
                style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </motion.button>
            )}
          </div>
          <div style={{ fontSize:10, color:'#bbb', marginTop:5, paddingLeft:4 }}>Appuie sur Entrée ou choisis une catégorie</div>
        </div>

        {/* AUTRES CATÉGORIES */}
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#aaa', textTransform:'uppercase', letterSpacing:'0.1em' }}>Autres catégories</div>
            <motion.button whileTap={{ scale:0.95 }} onClick={() => setShowOthers(v => !v)}
              style={{ background:'none', border:'none', fontSize:11, fontWeight:700, color:P, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:3 }}>
              {showOthers ? 'Voir moins' : 'Voir plus'}
              <motion.span animate={{ rotate: showOthers ? 180 : 0 }} transition={{ duration:0.25 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
              </motion.span>
            </motion.button>
          </div>
          <AnimatePresence>
            {showOthers && (
              <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.25 }} style={{ overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                  {OTHER_CATS.map(label => (
                    <motion.button key={label} whileTap={{ scale:0.95 }}
                      onClick={() => { setDescription(label); setStep(2); }}
                      style={{ padding:'11px 8px', borderRadius:14, border:`1.5px solid ${description===label ? P : '#EDE7DE'}`, background: description===label ? P : 'white', color: description===label ? 'white' : '#5a4030', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s', textAlign:'center' }}>
                      {label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* TATA NANTI LOU + MICRO */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, paddingTop:8, borderTop:'1px solid #EDE7DE' }}>
          <motion.img src={TATA_BLEU} alt="Tata Nanti Lou"
            style={{ width:160, height:160, objectFit:'contain', filter:'drop-shadow(0 12px 28px rgba(175,91,35,0.2))' }}
            animate={{ y:[0,-7,0] }} transition={{ duration:2.5, repeat:Infinity, ease:'easeInOut' }} />
          <motion.button whileTap={{ scale:0.9 }} onClick={handleMic} style={{ background:'none', border:'none', cursor:'pointer', padding:8 }}>
            <svg width="38" height="38" viewBox="0 0 22 22" fill="none">
              <rect x="7" y="2" width="8" height="12" rx="4" fill={isListening ? '#ef4444' : P}/>
              <path d="M4 11c0 3.9 3.1 7 7 7s7-3.1 7-7" stroke={isListening ? '#ef4444' : P} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
              <line x1="11" y1="18" x2="11" y2="21" stroke={isListening ? '#ef4444' : P} strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </motion.button>
          <div style={{ fontSize:12, color:'#B8937A', fontStyle:'italic', textAlign:'center' }}>{vocalHint}</div>
        </div>
      </div>

    </SubPageLayout>
  );

  // ══════════════════════════════════════════════════════════
  // STEP 2
  // ══════════════════════════════════════════════════════════
  return (
    <SubPageLayout
      role="marchand"
      title="Quelle dépense ?"
      rightContent={
        <motion.button whileTap={{ scale:0.9 }} onClick={() => navigate('/marchand/alertes')}
          style={{ width:38, height:38, borderRadius:13, background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.28)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span style={{ position:'absolute', top:8, right:8, width:7, height:7, background:'#FFD166', borderRadius:'50%', border:'1.5px solid #8f4418' }} />
        </motion.button>
      }
      bottomAction={
        <div style={{ flexShrink:0, padding:'8px 16px 32px', background:BG }}>
          <motion.button whileTap={{ scale:0.97 }} onClick={handleSave} disabled={isProcessing || !canSave}
            style={{ width:'100%', background: !canSave ? '#E0E0E0' : P, color: !canSave ? '#aaa' : 'white', border:'none', borderRadius:20, padding:'18px 0', fontSize:16, fontWeight:800, cursor: !canSave ? 'default' : 'pointer', fontFamily:'inherit', boxShadow: !canSave ? 'none' : `0 4px 16px ${P}55`, transition:'all 0.2s' }}>
            {isProcessing ? 'Enregistrement...' : 'Enregistrer la dépense'}
          </motion.button>
        </div>
      }
    >
      <div style={{ flex:1, overflowY:'auto', padding:'14px 16px 16px' }}>

        {/* Description + Changer */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <span style={{ fontSize:15, fontWeight:800, color:P }}>{description}</span>
          <motion.button whileTap={{ scale:0.95 }} onClick={() => setStep(1)}
            style={{ background:P, color:'white', border:'none', borderRadius:10, padding:'8px 16px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            Changer
          </motion.button>
        </div>

        {/* Montant */}
        <div style={{ textAlign:'center', padding:'8px 0 4px' }}>
          <motion.div key={montant} initial={{ y:8, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ duration:0.15 }}
            style={{ fontSize:64, fontWeight:900, color:montantColor, letterSpacing:'-3px', lineHeight:1, transition:'color 0.3s' }}>
            {montantNum.toLocaleString('fr-FR')}
          </motion.div>
          <div style={{ fontSize:12, height:18, marginTop:4, color:montantColor, fontStyle:'italic', opacity: montantHint ? 1 : 0 }}>
            {montantHint}
          </div>
        </div>

        {/* Historique */}
        <div style={{ textAlign:'center', marginBottom:14 }}>
          <span style={{ fontSize:11, color:'#bbb' }}>Dernier {description.toLowerCase()} : </span>
          <span style={{ fontSize:11, color:P, fontWeight:700 }}>
            {derniereDepense ? `${derniereDepense.toLocaleString('fr-FR')} F` : '—'}
          </span>
        </div>

        {/* Clavier */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
          {['1','2','3','4','5','6','7','8','9','000','0','<'].map(k => (
            <motion.button key={k} whileTap={{ scale:0.86 }} onClick={() => handleKey(k)}
              style={{ background: k==='0' ? P : k==='<' ? '#EBEBEB' : '#FDE8D8', border:'none', borderRadius:14, padding:'18px 0', fontSize:24, fontWeight:800, color: k==='0' ? 'white' : k==='<' ? '#888' : P, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'inherit' }}>
              {k === '<' ? <Delete size={24} color="#888" /> : k}
            </motion.button>
          ))}
        </div>

        {/* Micro */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:8 }}>
          <motion.button whileTap={{ scale:0.9 }} onClick={handleMic} style={{ background:'none', border:'none', cursor:'pointer', padding:8 }}>
            <svg width="38" height="38" viewBox="0 0 22 22" fill="none">
              <rect x="7" y="2" width="8" height="12" rx="4" fill={isListening ? '#ef4444' : P}/>
              <path d="M4 11c0 3.9 3.1 7 7 7s7-3.1 7-7" stroke={isListening ? '#ef4444' : P} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
              <line x1="11" y1="18" x2="11" y2="21" stroke={isListening ? '#ef4444' : P} strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </motion.button>
        </div>
      </div>

    </SubPageLayout>
  );
}