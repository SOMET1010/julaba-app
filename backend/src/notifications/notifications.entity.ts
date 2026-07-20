import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, DeleteDateColumn } from "typeorm";

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column({ nullable: true })
  role: string;

  @Column()
  type: string;

  @Column()
  titre: string;

  @Column()
  message: string;

  @Column({ default: "medium" })
  priority: string;

  @Column({ name: "is_read", default: false })
  isRead: boolean;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  icon: string;

  @Column({ type: "jsonb", nullable: true })
  metadata: any;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @DeleteDateColumn({ name: "deleted_at", nullable: true })
  deletedAt: Date | null;
}
