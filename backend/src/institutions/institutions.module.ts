import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstitutionsController } from './institutions.controller';
import { InstitutionDashboardController } from './institution-dashboard.controller';
import { Institution } from './institution.entity';
import { User } from '../users/entities/user.entity';
import { WalletTransaction } from '../wallets/entities/wallet-transaction.entity';
import { AuditModule } from '../audit/audit.module';
import { InstitutionScopeGuard } from './guards/institution-scope.guard';
import { InstitutionResponsableService } from './institution-responsable.service';

@Module({
  imports: [TypeOrmModule.forFeature([Institution, User, WalletTransaction]), AuditModule],
  controllers: [InstitutionsController, InstitutionDashboardController],
  providers: [InstitutionScopeGuard, InstitutionResponsableService],
})
export class InstitutionsModule {}
