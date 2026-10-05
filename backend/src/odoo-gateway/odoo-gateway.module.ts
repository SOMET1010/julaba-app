import { Module } from '@nestjs/common';
import { OdooGatewayController } from './odoo-gateway.controller';
import { OdooGatewayService } from './odoo-gateway.service';
import { OdooPocEnabledGuard } from './odoo-poc-enabled.guard';
import { ODOO_CLIENT, OdooClient } from './odoo-client.interface';
import { OdooMockClient } from './odoo-mock.client';
import { OdooRealClient } from './odoo-real.client';
import { lireConfigOdooReel, lireModeClientOdoo } from './odoo-client.config';
import { DataSource } from 'typeorm';
import { JOURNAL_SYNC } from './sync-journal';
import { SyncJournalPostgres } from './sync-journal-postgres';

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
 *
 * JOURNAL PERSISTÉ — ODOO-L1, 05/10/2026. Le journal de synchronisation est
 * désormais fourni par injection, et c'est la version Postgres qui tourne ici.
 * Avant ce lot il vivait dans une Map du service : un redémarrage l'effaçait,
 * et rejouer un `operationId` recréait un mouvement. Le service accepte
 * toujours de s'en passer (il retombe alors sur la mémoire) — c'est ce dont
 * les bancs ont besoin, et ce n'est JAMAIS ce qui tourne en production, parce
 * que ce module fournit toujours le token.
 */
@Module({
  controllers: [OdooGatewayController],
  providers: [
    OdooGatewayService,
    OdooPocEnabledGuard,
    { provide: ODOO_CLIENT, useFactory: creerOdooClient },
    {
      provide: JOURNAL_SYNC,
      useFactory: (dataSource: DataSource) => new SyncJournalPostgres(dataSource),
      inject: [DataSource],
    },
  ],
  // Exporte pour le referentiel maitre (CatalogueMaitreModule) : celui-ci
  // reutilise CE service, donc le meme client, la meme allowlist et le meme
  // verrou d'ecriture. Aucun second acces a Odoo n'est ouvert.
  exports: [OdooGatewayService],
})
export class OdooGatewayModule {}
