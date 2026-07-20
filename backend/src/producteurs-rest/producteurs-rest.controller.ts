import {
  Controller,
  Get,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

type CoopRow = {
  cooperative_id: string;
  cooperative_nom: string;
  coop_commune_id: string | null;
  coop_commune_nom: string | null;
  coop_lat: number | null;
  coop_lng: number | null;
};

type RecolteRow = {
  producteur_id: string;
  first_name: string | null;
  last_name: string | null;
  culture: string;
  date_recolte_estimee: string;
  quantite_estimee: string;
  prod_commune_id: string | null;
  prod_commune_nom: string | null;
  prod_lat: number | null;
  prod_lng: number | null;
};

@Controller('producteurs')
export class ProducteursRestController {
  constructor(private dataSource: DataSource) {}

  /**
   * Recoltes prevues a proximite, pour un marchand grossiste.
   * Une ligne par producteur = sa recolte la plus proche (cycle actif, date estimee future).
   * Distance Haversine entre la commune de la cooperative du grossiste et celle du producteur.
   * Tri par distance croissante ; producteur sans commune resolue en fin de liste (distance null).
   */
  @UseGuards(JwtAuthGuard)
  @Get('recoltes-prevues')
  async recoltesPrevues(@CurrentUser() user: User) {
    const role = String(user?.role || '').toLowerCase();
    if (role !== 'marchand' || user?.sousProfilMarchand !== 'grossiste') {
      throw new ForbiddenException('Récoltes prévues réservées aux grossistes');
    }

    const coopRows: CoopRow[] = await this.dataSource.query(
      `SELECT co.id AS cooperative_id, co.nom AS cooperative_nom,
              co.commune_id AS coop_commune_id,
              cm.nom AS coop_commune_nom,
              cm.latitude AS coop_lat, cm.longitude AS coop_lng
       FROM cooperative_membres m
       JOIN cooperatives co ON co.id = m.cooperative_id
       LEFT JOIN communes cm ON cm.id = co.commune_id
       WHERE m.membre_id = $1 AND m.actif = true
       LIMIT 1`,
      [user.id],
    );

    if (!coopRows || coopRows.length === 0) {
      return { cooperative: null, recoltes: [] };
    }
    const coop = coopRows[0];

    const rows: RecolteRow[] = await this.dataSource.query(
      `SELECT DISTINCT ON (c.user_id)
              c.user_id AS producteur_id,
              u.first_name, u.last_name,
              c.culture,
              c.date_recolte_estimee::text AS date_recolte_estimee,
              c.quantite_estimee,
              u.commune_id AS prod_commune_id,
              cm.nom AS prod_commune_nom,
              cm.latitude AS prod_lat, cm.longitude AS prod_lng
       FROM cycles c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN communes cm ON cm.id = u.commune_id
       WHERE c.status = 'active' AND c.date_recolte_estimee >= CURRENT_DATE
       ORDER BY c.user_id, c.date_recolte_estimee ASC`,
    );

    const coopLat = coop.coop_lat === null ? null : Number(coop.coop_lat);
    const coopLng = coop.coop_lng === null ? null : Number(coop.coop_lng);

    const recoltes = rows
      .map((r) => {
        const prodLat = r.prod_lat === null ? null : Number(r.prod_lat);
        const prodLng = r.prod_lng === null ? null : Number(r.prod_lng);
        const prenom = r.first_name || '';
        const nom = r.last_name || '';
        return {
          producteurId: r.producteur_id,
          producteurNom: `${prenom} ${nom}`.trim() || null,
          culture: r.culture,
          dateRecolteEstimee: r.date_recolte_estimee,
          quantiteEstimee: Number(r.quantite_estimee),
          commune: r.prod_commune_nom,
          distanceKm: this.haversineKm(coopLat, coopLng, prodLat, prodLng),
        };
      })
      .sort((a, b) => {
        if (a.distanceKm === null && b.distanceKm === null) return 0;
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });

    return {
      cooperative: {
        id: coop.cooperative_id,
        nom: coop.cooperative_nom,
        commune: coop.coop_commune_nom,
      },
      recoltes,
    };
  }

  private haversineKm(
    lat1: number | null,
    lng1: number | null,
    lat2: number | null,
    lng2: number | null,
  ): number | null {
    if (lat1 === null || lng1 === null || lat2 === null || lng2 === null) {
      return null;
    }
    const R = 6371;
    const toRad = (d: number): number => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }
}
