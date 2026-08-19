import { Module } from "@nestjs/common";
import { AlertesService } from './alertes.service';
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from '@nestjs/schedule';
import { Notification } from "./notifications.entity";
import { User } from '../users/entities/user.entity';
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { PushToken } from './push-token.entity';
import { PushService } from './push.service';
import { CronJobsModule } from '../cron-jobs/cron-jobs.module';

@Module({
  imports: [ScheduleModule, TypeOrmModule.forFeature([Notification, User, PushToken]), CronJobsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, AlertesService, PushService],
  exports: [NotificationsService, AlertesService, PushService],
})
export class NotificationsModule {}
