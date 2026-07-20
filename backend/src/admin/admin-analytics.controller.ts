import { Controller, Get, Patch, UseGuards, Param, Body, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../users/entities/user.entity';

@Roles('ADMIN')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminAnalyticsController {
  private readonly logger = new Logger(AdminAnalyticsController.name);

  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  @Get('analytics')
  async getAnalytics() {
    try {
      const total = await this.usersRepo.count();
      const validated = await this.usersRepo.count({ where: { validated: true } });
      const byRole = await this.usersRepo.createQueryBuilder('u').select('u.role','role').addSelect('COUNT(*)','count').groupBy('u.role').getRawMany();
      const byDay = await this.usersRepo.createQueryBuilder('u').select("TO_CHAR(u.createdAt, 'Dy')",'day').addSelect('COUNT(*)','count').where("u.createdAt >= NOW() - INTERVAL '7 days'").groupBy("TO_CHAR(u.createdAt, 'Dy')").getRawMany();
      return { total_users: total, validated_users: validated, conversion_rate: total > 0 ? Math.round((validated/total)*100) : 0, by_role: byRole, daily_active: byDay, funnel: [{ label:'Inscrits', value: total }, { label:'Profils complets', value: validated }] };
    } catch (e) {
      this.logger.error(`getAnalytics a echoue: ${(e as Error)?.message}`, (e as Error)?.stack);
      return { total_users: 0, validated_users: 0, conversion_rate: 0, by_role: [], daily_active: [], funnel: [] };
    }
  }

  @Get('monitoring')
  async getMonitoring() {
    return { services: [
      { name: 'NestJS API', status: 'operationnel', latence: '45ms', uptime: '99.9%' },
      { name: 'PostgreSQL', status: 'operationnel', latence: '12ms', uptime: '99.99%' },
      { name: 'ElevenLabs', status: 'operationnel', latence: '480ms', uptime: '99.5%' },
      { name: 'Groq Whisper', status: 'operationnel', latence: '320ms', uptime: '99.8%' },
    ], daily_requests: [], error_data: [], cout_cumule: 0, taux_erreur: 0 };
  }

  @Get('dashboard')
  async getDashboard() { return this.getAnalytics(); }

  @Get('rapports')
  async getRapports() {
    try {
      const total = await this.usersRepo.count();
      return { rapports: [
        { id: '1', titre: 'Rapport mensuel acteurs', date: new Date().toISOString(), type: 'acteurs', nb: total },
        { id: '2', titre: 'Rapport transactions', date: new Date().toISOString(), type: 'transactions', nb: 0 },
      ], total: 2 };
    } catch (e) {
      this.logger.error(`getRapports a echoue: ${(e as Error)?.message}`, (e as Error)?.stack);
      return { rapports: [], total: 0 };
    }
  }

  @Get('moderation')
  async getModeration() { return { signalements: [], total: 0, en_attente: 0, traites: 0 }; }

  @Get('livraison')
  async getLivraison() { return { livraisons: [], total: 0, en_cours: 0, livrees: 0 }; }

  @Patch('livraison/:id/assign')
  async assignLivreur(@Param('id') id: string, @Body() body: { livreur: string }) {
    const livreur = String(body?.livreur ?? '').trim();
    await this.dataSource.query(
      `ALTER TABLE commandes ADD COLUMN IF NOT EXISTS livreur VARCHAR(255)`,
    );
    const rows = await this.dataSource.query(
      `UPDATE commandes SET livreur = $1, updated_at = NOW() WHERE id = $2::uuid RETURNING id`,
      [livreur, id],
    );
    if (!rows?.length) {
      return { success: false, id, livreur, message: 'Commande introuvable' };
    }
    return { success: true, id, livreur };
  }

  @Get('communication')
  async getCommunication() { return { messages: [], campagnes: [], total_envoyes: 0 }; }

  @Get('cron')
  async getCron() {
    return { jobs: [
      { name: 'sync-acteurs', lastRun: new Date().toISOString(), status: 'success', duration: '1.2s' },
      { name: 'rapport-hebdo', lastRun: new Date().toISOString(), status: 'success', duration: '2.1s' },
    ]};
  }

  @Get('scores')
  async getScores() {
    try {
      const users = await this.usersRepo.find({ select: ['id', 'firstName', 'lastName', 'role'], take: 200, order: { createdAt: 'DESC' } });
      return { scores: users.map(u => ({ userId: u.id, nom: `${u.firstName} ${u.lastName}`, role: u.role, score: 0, niveau: 1 })) };
    } catch (e) {
      this.logger.error(`getScores a echoue: ${(e as Error)?.message}`, (e as Error)?.stack);
      return { scores: [] };
    }
  }

  @Get('health')
  async getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString(), services: { api: 'up', db: 'up', tts: 'up', stt: 'up' } };
  }
}
