import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicationsRestController } from './publications-rest.controller';
import { Publication } from '../producteur/publications/entities/publication.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { CooperativeResolverModule } from '../cooperatives-rest/cooperative-resolver.module';

@Module({
  imports: [TypeOrmModule.forFeature([Publication, User]), NotificationsModule, CooperativeResolverModule],
  controllers: [PublicationsRestController],
})
export class PublicationsRestModule {}
