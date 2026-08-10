import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from "typeorm";

// Journal append-only cote serveur (remontee offline-first, presentation V2 slide 11).
// On stocke des MOUVEMENTS horodates, jamais un total. L'etat (stock, caisse) est
// recalcule par rejeu (BoutiqueService.etat). L'id est genere sur l'appareil et
// sert de cle d'idempotence : un meme mouvement remonte deux fois n'a aucun effet.
@Entity("boutique_mouvements")
export class BoutiqueMouvement {
  @PrimaryColumn("uuid")
  id: string;

  @Index()
  @Column("uuid")
  marchand_id: string;

  @Column()
  device: string;

  @Column()
  type: string; // vente | depense | reappro | solde

  @Column({ nullable: true })
  produit: string | null;

  @Column({ type: "numeric", nullable: true })
  quantite: number | null;

  @Column({ type: "numeric", nullable: true })
  montant: number | null;

  @Column({ type: "text", nullable: true })
  transcription: string | null;

  // Horodatage client (ms epoch). bigint -> renvoye en string par TypeORM/pg.
  @Column({ type: "bigint" })
  ts: string;

  @CreateDateColumn()
  created_at: Date;
}
