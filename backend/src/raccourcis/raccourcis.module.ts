import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RaccourcisController } from './raccourcis.controller';
import { Raccourci } from './raccourci.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Raccourci])],
  controllers: [RaccourcisController],
})
export class RaccourcisModule {}
