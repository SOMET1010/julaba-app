import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { TontinesService } from './tontines.service';
import { CreateTontineDto } from './dto/create-tontine.dto';

@ApiTags('Tontines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tontines')
export class TontinesController {
  constructor(private readonly tontinesService: TontinesService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une tontine (ordre de réception fixé à la création)' })
  create(@Body() dto: CreateTontineDto, @CurrentUser() user: User) {
    return this.tontinesService.create(dto, user.id);
  }

  @Get('mes-tontines')
  @ApiOperation({ summary: 'Mes tontines (responsable ou membre)' })
  findMine(@CurrentUser() user: User) {
    return this.tontinesService.findMine(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'une tontine (réservé au responsable ou à un membre)" })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.tontinesService.findOne(id, user.id);
  }

  @Post(':id/cotiser')
  @ApiOperation({ summary: 'Cotiser pour le cycle courant (débit réel + distribution automatique si dernier)' })
  cotiser(@Param('id') id: string, @CurrentUser() user: User) {
    return this.tontinesService.cotiser(id, user.id);
  }
}
