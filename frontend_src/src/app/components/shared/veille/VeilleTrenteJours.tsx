/**
 * JÙLABA — Veille 30 jours
 * ========================
 * Outil de recherche multi-sources inspire du skill last30days.
 * L'utilisateur saisit un sujet (ex: "prix cacao", "anacarde export"),
 * choisit ses sources, et obtient une note synthetique et sourcee de
 * ce qui s'est dit sur les 30 derniers jours.
 *
 * Le moteur (services/veille) est agnostique du fournisseur. Ici on
 * utilise le fournisseur de demonstration (deterministe, hors-ligne).
 * Brancher un backend reel = fournir un autre VeilleProvider.
 */
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Minus,
  ExternalLink,
  Radio,
  Quote,
  Clock,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { useApp } from '../../../contexts/AppContext';
import { ROLE_COLORS } from '../../../config/roleConfig';
import { SubPageLayout } from '../../layout/SubPageLayout';
import { SearchBar } from '../SearchBar';
import {
  VEILLE_SOURCES,
  DemoVeilleProvider,
  runVeille,
  getSource,
  type VeilleBrief,
  type VeilleFinding,
  type VeilleSourceId,
} from '../../../services/veille';

const FENETRE_JOURS = 30;

const SUGGESTIONS = [
  'prix du cacao',
  'anacarde export',
  'cafe robusta',
  'hevea fond de tasse',
  'riz local',
];

type Phase = 'idle' | 'searching' | 'done';

/* ── Rendu d'un constat ─────────────────────────────────────────── */

const SENTIMENT_STYLE: Record<
  VeilleFinding['sentiment'],
  { color: string; bg: string; label: string; Icon: typeof TrendingUp }
> = {
  hausse: { color: '#127A3E', bg: '#E9F7EF', label: 'Hausse', Icon: TrendingUp },
  baisse: { color: '#B42318', bg: '#FEECEB', label: 'Baisse', Icon: TrendingDown },
  alerte: { color: '#B54708', bg: '#FEF3E6', label: 'Vigilance', Icon: AlertTriangle },
  neutre: { color: '#475467', bg: '#F2F4F7', label: 'A suivre', Icon: Minus },
};

function FindingCard({
  finding,
  rank,
  primaryColor,
}: {
  finding: VeilleFinding;
  rank: number;
  primaryColor: string;
}) {
  const s = SENTIMENT_STYLE[finding.sentiment];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: rank * 0.05 }}
      style={{
        background: 'white',
        borderRadius: 18,
        border: '1px solid #EFEFEF',
        boxShadow: '0 1px 3px rgba(16,24,40,0.05)',
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 9,
            background: `${primaryColor}14`,
            color: primaryColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          {rank + 1}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1D2939', lineHeight: 1.3 }}>
            {finding.titre}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 700,
                color: s.color,
                background: s.bg,
                padding: '3px 8px',
                borderRadius: 999,
              }}
            >
              <s.Icon size={12} strokeWidth={2.5} />
              {s.label}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 700,
                color: '#475467',
                background: '#F2F4F7',
                padding: '3px 8px',
                borderRadius: 999,
              }}
            >
              <Layers size={12} strokeWidth={2.5} />
              {finding.confirmationSources} source
              {finding.confirmationSources > 1 ? 's' : ''}
            </span>
          </div>
          <p style={{ fontSize: 13.5, color: '#475467', lineHeight: 1.5, marginTop: 10 }}>
            {finding.synthese}
          </p>

          {/* Preuves sources */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
            {finding.preuves.slice(0, 4).map((p, i) => {
              const src = getSource(p.sourceId);
              return (
                <a
                  key={`${p.url}-${i}`}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 9px',
                    borderRadius: 11,
                    background: '#FAFAFA',
                    border: '1px solid #F0F0F0',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ fontSize: 14 }}>{src?.emoji ?? '🔗'}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: '#1D2939',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.titre}
                    </span>
                    <span style={{ fontSize: 11, color: '#98A2B3' }}>
                      {p.origine} · il y a {p.ageJours}j ·{' '}
                      {p.engagement.toLocaleString('fr-FR')} {p.engagementLabel}
                    </span>
                  </span>
                  <ExternalLink size={13} color="#98A2B3" />
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Pied de page en arbre ──────────────────────────────────────── */

function AgentTree({ brief }: { brief: VeilleBrief }) {
  return (
    <div
      style={{
        background: '#0B1220',
        borderRadius: 16,
        padding: 16,
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
        color: '#D0D5DD',
        fontSize: 12.5,
        lineHeight: 1.7,
        overflowX: 'auto',
      }}
    >
      <div style={{ color: '#34D399', fontWeight: 700 }}>
        <CheckCircle2
          size={13}
          style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }}
        />
        Tous les agents ont repondu !
      </div>
      {brief.agents.map((a, i) => {
        const last = i === brief.agents.length - 1;
        return (
          <div key={a.sourceId}>
            <span style={{ color: '#475467' }}>{last ? '└─ ' : '├─ '}</span>
            <span>{a.emoji} </span>
            <span style={{ color: '#98A2B3' }}>{a.label}</span>
            <span style={{ color: '#475467' }}> · </span>
            <span style={{ color: a.compte > 0 ? '#34D399' : '#667085' }}>
              {a.compte} preuve{a.compte > 1 ? 's' : ''}
            </span>
          </div>
        );
      })}
      <div style={{ color: '#667085', marginTop: 6 }}>
        {brief.totalPreuves} preuves · fenetre {brief.fenetreJours} jours · synced{' '}
        {brief.synced}
      </div>
    </div>
  );
}

/* ── Ecran de progression ───────────────────────────────────────── */

function SearchingView({
  sources,
  primaryColor,
}: {
  sources: VeilleSourceId[];
  primaryColor: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 14,
          fontWeight: 700,
          color: '#1D2939',
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          style={{ display: 'inline-flex' }}
        >
          <Radio size={16} color={primaryColor} />
        </motion.div>
        Deploiement des agents...
      </div>
      {sources.map((id, i) => {
        const src = getSource(id);
        if (!src) return null;
        return (
          <motion.div
            key={id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.12 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'white',
              border: '1px solid #EFEFEF',
              borderRadius: 12,
              padding: '10px 12px',
            }}
          >
            <span style={{ fontSize: 16 }}>{src.emoji}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#344054' }}>
              {src.label}
            </span>
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
              style={{ fontSize: 11, color: '#98A2B3' }}
            >
              interrogation...
            </motion.span>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── Composant principal ────────────────────────────────────────── */

export function VeilleTrenteJours() {
  const { user } = useApp();
  const role = (user?.role && user.role in ROLE_COLORS
    ? user.role
    : 'marchand') as keyof typeof ROLE_COLORS;
  const primaryColor = ROLE_COLORS[role];

  const [sujet, setSujet] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [brief, setBrief] = useState<VeilleBrief | null>(null);
  const [activeSources, setActiveSources] = useState<Set<VeilleSourceId>>(
    () => new Set(VEILLE_SOURCES.filter((s) => s.defaultOn).map((s) => s.id)),
  );

  const provider = useMemo(() => new DemoVeilleProvider(), []);
  const selectedIds = useMemo(
    () => VEILLE_SOURCES.filter((s) => activeSources.has(s.id)).map((s) => s.id),
    [activeSources],
  );

  const toggleSource = (id: VeilleSourceId) => {
    setActiveSources((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const lancer = async (rawSujet?: string) => {
    const q = (rawSujet ?? sujet).trim();
    if (!q || selectedIds.length === 0) return;
    if (rawSujet) setSujet(rawSujet);
    setPhase('searching');
    setBrief(null);
    // Laisse l'animation des agents se derouler avant la synthese.
    const minDelay = new Promise((r) => setTimeout(r, 250 + selectedIds.length * 160));
    const [result] = await Promise.all([
      runVeille(
        { sujet: q, sources: selectedIds, fenetreJours: FENETRE_JOURS },
        { provider },
      ),
      minDelay,
    ]);
    setBrief(result);
    setPhase('done');
  };

  return (
    <SubPageLayout
      role={role}
      title="Veille 30 jours"
      subtitle="Ce qui se dit sur vos marches, en temps reel"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}>
        {/* Barre de recherche */}
        <div>
          <SearchBar
            value={sujet}
            onChange={setSujet}
            onVoiceResult={(t) => lancer(t)}
            placeholder="Rechercher un sujet, un produit, un marche..."
            primaryColor={primaryColor}
            autoFocus
          />
          <div
            role="button"
            tabIndex={0}
            onClick={() => lancer()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') lancer();
            }}
            style={{
              marginTop: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: sujet.trim() ? primaryColor : '#E4E7EC',
              color: sujet.trim() ? 'white' : '#98A2B3',
              fontWeight: 800,
              fontSize: 14,
              padding: '13px 16px',
              borderRadius: 14,
              cursor: sujet.trim() ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s',
              userSelect: 'none',
            }}
          >
            <Sparkles size={16} />
            Lancer la veille
          </div>
        </div>

        {/* Sources */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#98A2B3', marginBottom: 8 }}>
            SOURCES ({selectedIds.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {VEILLE_SOURCES.map((src) => {
              const on = activeSources.has(src.id);
              return (
                <button
                  key={src.id}
                  onClick={() => toggleSource(src.id)}
                  title={src.hint}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12.5,
                    fontWeight: 700,
                    padding: '7px 11px',
                    borderRadius: 999,
                    border: on ? `1.5px solid ${primaryColor}` : '1.5px solid #E4E7EC',
                    background: on ? `${primaryColor}12` : 'white',
                    color: on ? primaryColor : '#667085',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <span>{src.emoji}</span>
                  {src.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Suggestions (etat initial) */}
        {phase === 'idle' && (
          <div>
            <div
              style={{ fontSize: 12, fontWeight: 700, color: '#98A2B3', marginBottom: 8 }}
            >
              IDEES DE RECHERCHE
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => lancer(s)}
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    padding: '7px 12px',
                    borderRadius: 999,
                    border: '1px solid #E4E7EC',
                    background: 'white',
                    color: '#344054',
                    cursor: 'pointer',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <div
              style={{
                marginTop: 18,
                padding: 14,
                borderRadius: 14,
                background: `${primaryColor}0A`,
                border: `1px dashed ${primaryColor}40`,
                fontSize: 12.5,
                color: '#667085',
                lineHeight: 1.5,
              }}
            >
              <b style={{ color: '#344054' }}>Comment ca marche.</b> Chaque source est
              interrogee en parallele sur les 30 derniers jours. Les resultats sont classes
              par engagement reel et par confirmation croisee entre sources, puis
              synthetises en une note sourcee.
            </div>
          </div>
        )}

        {/* Progression */}
        {phase === 'searching' && (
          <SearchingView sources={selectedIds} primaryColor={primaryColor} />
        )}

        {/* Resultats */}
        <AnimatePresence>
          {phase === 'done' && brief && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              {/* Badge */}
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: primaryColor,
                  fontFamily: 'ui-monospace, monospace',
                }}
              >
                {brief.badge}
              </div>

              {/* Resume */}
              <div
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}CC)`,
                  color: 'white',
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 800,
                    opacity: 0.85,
                    letterSpacing: 0.5,
                  }}
                >
                  <Sparkles size={13} /> SYNTHESE
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5, marginTop: 8 }}>
                  {brief.resume}
                </p>
              </div>

              {/* Constats */}
              {brief.findings.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1D2939' }}>
                    Ce qui ressort ({brief.findings.length})
                  </div>
                  {brief.findings.map((f, i) => (
                    <FindingCard
                      key={f.id}
                      finding={f}
                      rank={i}
                      primaryColor={primaryColor}
                    />
                  ))}
                </div>
              )}

              {/* Verbatims */}
              {brief.verbatims.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 800,
                      color: '#1D2939',
                    }}
                  >
                    <Quote size={14} color={primaryColor} /> Ce que dit la communaute
                  </div>
                  {brief.verbatims.map((v, i) => (
                    <div
                      key={`${v.url}-${i}`}
                      style={{
                        background: 'white',
                        borderLeft: `3px solid ${primaryColor}`,
                        borderRadius: 12,
                        padding: '10px 14px',
                      }}
                    >
                      <p
                        style={{
                          fontSize: 13.5,
                          fontStyle: 'italic',
                          color: '#344054',
                          lineHeight: 1.5,
                        }}
                      >
                        "{v.extrait}"
                      </p>
                      <div
                        style={{
                          fontSize: 11,
                          color: '#98A2B3',
                          marginTop: 6,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <span>{getSource(v.sourceId)?.emoji}</span>
                        {v.origine}
                        <Clock size={11} style={{ marginLeft: 4 }} /> il y a {v.ageJours}j
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pied de page en arbre */}
              <AgentTree brief={brief} />

              {/* Relancer */}
              <button
                onClick={() => lancer()}
                style={{
                  alignSelf: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  color: primaryColor,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 8,
                }}
              >
                Relancer la veille
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SubPageLayout>
  );
}

export default VeilleTrenteJours;
