import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

// ──────────────────────────────────────────────────────────────────────────
// code-recuperation.entity.ts — LE CODE QUI REND SA CAISSE (SPEC-AUTH-CIBLE §3).
//
// Le scénario le plus dur : réinstallation, téléphone neuf, téléphone perdu.
// L'identifiant WebAuthn est lié à l'appareil — il disparaît avec lui. La
// récupération s'appuie sur un code détenu par l'identificateur/l'agent :
// À USAGE UNIQUE, HORODATÉ, TRACÉ CÔTÉ SERVEUR, VÉRIFIÉ CÔTÉ SERVEUR, et
// RÉVOCABLE — jamais improvisé dans les routes existantes (AUTH-RECOVERY-01,
// arbitrage Patrick 19/09 : rouvrirait SEC-05).
//
// POURQUOI UNE TABLE ET PAS UN CHAMP SUR USER. Un compte peut avoir eu PLUSIEURS
// codes dans sa vie (un par incident) ; chaque code porte son propre état
// (actif → consommé / révoqué), son propre compteur d'échecs et son propre
// verrou. Sur la ligne user, tout ça serait un JSONB illisible et non traçable.
//
// POURQUOI UN HASH ET PAS UN CHIFFREMENT (PinCrypto). Le PIN d'identificateur
// est UN SECRET VIVANT qu'on doit parfois relire (changement de PIN : ancien
// contre nouveau) → AES réversible assumé là-bas. Un code de récupération ne se
// relit JAMAIS : il naît, il est montré UNE fois à qui le remet, puis seuls son
// hash et son état restent. Un dump de la base ne révèle donc AUCUN code —
// bcrypt (coût élevé, sel intégré) rend la force brute hors-ligne vaine sur un
// espace déjà grand (8 caractères, ~40 bits).
//
// ANTI-ABUS INTÉGRÉ À LA LIGNE. `echecs` + `verrou_le` appliquent CÔTÉ SERVEUR
// la même échelle d'attente que le code secret (verrou-pin.ts) : un attaquant
// qui sonde /initier ralentit sur la ligne du code, pas seulement au throttler
// global (SPEC-AUTH-CIBLE §4.4 — toute limitation côté serveur, jamais client).
// ──────────────────────────────────────────────────────────────────────────

/** Statuts d'un code : vivant, servi (parcours mené au bout), ou tué par un admin. */
export const STATUTS_CODE_RECUPERATION = ['actif', 'consomme', 'revoque'] as const;
export type StatutCodeRecuperation = (typeof STATUTS_CODE_RECUPERATION)[number];

@Entity('codes_recuperation')
@Index(['userId', 'statut'])
export class CodeRecuperation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Le compte QUE CE CODE PERMET DE RÉ-ENRÔLER — jamais celui du détenteur. */
  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  /** bcrypt du code — le code en clair n'existe nulle part après la création. */
  @Column({ name: 'code_hash', length: 255 })
  codeHash: string;

  @Column({ default: 'actif' })
  statut: StatutCodeRecuperation;

  /** Qui a fait naître le code (admin/agent — le détenteur, lui, est physique). */
  @Column({ name: 'genere_par', type: 'uuid', nullable: true })
  generePar: string | null;

  @Column({ name: 'expire_le', type: 'timestamptz', nullable: true })
  expireLe: Date | null;

  @Column({ name: 'consomme_le', type: 'timestamptz', nullable: true })
  consommeLe: Date | null;

  @Column({ name: 'revoque_le', type: 'timestamptz', nullable: true })
  revoqueLe: Date | null;

  @Column({ name: 'revoque_par', type: 'uuid', nullable: true })
  revoquePar: string | null;

  /** Échecs consécutifs de présentation du code — l'échelle d'attente serveur. */
  @Column({ default: 0 })
  echecs: number;

  @Column({ name: 'verrou_le', type: 'timestamptz', nullable: true })
  verrouLe: Date | null;

  @CreateDateColumn({ name: 'genere_le' })
  genereLe: Date;
}
