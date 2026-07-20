import {
  Injectable, ConflictException, UnauthorizedException, Logger, Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { randomBytes } from 'crypto';
import { User, UserStatus, UserRole } from '../users/entities/user.entity';
import { Cooperative } from '../cooperatives-rest/cooperative.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { SignupDto } from './dto/signup.dto';
import { EventsGateway } from '../events/events.gateway';
import { LoginDto } from './dto/login.dto';
import { WalletsService } from '../wallets/wallets.service';
import { NotificationsService } from '../notifications/notifications.service';

const MAX_SESSIONS_PER_USER = 5;
// Verrouillage PIN/connexion acteur : 9 échecs cumulés -> blocage SANS expiration.
// Matérialisé par une date très lointaine ; seul un identificateur le lève.
const PIN_MAX_FAILED_ATTEMPTS = 9;
const PIN_LOCK_FAR_FUTURE_MS = 100 * 365 * 24 * 60 * 60 * 1000;
const BO_ROLES = ['super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain'];
const ACTEUR_ROLES = ['marchand', 'producteur', 'cooperateur', 'institution', 'identificateur'];
const DEFAULT_PASSWORD_BO = '123456';
const DEFAULT_PASSWORD_ACTEUR = '0000';

function getDefaultPasswordForRole(role: string): string {
  if (BO_ROLES.includes(role)) return DEFAULT_PASSWORD_BO;
  if (ACTEUR_ROLES.includes(role)) return DEFAULT_PASSWORD_ACTEUR;
  return DEFAULT_PASSWORD_ACTEUR;
}

function generateInitialPassword(): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(12);
  let out = '';
  for (let i = 0; i < 12; i++) {
    out += charset[bytes[i] % charset.length];
  }
  return out;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Cooperative)
    private readonly cooperativeRepository: Repository<Cooperative>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly walletsService: WalletsService,
    private readonly notificationsService: NotificationsService,
    @Optional() private readonly eventsGateway?: EventsGateway,
  ) {}

  // ── Inscription ───────────────────────────────────────────
  async signup(signupDto: SignupDto, deviceInfo?: string, ipAddress?: string) {
    const existing = await this.userRepository.findOne({ where: { phone: signupDto.phone } });
    if (existing) throw new ConflictException('Ce numéro est déjà utilisé');

    const passwordToApply = getDefaultPasswordForRole(signupDto.role);
    const passwordHash = await bcrypt.hash(passwordToApply, 10);
    const user = this.userRepository.create({
      phone: signupDto.phone, passwordHash,
      firstName: signupDto.firstName, lastName: signupDto.lastName,
      role: signupDto.role, genre: signupDto.genre as any,
      sousProfilMarchand: (signupDto as any).sousProfilMarchand ?? null,
      region: signupDto.region, commune: signupDto.commune,
      activity: signupDto.activity, market: signupDto.market,
      cooperativeName: signupDto.cooperativeName, institutionName: signupDto.institutionName,
      photoUrl: signupDto.photoUrl, zoneId: signupDto.zoneId,
      nin: signupDto.nin, nationalite: signupDto.nationalite,
      situationMatrimoniale: signupDto.situationMatrimoniale,
      numCNPS: signupDto.numCNPS, numCMU: signupDto.numCMU,
      recepisse: signupDto.recepisse, categorie: signupDto.categorie,
      dateNaissance: signupDto.dateNaissance ? new Date(signupDto.dateNaissance) : null,
      lieuNaissance: signupDto.lieuNaissance || null,
      estMembreCooperative: signupDto.estMembreCooperative ?? false,
      boitePostale: signupDto.boitePostale, statutEntrepreneur: signupDto.statutEntrepreneur,
      typePointVente: signupDto.typePointVente ?? null,
      typePointVenteAutre: signupDto.typePointVenteAutre ?? null,
      districtId: signupDto.districtId ?? null,
      districtAutre: signupDto.districtAutre ?? null,
      regionId: signupDto.regionId ?? null,
      regionAutre: signupDto.regionAutre ?? null,
      departementId: signupDto.departementId ?? null,
      departementAutre: signupDto.departementAutre ?? null,
      communeId: signupDto.communeId ?? null,
      communeAutre: signupDto.communeAutre ?? null,
      quartierVillage: signupDto.quartierVillage ?? null,
      objectifMensuel: signupDto.objectifMensuel ?? null,
      primeObjectif: signupDto.primeObjectif ?? null,
      mustChangePassword: true,
      status: UserStatus.ACTIF, validated: false,
    });
    const saved = await this.userRepository.save(user);
    if (saved.role === 'cooperateur') {
      const coopName = saved.cooperativeName || `Coopérative de ${saved.firstName} ${saved.lastName}`;
      const coops = await this.cooperativeRepository.query(
        `SELECT id FROM cooperatives WHERE responsable_id = $1 LIMIT 1`,
        [saved.id],
      );
      const existing = coops[0] || null;
      if (!existing) {
        await this.cooperativeRepository.save(
          this.cooperativeRepository.create({
            nom: coopName,
            responsable_id: saved.id,
          } as any)
        );
      }
    }
    if (saved.role === 'institution') {
      const existingInst = await this.cooperativeRepository.query(
        `SELECT id FROM institutions WHERE responsable_id = $1 LIMIT 1`,
        [saved.id],
      );
      if (!existingInst.length) {
        await this.cooperativeRepository.query(
          `INSERT INTO institutions (nom, responsable_id, actif)
           VALUES ($1, $2::uuid, true)
           ON CONFLICT DO NOTHING`,
          [`Institution de ${saved.firstName} ${saved.lastName}`, saved.id],
        );
      }
    }
    await this.walletsService.createForUser(saved.id);
    const tokens = await this.generateAndStoreTokens(saved, deviceInfo, ipAddress);
    this.logger.log(`Signup: ${saved.phone} (${saved.role})`);
    this.eventsGateway?.emitUserCreated({ id: saved.id, phone: saved.phone, role: saved.role });
    return { user: this.sanitizeUser(saved), ...tokens };
  }

  // ── Connexion ─────────────────────────────────────────────
  async login(loginDto: LoginDto, deviceInfo?: string, ipAddress?: string) {
    if (!loginDto.phone && !loginDto.email) {
      throw new UnauthorizedException('Téléphone ou e-mail requis');
    }

    let user: User | null = null;

    if (loginDto.email) {
      const normalizedEmail = loginDto.email.trim().toLowerCase();
      user = await this.userRepository
        .createQueryBuilder('u')
        .where('LOWER(u.email) = :email', { email: normalizedEmail })
        .getOne();

      if (!user) {
        this.logger.warn(`Echec login email: ${normalizedEmail} depuis ${ipAddress}`);
        throw new UnauthorizedException('Identifiants incorrects');
      }

      if (!BO_ROLES.includes(user.role)) {
        this.logger.warn(`Tentative login email pour role non-BO: ${user.role} depuis ${ipAddress}`);
        throw new UnauthorizedException('Connexion par e-mail réservée aux administrateurs');
      }
    } else if (loginDto.phone) {
      user = await this.userRepository.findOne({ where: { phone: loginDto.phone } });
    }

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    // Verrouillage actif (sans expiration) : levé uniquement par un identificateur.
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw new UnauthorizedException({
        message: 'Compte bloqué. Contacte ton identificateur pour le débloquer.',
        error: 'Unauthorized',
        locked: true,
      });
    }

    const valid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!valid) {
      this.logger.warn(`Echec login: ${loginDto.email || loginDto.phone} depuis ${ipAddress}`);
      const attempts = (user.failedPinAttempts ?? 0) + 1;
      if (attempts >= PIN_MAX_FAILED_ATTEMPTS) {
        const farFuture = new Date(Date.now() + PIN_LOCK_FAR_FUTURE_MS);
        await this.userRepository.update(user.id, { failedPinAttempts: attempts, lockedUntil: farFuture });
        await this.notifyIdentificateursVerrouillage(user);
        throw new UnauthorizedException({
          message: 'Compte bloqué. Contacte ton identificateur pour le débloquer.',
          error: 'Unauthorized',
          locked: true,
        });
      }
      await this.userRepository.update(user.id, { failedPinAttempts: attempts });
      throw new UnauthorizedException('Identifiants incorrects');
    }
    if (user.status === UserStatus.SUSPENDU) throw new UnauthorizedException('Compte suspendu');
    if (user.status === UserStatus.REJETE) throw new UnauthorizedException('Compte rejeté');
    if (user.status === UserStatus.EN_ATTENTE_VALIDATION) throw new UnauthorizedException('Compte en attente de validation par un super administrateur');

    user.lastLoginAt = new Date();
    user.lastLoginUserAgent = typeof deviceInfo === 'string' ? deviceInfo.slice(0, 500) : null;
    // Connexion réussie : réinitialiser le compteur d'échecs et lever tout verrou résiduel.
    user.failedPinAttempts = 0;
    user.lockedUntil = null;
    await this.userRepository.save(user);

    const tokens = await this.generateAndStoreTokens(user, deviceInfo, ipAddress);
    this.logger.log(`Login: ${user.email || user.phone} (role: ${user.role})`);

    // Audit log
    try {
      await this.userRepository.manager.query(
        `INSERT INTO audit_logs (user_id, action, entite, entite_id, ip, details) VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, 'login', 'user', user.id, ipAddress || null, JSON.stringify({ deviceInfo: deviceInfo || null, method: loginDto.email ? 'email' : 'phone' })],
      );
    } catch (e: any) {
      this.logger.warn(`Audit log login failed: ${e?.message}`);
    }

    return { user: this.sanitizeUser(user), ...tokens };
  }

  async checkPhone(phone: string): Promise<{ exists: boolean }> {
    const user = await this.userRepository.findOne({
      where: { phone },
      select: ['id'],
    });
    return { exists: !!user };
  }

  // Notifie tous les identificateurs de la même zone qu'un acteur vient d'être verrouillé.
  private async notifyIdentificateursVerrouillage(acteur: User): Promise<void> {
    try {
      const zoneId = acteur.zoneId;
      if (!zoneId) return;
      const identificateurs = await this.userRepository.find({
        where: { role: UserRole.IDENTIFICATEUR, zoneId },
        select: ['id'],
      });
      if (!identificateurs.length) return;
      const acteurNom =
        `${acteur.firstName ?? ''} ${acteur.lastName ?? ''}`.trim() || acteur.phone;
      await Promise.allSettled(
        identificateurs.map((i) =>
          this.notificationsService.notifyActeurVerrouille(i.id, acteurNom),
        ),
      );
    } catch (e: any) {
      this.logger.warn(`Notification verrouillage acteur échouée: ${e?.message}`);
    }
  }

  async loginById(userId: string, deviceInfo?: string, ipAddress?: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Utilisateur introuvable');
    if (user.status === UserStatus.SUSPENDU) throw new UnauthorizedException('Compte suspendu');
    if (user.status === UserStatus.REJETE) throw new UnauthorizedException('Compte rejeté');
    if (user.status === UserStatus.EN_ATTENTE_VALIDATION) throw new UnauthorizedException('Compte en attente de validation par un super administrateur');

    user.lastLoginAt = new Date();
    user.lastLoginUserAgent = typeof deviceInfo === 'string' ? deviceInfo.slice(0, 500) : null;
    await this.userRepository.save(user);

    const tokens = await this.generateAndStoreTokens(user, deviceInfo, ipAddress);
    this.logger.log(`Login WebAuthn: ${user.phone}`);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  // ── Rotation refresh token ────────────────────────────────
  async rotateRefreshToken(rawToken: string, deviceInfo?: string, ipAddress?: string) {
    // 1. Hasher le token reçu pour chercher en DB
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.refreshTokenRepository.findOne({ where: { tokenHash } });

    // 2. Token introuvable → 401
    if (!stored) {
      this.logger.warn(`Refresh token inconnu depuis ${ipAddress}`);
      throw new UnauthorizedException('Token invalide');
    }

    // 3. Token déjà utilisé → COMPROMISSION → révoquer TOUT
    if (stored.used) {
      this.logger.warn(`Token déjà utilisé pour user ${stored.userId} depuis ${ipAddress}`);
      await this.revokeAllUserTokens(stored.userId);
      throw new UnauthorizedException('Token compromis - toutes les sessions révoquées');
    }

    // 4. Token révoqué → 401
    if (stored.revoked) {
      this.logger.warn(`Token révoqué utilisé: user ${stored.userId}`);
      throw new UnauthorizedException('Token révoqué');
    }

    // 5. Token expiré → 401
    if (stored.expiresAt < new Date()) {
      await this.refreshTokenRepository.update(stored.id, { revoked: true });
      throw new UnauthorizedException('Token expiré');
    }

    // 6. Marquer l'ancien comme USED (rotation)
    await this.refreshTokenRepository.update(stored.id, { used: true, revoked: true });

    // 7. Charger l'utilisateur
    const user = await this.userRepository.findOne({ where: { id: stored.userId } });
    if (!user) throw new UnauthorizedException('Utilisateur introuvable');

    // 8. Générer nouveaux tokens
    const tokens = await this.generateAndStoreTokens(user, deviceInfo, ipAddress);
    this.logger.log(`Rotation token: user ${user.phone}`);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  // ── Logout ────────────────────────────────────────────────
  async logout(rawToken: string) {
    if (!rawToken) return { success: true };
    const tokenHash = this.hashToken(rawToken);
    await this.refreshTokenRepository.update({ tokenHash }, { revoked: true, used: true });
    return { success: true };
  }

  // ── Logout global (révoquer toutes les sessions) ──────────
  async logoutAll(userId: string) {
    await this.revokeAllUserTokens(userId);
    this.logger.log(`Logout global: user ${userId}`);
    return { success: true };
  }

  // ── Nettoyer les tokens expirés (cron-like) ───────────────
  async cleanExpiredTokens() {
    const result = await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
    this.logger.log(`Tokens expirés supprimés: ${result.affected}`);
    return result.affected;
  }

  // ── Générer + stocker tokens ──────────────────────────────
  private async generateAndStoreTokens(user: User, deviceInfo?: string, ipAddress?: string) {
    const payload = { sub: user.id, phone: user.phone, role: user.role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
    });

    // Générer refresh token aléatoire sécurisé
    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);

    const expiresInDays = parseInt(this.configService.get('JWT_REFRESH_DAYS', '7'));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Limiter les sessions actives par user
    await this.enforceSessionLimit(user.id);

    // Sauvegarder en DB
    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        userId: user.id,
        tokenHash,
        expiresAt,
        revoked: false,
        used: false,
        deviceInfo: deviceInfo?.slice(0, 500),
        ipAddress: ipAddress?.slice(0, 45),
      }),
    );

    return { accessToken, refreshToken: rawRefreshToken };
  }

  // ── Limiter les sessions actives ──────────────────────────
  private async enforceSessionLimit(userId: string) {
    const active = await this.refreshTokenRepository.find({
      where: { userId, revoked: false, used: false },
      order: { createdAt: 'ASC' },
    });
    if (active.length >= MAX_SESSIONS_PER_USER) {
      // Révoquer les plus anciennes
      const toRevoke = active.slice(0, active.length - MAX_SESSIONS_PER_USER + 1);
      for (const t of toRevoke) {
        await this.refreshTokenRepository.update(t.id, { revoked: true });
      }
      this.logger.log(`Sessions limitées pour user ${userId}: ${toRevoke.length} révoquées`);
    }
  }

  // ── Révoquer tous les tokens d'un user ───────────────────
  async revokeAllUserTokens(userId: string) {
    await this.refreshTokenRepository.update(
      { userId, revoked: false },
      { revoked: true, used: true },
    );
  }

  // ── Hash SHA-256 + sel statique ───────────────────────────
  private hashToken(token: string): string {
    const salt = this.configService.get<string>('REFRESH_TOKEN_SALT');
    if (!salt) {
      throw new UnauthorizedException('Configuration REFRESH_TOKEN_SALT manquante');
    }
    return crypto.createHmac('sha256', salt).update(token).digest('hex');
  }

  // ── Sanitize user ─────────────────────────────────────────
  sanitizeUser(user: User) {
    const { passwordHash, pinCodeHash, pinCodeEncryptedIdentificateur, ...sanitized } = user as any;
    return sanitized;
  }

  // ── refreshTokens (compatibilité) ────────────────────────
  async refreshTokens(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Utilisateur introuvable');
    return this.generateAndStoreTokens(user);
  }
}

export { BO_ROLES, ACTEUR_ROLES, DEFAULT_PASSWORD_BO, DEFAULT_PASSWORD_ACTEUR, getDefaultPasswordForRole, generateInitialPassword };
