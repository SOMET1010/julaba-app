import { Module } from '@nestjs/common';
import { OdooGatewayController } from './odoo-gateway.controller';
import { OdooGatewayService } from './odoo-gateway.service';
import { OdooPocEnabledGuard } from './odoo-poc-enabled.guard';
import { ODOO_CLIENT } from './odoo-client.interface';
import { OdooMockClient } from './odoo-mock.client';

/**
 * POC structurel — catalogue + stock consolidé uniquement (voir docs/
 * ETUDE_ARCHITECTURE_JULABA_ODOO.md). Aucun branchement au frontend JULABA,
 * aucune migration DB, aucun appel externe réel dans ce lot.
 *
 * BASCULE FUTURE vers une vraie instance Odoo : remplacer UNIQUEMENT
 * `useClass: OdooMockClient` ci-dessous par `useClass: OdooRealClient`
 * (à créer, hors périmètre de ce lot) — ni le service ni le contrôleur
 * n'ont besoin de changer.
 *
 * DÉSACTIVÉ PAR DÉFAUT : voir OdooPocEnabledGuard — importer ce module dans
 * AppModule ne rend PAS `/odoo-poc/*` utilisable ; il faut en plus
 * ODOO_POC_ENABLED=true (démo/dev uniquement).
 */
@Module({
  controllers: [OdooGatewayController],
  providers: [
    OdooGatewayService,
    OdooPocEnabledGuard,
    { provide: ODOO_CLIENT, useClass: OdooMockClient },
  ],
})
export class OdooGatewayModule {}
