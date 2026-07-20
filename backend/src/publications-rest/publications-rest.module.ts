import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicationsRestController } from './publications-rest.controller';
import { Publication } from '../producteur/publications/entities/publication.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Publication, User]), NotificationsModule],
  controllers: [PublicationsRestController],
})
export class PublicationsRestModule {}
