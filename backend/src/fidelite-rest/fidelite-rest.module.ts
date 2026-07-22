import { Module } from '@nestjs/common';
import { FideliteRestController } from './fidelite-rest.controller';

@Module({
  controllers: [FideliteRestController],
})
export class FideliteRestModule {}
