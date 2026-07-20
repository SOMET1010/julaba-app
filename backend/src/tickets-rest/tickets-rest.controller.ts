import { paginate } from '../common/paginate';
import { Controller, Get, Post, Patch, Body, Param, UseGuards, Query, Request } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Ticket } from './ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketReponseDto } from './dto/ticket-reponse.dto';
import { TicketStatutDto } from './dto/ticket-statut.dto';

// Roles habilites a gerer le support (liste globale, reponse, statut, lu, compteur, update).
// Meme liste que transactions-rest (acces admin) et que les roles charges par le
// BackOffice cote frontend (BackOfficeContext.loadUser).
const ROLES_BO = ['super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain'];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tickets')
export class TicketsRestController {
  constructor(@InjectRepository(Ticket) private repo: Repository<Ticket>) {}

  // Liste globale de tous les tickets — reservee au BO.
  @Get()
  @Roles(...ROLES_BO)
  async findAll(@Query() query: any) {
    return paginate(this.repo, query, { order: { created_at: 'DESC' } as any });
  }

  // Mes tickets (acteur connecte) — source acteur, filtree sur user_id.
  @Get('mes-tickets')
  async mesTickets(@Request() req: any, @Query() query: any) {
    return paginate(this.repo, query, {
      where: { user_id: req.user.id },
      order: { created_at: 'DESC' } as any,
    });
  }

  // Creer un ticket — accessible a tout authentifie. Le serveur fixe le
  // proprietaire et les champs systeme ; le DTO ne porte que les champs metier.
  @Post()
  async create(@Body() dto: CreateTicketDto, @Request() req: any) {
    const count = await this.repo.count();
    const numero = `TK-${String(count + 1).padStart(5, '0')}`;
    const ticket = this.repo.create({
      titre: dto.titre,
      description: dto.description,
      categorie: dto.categorie,
      priorite: dto.priorite,
      user_id: req.user.id,
      statut: 'ouvert',
      lu_par_bo: false,
      reponses: [],
      numero,
    });
    return this.repo.save(ticket);
  }

  // Mettre a jour un ticket — reservee au BO. Le DTO n'expose ni user_id,
  // ni numero, ni id, ni reponses : ces champs ne sont pas modifiables ici.
  @Patch(':id')
  @Roles(...ROLES_BO)
  async update(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    await this.repo.update(id, dto);
    return this.repo.findOne({ where: { id } });
  }

  // Changer le statut d'un ticket — reservee au BO.
  @Post(':id/statut')
  @Roles(...ROLES_BO)
  async changerStatut(@Param('id') id: string, @Body() dto: TicketStatutDto) {
    await this.repo.update(id, { statut: dto.statut });
    return this.repo.findOne({ where: { id } });
  }

  // Repondre a un ticket — reservee au BO.
  @Post(':id/reponse')
  @Roles(...ROLES_BO)
  async repondre(@Param('id') id: string, @Body() dto: TicketReponseDto, @Request() req: any) {
    const ticket = await this.repo.findOne({ where: { id } });
    if (!ticket) return { error: 'Ticket introuvable' };
    const reponses = Array.isArray(ticket.reponses) ? ticket.reponses : [];
    reponses.push({
      message: dto.message,
      auteur: req.user?.id || 'admin',
      date: new Date().toISOString(),
    });
    await this.repo.update(id, { reponses, lu_par_bo: true, statut: 'en_cours' });
    return this.repo.findOne({ where: { id } });
  }

  // Marquer comme lu par le BO — reservee au BO.
  @Patch(':id/lu')
  @Roles(...ROLES_BO)
  async marquerLu(@Param('id') id: string) {
    await this.repo.update(id, { lu_par_bo: true });
    return { success: true };
  }

  // Compter les tickets non lus — reservee au BO.
  @Get('count/non-lus')
  @Roles(...ROLES_BO)
  async countNonLus() {
    const count = await this.repo.count({ where: { lu_par_bo: false } });
    return { count };
  }
}
