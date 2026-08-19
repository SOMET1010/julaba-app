import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type FideliteEvenementType = 'gain' | 'recompense';

/**
 * Journal APPEND-ONLY du programme de fidélité (Constitution §5 — « les
 * données sont le produit » : chaque mouvement est un événement immuable,
 * jamais une simple mise à jour de colonne).
 *
 * Avant cette entité, `POST /fidelite/gagner` et `POST /fidelite/utiliser`
 * ne faisaient que MUTER `fidelite_clients.points` (UPDATE en place) : aucune
 * preuve qu'une récompense a réellement été accordée, aucun historique
 * consultable, aucune protection contre un double crédit/débit en cas de
 * rejeu réseau. Cette table trace CHAQUE gain et CHAQUE récompense, avec le
 * solde de points APRÈS l'événement (`points_apres`) — un relevé complet
 * peut être reconstruit sans jamais faire confiance au seul solde courant.
 *
 * Idempotence : `idempotency_key` (fournie par le client, un par action)
 * rend `gagner`/`utiliser` rejouables sans double effet — même mécanisme que
 * `caisse_transactions.idempotency_key` (cf. CaisseTransaction).
 */
@Entity('fidelite_evenements')
export class FideliteEvenement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_fidelite_evenements_marchand_tel')
  @Column({ name: 'marchand_id', type: 'uuid' })
  marchandId: string;

  @Column({ name: 'client_id', type: 'uuid' })
  clientId: string;

  @Column({ type: 'varchar', length: 40 })
  telephone: string;

  // 'gain' (achat qualifiant crédité) | 'recompense' (récompense accordée).
  @Column({ type: 'varchar', length: 20 })
  type: FideliteEvenementType;

  // Signé : positif pour un gain, négatif (= -seuil_points au moment de
  // l'octroi) pour une récompense.
  @Column({ name: 'points_delta', type: 'numeric' })
  pointsDelta: number;

  // Solde du client APRÈS l'événement — permet de vérifier l'historique sans
  // dépendre du solde courant (qui, lui, peut être recalculé/audité).
  @Column({ name: 'points_apres', type: 'numeric' })
  pointsApres: number;

  @Column({ name: 'montant_achat', type: 'numeric', nullable: true })
  montantAchat: number | null;

  @Column({ name: 'remise_fcfa', type: 'numeric', nullable: true })
  remiseFcfa: number | null;

  // Un par action ; NULL toléré pour un appel legacy sans clé (pas de
  // déduplication possible dans ce cas, comme pour caisse_transactions).
  @Column({ name: 'idempotency_key', type: 'varchar', length: 120, nullable: true })
  idempotencyKey: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
