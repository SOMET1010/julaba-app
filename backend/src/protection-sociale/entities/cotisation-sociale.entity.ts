import { Entity, PrimaryColumn, Column, CreateDateColumn, Index, Check } from 'typeorm';

export type OrganismeSocial = 'CNPS' | 'CNAM';
export type ModePaiementCotisation = 'especes' | 'keiwa' | 'mobile_money';

/**
 * Journal APPEND-ONLY des cotisations sociales déclarées par la commerçante
 * (CNPS retraite / CNAM santé) — écran « Protection sociale ».
 *
 * Avant cette entité, tout vivait dans `localStorage`
 * (`protectionSociale.service.ts`, `SourceLocale`) : rien de consultable côté
 * serveur, rien de rattaché au wallet. Cette table persiste réellement chaque
 * versement déclaré, et — quand `mode = 'keiwa'` — le rattache à l'écriture
 * `wallet_transactions` qui a réellement débité le compte (cf.
 * ProtectionSocialeController, même patron que le paiement Keiwa d'une
 * commande : CommandesRestController#recupererPaiement).
 *
 * Portée assumée (cf. docs/PARCOURS.md) : ceci reste un suivi DÉCLARATIF fait
 * par la commerçante elle-même pour son propre provisionnement — aucune
 * connexion à la vraie API CNPS/CNAM (qui n'existe pas). Seul change le lieu
 * de stockage (backend réel au lieu de localStorage) et la réalité du
 * mouvement d'argent quand elle choisit « keiwa ».
 *
 * APPEND-ONLY comme `fidelite_evenements` (Constitution §5) : jamais
 * d'UPDATE/DELETE sur une cotisation existante — une correction se fait en
 * enregistrant un nouvel événement, jamais en réécrivant l'historique. Il n'y
 * a donc volontairement AUCUNE route de suppression.
 */
@Entity('cotisations_sociales')
@Index('idx_cotisations_sociales_user', ['userId', 'createdAt'])
@Check(
  'ck_cotisations_sociales_keiwa_tx',
  `(mode = 'keiwa' AND wallet_transaction_id IS NOT NULL) OR (mode <> 'keiwa' AND wallet_transaction_id IS NULL)`,
)
@Check('ck_cotisations_sociales_organisme', `organisme IN ('CNPS', 'CNAM')`)
@Check('ck_cotisations_sociales_mode', `mode IN ('especes', 'keiwa', 'mobile_money')`)
@Check('ck_cotisations_sociales_montant', `montant > 0`)
export class CotisationSociale {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 10 })
  organisme: OrganismeSocial;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  montant: number;

  // Mois couvert par le versement, ex. « 2026-08 ».
  @Column({ type: 'varchar', length: 7 })
  periode: string;

  @Column({ name: 'date_paiement', type: 'timestamptz' })
  datePaiement: Date;

  @Column({ type: 'varchar', length: 20 })
  mode: ModePaiementCotisation;

  // Renseigné uniquement quand mode = 'keiwa' : id de l'écriture
  // wallet_transactions (type='debit') qui a réellement débité le compte.
  // NULL pour espèces/mobile money (aucun mouvement wallet, simple
  // déclaration).
  @Column({ name: 'wallet_transaction_id', type: 'uuid', nullable: true })
  walletTransactionId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
