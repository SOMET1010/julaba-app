import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type TontineMouvementType = 'cotisation' | 'distribution';

/**
 * Journal APPEND-ONLY de chaque cotisation et chaque distribution d'une
 * tontine — même philosophie que `fidelite_evenements` (PR #190) et le
 * journal argent (ADR-001) : l'historique complet doit être reconstructible
 * sans jamais faire confiance à un seul solde/statut courant, et aucune ligne
 * n'est modifiée ou supprimée après écriture.
 *
 * - type='cotisation'   : membreId = le COTISANT, cycleNumero = le cycle pour
 *   lequel il cotise, montant = `tontines.montant_cotisation`.
 * - type='distribution' : membreId = le BÉNÉFICIAIRE (celui dont c'est le
 *   tour), cycleNumero = le même cycle que les cotisations qu'elle clôture,
 *   montant = montant_cotisation × nombre de membres.
 *
 * `walletTransactionId` pointe vers l'écriture `wallet_transactions` réelle
 * (débit du cotisant ou crédit du bénéficiaire) créée par WalletsService —
 * seul chemin autorisé pour bouger l'argent : cette table ne fait que TRACER
 * un mouvement wallet déjà effectué, jamais bouger l'argent elle-même.
 *
 * Contrainte d'unicité (tontine_id, membre_id, cycle_numero, type) : empêche
 * STRUCTURELLEMENT une double cotisation du même membre sur le même cycle, ou
 * une double distribution sur le même cycle — même défense en profondeur que
 * `ux_wallet_tx_commande_idempotence` (migration
 * 1780700000000-WalletTransactionCommandeIdempotence).
 */
@Entity('tontine_mouvements')
@Index('ux_tontine_mouvements_cycle', ['tontineId', 'membreId', 'cycleNumero', 'type'], { unique: true })
@Index('ix_tontine_mouvements_tontine', ['tontineId'])
export class TontineMouvement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tontine_id', type: 'uuid' })
  tontineId: string;

  @Column({ type: 'varchar', length: 20 })
  type: TontineMouvementType;

  @Column({ name: 'membre_id', type: 'uuid' })
  membreId: string;

  @Column({ name: 'cycle_numero', type: 'int' })
  cycleNumero: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  montant: number;

  @Column({ name: 'wallet_transaction_id', type: 'uuid' })
  walletTransactionId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
