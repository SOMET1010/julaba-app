import { Module } from '@nestjs/common';
import { AuditModule } from '../audit-log/audit-log.module';
import { OneciService } from './oneci.service';
import { OneciController } from './oneci.controller';

// AuditModule : journal d'accès ONECI (INSTITUTION-01 / INSTITUTION-05) —
// toute consultation du RNPP est tracée : acteur, rôle, route, résultat,
// sans PII (cf. oneci.controller.ts).
@Module({
  imports: [AuditModule],
  controllers: [OneciController],
  providers: [OneciService],
  exports: [OneciService],
})
export class OneciModule {}
