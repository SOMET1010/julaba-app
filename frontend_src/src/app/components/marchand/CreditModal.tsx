import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { creerCredit, fetchClientsRecents, type ClientMarchand } from '../../../imports/caisse-api';
import { useApp } from '../../contexts/AppContext';
import { useUser } from '../../contexts/UserContext';
import { toast } from 'sonner';

const P = '#AF5B23';

const JOURS = [1,2,3,4,5,6,7,10,14,21,30];

function capitalize(s: string) {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

function getDate(j: number) {
  const d = new Date();
  d.setDate(d.getDate() + j);
  return d;
}

function fmtShort(d: Date) {
  return d.toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'short' });
}

function formatPhone(v: string): string {
  return v.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cart: { nom: string; quantite: number; prix: number }[];
  total: number;
  onSuccess: () => void;
}

export function CreditModal({ isOpen, onClose, cart, total, onSuccess }: Props) {
  const { speak } = useApp();
  const { user } = useUser();
  const [step, setStep] = useState<1|2|3>(1);

  // Étape 1
  const [clientNom, setClientNom] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [showPhone, setShowPhone] = useState(true);
  const [clientsRecents, setClientsRecents] = useState<ClientMarchand[]>([]);
  const [clientsFiltres, setClientsFiltres] = useState<ClientMarchand[]>([]);
  const [clientDette, setClientDette] = useState<{ montant: number } | null>(null);

  // Étape 2
  const [jours, setJours] = useState(3);
  const [acompte, setAcompte] = useState('');
  const [aADonne, setAADonne] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<any>(null);

  // Étape 3
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const echeanceDate = useMemo(() => getDate(jours), [jours]);
  const echeanceISO = useMemo(() => echeanceDate.toISOString().split('T')[0], [echeanceDate]);
  const echeanceLong = useMemo(() => {
    const wd = echeanceDate.toLocaleDateString('fr-FR', { weekday:'long' });
    const dt = echeanceDate.toLocaleDateString('fr-FR', { day:'numeric', month:'long' });
    return `${wd} ${dt}`;
  }, [echeanceDate]);

  // Charger clients
  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      try {
        const r = await fetchClientsRecents();
        setClientsRecents(r.clients || []);
        setClientsFiltres(r.clients || []);
      } catch {
        toast.error('Impossible de charger les clients crédit');
      }
    };
    void load();
  }, [isOpen]);

  // Reset
  useEffect(() => {
    if (isOpen) {
      setStep(1); setClientNom(''); setClientPhone('');
      setShowPhone(true); setJours(3); setAcompte('');
      setAADonne(false); setClientDette(null); setShowSuccess(false);
    }
  }, [isOpen]);

  // Scroll initial drum roller
  useEffect(() => {
    if (step === 2) setTimeout(() => jumpTo(jours), 120);
  }, [step]);

  // Recherche dynamique
  useEffect(() => {
    if (!clientNom.trim()) {
      setClientsFiltres(clientsRecents);
      setClientDette(null);
      return;
    }
    const q = clientNom.toLowerCase();
    setClientsFiltres(clientsRecents.filter(c => c.nom.toLowerCase().includes(q)));
    const exact = clientsRecents.find(c => c.nom.toLowerCase() === q);
    setClientDette(exact && exact.montant_du > 0 ? { montant: exact.montant_du } : null);
  }, [clientNom, clientsRecents]);

  const selectClient = (c: ClientMarchand) => {
    setClientNom(c.nom);
    if (c.phone) {
      const digits = c.phone.replace(/\D/g, '').slice(0, 10);
      setClientPhone(formatPhone(digits));
    } else {
      setClientPhone('');
    }
    setClientDette(c.montant_du > 0 ? { montant: c.montant_du } : null);
  };

  // Drum roller : scroll → update jours
  const handleTrackScroll = () => {
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      const track = trackRef.current;
      if (!track) return;
      const chips = Array.from(track.querySelectorAll<HTMLElement>('[data-j]'));
      const cx = track.getBoundingClientRect().left + track.offsetWidth / 2;
      let best: HTMLElement | null = null, bestDist = Infinity;
      chips.forEach(c => {
        const r = c.getBoundingClientRect();
        const dist = Math.abs(r.left + r.width / 2 - cx);
        if (dist < bestDist) { bestDist = dist; best = c; }
      });
      if (best) {
        const j = parseInt((best as HTMLElement).dataset.j || '3');
        setJours(j);
        if (navigator.vibrate && user?.preferences?.vibrations !== false) navigator.vibrate(8);
      }
    }, 80);
  };

  const jumpTo = (j: number) => {
    const track = trackRef.current;
    if (!track) return;
    const chip = track.querySelector<HTMLElement>(`[data-j="${j}"]`);
    if (!chip) return;
    const chipCenter = chip.offsetLeft + chip.offsetWidth / 2;
    track.scrollTo({ left: chipCenter - track.offsetWidth / 2, behavior: 'smooth' });
    setJours(j);
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!clientNom.trim()) return;
    if (clientPhone.trim()) {
      const digits = clientPhone.replace(/\D/g, '');
      if (digits.length > 0 && !/^(01|05|07|25|27)\d{8}$/.test(digits)) {
        speak('Numéro de téléphone invalide. Format attendu : 07XXXXXXXX');
        return;
      }
    }
    if (aADonne && acompte) {
      const acompteNum = Number(acompte);
      if (acompteNum > total) {
        toast.error('L\'acompte ne peut pas dépasser le total');
        return;
      }
      if (acompteNum < 0) {
        toast.error('L\'acompte ne peut pas être négatif');
        return;
      }
      if (isNaN(acompteNum) || acompteNum <= 0) {
        speak('Le montant de l\'acompte est invalide');
        return;
      }
      if (acompteNum >= total) {
        speak('L\'acompte ne peut pas être égal ou supérieur au total. Enregistre plutôt une vente.');
        return;
      }
    }
    setIsSaving(true);
    try {
      const clientPhoneDigits = clientPhone.replace(/\D/g, '');
      await creerCredit({
        client_nom: clientNom.trim(),
        client_phone: clientPhoneDigits || undefined,
        montant_total: total,
        acompte: aADonne && acompte ? Number(acompte) : 0,
        echeance: echeanceISO,
        articles: cart,
      });
      if (navigator.vibrate && user?.preferences?.vibrations !== false) navigator.vibrate([50, 30, 50]);
      setShowSuccess(true);
      setTimeout(() => {
        speak(`Crédit de ${total.toLocaleString('fr-FR')} francs noté pour ${clientNom}. Elle rembourse le ${echeanceLong}`);
        onSuccess();
        onClose();
      }, 1800);
    } catch (e: any) {
      console.warn('[CreditModal] handleSave failed:', e?.message);
      speak('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const montantDu = aADonne && acompte ? Math.max(0, total - Number(acompte)) : total;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:200, display:'flex', alignItems:'flex-end' }}
        onClick={onClose}>
        <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
          transition={{ type:'spring', damping:28, stiffness:300 }}
          onClick={e => e.stopPropagation()}
          style={{ width:'100%', background:'white', borderRadius:'24px 24px 0 0', maxHeight:'97vh', overflowY:'auto', fontFamily:'system-ui,sans-serif' }}>

          {/* ── Animation succès ── */}
          <AnimatePresence>
            {showSuccess && (
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                style={{ position:'absolute', inset:0, background:'white', borderRadius:'24px 24px 0 0', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:10 }}>
                <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', stiffness:300 }}
                  style={{ width:100, height:100, borderRadius:'50%', background:'#1D9E75', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20 }}>
                  <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                </motion.div>
                <div style={{ fontSize:22, fontWeight:900, color:'#1a1206' }}>Crédit enregistré !</div>
                <div style={{ fontSize:15, color:'#aaa', marginTop:6 }}>{clientNom} · {montantDu.toLocaleString('fr-FR')} FCFA</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ══ ÉTAPE 1 ══ */}
          {step === 1 && (
            <>
              <div style={{ background:`linear-gradient(160deg,${P},#8f4418)`, padding:'14px 16px 22px' }}>
                <div style={{ width:40, height:4, borderRadius:2, background:'rgba(255,255,255,0.3)', margin:'0 auto 16px' }} />
                <div style={{ display:'flex', gap:7, marginBottom:14 }}>
                  <div style={{ width:32, height:6, borderRadius:3, background:'white' }} />
                  <div style={{ width:32, height:6, borderRadius:3, background:'rgba(255,255,255,0.35)' }} />
                  <div style={{ width:32, height:6, borderRadius:3, background:'rgba(255,255,255,0.35)' }} />
                </div>
                <div style={{ fontSize:24, fontWeight:900, color:'white' }}>Qui doit payer ?</div>
                <div style={{ fontSize:14, color:'rgba(255,255,255,0.7)', marginTop:4 }}>Choisis ou tape le nom</div>
              </div>
              <div style={{ padding:'18px' }}>
                {/* Résumé */}
                <div style={{ background:'#FFF3EA', borderRadius:14, padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
                  <span style={{ fontSize:14, color:'#5a4030', fontWeight:600 }}>{cart.map(i=>`${i.nom} ×${i.quantite}`).join(' · ')}</span>
                  <span style={{ fontSize:20, fontWeight:900, color:P }}>{total.toLocaleString('fr-FR')} FCFA</span>
                </div>

                {/* Clients filtrés */}
                {clientsFiltres.length > 0 && (
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#aaa', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>
                      {clientNom ? 'Résultats' : 'Clients récents'}
                    </div>
                    {clientsFiltres.slice(0,4).map(c => (
                      <motion.button key={c.id} whileTap={{ scale:0.98 }} onClick={() => selectClient(c)}
                        style={{ width:'100%', borderRadius:14, padding:'14px 16px', fontSize:17, fontWeight:800, cursor:'pointer', border:`2px solid ${clientNom===c.nom ? P : '#EDE7DE'}`, background: clientNom===c.nom ? P : 'white', color: clientNom===c.nom ? 'white' : '#1a1206', fontFamily:'inherit', textAlign:'left', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, marginBottom:8 }}>
                        <span style={{ flex:'1 1 auto', minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.nom}</span>
                        {c.montant_du > 0 && (
                          <span style={{ fontSize:11, color: clientNom===c.nom ? 'rgba(255,255,255,0.75)' : '#ef4444', fontWeight:600, flexShrink:0, whiteSpace:'nowrap', paddingLeft:6 }}>
                            doit {c.montant_du.toLocaleString('fr-FR')} FCFA
                          </span>
                        )}
                      </motion.button>
                    ))}
                  </div>
                )}

                {/* Champ nom */}
                <div style={{ background:'#f5f0eb', border:`1.5px solid ${clientNom ? P : '#EDE7DE'}`, borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={clientNom ? P : '#aaa'} strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                  <input value={clientNom}
                    onChange={e => setClientNom(capitalize(e.target.value))}
                    placeholder="Nouveau client — tape son nom..."
                    style={{ flex:1, border:'none', outline:'none', background:'transparent', fontSize:16, color:'#333', fontFamily:'inherit' }} />
                  {clientNom && <motion.button whileTap={{ scale:0.9 }} onClick={() => setClientNom('')} style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}>
                    <X size={14} color="#aaa" />
                  </motion.button>}
                </div>

                {/* Alerte dette */}
                <AnimatePresence>
                  {clientDette && (
                    <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
                      style={{ background:'#FEF2F2', border:'1px solid #fca5a5', borderRadius:10, padding:'9px 12px', marginBottom:10, fontSize:13, color:'#ef4444', fontWeight:700 }}>
                      ⚠️ Doit encore {clientDette.montant.toLocaleString('fr-FR')} FCFA
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Téléphone */}
                {!showPhone
                  ? <motion.button whileTap={{ scale:0.97 }} onClick={() => setShowPhone(true)}
                      style={{ background:'none', border:'none', fontSize:13, color:P, fontWeight:700, cursor:'pointer', fontFamily:'inherit', padding:'4px 0', marginBottom:18 }}>
                      + Ajouter un numéro de téléphone
                    </motion.button>
                  : <div style={{ background:'#f5f0eb', border:'1.5px solid #EDE7DE', borderRadius:14, padding:'13px 16px', display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      <span
                        aria-hidden
                        style={{ fontSize: 13, fontWeight: 900, color: '#2a1a0a', padding: '8px 10px', borderRadius: 12, background: 'rgba(198,106,44,0.08)', userSelect: 'none' }}
                      >
                        +225
                      </span>
                      <input
                        value={clientPhone}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setClientPhone(digits ? formatPhone(digits) : '');
                        }}
                        placeholder="07 00 00 00 00"
                        type="tel"
                        maxLength={14}
                        inputMode="numeric"
                        style={{ flex:1, border:'none', outline:'none', background:'transparent', fontSize:15, color:'#333', fontFamily:'inherit' }}
                      />
                      <span style={{ fontSize:10, color:'#bbb', fontWeight:600 }}>Optionnel</span>
                    </div>
                }

                <motion.button whileTap={{ scale:0.97 }}
                  onClick={() => { if (clientNom.trim()) setStep(2); }}
                  style={{ width:'100%', background: clientNom.trim() ? P : '#E0E0E0', color: clientNom.trim() ? 'white' : '#aaa', border:'none', borderRadius:16, padding:'18px 0', fontSize:18, fontWeight:800, cursor: clientNom.trim() ? 'pointer' : 'default', fontFamily:'inherit', transition:'all 0.2s' }}>
                  Suivant →
                </motion.button>
              </div>
            </>
          )}

          {/* ══ ÉTAPE 2 ══ */}
          {step === 2 && (
            <>
              <div style={{ background:`linear-gradient(160deg,${P},#8f4418)`, padding:'14px 16px 22px' }}>
                <div style={{ width:40, height:4, borderRadius:2, background:'rgba(255,255,255,0.3)', margin:'0 auto 16px' }} />
                <div style={{ display:'flex', gap:7, marginBottom:14 }}>
                  <div style={{ width:32, height:6, borderRadius:3, background:'rgba(255,255,255,0.35)' }} />
                  <div style={{ width:32, height:6, borderRadius:3, background:'white' }} />
                  <div style={{ width:32, height:6, borderRadius:3, background:'rgba(255,255,255,0.35)' }} />
                </div>
                <div style={{ fontSize:24, fontWeight:900, color:'white' }}>Quand {clientNom.split(' ')[0]} paie ?</div>
                <div style={{ fontSize:14, color:'rgba(255,255,255,0.7)', marginTop:4 }}>{total.toLocaleString('fr-FR')} FCFA à récupérer</div>
              </div>
              <div style={{ padding:'18px' }}>
                {/* Grand chiffre */}
                <div style={{ textAlign:'center', marginBottom:8 }}>
                  <motion.div key={jours} initial={{ scale:0.7, opacity:0 }} animate={{ scale:1, opacity:1 }} transition={{ type:'spring', stiffness:400 }}
                    style={{ fontSize:72, fontWeight:900, color:P, lineHeight:1 }}>
                    {jours}
                  </motion.div>
                  <div style={{ fontSize:16, color:'#aaa', fontWeight:600, marginTop:6 }}>
                    jour{jours > 1 ? 's' : ''} — {echeanceLong}
                  </div>
                </div>

                {/* Raccourcis */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, margin:'16px 0 14px' }}>
                  {[{j:1,label:'Demain'},{j:7,label:'1 semaine'},{j:30,label:'1 mois'}].map(({j,label}) => (
                    <motion.button key={j} whileTap={{ scale:0.95 }} onClick={() => jumpTo(j)}
                      style={{ background: jours===j ? P : '#f5f0eb', border:`1.5px solid ${jours===j ? P : '#EDE7DE'}`, borderRadius:12, padding:'10px 4px', cursor:'pointer', fontFamily:'inherit' }}>
                      <div style={{ fontSize:13, fontWeight:800, color: jours===j ? 'white' : '#1a1206' }}>{label}</div>
                      <div style={{ fontSize:10, color: jours===j ? 'rgba(255,255,255,0.75)' : '#aaa', marginTop:2 }}>{fmtShort(getDate(j))}</div>
                    </motion.button>
                  ))}
                </div>

                {/* Drum roller snap — cadre fixe + chips défilent dessous */}
                <div style={{ fontSize:11, fontWeight:700, color:'#aaa', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10, textAlign:'center' }}>Ou glisse pour choisir</div>
                <div style={{ position:'relative', height:96, marginBottom:20 }}>
                  {/* Cadre orange fixe */}
                  <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:76, height:88, borderRadius:18, border:`3px solid ${P}`, zIndex:5, pointerEvents:'none', background:'transparent' }} />
                  {/* Track scrollable */}
                  <div ref={trackRef} onScroll={handleTrackScroll}
                    style={{ position:'absolute', inset:0, overflowX:'auto', display:'flex', alignItems:'center', gap:10, scrollSnapType:'x mandatory', WebkitOverflowScrolling:'touch', padding:'0 calc(50% - 36px)', scrollbarWidth:'none' }}>
                    {JOURS.map((j) => {
                      const d = getDate(j);
                      const wd = d.toLocaleDateString('fr-FR', { weekday:'short' });
                      const dist = Math.abs(JOURS.indexOf(j) - JOURS.indexOf(jours));
                      const isOn = j === jours;
                      return (
                        <div key={j} data-j={j}
                          onClick={() => jumpTo(j)}
                          style={{ flexShrink:0, width:72, height:84, borderRadius:16, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', scrollSnapAlign:'center', cursor:'pointer', border:`2px solid ${isOn ? P : '#EDE7DE'}`, background: isOn ? P : 'white', transform:`scale(${isOn ? 1.08 : dist===1 ? 0.93 : 0.82})`, opacity: isOn ? 1 : dist===1 ? 0.7 : 0.45, transition:'all 0.2s' }}>
                          <div style={{ fontSize: isOn ? 22 : 17, fontWeight:900, color: isOn ? 'white' : '#1a1206' }}>{j}</div>
                          <div style={{ fontSize:10, color: isOn ? 'rgba(255,255,255,0.75)' : '#aaa', marginTop:3 }}>{wd}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Acompte */}
                <div style={{ background:'#FFF3EA', border:'1.5px solid #f5d5a8', borderRadius:16, padding:'16px', marginBottom:8 }}>
                  <div style={{ fontSize:17, fontWeight:800, color:'#1a1206', marginBottom:12 }}>Elle t'a déjà donné quelque chose ?</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    <motion.button whileTap={{ scale:0.97 }} onClick={() => { setAADonne(false); setAcompte(''); }}
                      style={{ borderRadius:12, padding:'14px', textAlign:'center', background: !aADonne ? '#E8E8E8' : 'white', border:`1.5px solid ${!aADonne ? '#999' : '#EDE7DE'}`, cursor:'pointer', fontFamily:'inherit', fontSize:17, fontWeight:800, color: !aADonne ? '#555' : '#aaa' }}>
                      Non
                    </motion.button>
                    <div onClick={() => setAADonne(true)}
                      style={{ borderRadius:12, padding:'12px 14px', background:'white', border:`1.5px solid ${aADonne ? P : '#EDE7DE'}`, display:'flex', alignItems:'center', gap:6, cursor:'text' }}>
                      <input value={acompte} onChange={e => { setAcompte(e.target.value); setAADonne(true); }}
                        placeholder="Montant" type="number"
                        style={{ flex:1, border:'none', outline:'none', background:'transparent', fontSize:16, color:P, fontWeight:700, fontFamily:'inherit', width:60 }} />
                      <span style={{ fontSize:12, color:'#aaa', fontWeight:600 }}>FCFA</span>
                    </div>
                  </div>
                  {aADonne && acompte && (
                    <div style={{ fontSize:13, color: Number(acompte) >= total ? '#ef4444' : P, fontWeight:700, marginTop:10 }}>
                      {Number(acompte) >= total
                        ? 'Acompte trop élevé — doit être inférieur au total'
                        : `Reste à payer : ${(total - Number(acompte)).toLocaleString('fr-FR')} FCFA`}
                    </div>
                  )}
                </div>
                <div style={{ fontSize:11, color:'#bbb', paddingLeft:4, marginBottom:20 }}>Si oui, note le montant qu'elle t'a donné</div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:8 }}>
                  <motion.button whileTap={{ scale:0.97 }} onClick={() => setStep(1)}
                    style={{ background:'#f0f0f0', border:'none', borderRadius:14, padding:'16px', fontSize:15, fontWeight:700, color:'#888', cursor:'pointer', fontFamily:'inherit' }}>
                    ← Retour
                  </motion.button>
                  <motion.button whileTap={{ scale:0.97 }} onClick={() => setStep(3)}
                    style={{ background:P, border:'none', borderRadius:14, padding:'16px', fontSize:16, fontWeight:800, color:'white', cursor:'pointer', fontFamily:'inherit' }}>
                    Continuer →
                  </motion.button>
                </div>
              </div>
            </>
          )}

          {/* ══ ÉTAPE 3 ══ */}
          {step === 3 && (
            <>
              <div style={{ background:`linear-gradient(160deg,${P},#8f4418)`, padding:'14px 16px 22px' }}>
                <div style={{ width:40, height:4, borderRadius:2, background:'rgba(255,255,255,0.3)', margin:'0 auto 16px' }} />
                <div style={{ display:'flex', gap:7, marginBottom:14 }}>
                  <div style={{ width:32, height:6, borderRadius:3, background:'rgba(255,255,255,0.35)' }} />
                  <div style={{ width:32, height:6, borderRadius:3, background:'rgba(255,255,255,0.35)' }} />
                  <div style={{ width:32, height:6, borderRadius:3, background:'white' }} />
                </div>
                <div style={{ fontSize:24, fontWeight:900, color:'white' }}>Confirme le crédit</div>
                <div style={{ fontSize:14, color:'rgba(255,255,255,0.7)', marginTop:4 }}>Vérifie avant d'enregistrer</div>
              </div>
              <div style={{ padding:'18px' }}>
                {/* Récap lisible */}
                <div style={{ borderRadius:18, overflow:'hidden', border:'1.5px solid #EDE7DE', marginBottom:20 }}>
                  {/* Client */}
                  <div style={{ padding:'18px', background:'#FFF3EA', borderBottom:'1.5px solid #f5d5a8' }}>
                    <div style={{ fontSize:13, color:'#aaa', fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.08em' }}>Client</div>
                    <div style={{ fontSize:26, fontWeight:900, color:'#1a1206' }}>{clientNom}</div>
                    {clientPhone && <div style={{ fontSize:13, color:'#aaa', marginTop:2 }}>{clientPhone}</div>}
                  </div>
                  {/* Montant */}
                  <div style={{ padding:'16px 18px', background:'white', borderBottom:'1.5px solid #EDE7DE', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:13, color:'#aaa', fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.08em' }}>Montant dû</div>
                      <div style={{ fontSize:30, fontWeight:900, color:P }}>{montantDu.toLocaleString('fr-FR')} FCFA</div>
                    </div>
                    {aADonne && acompte && (
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:13, color:'#aaa', fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.08em' }}>Acompte versé</div>
                        <div style={{ fontSize:20, fontWeight:800, color:'#1D9E75' }}>{Number(acompte).toLocaleString('fr-FR')} FCFA</div>
                      </div>
                    )}
                  </div>
                  {/* Date */}
                  <div style={{ padding:'16px 18px', background:'white', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:13, color:'#aaa', fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.08em' }}>Remboursement</div>
                      <div style={{ fontSize:19, fontWeight:800, color:'#1a1206' }}>{echeanceLong}</div>
                    </div>
                    <div style={{ background:'#FFF3EA', borderRadius:10, padding:'6px 14px' }}>
                      <div style={{ fontSize:14, fontWeight:700, color:P }}>dans {jours}j</div>
                    </div>
                  </div>
                </div>

                {/* Note vocale */}
                <div style={{ background:'#F0FAF5', border:'1px solid #9fe1cb', borderRadius:12, padding:'12px 14px', display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
                  <span style={{ fontSize:13, color:'#1D9E75', fontWeight:600 }}>Tata Nanti Lou confirmera vocalement après l'enregistrement</span>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:8 }}>
                  <motion.button whileTap={{ scale:0.97 }} onClick={() => setStep(2)}
                    style={{ background:'#f0f0f0', border:'none', borderRadius:14, padding:'16px', fontSize:15, fontWeight:700, color:'#888', cursor:'pointer', fontFamily:'inherit' }}>
                    ← Retour
                  </motion.button>
                  <motion.button whileTap={{ scale:0.97 }} onClick={handleSave} disabled={isSaving}
                    style={{ background:P, border:'none', borderRadius:14, padding:'16px', fontSize:16, fontWeight:800, color:'white', cursor:'pointer', fontFamily:'inherit', opacity: isSaving ? 0.7 : 1 }}>
                    {isSaving ? 'Enregistrement...' : 'Enregistrer le crédit ✓'}
                  </motion.button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
