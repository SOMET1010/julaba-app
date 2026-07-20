import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RevenusController } from './revenus.controller';
import { Recolte } from '../producteur/recoltes/entities/recolte.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Recolte])],
  controllers: [RevenusController],
})
export class RevenusModule {}
