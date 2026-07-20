import { Module } from '@nestjs/common';
import { ProducteursRestController } from './producteurs-rest.controller';

@Module({
  controllers: [ProducteursRestController],
})
export class ProducteursRestModule {}
