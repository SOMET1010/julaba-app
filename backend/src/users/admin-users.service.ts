import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { RejectAdminUserDto } from './dto/reject-admin-user.dto';
import { generateInitialPassword } from '../auth/auth.service';
import { UsersService } from './users.service';

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getAdminsPending(): Promise<Array<{
    id: string;
    phone: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    role: string;
    createdAt: Date;
    createdBy: string | null;
    pendingValidationData: Record<string, unknown> | null;
  }>> {
    const admins = await this.usersRepo.find({
      where: { status: UserStatus.EN_ATTENTE_VALIDATION },
      select: ['id', 'phone', 'email', 'firstName', 'lastName', 'role', 'createdAt', 'pendingValidationData'],
      order: { createdAt: 'DESC' },
    });

    return admins.map((admin) => {
      const pendingData =
        admin.pendingValidationData && typeof admin.pendingValidationData === 'object'
          ? admin.pendingValidationData as Record<string, unknown>
          : null;

      return {
        id: admin.id,
        phone: admin.phone,
        email: admin.email ?? null,
        firstName: admin.firstName ?? null,
        lastName: admin.lastName ?? null,
        role: admin.role,
        createdAt: admin.createdAt,
        createdBy: typeof pendingData?.createurId === 'string' ? pendingData.createurId : null,
        pendingValidationData: pendingData,
      };
    });
  }

  /**
   * Crée un compte admin.
   * - Si créateur = super_admin : statut actif, mot de passe par défaut, mustChangePassword=true
   * - Si créateur = admin_general : statut en_attente_validation, données dans pendingValidationData
   */
  async createAdmin(
    dto: CreateAdminUserDto,
    creator: { id: string; role: string },
    ip?: string,
  ): Promise<{ id: string; status: string; message: string; motDePasseInitial?: string }> {
    if (
      creator.role !== UserRole.SUPER_ADMIN &&
      creator.role !== UserRole.ADMIN_GENERAL
    ) {
      throw new ForbiddenException(
        'Seul un super_admin ou un admin_general peut créer un compte administrateur',
      );
    }

    if (
      creator.role === UserRole.ADMIN_GENERAL &&
      dto.role === UserRole.ADMIN_GENERAL
    ) {
      throw new ForbiddenException(
        'Un admin_general ne peut pas créer un autre admin_general (réservé au super_admin)',
      );
    }

    if (
      dto.role === UserRole.ADMIN_GENERAL &&
      creator.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Seul un super_admin peut créer un compte admin_general',
      );
    }

    const { canonical: phoneCanonical, variants: phoneVariants } =
      UsersService.normalizePhone(dto.phone);
    if (!phoneCanonical || !/^\+225[0-9]{10}$/.test(phoneCanonical)) {
      throw new BadRequestException('Numéro de téléphone invalide');
    }

    const emailNormalized = dto.email.trim().toLowerCase();

    const existingPhone = await this.usersRepo.findOne({
      where: { phone: In(phoneVariants) },
    });
    if (existingPhone) {
      throw new ConflictException(
        'Un utilisateur avec ce numéro de téléphone existe déjà',
      );
    }

    const existingEmail = await this.usersRepo.findOne({
      where: { email: emailNormalized },
    });
    if (existingEmail) {
      throw new ConflictException(
        'Un utilisateur avec cette adresse e-mail existe déjà',
      );
    }

    const isDirect = creator.role === UserRole.SUPER_ADMIN;

    if (isDirect) {
      const defaultPassword = generateInitialPassword();
      const passwordHash = await bcrypt.hash(defaultPassword, 10);

      const user = this.usersRepo.create({
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: phoneCanonical,
        email: emailNormalized,
        role: dto.role,
        zoneId: dto.zoneId ?? null,
        boPermissions: dto.boPermissions ?? null,
        passwordHash,
        mustChangePassword: true,
        status: UserStatus.ACTIF,
      });
      const saved = await this.usersRepo.save(user);

      await this.auditService.log({
        userId: creator.id,
        action: 'COMPTE_ADMIN_CREATION',
        entite: 'user',
        entiteId: saved.id,
        details: { role: dto.role, createurRole: creator.role },
        ip: ip ?? null,
      });

      return {
        id: saved.id,
        status: saved.status,
        message: `Compte admin créé avec succès. Mot de passe initial : ${defaultPassword}. L'utilisateur devra le changer au premier login.`,
        motDePasseInitial: defaultPassword,
      };
    }

    const user = this.usersRepo.create({
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      phone: phoneCanonical,
      email: emailNormalized,
      role: dto.role,
      zoneId: dto.zoneId ?? null,
      boPermissions: null,
      passwordHash: null,
      mustChangePassword: true,
      status: UserStatus.EN_ATTENTE_VALIDATION,
      pendingValidationData: {
        createurId: creator.id,
        createurRole: creator.role,
        boPermissions: dto.boPermissions ?? null,
        submittedAt: new Date().toISOString(),
      },
    });
    const saved = await this.usersRepo.save(user);

    await this.auditService.log({
      userId: creator.id,
      action: 'COMPTE_ADMIN_CREATION_PENDING',
      entite: 'user',
      entiteId: saved.id,
      details: { role: dto.role, createurId: creator.id },
      ip: ip ?? null,
    });

    try {
      const superAdmins = await this.usersRepo.find({
        where: { role: UserRole.SUPER_ADMIN, status: UserStatus.ACTIF },
      });
      for (const admin of superAdmins) {
        await this.notificationsService.create({
          userId: admin.id,
          type: 'compte_admin_pending',
          titre: 'Nouveau compte admin à valider',
          message: `${dto.firstName} ${dto.lastName} (${dto.role}) en attente de validation`,
          priority: 'high',
          category: 'admin',
          icon: 'user-plus',
          metadata: { compteId: saved.id, role: dto.role, createurId: creator.id },
        });
      }
    } catch (e) {
      this.logger.warn(
        `Notification échouée pour compte_admin_pending ${saved.id}: ${(e as Error).message}`,
      );
    }

    return {
      id: saved.id,
      status: saved.status,
      message: 'Compte admin créé en attente de validation par un super_admin',
    };
  }

  async validateAdmin(
    id: string,
    validator: { id: string },
    ip?: string,
  ): Promise<{ id: string; status: string; message: string; motDePasseInitial?: string }> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Compte admin introuvable');
    }
    if (user.status !== UserStatus.EN_ATTENTE_VALIDATION) {
      throw new BadRequestException(
        `Le compte n'est pas en attente de validation (statut actuel : ${user.status})`,
      );
    }

    const defaultPassword = generateInitialPassword();
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const pendingData = user.pendingValidationData || {};
    const boPermissions = pendingData.boPermissions ?? null;
    const createurId = pendingData.createurId ?? null;

    await this.usersRepo.update(id, {
      passwordHash,
      mustChangePassword: true,
      status: UserStatus.ACTIF,
      boPermissions,
      pendingValidationData: null,
    });

    await this.auditService.log({
      userId: validator.id,
      action: 'COMPTE_ADMIN_VALIDATED',
      entite: 'user',
      entiteId: id,
      details: { role: user.role, validateurId: validator.id, createurId },
      ip: ip ?? null,
    });

    if (createurId) {
      try {
        await this.notificationsService.create({
          userId: createurId,
          type: 'compte_admin_validated',
          titre: 'Compte admin validé',
          message: `Le compte de ${user.firstName} ${user.lastName} (${user.role}) a été validé.`,
          priority: 'medium',
          category: 'admin',
          icon: 'circle-check',
          metadata: { compteId: id, role: user.role },
        });
      } catch (e) {
        this.logger.warn(
          `Notification échouée pour compte_admin_validated ${id}: ${(e as Error).message}`,
        );
      }
    }

    return {
      id,
      status: UserStatus.ACTIF,
      message: `Compte admin validé. Mot de passe initial : ${defaultPassword}. L'utilisateur devra le changer au premier login.`,
      motDePasseInitial: defaultPassword,
    };
  }

  async rejectAdmin(
    id: string,
    dto: RejectAdminUserDto,
    validator: { id: string },
    ip?: string,
  ): Promise<{ id: string; status: string; message: string }> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Compte admin introuvable');
    }
    if (user.status !== UserStatus.EN_ATTENTE_VALIDATION) {
      throw new BadRequestException(
        `Le compte n'est pas en attente de validation (statut actuel : ${user.status})`,
      );
    }

    const pendingData = user.pendingValidationData || {};
    const createurId = pendingData.createurId ?? null;

    await this.usersRepo.update(id, {
      status: UserStatus.REJETE,
      pendingValidationData: {
        ...pendingData,
        rejection_motif: dto.motif,
        rejection_at: new Date().toISOString(),
        rejection_by: validator.id,
      },
    });

    await this.auditService.log({
      userId: validator.id,
      action: 'COMPTE_ADMIN_REJECTED',
      entite: 'user',
      entiteId: id,
      details: {
        role: user.role,
        motif: dto.motif,
        validateurId: validator.id,
        createurId,
      },
      ip: ip ?? null,
    });

    if (createurId) {
      try {
        await this.notificationsService.create({
          userId: createurId,
          type: 'compte_admin_rejete',
          titre: 'Compte admin rejeté',
          message: `Le compte de ${user.firstName} ${user.lastName} a été rejeté. Motif : ${dto.motif}`,
          priority: 'high',
          category: 'admin',
          icon: 'x-circle',
          metadata: { compteId: id, role: user.role, motif: dto.motif },
        });
      } catch (e) {
        this.logger.warn(
          `Notification échouée pour compte_admin_rejete ${id}: ${(e as Error).message}`,
        );
      }
    }

    return {
      id,
      status: UserStatus.REJETE,
      message: 'Compte admin rejeté',
    };
  }
}
