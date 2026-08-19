import { parsePagination, buildMeta } from '../common/paginate';
import { Controller, Get, Logger, Query, UseGuards, Request } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../users/entities/user.entity';
import { ScoresService, SUPERVISION_ROLES } from './scores.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('scores')
export class ScoresController {
  private readonly logger = new Logger(ScoresController.name);
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly scoresService: ScoresService,
  ) {}

  @Get()
  @Roles('super_admin', 'admin', 'institution')
  async findAll(@Query() query: any) {
    const { page, limit } = parsePagination(query);
    const skip = (page - 1) * limit;
    const [users, total] = await this.userRepo.findAndCount({ select: ['id', 'firstName', 'lastName', 'role', 'phone'], skip, take: limit });
    const data = users.map(u => ({ userId: u.id, nom: `${u.firstName} ${u.lastName}`, role: u.role, score: 0, niveau: 1 }));
    return { data, meta: buildMeta(page, limit, total) };
  }

  @Get('me')
  async myScore(@Request() req: any) {
    const userId = req.user.id;
    let user: User | null;
    try {
      user = await this.userRepo.findOne({ where: { id: userId } });
    } catch (e: any) {
      this.logger.error(`[SCORES] findOne user failed: ${e?.message}`);
      return { userId, score: { score_total: 0 } };
    }
    if (!user) {
      return { userId, score: { score_total: 0 } };
    }

    const role = user.role as string;

    // Le calcul complet (ventes, récoltes, académie, coopérative, identifications)
    // vit dans ScoresService — SOURCE UNIQUE, aussi utilisée par
    // GET /cooperatives/membres pour scorer plusieurs membres à la fois (Constitution §2).
    const scores = await this.scoresService.getScoresForUsers([
      { id: userId, role, objectifMensuel: user.objectifMensuel },
    ]);
    const result = scores.get(userId);
    if (!result) {
      return { userId, score: { score_total: 0 } };
    }

    if (SUPERVISION_ROLES.includes(role)) {
      return {
        userId,
        role,
        roleSupervision: true,
        niveau: 0,
        progression: 0,
        score: { score_total: 0, breakdown: {} },
      };
    }

    const now = new Date().toISOString();

    return {
      userId: user.id,
      role,
      niveau: result.niveau,
      progression: result.progression,
      score: {
        id: userId,
        user_id: userId,
        score_total: result.score_total,
        breakdown: result.breakdown,
        academy: result.academy,
        created_at: now,
        updated_at: now,
      },
    };
  }
}
