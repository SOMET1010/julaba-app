import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Stock } from './stock.entity';

@UseGuards(JwtAuthGuard)
@Controller('stocks')
export class StocksRestController {
  constructor(@InjectRepository(Stock) private repo: Repository<Stock>) {}

  @Get()
  async findAll(@CurrentUser() user: User) {
    const produits = await this.repo.manager.query(
      'SELECT id, nom, stock, prix, prix_achat, unite, categorie, actif, image, seuil_alerte, date_peremption, created_at FROM produits WHERE marchand_id = $1',
      [user.id]
    );
    if (produits && produits.length > 0) {
      return {
        stocks: produits.map((p: any) => ({
          id: p.id,
          produit: p.nom,
          nom: p.nom,
          quantite: Number(p.stock) || 0,
          prix: Number(p.prix) || 0,
          prix_achat: Number(p.prix_achat) || 0,
          unite: p.unite || 'unite',
          categorie: p.categorie || 'General',
          actif: p.actif !== false,
          image: p.image || null,
          seuil_alerte: p.seuil_alerte != null ? Number(p.seuil_alerte) : 10,
          date_peremption: p.date_peremption || null,
          proprietaire_id: user.id,
          created_at: p.created_at,
        })),
      };
    }
    const rows = await this.repo.query(
      `SELECT * FROM stocks WHERE proprietaire_id = $1::uuid ORDER BY created_at DESC`,
      [user.id],
    );
    return {
      stocks: rows.map((s: any) => ({
        id: s.id,
        produit: s.produit,
        nom: s.produit,
        quantite: Number(s.quantite) || 0,
        quantity: Number(s.quantite) || 0,
        prix: Number(s.prix_vente) || 0,
        prix_achat: Number(s.prix_achat) || 0,
        prix_vente: Number(s.prix_vente) || 0,
        unite: s.unite || 'kg',
        categorie: s.categorie || 'General',
        seuil_alerte: Number(s.seuil_alerte) || 10,
        image: s.image || null,
        proprietaire_id: user.id,
        created_at: s.created_at,
      })),
    };
  }

  @Post()
  async create(@Body() body: any, @CurrentUser() user: User) {
    if (user.role === 'cooperateur' || user.role === 'producteur') {
      const rows = await this.repo.manager.query(
        `INSERT INTO stocks (produit, quantite, unite, prix_achat, prix_vente, seuil_alerte, categorie, image, proprietaire_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [body.nom || body.produit, Number(body.quantite) || 0, body.unite || 'kg',
         Number(body.prix_achat) || 0, Number(body.prix) || Number(body.prix_vente) || 0,
         Number(body.seuil_alerte) || 10, body.categorie || 'General', body.image || null, user.id]
      );
      return rows[0];
    }
    return this.repo.manager.query(
      `INSERT INTO produits (marchand_id, nom, stock, prix, prix_achat, unite, categorie, image, seuil_alerte, date_peremption, actif)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true) RETURNING *`,
      [user.id, body.nom || body.produit, Number(body.quantite) || 0, Number(body.prix) || 0,
       Number(body.prix_achat) || 0, body.unite || 'unite', body.categorie || 'General', body.image || null,
       body.seuil_alerte != null ? Number(body.seuil_alerte) : 10, body.date_peremption || null]
    ).then((r: any) => r[0]);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: User) {
    if (user.role === 'cooperateur' || user.role === 'producteur') {
      await this.repo.manager.query(
        `UPDATE stocks SET produit=COALESCE($1,produit), quantite=COALESCE($2,quantite),
         prix_achat=COALESCE($3,prix_achat), prix_vente=COALESCE($4,prix_vente),
         unite=COALESCE($5,unite), categorie=COALESCE($6,categorie), seuil_alerte=COALESCE($7,seuil_alerte),
         image=COALESCE($8,image), updated_at=now()
         WHERE id=$9 AND proprietaire_id=$10`,
        [body.nom||body.produit||null, body.quantite!=null?Number(body.quantite):null,
         body.prix_achat!=null?Number(body.prix_achat):null,
         body.prix_vente!=null?Number(body.prix_vente):body.prix!=null?Number(body.prix):null,
         body.unite||null, body.categorie||null,
         body.seuil_alerte!=null?Number(body.seuil_alerte):null,
         body.image||null, id, user.id]
      );
      return { success: true };
    }
    await this.repo.manager.query(
      `UPDATE produits SET nom=COALESCE($1,nom), stock=COALESCE($2,stock), prix=COALESCE($3,prix),
       prix_achat=COALESCE($4,prix_achat), unite=COALESCE($5,unite), categorie=COALESCE($6,categorie),
       seuil_alerte=COALESCE($7,seuil_alerte), date_peremption=COALESCE($8,date_peremption), updated_at=now()
       WHERE id=$9 AND marchand_id=$10`,
      [body.nom||body.produit||null, body.quantite!=null?Number(body.quantite):null,
       body.prix!=null?Number(body.prix):null,
       body.prix_achat!=null?Number(body.prix_achat):null,
       body.unite||null, body.categorie||null,
       body.seuil_alerte!=null?Number(body.seuil_alerte):null,
       body.date_peremption||null, id, user.id]
    );
    return { success: true };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    if (user.role === 'cooperateur' || user.role === 'producteur') {
      await this.repo.manager.query('DELETE FROM stocks WHERE id=$1 AND proprietaire_id=$2', [id, user.id]);
      return { success: true };
    }
    await this.repo.manager.query('DELETE FROM produits WHERE id=$1 AND marchand_id=$2', [id, user.id]);
    return { success: true };
  }
}
