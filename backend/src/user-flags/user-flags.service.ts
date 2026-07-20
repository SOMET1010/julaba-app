import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { UserFlag } from '../users/entities/user-flag.entity';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateUserFlagDto } from './dto/create-user-flag.dto';
import { FlagResolutionAction, ResolveUserFlagDto } from './dto/resolve-user-flag.dto';

@Injectable()
export class UserFlagsService {
  private readonly logger = new Logger(UserFlagsService.name);

  constructor(
    @InjectRepository(UserFlag)
    private readonly flagsRepo: Repository<UserFlag>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateUserFlagDto, createdBy: string, ip?: string | string[]): Promise<UserFlag> {
    const targetUser = await this.usersRepo.findOne({ where: { id: dto.userId } });
    if (!targetUser) {
      throw new NotFoundException('Utilisateur cible introuvable');
    }

    const existing = await this.flagsRepo.findOne({
      where: {
        userId: dto.userId,
        flagType: dto.flagType,
        createdBy,
        resolvedAt: IsNull(),
      },
    });
    if (existing) {
      throw new ConflictException('Vous avez déjà signalé cet utilisateur pour ce motif');
    }

    const flag = this.flagsRepo.create({
      userId: dto.userId,
      flagType: dto.flagType,
      raison: dto.raison,
      commentaire: dto.commentaire ?? null,
      createdBy,
    });
    const saved = await this.flagsRepo.save(flag);

    await this.auditService.log({
      userId: createdBy,
      action: 'SIGNALEMENT_ACTEUR',
      entite: 'user',
      entiteId: dto.userId,
      details: { flagType: dto.flagType, raison: dto.raison, flagId: saved.id },
      ip: ip != null ? String(Array.isArray(ip) ? ip[0] : ip).split(',')[0].trim() : null,
    });

    try {
      const superAdmins = await this.usersRepo.find({ where: { role: UserRole.SUPER_ADMIN } });
      for (const admin of superAdmins) {
        await this.notificationsService.create({
          userId: admin.id,
          type: 'signalement_nouveau',
          titre: 'Nouveau signalement',
          message: `Un acteur a été signalé pour ${dto.flagType}`,
          priority: 'medium',
          category: 'admin',
          icon: 'flag',
          metadata: { flagId: saved.id, userId: dto.userId, flagType: dto.flagType },
        });
      }
    } catch (e) {
      this.logger.warn(`Notification échouée pour signalement ${saved.id}: ${(e as Error).message}`);
    }

    return saved;
  }

  async findAll(filters: { resolved?: boolean; zoneId?: string }): Promise<{ count: number; items: any[] }> {
    const qb = this.flagsRepo
      .createQueryBuilder('flag')
      .leftJoin(User, 'user', 'user.id = flag.userId')
      .leftJoin(User, 'creator', 'creator.id = flag.createdBy')
      .select([
        'flag.id AS id',
        'flag.flagType AS "flagType"',
        'flag.raison AS raison',
        'flag.commentaire AS commentaire',
        'flag.createdAt AS "createdAt"',
        'flag.resolvedAt AS "resolvedAt"',
        'flag.resolutionNote AS "resolutionNote"',
        'flag.userId AS "userId"',
        'flag.createdBy AS "createdBy"',
        'user.firstName AS "userFirstName"',
        'user.lastName AS "userLastName"',
        'user.phone AS "userPhone"',
        'creator.firstName AS "creatorFirstName"',
        'creator.lastName AS "creatorLastName"',
      ]);

    if (filters.resolved === false) {
      qb.where('flag.resolvedAt IS NULL');
    } else if (filters.resolved === true) {
      qb.where('flag.resolvedAt IS NOT NULL');
    }

    if (filters.zoneId) {
      qb.andWhere('user.zoneId = :zoneId', { zoneId: filters.zoneId });
    }

    qb.orderBy('flag.createdAt', 'DESC');

    const items = await qb.getRawMany();
    return { count: items.length, items };
  }

  async resolve(id: string, dto: ResolveUserFlagDto, validatorId: string, ip?: string | string[]): Promise<{ id: string; resolved: true; action: string }> {
    const ipStr = ip != null ? String(Array.isArray(ip) ? ip[0] : ip).split(',')[0].trim() : null;

    return this.flagsRepo.manager.transaction(async (manager) => {
      const flag = await manager.findOne(UserFlag, { where: { id } });
      if (!flag) {
        throw new NotFoundException('Signalement introuvable');
      }
      if (flag.resolvedAt) {
        throw new BadRequestException('Signalement déjà résolu');
      }

      flag.resolvedAt = new Date();
      flag.resolvedBy = validatorId;
      flag.resolutionNote = dto.resolutionNote || null;
      await manager.save(flag);

      let userStatusChanged: string | null = null;
      if (dto.action === FlagResolutionAction.SUSPENDRE || dto.action === FlagResolutionAction.BANNIR) {
        const user = await manager.findOne(User, { where: { id: flag.userId } });
        if (!user) {
          throw new NotFoundException('Utilisateur cible introuvable');
        }
        const newStatus = dto.action === FlagResolutionAction.SUSPENDRE ? UserStatus.SUSPENDU : UserStatus.REJETE;
        user.status = newStatus;
        await manager.save(user);
        userStatusChanged = newStatus;
      }

      await manager.query(
        `INSERT INTO audit_logs (user_id, action, entite, entite_id, details, ip, created_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW())`,
        [
          validatorId,
          'SIGNALEMENT_RESOLU',
          'user_flag',
          id,
          JSON.stringify({
            flagId: id,
            targetUserId: flag.userId,
            resolutionAction: dto.action,
            resolutionNote: dto.resolutionNote || null,
            userStatusChanged,
          }),
          ipStr,
        ],
      );

      return { id, resolved: true, action: dto.action };
    });
  }
}
