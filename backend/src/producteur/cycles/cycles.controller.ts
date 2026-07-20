import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CyclesService } from './cycles.service';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';

@ApiTags('Cycles (Plantations)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cycles')
export class CyclesController {
  constructor(private readonly cyclesService: CyclesService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un nouveau cycle de production' })
  @ApiResponse({ status: 201, description: 'Cycle créé avec succès' })
  create(@CurrentUser() user: User, @Body() createCycleDto: CreateCycleDto) {
    return this.cyclesService.create(user.id, createCycleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister mes cycles de production' })
  @ApiResponse({ status: 200, description: 'Liste des cycles' })
  findAll(@CurrentUser() user: User) {
    return this.cyclesService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un cycle spécifique' })
  @ApiResponse({ status: 200, description: 'Détails du cycle' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.cyclesService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un cycle' })
  @ApiResponse({ status: 200, description: 'Cycle modifié' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() updateCycleDto: UpdateCycleDto,
  ) {
    return this.cyclesService.update(id, user.id, updateCycleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un cycle' })
  @ApiResponse({ status: 200, description: 'Cycle supprimé' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.cyclesService.remove(id, user.id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Marquer un cycle comme terminé' })
  @ApiResponse({ status: 200, description: 'Cycle terminé' })
  complete(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body()
    data: { dateRecolteReelle: string; quantiteReelle: number },
  ) {
    return this.cyclesService.complete(
      id,
      user.id,
      new Date(data.dateRecolteReelle),
      data.quantiteReelle,
    );
  }
}
