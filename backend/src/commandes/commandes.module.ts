import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Commande } from './entities/commande.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Commande])],
  controllers: [],
  providers: [],
  exports: [],
})
export class CommandesModule {}
