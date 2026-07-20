import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentificationsController } from './identifications.controller';
import { Identification } from './identification.entity';
import { FeedbakSmsModule } from '../feedbak-sms/feedbak-sms.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Identification]), FeedbakSmsModule, AuthModule, AuditModule, NotificationsModule],
  controllers: [IdentificationsController],
})
export class IdentificationsModule {}
