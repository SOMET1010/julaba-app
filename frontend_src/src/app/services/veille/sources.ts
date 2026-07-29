/**
 * JÙLABA — Veille 30 jours : catalogue des sources
 * ================================================
 * Reprend l'esprit multi-sources de last30days : reseaux sociaux,
 * medias, sources officielles et donnees de marche. Chaque source
 * porte un poids d'engagement et un emoji pour le pied de page en arbre.
 */
import type { VeilleSource, VeilleSourceId } from './types';

export const VEILLE_SOURCES: VeilleSource[] = [
  {
    id: 'web',
    label: 'Web',
    kind: 'media',
    emoji: '🌐',
    weight: 1.0,
    defaultOn: true,
    hint: 'Recherche web generale sur les 30 derniers jours.',
  },
  {
    id: 'news',
    label: 'Presse',
    kind: 'media',
    emoji: '📰',
    weight: 1.15,
    defaultOn: true,
    hint: 'Medias et agences (prix, recoltes, exportations).',
  },
  {
    id: 'marches',
    label: 'Cours & marches',
    kind: 'marche',
    emoji: '📈',
    weight: 1.4,
    defaultOn: true,
    hint: 'Cours des matieres premieres et places de marche.',
  },
  {
    id: 'gouv',
    label: 'Officiel',
    kind: 'officiel',
    emoji: '🏛️',
    weight: 1.3,
    defaultOn: true,
    hint: 'Conseil du Cafe-Cacao, ministeres, ANSUT, texte officiel.',
  },
  {
    id: 'x',
    label: 'X',
    kind: 'social',
    emoji: '🐦',
    weight: 0.9,
    defaultOn: true,
    hint: 'Fil X/Twitter des acteurs et journalistes filiere.',
  },
  {
    id: 'reddit',
    label: 'Reddit',
    kind: 'social',
    emoji: '👽',
    weight: 0.85,
    defaultOn: false,
    hint: 'Discussions communautaires et commentaires.',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    kind: 'social',
    emoji: '▶️',
    weight: 0.8,
    defaultOn: false,
    hint: 'Reportages video et transcriptions.',
  },
  {
    id: 'hackernews',
    label: 'Hacker News',
    kind: 'social',
    emoji: '🟠',
    weight: 0.6,
    defaultOn: false,
    hint: 'Agritech et signaux marches internationaux.',
  },
];

const BY_ID = new Map<VeilleSourceId, VeilleSource>(
  VEILLE_SOURCES.map((s) => [s.id, s]),
);

export function getSource(id: VeilleSourceId): VeilleSource | undefined {
  return BY_ID.get(id);
}

export function defaultSourceIds(): VeilleSourceId[] {
  return VEILLE_SOURCES.filter((s) => s.defaultOn).map((s) => s.id);
}
