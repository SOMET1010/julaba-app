import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { FinancialScoreService } from '../financial-score/financial-score.service';
import { ApiKeyGuard } from './api-key.guard';
import { PartnerApiKeysService } from './partner-api-keys.service';

@Controller('partner')
export class PartnerController {
  constructor(
    private readonly financialScoreService: FinancialScoreService,
    private readonly partnerApiKeysService: PartnerApiKeysService,
  ) {}

  private assertBoAdmin(user: User): void {
    if (!FinancialScoreService.isAdminRole(String(user.role ?? ''))) {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
  }

  @Get('financial-score/:userId')
  @UseGuards(ApiKeyGuard)
  async getFinancialScore(@Param('userId') userId: string) {
    return this.financialScoreService.computeForUser(userId);
  }

  @Get('api-keys')
  @UseGuards(JwtAuthGuard)
  async listApiKeys(@CurrentUser() user: User) {
    this.assertBoAdmin(user);
    return this.partnerApiKeysService.findAll();
  }

  @Post('api-keys')
  @UseGuards(JwtAuthGuard)
  async createApiKey(
    @CurrentUser() user: User,
    @Body() body: { name?: string; partner_type?: string },
  ) {
    this.assertBoAdmin(user);
    return this.partnerApiKeysService.create(
      body?.name ?? '',
      body?.partner_type ?? '',
    );
  }

  @Patch('api-keys/:id')
  @UseGuards(JwtAuthGuard)
  async patchApiKey(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { is_active?: boolean },
  ) {
    this.assertBoAdmin(user);
    if (typeof body?.is_active !== 'boolean') {
      throw new BadRequestException('Corps attendu : { is_active: boolean }');
    }
    return this.partnerApiKeysService.setActive(id, body.is_active);
  }
}
