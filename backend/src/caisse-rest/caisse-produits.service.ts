import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CaisseProduit } from './caisse-produit.entity';

// ─────────────────────────────────────────────────────────────────────────────
// Service du catalogue vivrier local (table `caisse_produits`).
//
// INIT-012 : remplace le tableau hardcodé `CATALOGUE` de
// `caisse-rest.controller.ts`. La donnée vit en base, seedée au démarrage par
// `DbInitService` (idempotent : ne réinjecte rien si la table contient déjà
// des lignes).
//
// Aucun prix n'est vendable depuis cette table : c'est un aide-mémoire. Une
// marchande qui veut vendre adopte une référence dans sa propre table
// `produits` (avec son prix à elle). La séparation est la même que pour
// `catalogue_maitre` : référentiel ≠ stock vendable.
// ─────────────────────────────────────────────────────────────────────────────

export interface CategorieCatalogue {
  categorie: string;
}

@Injectable()
export class CaisseProduitsService {
  private readonly logger = new Logger(CaisseProduitsService.name);

  constructor(
    @InjectRepository(CaisseProduit) private readonly repo: Repository<CaisseProduit>,
  ) {}

  /**
   * Liste tous les produits actifs du catalogue, optionnellement filtrés par
   * catégorie. Aucun filtre marchand : ce catalogue est GLOBAL, pas personnel.
   */
  async lister(categorie?: string): Promise<CaisseProduit[]> {
    const where = categorie
      ? { actif: true, categorie }
      : { actif: true };
    return this.repo.find({ where, order: { nom: 'ASC' } });
  }

  /**
   * Recherche plein-texte sur le nom et les mots-clés. Le terme est normalisé
   * en minuscules et cherché en ILIKE sur le nom + n'importe quel mot-clé du
   * tableau (`mots_cles ILIKE ANY(...)`).
   *
   * Préserve la sémantique de l'ancien `CatalogueController.findAll` :
   * `q='riz'` → matche `Riz` (nom) ET `rice` (mot-clé).
   *
   * Si `categorie` est fournie, la recherche est restreinte à cette catégorie
   * (comportement historique : l'ancien code filtrait par `categorie` d'abord,
   * puis par `q` sur le sous-ensemble — cf. `CatalogueController.findAll`).
   */
  async recherche(term: string, categorie?: string): Promise<CaisseProduit[]> {
    const q = (term ?? '').trim().toLowerCase();
    if (!q) return this.lister(categorie);
    // `EXISTS (SELECT 1 FROM unnest(p.mots_cles) AS mc WHERE LOWER(mc) LIKE :q)`
    // préserve la sémantique historique `mc.includes(lq)` (sous-chaîne) en
    // encadrant le terme de `%`.
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.actif = :actif', { actif: true })
      .andWhere('(LOWER(p.nom) LIKE :q OR EXISTS (SELECT 1 FROM unnest(p.mots_cles) AS mc WHERE LOWER(mc) LIKE :q))', { q: `%${q}%` });
    if (categorie) {
      qb.andWhere('p.categorie = :categorie', { categorie });
    }
    return qb.orderBy('p.nom', 'ASC').getMany();
  }

  /**
   * Auto-complétion : préfixe sur le nom. Plus efficace que `recherche` pour
   * le cas "l'utilisateur tape les premières lettres". Renvoie les noms
   * distincts (sans doublons).
   */
  async suggestions(prefix: string, limit = 20): Promise<string[]> {
    const p = (prefix ?? '').trim().toLowerCase();
    if (!p) return [];
    const plafond = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const lignes = await this.repo
      .createQueryBuilder('p')
      .select('DISTINCT p.nom', 'nom')
      .where('p.actif = :actif', { actif: true })
      .andWhere('LOWER(p.nom) LIKE :p', { p: `${p}%` })
      .orderBy('p.nom', 'ASC')
      .limit(plafond)
      .getRawMany<{ nom: string }>();
    return lignes.map((l) => l.nom);
  }

  /** Catégories distinctes du catalogue, triées alphabétiquement. */
  async categories(): Promise<string[]> {
    const lignes = await this.repo
      .createQueryBuilder('p')
      .select('DISTINCT p.categorie', 'categorie')
      .where('p.actif = :actif', { actif: true })
      .andWhere('p.categorie IS NOT NULL')
      .orderBy('p.categorie', 'ASC')
      .getRawMany<{ categorie: string }>();
    return lignes.map((l) => l.categorie);
  }
}
