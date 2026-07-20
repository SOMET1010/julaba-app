import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recolte } from './entities/recolte.entity';
import { RecoltesController } from './recoltes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Recolte])],
  controllers: [RecoltesController],
  providers: [],
  exports: [TypeOrmModule],
})
export class RecoltesModule {}
