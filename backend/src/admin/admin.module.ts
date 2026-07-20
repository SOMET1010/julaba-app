import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminWalletsController } from './admin-wallets.controller';
import { AdminService } from './admin.service';
import { AdminWalletsService } from './admin-wallets.service';
import { User } from '../users/entities/user.entity';
import { Cooperative } from '../cooperatives-rest/cooperative.entity';
import { WalletTransaction } from '../wallets/entities/wallet-transaction.entity';
import { AuditLog } from '../audit-rest/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Cooperative, WalletTransaction, AuditLog])],
  controllers: [AdminController, AdminAnalyticsController, AdminWalletsController],
  providers: [AdminService, AdminWalletsService],
})
export class AdminModule {}
