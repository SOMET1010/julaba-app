// ═══════════════════════════════════════════════════════════════════════════════
//  UniversalKPI - Composant KPI universel Julaba
//  Standard : chiffre gauche / icône animée droite / glassmorphism
//  Modal explicatif intégré au clic
// ═══════════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

function formatKPI(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0','') + 'M';
  if (n >= 10_000)    return Math.round(n / 1_000) + 'K';
  return n.toLocaleString('fr-FR');
}

// ─── CountUp ─────────────────────────────────────────────────────────────────
function AnimatedCounter({ target, duration = 1000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    startTime.current = null;
    const animate = (ts: number) => {
      if (!startTime.current) startTime.current = ts;
      const elapsed = ts - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return <>{formatKPI(count || 0)}</>;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type KPIAnimationType = 'bounce' | 'pulse' | 'spin' | 'float' | 'none';

export interface KPIDetail {
  label: string;
  value: string | number;
  color?: string;
}

export interface UniversalKPIProps {
  label: string;
  value?: string;
  animatedTarget?: number;
  suffix?: string;
  prefix?: string;
  icon: LucideIcon | React.ElementType | any;
  color: string;
  bgColor?: string;
  borderColor?: string;
  iconAnimation?: KPIAnimationType;
  active?: boolean;
  onClick?: () => void;
  delay?: number;
  // Modal explicatif
  explication?: string;
  formule?: string;
  details?: KPIDetail[];
}

// ─── Animations icône ─────────────────────────────────────────────────────────
const ICON_ANIMS: Record<KPIAnimationType, { animate: any; transition: any }> = {
  bounce: { animate: { y:[0,-5,0] },           transition: { duration:1.8, repeat:Infinity, ease:'easeInOut' } },
  pulse:  { animate: { scale:[1,1.2,1], rotate:[0,12,-12,0] }, transition: { duration:2.5, repeat:Infinity, ease:'easeInOut' } },
  spin:   { animate: { rotate:[0,360] },        transition: { duration:4,   repeat:Infinity, ease:'linear'    } },
  float:  { animate: { scale:[1,1.15,1] },      transition: { duration:2,   repeat:Infinity, ease:'easeInOut' } },
  none:   { animate: {},                         transition: {}                                                  },
};

// ─── Modal KPI ────────────────────────────────────────────────────────────────
function KPIDetailModal({
  open, onClose, label, value, suffix, color, bgColor, borderColor, explication, formule, details
}: {
  open: boolean; onClose: () => void;
  label: string; value: string | number; suffix?: string;
  color: string; bgColor: string; borderColor: string;
  explication?: string; formule?: string; details?: KPIDetail[];
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity:0 }}
          animate={{ opacity:1 }}
          exit={{ opacity:0 }}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity:0, scale:0.95, y:10 }}
            animate={{ opacity:1, scale:1, y:0 }}
            exit={{ opacity:0, scale:0.95, y:10 }}
            transition={{ type:'spring', damping:25, stiffness:320 }}
            onClick={e => e.stopPropagation()}
            style={{ background:'white', borderRadius:20, width:'100%', maxWidth:480, maxHeight:'70vh', overflowY:'auto', fontFamily:'system-ui,sans-serif', boxShadow:'0 24px 64px rgba(0,0,0,0.18)' }}
          >

            {/* Header avec label et bouton fermer */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 16px 8px' }}>
              <span style={{ fontSize:12, fontWeight:700, color:'#999', textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</span>
              <motion.button
                whileTap={{ scale:0.9 }}
                onClick={onClose}
                aria-label="Fermer"
                style={{ width:32, height:32, borderRadius:10, background:'#f5f0eb', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
              >
                <X size={14} color="#666" />
              </motion.button>
            </div>

            {/* Valeur principale compacte */}
            <div style={{ background:bgColor, border:`2px solid ${borderColor}`, borderRadius:16, margin:'0 16px', padding:16, overflow:'hidden' }}>
              <div style={{ fontSize:32, fontWeight:900, color, lineHeight:1.15, whiteSpace: typeof value === 'string' ? 'nowrap' : 'normal', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'100%' }}>
                {typeof value === 'number' ? (value||0).toLocaleString('fr-FR') : value}
                {suffix && <span style={{ fontSize:14, fontWeight:700, marginLeft:6 }}>{suffix}</span>}
              </div>
            </div>

            <div style={{ padding:'12px 16px 16px', display:'flex', flexDirection:'column', gap:10 }}>

              {/* Explication */}
              {explication && (
                <div style={{ background:'#FFF3EA', border:'1.5px solid rgba(175,91,35,0.2)', borderRadius:14, padding:12, display:'flex', gap:10, alignItems:'flex-start' }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'#AF5B23', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Info size={13} color="white" />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:900, color:'#AF5B23', marginBottom:3 }}>{'C\u2019est quoi\u00a0?'}</div>
                    <div style={{ fontSize:13, color:'#555', lineHeight:1.5 }}>{explication}</div>
                  </div>
                </div>
              )}

              {/* Formule */}
              {formule && (
                <div style={{ background:'#f9f6f3', borderRadius:12, padding:'10px 14px' }}>
                  <div style={{ fontSize:10, fontWeight:900, color:'#aaa', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>Formule</div>
                  <div style={{ fontSize:13, fontWeight:800, color:'#333' }}>{formule}</div>
                </div>
              )}

              {/* Détails */}
              {details && details.length > 0 && (
                <div style={{ background:'white', border:'1.5px solid #EDE7DE', borderRadius:14, overflow:'hidden' }}>
                  {details.map((d, i) => (
                    <div key={i} style={{ padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom: i < details.length-1 ? '1px solid #f5f0eb' : 'none', background: i===details.length-1 ? '#FFF3EA' : 'white' }}>
                      <span style={{ fontSize:12, color:'#999', fontWeight:600 }}>{d.label}</span>
                      <span style={{ fontSize:14, fontWeight:900, color: d.color || color }}>
                        {typeof d.value === 'number' ? (d.value||0).toLocaleString('fr-FR') : d.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <motion.button whileTap={{ scale:0.97 }} onClick={onClose}
                style={{ width:'100%', padding:'12px 0', borderRadius:12, background:'#AF5B23', border:'none', fontSize:14, fontWeight:900, color:'white', cursor:'pointer', fontFamily:'inherit', marginTop:4 }}>
                Fermer
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function UniversalKPI({
  label, value, animatedTarget, suffix, prefix,
  icon: Icon, color,
  bgColor, borderColor,
  iconAnimation = 'float',
  active = false, onClick, delay = 0,
  explication, formule, details,
}: UniversalKPIProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const iconAnim = ICON_ANIMS[iconAnimation];
  const hasModal = !!(explication || formule || (details && details.length > 0));
  const bg     = bgColor     || `${color}12`;
  const border = borderColor || `${color}40`;

  const handleClick = () => {
    if (hasModal) setModalOpen(true);
    onClick?.();
  };

  const displayValue = animatedTarget !== undefined
    ? animatedTarget
    : (typeof value === 'string' ? parseFloat(value) || 0 : 0);

  return (
    <>
      <motion.button type="button" onClick={handleClick}
        style={{ background:bg, backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', borderRadius:24, padding:'16px 12px 12px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', border:`2px solid ${border}`, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'stretch', gap:6, width:'100%', minWidth:0, overflow:'hidden' }}
        initial={{ opacity:1, y:0, scale:1 }}
        animate={{ opacity:1, y:0, scale:1 }}
        transition={{ type:'spring', stiffness:320, damping:26, delay }}
        whileTap={{ scale:0.95 }}>

        {/* Chiffre gauche / Icône droite */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:4 }}>
          <div style={{ display:'flex', flexWrap:'wrap', alignItems:'baseline', gap:3, flex:1 }}>
            <span style={{ fontSize:22, fontWeight:900, color, lineHeight:1.15, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'100%' }}>
              {prefix}
              {animatedTarget !== undefined
                ? <AnimatedCounter target={animatedTarget} />
                : value}
            </span>
            {suffix && <span style={{ fontSize:11, fontWeight:700, color }}>{suffix}</span>}
          </div>
          <motion.div {...iconAnim}
            style={{ width:42, height:42, borderRadius:'50%', background:`${color}20`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon size={20} color={color} strokeWidth={2.5} />
          </motion.div>
        </div>

        {/* Label bas gauche */}
        <span style={{ fontSize:12, fontWeight:900, color, textAlign:'left', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', minWidth:0, display:'block' }}>{label}</span>

        {/* Indicateur actif */}
        {active && (
          <motion.div style={{ height:3, borderRadius:20, background:color, width:28 }}
            layoutId="kpi-active" initial={{ scaleX:0 }} animate={{ scaleX:1 }}
            transition={{ type:'spring', stiffness:400, damping:30 }} />
        )}
      </motion.button>

      {/* Modal explicatif */}
      <KPIDetailModal
        open={modalOpen} onClose={() => setModalOpen(false)}
        label={label}
        value={animatedTarget !== undefined ? animatedTarget : (value || 0)}
        suffix={suffix} color={color} bgColor={bg} borderColor={border}
        explication={explication} formule={formule} details={details}
      />
    </>
  );
}

// ─── Grille KPI 2×2 ──────────────────────────────────────────────────────────
interface KPIGridProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}

export function KPIGrid({ children, cols, className = '' }: KPIGridProps) {
  const count = React.Children.count(children);
  const effectiveCols = cols || Math.min(count, 4);
  const colClass = effectiveCols === 2 ? 'repeat(2,minmax(0,1fr))' : effectiveCols === 3 ? 'repeat(3,minmax(0,1fr))' : 'repeat(4,minmax(0,1fr))';
  return (
    <div style={{ display:'grid', gridTemplateColumns:colClass, gap:10, marginBottom:14, width:'100%', maxWidth:'100%', overflow:'hidden', boxSizing:'border-box' }} className={className}>
      {children}
    </div>
  );
}