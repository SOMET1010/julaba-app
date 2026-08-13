import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommandesRestController } from './commandes-rest.controller';
import { Commande } from '../commandes/entities/commande.entity';
import { Negociation } from '../commandes/entities/negociation.entity';
import { StockReservation } from '../commandes/entities/stock-reservation.entity';
import { StockReservationService } from '../commandes/stock-reservation.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Commande, Negociation, StockReservation]),
    NotificationsModule,
    WalletsModule,
  ],
  controllers: [CommandesRestController],
  providers: [StockReservationService],
})
export class CommandesRestModule {}
