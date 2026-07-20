import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserFlag } from '../users/entities/user-flag.entity';
import { User } from '../users/entities/user.entity';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { UserFlagsService } from './user-flags.service';
import { UserFlagsController } from './user-flags.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserFlag, User]),
    AuditModule,
    NotificationsModule,
    AuthModule,
  ],
  controllers: [UserFlagsController],
  providers: [UserFlagsService],
  exports: [UserFlagsService],
})
export class UserFlagsModule {}
