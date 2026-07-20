import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstitutionsController } from './institutions.controller';
import { InstitutionDashboardController } from './institution-dashboard.controller';
import { Institution } from './institution.entity';
import { User } from '../users/entities/user.entity';
import { WalletTransaction } from '../wallets/entities/wallet-transaction.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Institution, User, WalletTransaction]), AuditModule],
  controllers: [InstitutionsController, InstitutionDashboardController],
})
export class InstitutionsModule {}
