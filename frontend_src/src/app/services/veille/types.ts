/**
 * JÙLABA — Veille 30 jours (moteur inspiré de last30days)
 * ========================================================
 * Types partages du moteur de recherche multi-sources.
 *
 * Le principe reprend le skill open-source last30days
 * (github.com/mvanhorn/last30days-skill) : interroger en parallele
 * plusieurs sources publiques, classer par engagement reel plutot
 * que par curation editoriale, dedupliquer les histoires communes,
 * puis synthetiser une note sourcee sur les 30 derniers jours.
 *
 * Ici la methodologie est appliquee a la veille des marches agricoles
 * ivoiriens (cacao, cafe, anacarde, hevea, riz, vivriers, etc.).
 */

/** Identifiant stable d'une source interrogeable. */
export type VeilleSourceId =
  | 'web'
  | 'news'
  | 'reddit'
  | 'x'
  | 'youtube'
  | 'hackernews'
  | 'gouv'
  | 'marches';

/** Categorie d'affichage d'une source. */
export type VeilleSourceKind = 'social' | 'media' | 'officiel' | 'marche';

/** Description d'une source du catalogue. */
export interface VeilleSource {
  id: VeilleSourceId;
  label: string;
  kind: VeilleSourceKind;
  /** Emoji utilise dans le pied de page en arbre. */
  emoji: string;
  /** Poids d'engagement relatif applique au classement. */
  weight: number;
  /** Source active par defaut dans l'interface. */
  defaultOn: boolean;
  /** Courte explication de ce que couvre la source. */
  hint: string;
}

/** Une preuve unitaire recoltee sur une source. */
export interface VeilleEvidence {
  sourceId: VeilleSourceId;
  /** Titre ou premiere ligne du contenu. */
  titre: string;
  /** Extrait ou verbatim communautaire (peut etre vide). */
  extrait?: string;
  /** Auteur, chaine, subreddit ou media d'origine. */
  origine: string;
  /** URL de la source (peut etre fictive en mode demonstration). */
  url: string;
  /** Metrique d'engagement brute (upvotes, vues, commentaires...). */
  engagement: number;
  /** Libelle de la metrique (ex: "upvotes", "vues"). */
  engagementLabel: string;
  /** Nombre de jours ecoules depuis la publication (0 a 30). */
  ageJours: number;
  /**
   * Identifiant du cluster/histoire auquel la preuve se rattache.
   * Permet a l'orchestrateur de regrouper les preuves confirmant un meme
   * fait (equivalent de la deduplication cross-source de last30days).
   * Optionnel : a defaut, l'orchestrateur regroupe par titre normalise.
   */
  cluster?: string;
  /** Titre lisible du constat associe au cluster. */
  clusterTitre?: string;
  /** Tonalite du constat pour le marche (portee par le cluster). */
  sentiment?: 'hausse' | 'baisse' | 'neutre' | 'alerte';
}

/** Un cluster de preuves confirmant un meme fait. */
export interface VeilleFinding {
  id: string;
  /** Phrase-titre du constat, en gras dans la synthese. */
  titre: string;
  /** Corps de synthese en prose (2 a 4 phrases). */
  synthese: string;
  /** Score final de classement (engagement x confirmation x recence). */
  score: number;
  /** Nombre de sources distinctes qui confirment le constat. */
  confirmationSources: number;
  /** Preuves rattachees au constat, deja triees par engagement. */
  preuves: VeilleEvidence[];
  /** Tonalite dominante du constat pour le marche. */
  sentiment: 'hausse' | 'baisse' | 'neutre' | 'alerte';
}

/** Parametres d'une recherche. */
export interface VeilleQuery {
  sujet: string;
  sources: VeilleSourceId[];
  /** Fenetre temporelle en jours (30 par defaut). */
  fenetreJours: number;
}

/** Ligne du pied de page en arbre (un agent par source). */
export interface VeilleAgentReport {
  sourceId: VeilleSourceId;
  emoji: string;
  label: string;
  /** Nombre de preuves rapportees par l'agent. */
  compte: number;
}

/** Resultat complet d'une recherche : la note de veille. */
export interface VeilleBrief {
  sujet: string;
  /** Ligne de badge en tete (jamais autre chose sur cette ligne). */
  badge: string;
  /** Date de synchronisation au format YYYY-MM-DD. */
  synced: string;
  /** Version du moteur. */
  version: string;
  /** Resume executif en une phrase. */
  resume: string;
  /** Constats classes du plus fort au plus faible. */
  findings: VeilleFinding[];
  /** Verbatims communautaires mis en avant. */
  verbatims: VeilleEvidence[];
  /** Rapport des agents pour le pied de page en arbre. */
  agents: VeilleAgentReport[];
  /** Nombre total de preuves collectees toutes sources confondues. */
  totalPreuves: number;
  fenetreJours: number;
}

/** Contrat d'un fournisseur de preuves (backend reel ou demonstration). */
export interface VeilleProvider {
  readonly id: string;
  collect(query: VeilleQuery): Promise<VeilleEvidence[]>;
}
