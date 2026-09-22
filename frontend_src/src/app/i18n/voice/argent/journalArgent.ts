/**
 * JOURNAL D'ARGENT — demandé explicitement par Patrick.
 *
 *   « Pour chaque énoncé d'argent : valeur source · unité source · texte
 *     produit · chemin utilisé · drapeau expérimental actif ou non. »
 *
 * Module PUR : un anneau borné en mémoire et des abonnés. Aucun accès au
 * navigateur — c'est `speakMessage.ts` qui branche l'anneau sur le journal de
 * voix du lot E (`utils/voiceTrace`), comme il le fait déjà pour les replis.
 *
 * CE QUE CE JOURNAL PERMET DE CONSTATER APRÈS COUP, sur le rapport de test
 * d'un vrai téléphone :
 *   - qu'un montant est bien parti sous sa forme PARLÉE, et laquelle ;
 *   - qu'un montant a été REFUSÉ faute d'unité sémantique, et lequel ;
 *   - qu'un build avait la dérogation expérimentale allumée.
 *
 * Le drapeau expérimental n'est jamais une validation de justesse : il dit
 * seulement « ce build parlait une langue non validée sur l'argent ».
 */

/** Par où le nombre est sorti. Il n'y a pas de quatrième chemin. */
export type CheminArgent =
  /** Forme parlée dérivée d'un `MoneyUtterance` résolu — le chemin voulu. */
  | 'forme-parlee'
  /** Nombre en toutes lettres, sans unité monétaire (comptage déclaré). */
  | 'comptage-parle'
  /** REFUS : unité sémantique absente. Le nombre garde sa forme écrite. */
  | 'refus-unite-absente';

/** Une ligne de journal : les cinq champs demandés, plus de quoi s'y retrouver. */
export interface LigneJournalArgent {
  /** La clé du message et la variable concernée — pour retrouver la phrase. */
  readonly cle: string;
  readonly variable: string;
  readonly locale: string;
  /** VALEUR SOURCE : le nombre tel qu'il est entré, avant toute mise en forme. */
  readonly valeurSource: number;
  /** UNITÉ SOURCE : `null` quand elle manquait — c'est le cas qui refuse. */
  readonly uniteSource: string | null;
  /** TEXTE PRODUIT : ce qui part réellement à la voix pour cette variable. */
  readonly texteProduit: string;
  /** CHEMIN UTILISÉ. */
  readonly chemin: CheminArgent;
  /** DRAPEAU EXPÉRIMENTAL actif ou non au moment de l'énoncé. */
  readonly experimental: boolean;
}

const JOURNAL_MAX = 200;
const journal: LigneJournalArgent[] = [];
const abonnes = new Set<(l: LigneJournalArgent) => void>();

/** Écrit une ligne. Un observateur qui jette ne casse jamais la voix. */
export function journaliserArgent(ligne: LigneJournalArgent): void {
  journal.push(ligne);
  if (journal.length > JOURNAL_MAX) journal.shift();
  for (const cb of abonnes) {
    try { cb(ligne); } catch { /* un observateur ne casse jamais la voix */ }
  }
}

/** S'abonne aux énoncés d'argent ; rend la fonction de désabonnement. */
export function surEnonceArgent(cb: (l: LigneJournalArgent) => void): () => void {
  abonnes.add(cb);
  return () => { abonnes.delete(cb); };
}

export function journalArgent(): readonly LigneJournalArgent[] { return journal; }

export function viderJournalArgent(): void { journal.length = 0; }
