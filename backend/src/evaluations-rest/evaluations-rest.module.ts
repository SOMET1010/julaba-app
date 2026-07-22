import { Module } from '@nestjs/common';
import { EvaluationsRestController } from './evaluations-rest.controller';

@Module({
  controllers: [EvaluationsRestController],
})
export class EvaluationsRestModule {}
