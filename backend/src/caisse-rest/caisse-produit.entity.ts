import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

// ─────────────────────────────────────────────────────────────────────────────
// CATALOGUE PRODUITS GLOBAL (vivriers) — table `caisse_produits`.
//
// INIT-012 : ce catalogue vivait en dur dans `caisse-rest.controller.ts`
// (constante `CATALOGUE` de 21 produits + 2ᵉ classe `CatalogueController`).
// La table est désormais créée et seedée par `DbInitService` (DDL idempotent +
// seed si vide), et les routes `GET /catalogue` et `GET /catalogue/categories`
// délèguent à `CaisseProduitsService`.
//
// Différence avec `catalogue_maitre` (miroir du référentiel Odoo) :
//   - `caisse_produits` = catalogue vivrier LOCAL, sans lien Odoo, prix indicatifs
//     d'achat/vente pour faciliter la saisie guidée d'une marchande.
//   - `catalogue_maitre` = référentiel maître Odoo SANS prix ni stock (adoptable).
// Les deux coexistent volontairement : l'un est un référentiel distant, l'autre
// un aide-mémoire local de produits du marché ivoirien.
//
// `mots_cles` est un tableau PostgreSQL natif (`text[]`) : la recherche par
// mot-clé se fait en SQL via `ANY(mots_cles) ILIKE …` (cf. service).
// ─────────────────────────────────────────────────────────────────────────────

@Entity('caisse_produits')
@Index('idx_caisse_produits_nom', ['nom'])
@Index('idx_caisse_produits_categorie', ['categorie'])
export class CaisseProduit {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'text' }) nom: string;

  @Column({ type: 'text', nullable: true }) categorie: string | null;

  @Column({ type: 'text', nullable: true }) unite: string | null;

  // Prix indicatifs (XOF). Servent d'aide à la saisie : une marchande adopte
  // un produit de son catalogue personnel (`produits`) avec SON prix à elle.
  // Ne sont JAMAIS vendus directement depuis cette table.
  @Column({ type: 'numeric', default: 0 }) prix_achat: number;
  @Column({ type: 'numeric', default: 0 }) prix_vente: number;

  // Mots-clés de recherche (synonymes, traductions : ['riz', 'rice']).
  @Column({ type: 'text', array: true, default: '{}' }) mots_cles: string[];

  @Column({ type: 'boolean', default: true }) actif: boolean;

  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
