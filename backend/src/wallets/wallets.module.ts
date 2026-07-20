import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';
import { WalletsPublicController } from './wallets-public.controller';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { BpayModule } from '../bpay/bpay.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FeedbakSmsModule } from '../feedbak-sms/feedbak-sms.module';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, WalletTransaction]), forwardRef(() => BpayModule), NotificationsModule, FeedbakSmsModule],
  controllers: [WalletsController, WalletsPublicController],
  providers: [WalletsService],
  exports: [WalletsService],
})
export class WalletsModule {}
