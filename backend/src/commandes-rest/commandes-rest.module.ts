import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommandesRestController } from './commandes-rest.controller';
import { Commande } from '../commandes/entities/commande.entity';
import { Negociation } from '../commandes/entities/negociation.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Commande, Negociation]),
    NotificationsModule,
    WalletsModule,
  ],
  controllers: [CommandesRestController],
})
export class CommandesRestModule {}
