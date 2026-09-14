import { Module } from '@nestjs/common';
import { OdooGatewayController } from './odoo-gateway.controller';
import { OdooGatewayService } from './odoo-gateway.service';
import { OdooPocEnabledGuard } from './odoo-poc-enabled.guard';
import { ODOO_CLIENT, OdooClient } from './odoo-client.interface';
import { OdooMockClient } from './odoo-mock.client';
import { OdooRealClient } from './odoo-real.client';
import { lireConfigOdooReel, lireModeClientOdoo } from './odoo-client.config';

function creerOdooClient(): OdooClient {
  if (lireModeClientOdoo() === 'real') {
    // Lève une erreur explicite (arrêt du boot) si les secrets manquent —
    // voir odoo-client.config.ts : jamais de repli silencieux vers le mock.
    return new OdooRealClient(lireConfigOdooReel());
  }
  return new OdooMockClient();
}

/**
 * Gateway JULABA → Odoo — catalogue + stock consolidé uniquement (voir docs/
 * ETUDE_ARCHITECTURE_JULABA_ODOO.md). Aucun branchement au frontend JULABA,
 * aucune migration DB dans ce lot.
 *
 * BASCULE mock/réel : `ODOO_CLIENT_MODE=real` (+ `ODOO_BASE_URL`/
 * `ODOO_API_KEY`) fait passer `ODOO_CLIENT` sur `OdooRealClient` — ni le
 * service ni le contrôleur n'ont besoin de changer, c'est tout le sens du
 * contrat `OdooClient.execute()`.
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
    { provide: ODOO_CLIENT, useFactory: creerOdooClient },
  ],
  // Exporte pour le referentiel maitre (CatalogueMaitreModule) : celui-ci
  // reutilise CE service, donc le meme client, la meme allowlist et le meme
  // verrou d'ecriture. Aucun second acces a Odoo n'est ouvert.
  exports: [OdooGatewayService],
})
export class OdooGatewayModule {}
