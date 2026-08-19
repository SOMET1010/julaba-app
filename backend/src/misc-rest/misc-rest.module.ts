import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MiscRestController } from './misc-rest.controller';
import { User } from '../users/entities/user.entity';
import { CronJobsModule } from '../cron-jobs/cron-jobs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    CronJobsModule,
  ],
  controllers: [MiscRestController],
})
export class MiscRestModule {}
