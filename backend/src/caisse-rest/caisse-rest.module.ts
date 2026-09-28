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
import { CaisseProduit } from './caisse-produit.entity';
import { CaisseProduitsService } from './caisse-produits.service';
import { VoiceModule } from '../voice/voice.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([CaisseTransaction, ObjectifJournalier, RaccourciVocal, CaisseProduit]), VoiceModule, NotificationsModule],
  controllers: [
    CreditsController,CaisseRestController, ObjectifsController, RapportHebdoController, RaccourcisController,
    CatalogueController
  ],
  providers: [CaisseProduitsService],
})
export class CaisseRestModule {}
