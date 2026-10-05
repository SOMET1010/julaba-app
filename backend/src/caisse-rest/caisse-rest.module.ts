import { CatalogueController } from './caisse-rest.controller';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditsController } from './credits.controller';
import { CaisseRestController } from './caisse-rest.controller';
import { ObjectifsController } from './objectifs.controller';
import { RapportHebdoController } from './rapport-hebdo.controller';
import { RaccourcisController } from './raccourcis.controller';
import { CaisseTransaction } from './caisse-transaction.entity';
import { ObjectifJournalier } from './objectif-journalier.entity';
import { RaccourciVocal } from './raccourci-vocal.entity';
import { VoiceModule } from '../voice/voice.module';
import { NotificationsModule } from '../notifications/notifications.module';
// ODOO-L2 : la caisse peut faire suivre une vente vers Odoo. L'import n'active
// RIEN par lui-même — le pont reste muet tant qu'ODOO_PONT_VENTE_ENABLED n'est
// pas posé (voir pont-vente-odoo.service.ts).
import { OdooGatewayModule } from '../odoo-gateway/odoo-gateway.module';

@Module({
  imports: [TypeOrmModule.forFeature([CaisseTransaction, ObjectifJournalier, RaccourciVocal]), VoiceModule, NotificationsModule, OdooGatewayModule],
  controllers: [
    CreditsController,CaisseRestController, ObjectifsController, RapportHebdoController, RaccourcisController,
    CatalogueController
  ],
})
export class CaisseRestModule {}
