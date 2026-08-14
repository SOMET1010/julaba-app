import { Module } from '@nestjs/common';
import { ProducteurStatsController } from './producteur-stats.controller';

/**
 * Endpoints REST transverses du rôle producteur (stats autoritatives du
 * tableau de bord). Requêtes SQL brutes via DataSource — pas de forFeature
 * nécessaire ici.
 */
@Module({
  controllers: [ProducteurStatsController],
})
export class ProducteurRestModule {}
