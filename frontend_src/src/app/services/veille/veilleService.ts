/**
 * JÙLABA — Veille 30 jours : orchestrateur
 * ========================================
 * Transforme les preuves brutes d'un fournisseur en une note de veille
 * classee et synthetisee, dans l'esprit de last30days :
 *  - regroupement des preuves confirmant un meme fait (cluster) ;
 *  - classement par engagement reel x confirmation cross-source x recence ;
 *  - mise en avant de verbatims communautaires ;
 *  - pied de page en arbre "agents reported back".
 *
 * Le moteur est agnostique du fournisseur : brancher un backend reel
 * revient a fournir un VeilleProvider a runVeille().
 */
import { getSource } from './sources';
import type {
  VeilleAgentReport,
  VeilleBrief,
  VeilleEvidence,
  VeilleFinding,
  VeilleProvider,
  VeilleQuery,
  VeilleSourceId,
} from './types';

export const VEILLE_VERSION = '1.0.0';

/* ── Utilitaires ────────────────────────────────────────────────── */

function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function clusterKey(ev: VeilleEvidence): string {
  return ev.cluster ?? normalizeTitle(ev.titre);
}

function sentimentFromTitle(t: string): VeilleFinding['sentiment'] {
  const s = t.toLowerCase();
  if (/(alerte|craindre|deficit|compromis|risque|tension|penurie)/.test(s)) return 'alerte';
  if (/(hausse|dope|ferme|rebond|soutien|monte|repart|tire vers le haut)/.test(s))
    return 'hausse';
  if (/(baisse|chute|recul|effondre|deprime)/.test(s)) return 'baisse';
  return 'neutre';
}

/** Engagement pondere par le poids de la source et decru avec l'age. */
function weightedEngagement(ev: VeilleEvidence, fenetreJours: number): number {
  const src = getSource(ev.sourceId);
  const weight = src?.weight ?? 1;
  const recency = Math.max(0.35, 1 - ev.ageJours / (fenetreJours + 4));
  return ev.engagement * weight * recency;
}

/* ── Synthese en prose d'un constat ─────────────────────────────── */

const SENTIMENT_LEAD: Record<VeilleFinding['sentiment'], string> = {
  hausse: 'Signal favorable',
  baisse: 'Signal a la baisse',
  alerte: 'Point de vigilance',
  neutre: 'A suivre',
};

function synthese(finding: Omit<VeilleFinding, 'synthese'>): string {
  const nb = finding.confirmationSources;
  const sources = finding.preuves
    .map((p) => getSource(p.sourceId)?.label)
    .filter((v, i, a): v is string => Boolean(v) && a.indexOf(v) === i);
  const top = finding.preuves[0];
  const lead = SENTIMENT_LEAD[finding.sentiment];
  const confirm =
    nb > 1
      ? `Confirme par ${nb} sources (${sources.slice(0, 3).join(', ')}).`
      : `Signale par ${sources[0] ?? 'une source'}.`;
  const detail = top ? ` En tete : "${top.titre}" via ${top.origine}.` : '';
  return `${lead}. ${confirm}${detail}`;
}

/* ── Construction des constats ──────────────────────────────────── */

function buildFindings(
  evidences: VeilleEvidence[],
  fenetreJours: number,
): VeilleFinding[] {
  const groups = new Map<string, VeilleEvidence[]>();
  for (const ev of evidences) {
    const key = clusterKey(ev);
    const arr = groups.get(key);
    if (arr) arr.push(ev);
    else groups.set(key, [ev]);
  }

  const findings: VeilleFinding[] = [];
  for (const [key, group] of groups) {
    const preuves = [...group].sort(
      (a, b) => weightedEngagement(b, fenetreJours) - weightedEngagement(a, fenetreJours),
    );
    const distinctSources = new Set(preuves.map((p) => p.sourceId)).size;
    const engagementTotal = preuves.reduce(
      (sum, p) => sum + weightedEngagement(p, fenetreJours),
      0,
    );
    // Confirmation cross-source : bonus multiplicatif par source distincte.
    const confirmationBoost = 1 + (distinctSources - 1) * 0.5;
    const score = Math.round(engagementTotal * confirmationBoost);
    const titre = preuves[0]?.clusterTitre ?? group[0]?.titre ?? key;
    const sentiment =
      preuves.find((p) => p.sentiment)?.sentiment ?? sentimentFromTitle(titre);

    const partial = {
      id: key,
      titre,
      score,
      confirmationSources: distinctSources,
      preuves,
      sentiment,
    };
    findings.push({ ...partial, synthese: synthese(partial) });
  }

  return findings.sort((a, b) => b.score - a.score);
}

/* ── Verbatims communautaires ───────────────────────────────────── */

function pickVerbatims(evidences: VeilleEvidence[]): VeilleEvidence[] {
  const social: VeilleSourceId[] = ['x', 'reddit', 'youtube', 'hackernews'];
  return evidences
    .filter((e) => e.extrait && social.includes(e.sourceId))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 3);
}

/* ── Rapport des agents (pied de page en arbre) ─────────────────── */

function buildAgents(
  requested: VeilleSourceId[],
  evidences: VeilleEvidence[],
): VeilleAgentReport[] {
  const counts = new Map<VeilleSourceId, number>();
  for (const e of evidences) counts.set(e.sourceId, (counts.get(e.sourceId) ?? 0) + 1);
  return requested
    .map((id) => {
      const src = getSource(id);
      if (!src) return null;
      return {
        sourceId: id,
        emoji: src.emoji,
        label: src.label,
        compte: counts.get(id) ?? 0,
      } satisfies VeilleAgentReport;
    })
    .filter((v): v is VeilleAgentReport => v !== null);
}

/* ── Resume executif ────────────────────────────────────────────── */

function buildResume(sujet: string, findings: VeilleFinding[], total: number): string {
  if (findings.length === 0) {
    return `Aucun signal notable sur "${sujet}" dans la fenetre analysee. Elargissez les sources ou reformulez le sujet.`;
  }
  const haussiers = findings.filter((f) => f.sentiment === 'hausse').length;
  const alertes = findings.filter((f) => f.sentiment === 'alerte').length;
  const tete = findings[0].titre.charAt(0).toLowerCase() + findings[0].titre.slice(1);
  const climat =
    alertes > haussiers
      ? 'climat prudent'
      : haussiers > 0
        ? 'climat plutot porteur'
        : 'climat stable';
  return `Sur "${sujet}", ${total} preuves analysees font ressortir un ${climat}. Constat dominant : ${tete}.`;
}

/* ── Date de synchronisation ────────────────────────────────────── */

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* ── Point d'entree ─────────────────────────────────────────────── */

export interface RunVeilleOptions {
  provider: VeilleProvider;
  /** Injection de la date pour les tests (defaut : maintenant). */
  now?: Date;
}

export async function runVeille(
  query: VeilleQuery,
  options: RunVeilleOptions,
): Promise<VeilleBrief> {
  const { provider } = options;
  const now = options.now ?? new Date();
  const evidences = await provider.collect(query);

  const findings = buildFindings(evidences, query.fenetreJours);
  const verbatims = pickVerbatims(evidences);
  const agents = buildAgents(query.sources, evidences);
  const synced = isoDay(now);

  return {
    sujet: query.sujet,
    badge: `🌐 Veille ${VEILLE_VERSION} · ${query.fenetreJours} jours · synced ${synced}`,
    synced,
    version: VEILLE_VERSION,
    resume: buildResume(query.sujet, findings, evidences.length),
    findings,
    verbatims,
    agents,
    totalPreuves: evidences.length,
    fenetreJours: query.fenetreJours,
  };
}
