import { Module } from '@nestjs/common';
import { FinancialScoreModule } from '../financial-score/financial-score.module';
import { ApiKeyGuard } from './api-key.guard';
import { PartnerApiKeysService } from './partner-api-keys.service';
import { PartnerController } from './partner.controller';

@Module({
  imports: [FinancialScoreModule],
  controllers: [PartnerController],
  providers: [ApiKeyGuard, PartnerApiKeysService],
})
export class PartnerModule {}
