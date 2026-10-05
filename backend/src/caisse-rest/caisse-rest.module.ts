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
// ODOO-L2 : la caisse peut faire suivre une vente vers Odoo. L'import n'active
// RIEN par lui-même — le pont reste muet tant qu'ODOO_PONT_VENTE_ENABLED n'est
// pas posé (voir pont-vente-odoo.service.ts).
import { OdooGatewayModule } from '../odoo-gateway/odoo-gateway.module';

@Module({
  imports: [TypeOrmModule.forFeature([CaisseTransaction, ObjectifJournalier, RaccourciVocal, CaisseProduit]), VoiceModule, NotificationsModule, OdooGatewayModule],
  controllers: [
    CreditsController,CaisseRestController, ObjectifsController, RapportHebdoController, RaccourcisController,
    CatalogueController
  ],
  // AGENT-A4 : `CaisseRestController` est AUSSI un provider exporté, pour que
  // le contrôleur d'agent puisse l'appeler au lieu de réimplémenter la vente.
  // C'est inhabituel, et c'est le prix d'un invariant qui compte plus : il n'y
  // a qu'UN chemin de vente, celui qui porte l'idempotence, le mouvement de
  // stock dans la même transaction et la marge ligne par ligne. Un second
  // chemin aurait divergé — le dépôt a déjà fermé une autre route de vente
  // pour cette raison exacte.
  providers: [CaisseProduitsService, CaisseRestController],
  exports: [CaisseRestController],
})
export class CaisseRestModule {}
