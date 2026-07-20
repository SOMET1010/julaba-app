import { Module } from '@nestjs/common';
import { FinancialScoreController } from './financial-score.controller';
import { FinancialScoreService } from './financial-score.service';

@Module({
  controllers: [FinancialScoreController],
  providers: [FinancialScoreService],
  exports: [FinancialScoreService],
})
export class FinancialScoreModule {}
