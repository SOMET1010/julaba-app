import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivationService } from './activation.service';
import { ActivationCode } from './entities/activation-code.entity';
import { User } from '../users/entities/user.entity';
import { AuditModule } from '../audit-log/audit-log.module';

// Module dédié (P0.0, ADR-002) : isole ActivationService de AuthModule pour que
// tout module de création de compte (identifications, back-office, …) puisse le
// consommer SANS import circulaire avec AuthModule (qui dépend de WalletsModule,
// lequel dépend de UsersModule). Une seule implémentation, réutilisée partout
// (Constitution §1) — jamais de second service ni de logique dupliquée.
// LOT-ACTIVATION : AuditModule entre ici — la trace ACTIV_CONSENTEMENT (le
// oui horodaté d'ELLE, SPEC-AUTH-CIBLE §1.1.3) est écrite par le même
// journal que le reste du serveur, pas par un canal parallèle.
@Module({
  imports: [TypeOrmModule.forFeature([ActivationCode, User]), AuditModule],
  providers: [ActivationService],
  exports: [ActivationService],
})
export class ActivationModule {}
