import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TontinesController } from './tontines.controller';
import { TontinesService } from './tontines.service';
import { Tontine } from './entities/tontine.entity';
import { TontineMembre } from './entities/tontine-membre.entity';
import { TontineMouvement } from './entities/tontine-mouvement.entity';
import { User } from '../users/entities/user.entity';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tontine, TontineMembre, TontineMouvement, User]),
    WalletsModule,
  ],
  controllers: [TontinesController],
  providers: [TontinesService],
  exports: [TontinesService],
})
export class TontinesModule {}
