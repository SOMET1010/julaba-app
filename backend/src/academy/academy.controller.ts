import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AcademyModule } from './academy-module.entity';
import { AcademyQuestion } from './academy-question.entity';
import { AcademyProgress } from './academy-progress.entity';
import { CreateAcademyModuleDto } from './dto/create-academy-module.dto';
import { UpdateAcademyModuleDto } from './dto/update-academy-module.dto';
import { CreateAcademyQuestionDto } from './dto/create-academy-question.dto';
import { UpdateAcademyQuestionDto } from './dto/update-academy-question.dto';

// Administration de contenu academy (creation / edition de modules et
// questions) reservee aux admins. Les endpoints de consultation, enrolement
// et progression restent accessibles a tout acteur authentifie.
const ROLES_ACADEMY_ADMIN = ['super_admin', 'admin_general', 'admin_national'];

@UseGuards(JwtAuthGuard)
@Controller('academy')
export class AcademyController {
  constructor(
    @InjectRepository(AcademyModule) private modulesRepo: Repository<AcademyModule>,
    @InjectRepository(AcademyQuestion) private questionsRepo: Repository<AcademyQuestion>,
    @InjectRepository(AcademyProgress) private progressRepo: Repository<AcademyProgress>,
  ) {}

  // ── MODULES CRUD ──────────────────────────────────────────────
  @Get('modules')
  async getModules(@Query('profil') profil?: string, @Query('statut') statut?: string) {
    const where: any = {};
    if (profil && profil !== 'all') where.profil = profil;
    if (statut && statut !== 'all') where.statut = statut;
    // Pas de pagination cote API: le frontend consomme la liste complete.
    // meta reflete la realite (tout est renvoye en une seule page).
    const [modules, total] = await this.modulesRepo.findAndCount({ where, order: { dateCreation: 'DESC' } as any });
    const meta = {
      page: 1,
      limit: total,
      total,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    };
    return { modules, meta };
  }

  @Post('modules')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ACADEMY_ADMIN)
  async createModule(@Body() dto: CreateAcademyModuleDto) {
    const mod = this.modulesRepo.create({ ...dto, nbInscrits: 0, tauxCompletion: 0 });
    const saved = await this.modulesRepo.save(mod);
    return saved;
  }

  @Patch('modules/:id')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ACADEMY_ADMIN)
  async updateModule(@Param('id') id: string, @Body() dto: UpdateAcademyModuleDto) {
    const result = await this.modulesRepo.update(id, dto);
    if (result.affected === 0) {
      throw new NotFoundException('Module introuvable');
    }
    return this.modulesRepo.findOne({ where: { id } });
  }

  @Delete('modules/:id')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ACADEMY_ADMIN)
  async deleteModule(@Param('id') id: string) {
    await this.progressRepo.delete({ moduleId: id });
    await this.modulesRepo.delete(id);
    return { success: true };
  }

  // ── QUESTIONS CRUD ────────────────────────────────────────────
  @Get('questions')
  async getQuestions(
    @Query('role') role?: string,
    @Query('chapter') chapter?: string,
    @Query('module_id') moduleId?: string,
  ) {
    const where: any = {};
    if (role) where.role = role;
    if (chapter) where.chapter = parseInt(chapter);
    if (moduleId) where.moduleId = moduleId;
    const questions = await this.questionsRepo.find({ where, order: { lesson: 'ASC' } });
    return { questions };
  }

  @Post('questions')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ACADEMY_ADMIN)
  async createQuestion(@Body() dto: CreateAcademyQuestionDto) {
    return this.questionsRepo.save(this.questionsRepo.create(dto));
  }

  @Patch('questions/:id')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ACADEMY_ADMIN)
  async updateQuestion(@Param('id') id: string, @Body() dto: UpdateAcademyQuestionDto) {
    const result = await this.questionsRepo.update(id, dto);
    if (result.affected === 0) {
      throw new NotFoundException('Question introuvable');
    }
    return this.questionsRepo.findOne({ where: { id } });
  }

  @Delete('questions/:id')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ACADEMY_ADMIN)
  async deleteQuestion(@Param('id') id: string) {
    await this.questionsRepo.delete(id);
    return { success: true };
  }

  // ── TRACKING PROGRESS ─────────────────────────────────────────
  @Post('modules/:id/enroll')
  async enroll(@Param('id') moduleId: string, @Request() req: any) {
    const userId = req.user.id;
    const mod = await this.modulesRepo.findOne({ where: { id: moduleId } });
    if (!mod) return { error: 'Module introuvable' };

    const existing = await this.progressRepo.findOne({ where: { userId, moduleId } });
    if (existing) return { progress: existing, already_enrolled: true };

    const progress = await this.progressRepo.save(
      this.progressRepo.create({ userId, moduleId, tauxCompletion: 0, completed: false, score: 0 })
    );
    // Incrémenter nb_inscrits
    await this.modulesRepo.update(moduleId, { nbInscrits: (mod.nbInscrits || 0) + 1 });
    return { progress, already_enrolled: false };
  }

  @Patch('modules/:id/progress')
  async updateProgress(
    @Param('id') moduleId: string,
    @Body() body: { taux_completion: number; score?: number; last_question_index?: number },
    @Request() req: any,
  ) {
    const userId = req.user.id;
    const progress = await this.progressRepo.findOne({ where: { userId, moduleId } });
    if (!progress) return { error: 'Non inscrit' };

    const completed = body.taux_completion >= 100;
    await this.progressRepo.update(progress.id, {
      tauxCompletion: Math.min(100, body.taux_completion),
      score: body.score ?? progress.score,
      lastQuestionIndex: body.last_question_index ?? progress.lastQuestionIndex,
      completed,
    });

    // Recalculer taux_completion moyen du module
    const allProgress = await this.progressRepo.find({ where: { moduleId } });
    const avg = allProgress.length
      ? Math.round(allProgress.reduce((s, p) => s + p.tauxCompletion, 0) / allProgress.length)
      : 0;
    await this.modulesRepo.update(moduleId, { tauxCompletion: avg });

    return { success: true, taux_completion: Math.min(100, body.taux_completion), completed };
  }

  @Get('modules/:id/progress')
  async getProgress(@Param('id') moduleId: string, @Request() req: any) {
    const userId = req.user.id;
    const progress = await this.progressRepo.findOne({ where: { userId, moduleId } });
    return progress || { userId, moduleId, tauxCompletion: 0, completed: false, score: 0 };
  }

  @Get('my-progress')
  async myProgress(@Request() req: any) {
    const userId = req.user.id;
    const progress = await this.progressRepo.find({ where: { userId } });
    return { progress };
  }

  // ── STATS BO ──────────────────────────────────────────────────
  @Get('stats')
  async getStats() {
    const totalModules = await this.modulesRepo.count();
    const publies = await this.modulesRepo.count({ where: { statut: 'publie' } });
    const brouillons = await this.modulesRepo.count({ where: { statut: 'brouillon' } });
    const totalQuestions = await this.questionsRepo.count();
    const activeQuestions = await this.questionsRepo.count({ where: { actif: true } });
    const totalInscrits = await this.progressRepo.count();
    const completed = await this.progressRepo.count({ where: { completed: true } });
    const tauxMoyen = totalInscrits > 0 ? Math.round((completed / totalInscrits) * 100) : 0;
    return { totalModules, publies, brouillons, totalQuestions, activeQuestions, totalInscrits, tauxMoyen, completed };
  }
}
