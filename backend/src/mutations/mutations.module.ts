import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MutationsController } from './mutations.controller';
import { Mutation } from './mutation.entity';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Mutation]), AuthModule, NotificationsModule],
  controllers: [MutationsController],
})
export class MutationsModule {}
