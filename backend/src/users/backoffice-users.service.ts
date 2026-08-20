import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { Identification } from '../identifications/identification.entity';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBackofficeUserDto } from './dto/create-backoffice-user.dto';
import { UpdateSousProfilMarchandDto } from './dto/update-sous-profil-marchand.dto';
import { SousProfilMarchand } from './entities/sous-profil-marchand.enum';
import { UsersService } from './users.service';
import { generateInitialPassword } from '../auth/auth.service';
import { ActivationService } from '../auth/activation.service';

const ADMIN_ROLES: UserRole[] = [
  UserRole.ADMIN_GENERAL,
  UserRole.ADMIN_NATIONAL,
  UserRole.GESTIONNAIRE_ZONE,
  UserRole.OPERATEUR_TERRAIN,
];

const ACTEUR_METIER_ROLES: UserRole[] = [
  UserRole.MARCHAND,
  UserRole.PRODUCTEUR,
  UserRole.COOPERATEUR,
];

@Injectable()
export class BackofficeUsersService {
  private readonly logger = new Logger(BackofficeUsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Identification)
    private readonly identificationsRepo: Repository<Identification>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
    private readonly activationService: ActivationService,
  ) {}

  /**
   * Crée un utilisateur via le back-office (neuf rôles ciblés).
   * La colonne identifications.source utilise la valeur d'énumération PostgreSQL admin_bo.
   */
  async createUser(
    dto: CreateBackofficeUserDto,
    creator: { id: string; role: string; zoneId?: string | null },
    ip?: string,
  ): Promise<{
    id: string;
    status: string;
    message: string;
    defaultPassword?: string;
    motDePasseInitial?: string;
    activationCode?: string;
  }> {
    const targetIsAdmin = ADMIN_ROLES.includes(dto.role);
    const isActeurMetier = ACTEUR_METIER_ROLES.includes(dto.role);
    const isInstitution = dto.role === UserRole.INSTITUTION;
    const isIdentificateur = dto.role === UserRole.IDENTIFICATEUR;

    const CREATOR_ROLES_ALLOWED = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN_GENERAL,
      UserRole.ADMIN_NATIONAL,
      UserRole.GESTIONNAIRE_ZONE,
    ];

    if (!CREATOR_ROLES_ALLOWED.includes(creator.role as UserRole)) {
      throw new ForbiddenException(
        'Vous n\'êtes pas autorisé à créer des utilisateurs depuis le back-office',
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

    if (
      [UserRole.ADMIN_NATIONAL, UserRole.GESTIONNAIRE_ZONE].includes(
        creator.role as UserRole,
      ) &&
      targetIsAdmin
    ) {
      throw new ForbiddenException(
        'Seuls super_admin et admin_general peuvent créer des comptes administrateur',
      );
    }

    if (creator.role === UserRole.GESTIONNAIRE_ZONE) {
      if (!creator.zoneId) {
        throw new ForbiddenException(
          'Votre compte n\'est associé à aucune zone',
        );
      }
      const zoneIdToUse = dto.zoneId ?? dto.zoneIdOptional;
      if (zoneIdToUse && zoneIdToUse !== creator.zoneId) {
        throw new ForbiddenException(
          'Vous ne pouvez créer que dans votre zone assignée',
        );
      }
    }

    let zoneIdFinal =
      dto.zoneId ?? dto.zoneIdOptional ?? null;

    if (creator.role === UserRole.GESTIONNAIRE_ZONE && creator.zoneId) {
      zoneIdFinal = zoneIdFinal ?? creator.zoneId;
    }

    if (
      creator.role !== UserRole.SUPER_ADMIN &&
      !targetIsAdmin &&
      !zoneIdFinal
    ) {
      throw new BadRequestException(
        'zoneId obligatoire pour ce profil (contournement réservé au super_admin)',
      );
    }

    const { canonical: phoneCanonical, variants: phoneVariants } =
      UsersService.normalizePhone(dto.phone);
    if (!phoneCanonical || !/^\+225[0-9]{10}$/.test(phoneCanonical)) {
      throw new BadRequestException('Numéro de téléphone invalide');
    }

    const emailRaw = dto.email ?? dto.emailOptional;
    const emailNormalized = emailRaw?.trim().toLowerCase() ?? null;

    const existingPhone = await this.usersRepo.findOne({
      where: { phone: In(phoneVariants) },
    });
    if (existingPhone) {
      throw new ConflictException(
        'Un utilisateur avec ce numéro de téléphone existe déjà',
      );
    }

    if (emailNormalized) {
      const existingEmail = await this.usersRepo.findOne({
        where: { email: emailNormalized },
      });
      if (existingEmail) {
        throw new ConflictException(
          'Un utilisateur avec cette adresse e-mail existe déjà',
        );
      }
    }

    let userStatus: UserStatus;
    let isPendingValidation = false;

    if (targetIsAdmin) {
      // Cas ADMIN créé par un SUPER_ADMIN : ACTIF immédiat + mot de passe connu
      // reste acceptable ICI, et seulement ici — c'est le cas d'exemption documenté
      // par l'ADR-002 (« vérifie s'il existe un rôle légitime… »). Pourquoi c'est
      // différent du trou fermé par P0.0 : (1) le mot de passe n'est PAS une
      // constante publique comme '0000' — il est généré aléatoirement à CHAQUE
      // création (generateInitialPassword(), 12 caractères) et n'est affiché
      // qu'une seule fois, à l'admin créateur ; (2) « quiconque connaît le numéro »
      // ne peut donc rien tenter : il lui faudrait aussi ce secret aléatoire
      // jamais réutilisé ailleurs ; (3) le créateur est un super_admin, déjà
      // authentifié comme administrateur de confiance — ce n'est pas l'exploit de
      // masse « n'importe quel identificateur terrain peut faire login à la place
      // de la marchande ». Ce n'est donc pas le takeover documenté par l'ADR.
      if (creator.role === UserRole.SUPER_ADMIN) {
        userStatus = UserStatus.ACTIF;
      } else {
        userStatus = UserStatus.EN_ATTENTE_VALIDATION;
        isPendingValidation = true;
      }
    } else {
      // P0.0 (ADR-002) — RÉGRESSION FERMÉE ICI : ce chemin posait auparavant
      // userStatus = ACTIF + mot de passe CONSTANT '0000' pour tout rôle non-admin
      // (marchand/producteur/cooperateur/institution/identificateur), soit
      // EXACTEMENT l'exploit de masse que l'ADR ferme sur `create-with-acteur`.
      // On applique donc ici le MÊME modèle : le compte naît inerte, non-loginable,
      // et devient utilisable uniquement via le code d'activation à usage unique
      // (POST /auth/activer), où l'acteur pose SON secret.
      userStatus = UserStatus.EN_ATTENTE_ACTIVATION;
    }

    // Le "mot de passe" posé ici pour un acteur métier n'est JAMAIS montré ni
    // utilisable : c'est un secret aléatoire jeté (même motif que
    // `identifications.controller.ts` create-with-acteur), semé uniquement parce
    // que la colonne password_hash ne peut pas rester vide. Le login réel se fera
    // après activation, avec le secret choisi par l'acteur lui-même.
    const defaultPassword = targetIsAdmin
      ? generateInitialPassword()
      : crypto.randomBytes(24).toString('hex');
    const passwordHash = isPendingValidation
      ? null
      : await bcrypt.hash(defaultPassword, 10);

    const lastNameSafe = (dto.lastName ?? '').trim();

    const user = this.usersRepo.create({
      firstName: dto.firstName.trim(),
      lastName: lastNameSafe || '-',
      phone: phoneCanonical,
      email: emailNormalized,
      role: dto.role,
      sousProfilMarchand: dto.sousProfilMarchand ?? null,
      zoneId: zoneIdFinal ?? undefined,
      passwordHash,
      mustChangePassword: targetIsAdmin ? false : true,
      status: userStatus,
      genre: dto.genre ?? undefined,
      dateNaissance: dto.dateNaissance
        ? new Date(dto.dateNaissance)
        : undefined,
      lieuNaissance: dto.lieuNaissance ?? undefined,
      nationalite: dto.nationalite ?? undefined,
      nin: dto.nin ?? undefined,
      numCMU: dto.numCmu ?? undefined,
      boPermissions:
        targetIsAdmin && !isPendingValidation
          ? (dto.boPermissions as Record<string, boolean> | undefined) ?? null
          : null,
      // Metadonnees d'entite uniquement pour les comptes admin ; nulles pour
      // tous les autres roles (acteurs metier, institution, identificateur).
      entiteMetadata: targetIsAdmin ? dto.entiteMetadata ?? null : null,
      pendingValidationData: isPendingValidation
        ? {
            createurId: creator.id,
            createurRole: creator.role,
            boPermissions: dto.boPermissions ?? null,
            submittedAt: new Date().toISOString(),
          }
        : undefined,
    });

    const saved = await this.usersRepo.save(user);

    // P0.0 (ADR-002) : le compte non-admin naît en_attente_activation (voir plus
    // haut) — on émet ici son code d'activation à usage unique (30 min), via le
    // MÊME service que `create-with-acteur` (Constitution §1 : une seule
    // implémentation). `createdBy` = l'admin BO créateur, pour la journalisation
    // exigée par l'ADR (qui a initié l'enrôlement).
    let activationCode: string | undefined;
    if (!targetIsAdmin) {
      activationCode = await this.activationService.issueForUser(saved.id, creator.id);
    }

    if (!targetIsAdmin) {
      try {
        const identification = this.identificationsRepo.create({
          acteur_id: saved.id,
          identificateur_id: null,
          type_acteur: dto.role,
          statut: 'valide',
          source: 'admin_bo',
          zone_id: zoneIdFinal ?? undefined,
          acteur_nom:
            `${dto.firstName} ${lastNameSafe}`.trim() ||
            dto.firstName.trim(),
          form_data: {
            createdViaBackoffice: true,
            createurBoUserId: creator.id,
            createurRole: creator.role,
            acteurMetierData: dto.acteurMetierData ?? null,
            institutionData: dto.institutionData ?? null,
            photoBase64: dto.photoBase64 ?? null,
          },
        });
        await this.identificationsRepo.save(identification);
      } catch (e) {
        this.logger.warn(
          `Identification back-office non persistée pour l'utilisateur ${saved.id}: ${(e as Error).message}`,
        );
      }
    }

    let auditAction = '';
    if (targetIsAdmin) {
      auditAction = isPendingValidation
        ? 'COMPTE_ADMIN_CREATION_PENDING_BO'
        : 'COMPTE_ADMIN_CREATION_BO';
    } else if (isActeurMetier) {
      auditAction = 'ACTEUR_METIER_CREATION_BO';
    } else if (isInstitution) {
      auditAction = 'INSTITUTION_CREATION_BO';
    } else if (isIdentificateur) {
      auditAction = 'IDENTIFICATEUR_CREATION_BO';
    }

    await this.auditService.log({
      userId: creator.id,
      action: auditAction,
      entite: 'user',
      entiteId: saved.id,
      details: { role: dto.role, createurRole: creator.role, source: 'admin_bo' },
      ip: ip ?? null,
    });

    if (isPendingValidation) {
      try {
        const superAdmins = await this.usersRepo.find({
          where: { role: UserRole.SUPER_ADMIN, status: UserStatus.ACTIF },
        });
        for (const admin of superAdmins) {
          await this.notificationsService.create({
            userId: admin.id,
            type: 'compte_admin_pending',
            titre: 'Nouveau compte admin à valider',
            message: `${dto.firstName} ${lastNameSafe} (${dto.role}) en attente de validation`,
            priority: 'high',
            category: 'admin',
            icon: 'user-plus',
            metadata: {
              compteId: saved.id,
              role: dto.role,
              createurId: creator.id,
            },
          });
        }
      } catch (e) {
        this.logger.warn(
          `Notification échouée compte_admin_pending ${saved.id}: ${(e as Error).message}`,
        );
      }
    }

    if (isPendingValidation) {
      return {
        id: saved.id,
        status: saved.status,
        message:
          'Compte admin créé en attente de validation par un super_admin',
      };
    }

    if (targetIsAdmin) {
      // Cas ADMIN créé par un super_admin (voir commentaire plus haut) : mot de
      // passe aléatoire réel, affiché une seule fois — comportement inchangé.
      return {
        id: saved.id,
        status: saved.status,
        message: `Compte créé avec succès. Mot de passe initial : ${defaultPassword}. L'utilisateur devra le changer au premier login.`,
        defaultPassword,
        motDePasseInitial: defaultPassword,
      };
    }

    // Acteur métier / institution / identificateur (P0.0) : PAS de mot de passe
    // à transmettre — le compte est inerte tant que le code d'activation n'a pas
    // été utilisé sur le téléphone de l'acteur via POST /auth/activer.
    return {
      id: saved.id,
      status: saved.status,
      message:
        "Compte créé, en attente d'activation. Transmettez le code d'activation à l'acteur : " +
        'il doit l\'utiliser sur son téléphone (POST /auth/activer) pour choisir SON secret. ' +
        'Le code est à usage unique et expire dans 30 minutes.',
      activationCode,
    };
  }

  async changeSousProfil(
    marchandId: string,
    dto: UpdateSousProfilMarchandDto,
    actor: { id: string; role: string },
    ip?: string,
  ): Promise<{ id: string; sousProfilMarchand: SousProfilMarchand; message: string }> {
    const user = await this.usersRepo.findOne({ where: { id: marchandId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.role !== UserRole.MARCHAND) {
      throw new ConflictException(
        'Seul un marchand peut se voir attribuer un sous-profil',
      );
    }

    const ancien = user.sousProfilMarchand ?? null;
    const nouveau = dto.sousProfilMarchand;

    if (ancien === nouveau) {
      return { id: user.id, sousProfilMarchand: nouveau, message: 'Sous-profil inchangé' };
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.update(User, { id: marchandId }, { sousProfilMarchand: nouveau });
      await manager.query(
        `INSERT INTO marchand_sous_profil_historique
           (marchand_id, ancien_sous_profil, nouveau_sous_profil, modifie_par, motif)
         VALUES ($1, $2::sous_profil_marchand_enum, $3::sous_profil_marchand_enum, $4, $5)`,
        [marchandId, ancien, nouveau, actor.id, dto.motif ?? null],
      );
    });

    await this.auditService.log({
      userId: actor.id,
      action: 'MARCHAND_SOUS_PROFIL_MODIF_BO',
      entite: 'user',
      entiteId: marchandId,
      details: { ancien, nouveau, motif: dto.motif ?? null, modifieParRole: actor.role },
      ip: ip ?? null,
    });

    return {
      id: user.id,
      sousProfilMarchand: nouveau,
      message: `Sous-profil mis à jour : ${nouveau}`,
    };
  }
}
