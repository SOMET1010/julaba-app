import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { InstitutionScopeGuard, InstitutionScope } from './guards/institution-scope.guard';
import { RequireInstitutionModule } from './decorators/institution-required-module.decorator';
import { CurrentInstitutionScope } from './decorators/institution-scope.decorator';
import { AuditService } from '../audit-log/audit-log.service';

// DGE-10 (20/10/2026) — la piste d'audit du régulateur.
//
// Constat (AUDIT-PARCOURS-DGE-BACKOFFICE §DGE-10, reconduisant INSTITUTION-05
// et INSTITUTION-08 des audits acteur) : GET /audit porte @Roles('ADMIN') —
// c'est-à-dire les rôles back-office uniquement (roles.guard.ts) — donc un
// compte `institution` essuyait un 403 garanti et son écran AuditTrail restait
// vide (couche données sur routes admin). Les accès du régulateur n'étaient
// eux-mêmes pas journalisés (conformité 2013-450 impossible).
//
// CE CONTROLEUR : une piste d'audit SCOPÉE pour le rôle `institution`.
//  - Périmètre : InstitutionScopeGuard (fail-closed — sans institution liée ni
//    zone configurée, 403) + module `audit` requis dans institutions.modules
//    (niveau ≠ 'aucun'/absent, fail-closed pareil).
//  - Filtre SQL explicite : le journal du périmètre = entrées dont l'AUTEUR
//    appartient à la zone, OU dont l'OBJET est un dossier d'identification de
//    la zone, OU dont l'auteur est le régulateur lui-même (ses propres traces
//    de lecture). Jamais de fallback silencieux sur le national.
//  - super_admin / admin_general : non scopés (vue plateforme complète,
//    inchangée) — même convention que les autres contrôleurs /institution/*.
//  - CHAQUE lecture écrit une entrée INSTITUTION_AUDIT_LECTURE : le régulateur
//    laisse à son tour une trace (INSTITUTION-05, premier pas).
@UseGuards(JwtAuthGuard, RolesGuard, InstitutionScopeGuard)
@Roles('institution', 'super_admin', 'admin_general')
@Controller('institution')
export class InstitutionAuditController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  @Get('audit')
  @RequireInstitutionModule('audit')
  async findAll(
    @CurrentUser() user: User,
    @CurrentInstitutionScope() scope?: InstitutionScope,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('action') action?: string,
    @Query('entite') entite?: string,
  ) {
    const take = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const pageNum = Math.max(Number(page) || 1, 1);
    const skip = (pageNum - 1) * take;

    const estInstitution = user.role === 'institution';
    const params: unknown[] = [];
    const conditions: string[] = [];
    let p = 1;

    if (estInstitution) {
      const zone = String(scope!.zoneId);
      conditions.push(`(
        a.user_id::text IN (SELECT u.id::text FROM users u WHERE u.zone_id::text = $${p})
        OR (
          a.entite = 'identification'
          AND a.entite_id::text IN (
            SELECT i.id::text FROM identifications i WHERE i.zone_id::text = $${p}
          )
        )
        OR (a.entite = 'audit' AND a.user_id::text = $${p + 1})
      )`);
      params.push(zone, String(user.id));
      p += 2;
    }
    if (action && action.trim() !== '') {
      conditions.push(`a.action = $${p++}`);
      params.push(action.trim());
    }
    if (entite && entite.trim() !== '') {
      conditions.push(`a.entite = $${p++}`);
      params.push(entite.trim());
    }
    const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const logs = await this.dataSource.query(
      `SELECT a.id, a.user_id, a.action, a.entite, a.entite_id, a.details, a.ip, a.created_at
         FROM audit_logs a ${clause}
        ORDER BY a.created_at DESC
        LIMIT $${p++} OFFSET $${p++}`,
      [...params, take, skip],
    );
    const totalRows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total FROM audit_logs a ${clause}`,
      params,
    );
    const total = Number(totalRows[0]?.total ?? 0);

    // La lecture du journal est elle-même journalisée (2013-450) — dans une
    // requête SÉPARÉE, après la réponse lue : une panne d'écriture ne doit pas
    // masquer les données au régulateur, mais l'échec reste tracé côté logs.
    try {
      await this.audit.log({
        userId: user.id,
        action: 'INSTITUTION_AUDIT_LECTURE',
        entite: 'audit',
        entiteId: scope?.institutionId ?? null,
        details: {
          page: pageNum,
          limite: take,
          filtre_action: action ?? null,
          filtre_entite: entite ?? null,
          resultat: total,
          perimetre: estInstitution ? 'zone' : 'plateforme',
          route: 'GET /institution/audit',
        },
      });
    } catch {
      // AuditService.log avale déjà ses erreurs ; ce garde est défensif.
    }

    return {
      logs,
      meta: { total, page: pageNum, limit: take, pages: Math.max(Math.ceil(total / take), 1) },
    };
  }
}
