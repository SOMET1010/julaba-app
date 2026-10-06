import { Module } from '@nestjs/common';
import { AuditService } from './audit-log.service';

@Module({
  imports: [],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
