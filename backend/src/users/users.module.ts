import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { DuplicatesService } from './duplicates.service';
import { AdminUsersService } from './admin-users.service';
import { BackofficeUsersService } from './backoffice-users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { MarchandSousProfilHistorique } from './entities/marchand-sous-profil-historique.entity';
import { Identification } from '../identifications/identification.entity';
import { FeedbakSmsModule } from '../feedbak-sms/feedbak-sms.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
// ActivationModule (et non AuthModule) : AuthModule dépend de WalletsModule qui
// dépend lui-même de UsersModule → importer AuthModule ici créerait un cycle.
// ActivationModule est autonome (P0.0, cf. activation.module.ts).
import { ActivationModule } from '../auth/activation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Identification, MarchandSousProfilHistorique]),
    FeedbakSmsModule,
    AuditModule,
    NotificationsModule,
    ActivationModule,
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    DuplicatesService,
    AdminUsersService,
    BackofficeUsersService,
  ],
  exports: [
    UsersService,
    DuplicatesService,
    AdminUsersService,
    BackofficeUsersService,
  ],
})
export class UsersModule {}
