import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivationService } from './activation.service';
import { ActivationCode } from './entities/activation-code.entity';
import { User } from '../users/entities/user.entity';

// Module dédié (P0.0, ADR-002) : isole ActivationService de AuthModule pour que
// tout module de création de compte (identifications, back-office, …) puisse le
// consommer SANS import circulaire avec AuthModule (qui dépend de WalletsModule,
// lequel dépend de UsersModule). Une seule implémentation, réutilisée partout
// (Constitution §1) — jamais de second service ni de logique dupliquée.
@Module({
  imports: [TypeOrmModule.forFeature([ActivationCode, User])],
  providers: [ActivationService],
  exports: [ActivationService],
})
export class ActivationModule {}
