import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StocksRestController } from './stocks-rest.controller';
import { Stock } from './stock.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Stock])],
  controllers: [StocksRestController],
})
export class StocksRestModule {}
