import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CooperativesRestController } from './cooperatives-rest.controller';
import { Cooperative } from './cooperative.entity';
import { CooperativeMembre } from './cooperative-membre.entity';
import { CooperativeStock } from './cooperative-stock.entity';
import { CooperativeStockMouvement } from './cooperative-stock-mouvement.entity';
import { User } from '../users/entities/user.entity';
import { ScoresModule } from '../scores/scores.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cooperative, CooperativeMembre, CooperativeStock, CooperativeStockMouvement, User]),
    ScoresModule,
    NotificationsModule,
  ],
  controllers: [CooperativesRestController],
})
export class CooperativesRestModule {}
