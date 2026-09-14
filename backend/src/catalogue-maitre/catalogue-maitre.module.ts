import { Module } from '@nestjs/common';
import { CatalogueMaitreController } from './catalogue-maitre.controller';
import { CatalogueMaitreService } from './catalogue-maitre.service';
import { OdooGatewayModule } from '../odoo-gateway/odoo-gateway.module';

/**
 * Référentiel maître : le miroir Postgres d'Odoo et son API de lecture.
 *
 * Importe `OdooGatewayModule` pour réutiliser `OdooGatewayService` — donc le
 * MÊME client Odoo, la MÊME allowlist et le MÊME verrou d'écriture. Ce module
 * n'ouvre aucun accès supplémentaire vers Odoo : il consomme celui qui
 * existe, en lecture seule.
 */
@Module({
  imports: [OdooGatewayModule],
  controllers: [CatalogueMaitreController],
  providers: [CatalogueMaitreService],
  exports: [CatalogueMaitreService],
})
export class CatalogueMaitreModule {}
