import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstitutionsController } from './institutions.controller';
import { InstitutionDashboardController } from './institution-dashboard.controller';
import { Institution } from './institution.entity';
import { User } from '../users/entities/user.entity';
import { CaisseTransaction } from '../caisse-rest/caisse-transaction.entity';
import { AuditModule } from '../audit/audit.module';
import { InstitutionScopeGuard } from './guards/institution-scope.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Institution, User, CaisseTransaction]), AuditModule],
  controllers: [InstitutionsController, InstitutionDashboardController],
  providers: [InstitutionScopeGuard],
})
export class InstitutionsModule {}
