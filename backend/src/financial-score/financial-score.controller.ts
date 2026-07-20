import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Logger,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { FinancialScoreService } from './financial-score.service';

@Controller('financial-score')
@UseGuards(JwtAuthGuard)
export class FinancialScoreController {
  private readonly logger = new Logger(FinancialScoreController.name);
  constructor(private readonly financialScoreService: FinancialScoreService) {}

  @Get(':userId')
  async getScore(
    @Param('userId') userId: string,
    @CurrentUser() user: User,
  ) {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(userId)) {
      throw new BadRequestException('userId invalide');
    }
    const role = String(user.role ?? '');
    if (
      user.id !== userId &&
      !FinancialScoreService.isAdminRole(role)
    ) {
      throw new ForbiddenException('Accès refusé à ce score financier.');
    }
    this.logger.log(`[SCORE] userId=${user.id} role=${user.role} consulte score de ${userId}`);
    return this.financialScoreService.computeForUser(userId);
  }
}
