import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BpayService } from './bpay.service';
import { BpayController } from './bpay.controller';
import { BpayCronService } from './bpay.cron';
import { WalletsModule } from '../wallets/wallets.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CronJobsModule } from '../cron-jobs/cron-jobs.module';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([]), forwardRef(() => WalletsModule), NotificationsModule, CronJobsModule],
  controllers: [BpayController],
  providers: [BpayService, BpayCronService],
  exports: [BpayService],
})
export class BpayModule {}
