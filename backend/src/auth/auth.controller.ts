import { Controller, Post, Get, Patch, Delete, Param, Body, HttpCode, HttpStatus, UseGuards, Request, Res, ForbiddenException } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthService, BO_ROLES, ACTEUR_ROLES, getDefaultPasswordForRole } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { CreateActeurDto } from './dto/create-acteur.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { timingSafeEqual } from 'crypto';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';
import { FeedbakSmsService } from '../feedbak-sms/feedbak-sms.service';
import { AuditService } from '../audit/audit.service';
import { PinCryptoService } from './pin-crypto.service';

// Verrouillage PIN acteur : 9 échecs cumulés -> blocage SANS expiration temporelle.
// Le blocage est matérialisé par une date très lointaine (~100 ans) ; seul
// l'endpoint de déblocage identificateur le lève (remise à zéro).
const PIN_MAX_FAILED_ATTEMPTS = 9;
const PIN_LOCK_FAR_FUTURE_MS = 100 * 365 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken) private readonly tokenRepo: Repository<RefreshToken>,
    private readonly feedbakSmsService: FeedbakSmsService,
    private readonly auditService: AuditService,
    private readonly pinCrypto: PinCryptoService,
  ) {}

  @Throttle({ auth: { limit: 3, ttl: 60000 } })
  @Post('signup')
  async signup(@Body() signupDto: SignupDto, @Request() req: any, @Res({ passthrough: true }) res: Response) {
    // Securite: l'endpoint public d'auto-inscription est limite aux roles acteurs.
    // Les roles a privileges (back-office, admin, super_admin) ne sont jamais creables
    // sans authentification: ils passent par les endpoints administres (ex: POST /users/admin).
    if (!ACTEUR_ROLES.includes(signupDto.role)) {
      throw new ForbiddenException("Ce role ne peut pas etre cree via l'inscription publique");
    }
    // Politique mot de passe canonique JULABA: BO = 123456, acteur = 0000, mustChangePassword=true.
    // Le password recu du frontend est ignore et ecrase pour garantir la regle uniforme.
    signupDto.password = getDefaultPasswordForRole(signupDto.role);
    (signupDto as any).mustChangePassword = true;
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const result = await this.authService.signup(signupDto, deviceInfo, ipAddress);
    this.setTokenCookies(res, result.accessToken, result.refreshToken);
    return { user: { ...result.user, mustChangePassword: result.user.mustChangePassword ?? false }, success: true };
  }

  @Throttle({ auth: { limit: 10, ttl: 60000 } })
  @Post('check-phone')
  @HttpCode(HttpStatus.OK)
  async checkPhone(@Body() body: { phone: string }): Promise<{ exists: boolean }> {
    if (!body?.phone) return { exists: false };
    const phone = body.phone.startsWith('+225') ? body.phone : `+225${body.phone.replace(/\D/g, '').slice(0, 10)}`;
    return this.authService.checkPhone(phone);
  }

  @Throttle({ recovery: { limit: 5, ttl: 60000 } })
  @Get('contacts-recovery-bo')
  @HttpCode(HttpStatus.OK)
  async contactsRecoveryBo() {
    const rows = await this.userRepo.manager.query(
      `
      SELECT id, first_name AS "firstName", last_name AS "lastName", phone
      FROM users
      WHERE role = 'super_admin' AND status = 'actif'
      ORDER BY created_at ASC
      LIMIT 5
    `,
    );
    return { contacts: rows };
  }

  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Request() req: any, @Res({ passthrough: true }) res: Response) {
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const result = await this.authService.login(loginDto, deviceInfo, ipAddress);
    const isBO = BO_ROLES.includes(result.user?.role);
    this.setTokenCookies(res, result.accessToken, result.refreshToken, isBO);
    return { user: result.user, success: true };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Request() req: any, @Body() body: any, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refresh_token || body?.refreshToken;
    if (!token) return { error: 'Refresh token manquant' };
    try {
      const deviceInfo = req.headers['user-agent'];
      const ipAddress = req.ip || req.headers['x-forwarded-for'];
      const result = await this.authService.rotateRefreshToken(token, deviceInfo, ipAddress);
        const isBO = BO_ROLES.includes(result.user?.role);
      this.setTokenCookies(res, result.accessToken, result.refreshToken, isBO);
      return { success: true, accessToken: result.accessToken };
    } catch (e) {
      res.clearCookie('access_token', this.getTokenCookieBaseOptions());
      res.clearCookie('refresh_token', this.getTokenCookieBaseOptions());
      res.clearCookie('bo_access_token', this.getTokenCookieBaseOptions());
      return { error: e.message || 'Token invalide' };
    }
  }

  @SkipThrottle()
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    const user = await this.userRepo.findOne({ where: { id: req.user.id } });
    return { user };
  }


  @SkipThrottle()
  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getSessions(@Request() req: any) {
    const sessions = await this.tokenRepo.find({
      where: { userId: req.user.id, revoked: false, used: false },
      order: { createdAt: 'DESC' },
      take: 10,
    });
    const crypto = require('crypto');
    const salt = process.env.REFRESH_TOKEN_SALT;
    const rawToken = req.cookies?.refresh_token || '';
    const currentHash = rawToken
      ? (salt ? crypto.createHmac('sha256', salt).update(rawToken).digest('hex') : '')
      : '';
    return {
      sessions: sessions.map(s => ({
        id: s.id,
        deviceInfo: s.deviceInfo || 'Appareil inconnu',
        ipAddress: s.ipAddress || 'IP inconnue',
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        isCurrent: currentHash ? s.tokenHash === currentHash : false,
      })),
    };
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async revokeSession(@Request() req: any, @Param('id') id: string) {
    const session = await this.tokenRepo.findOne({ where: { id, userId: req.user.id } });
    if (!session) return { success: false, message: 'Session introuvable' };
    await this.tokenRepo.update(id, { revoked: true });
    return { success: true };
  }

  @Delete('sessions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async revokeAllSessions(@Request() req: any) {
    await this.tokenRepo.update({ userId: req.user.id, revoked: false }, { revoked: true });
    return { success: true };
  }

  @Patch('preferences')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updatePreferences(@Request() req: any, @Body() body: Record<string, boolean | string | number>) {
    const user = await this.userRepo.findOne({ where: { id: req.user.id } });
    if (!user) return { success: false, message: 'Utilisateur introuvable' };
    const merged = { ...(user.preferences || {}), ...body };
    await this.userRepo.update(req.user.id, { preferences: merged } as any);
    return { success: true, preferences: merged };
  }


  @Post('pin/set')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async setPin(@Request() req: any, @Body() body: { pin: string; currentPin?: string }) {
    if (!body.pin || !/^\d{4}$/.test(body.pin)) {
      return { success: false, message: 'Le code PIN doit contenir exactement 4 chiffres' };
    }
    const bcrypt = require('bcryptjs');
    const user = await this.userRepo.findOne({ where: { id: req.user.id } });
    if (!user) return { success: false, message: 'Utilisateur introuvable' };
    if (user.pinSecurityEnabled && user.pinCodeHash) {
      if (!body.currentPin) return { success: false, message: 'Code PIN actuel requis' };
      const valid = await bcrypt.compare(body.currentPin, user.pinCodeHash);
      if (!valid) return { success: false, message: 'Code PIN actuel incorrect' };
    }
    const hash = await bcrypt.hash(body.pin, 10);
    await this.userRepo.update(req.user.id, {
      pinCodeHash: hash,
      pinSecurityEnabled: true,
    } as any);
    return { success: true };
  }

  @Post('pin/verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verifyPin(@Request() req: any, @Body() body: { pin: string }) {
    if (!body.pin) return { valid: false };
    const bcrypt = require('bcryptjs');
    // Recharger le user complet (failedPinAttempts / lockedUntil à jour).
    const user = await this.userRepo.findOne({ where: { id: req.user.id } });
    if (!user || !user.pinCodeHash) return { valid: false };

    // Blocage actif (sans expiration) : on ne vérifie même pas le PIN.
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      return { valid: false, locked: true };
    }

    const valid = await bcrypt.compare(body.pin, user.pinCodeHash);
    if (valid) {
      await this.userRepo.update(user.id, { failedPinAttempts: 0, lockedUntil: null });
      return { valid: true };
    }

    const attempts = (user.failedPinAttempts ?? 0) + 1;
    if (attempts >= PIN_MAX_FAILED_ATTEMPTS) {
      // Date très lointaine = blocage sans expiration (déblocage identificateur uniquement).
      const farFuture = new Date(Date.now() + PIN_LOCK_FAR_FUTURE_MS);
      await this.userRepo.update(user.id, { failedPinAttempts: attempts, lockedUntil: farFuture });
      return { valid: false, locked: true };
    }
    await this.userRepo.update(user.id, { failedPinAttempts: attempts });
    return { valid: false, locked: false };
  }

  @Post('acteur/:id/debloquer-pin')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async debloquerPinActeur(@Param('id') id: string, @Request() req: any) {
    if (req.user?.role !== 'identificateur') {
      throw new ForbiddenException('Réservé aux identificateurs');
    }
    const acteur = await this.userRepo.findOne({ where: { id } });
    if (!acteur) return { success: false, message: 'Acteur introuvable' };
    // L'identificateur ne peut débloquer qu'un acteur de SA zone.
    if (!acteur.zoneId || !req.user?.zoneId || acteur.zoneId !== req.user.zoneId) {
      throw new ForbiddenException('Acteur hors de votre zone');
    }
    await this.userRepo.update(id, { failedPinAttempts: 0, lockedUntil: null });
    return { success: true };
  }

  @Post('pin/disable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async disablePin(@Request() req: any, @Body() body: { currentPin: string }) {
    if (!body.currentPin) return { success: false, message: 'Code PIN requis pour désactiver' };
    const bcrypt = require('bcryptjs');
    const user = await this.userRepo.findOne({ where: { id: req.user.id } });
    if (!user || !user.pinCodeHash) return { success: false, message: 'Aucun PIN configuré' };
    const valid = await bcrypt.compare(body.currentPin, user.pinCodeHash);
    if (!valid) return { success: false, message: 'Code PIN incorrect' };
    await this.userRepo.update(req.user.id, {
      pinSecurityEnabled: false,
      pinCodeHash: null,
    } as any);
    return { success: true };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(@Request() req: any, @Body() body: { oldPassword: string; newPassword: string }) {
    const bcrypt = require('bcryptjs');
    const user = await this.userRepo.findOne({ where: { id: req.user.id } });
    if (!user) return { success: false, message: 'Utilisateur introuvable' };
    if (!body.oldPassword || body.oldPassword.length < 4)
      return { success: false, message: 'Ancien mot de passe requis (4 caracteres minimum)' };
    if (!body.newPassword || body.newPassword.length < 4)
      return { success: false, message: 'Nouveau mot de passe trop court (4 caracteres minimum)' };
    const valid = await bcrypt.compare(body.oldPassword, user.passwordHash);
    if (!valid) return { success: false, message: 'Ancien code incorrect' };
    const hash = await bcrypt.hash(body.newPassword, 10);
    await this.userRepo.update(req.user.id, { passwordHash: hash, mustChangePassword: false } as any);
    return { success: true };
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteAccount(@Request() req: any, @Body() body: { password: string }) {
    if (!body.password) return { success: false, message: 'Mot de passe requis' };
    const bcrypt = require('bcryptjs');
    const user = await this.userRepo.findOne({ where: { id: req.user.id } });
    if (!user) return { success: false, message: 'Utilisateur introuvable' };
    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) return { success: false, message: 'Mot de passe incorrect' };
    await this.authService.logoutAll(req.user.id);
    await this.userRepo.update(req.user.id, {
      phone: `deleted_${req.user.id}`,
      passwordHash: '',
      firstName: 'Compte',
      lastName: 'Supprimé',
      status: UserStatus.REJETE,
    } as any);
    return { success: true };
  }

  @SkipThrottle()
  @Post('logout')
  @HttpCode(200)
  async logout(@Request() req: any, @Body() body: any, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refresh_token || body?.refreshToken;
    if (token) await this.authService.logout(token);
    res.clearCookie('access_token', this.getTokenCookieBaseOptions());
    res.clearCookie('refresh_token', this.getTokenCookieBaseOptions());
    res.clearCookie('bo_access_token', this.getTokenCookieBaseOptions());
    return { success: true };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async logoutAll(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    await this.authService.logoutAll(req.user.id);
    res.clearCookie('access_token', this.getTokenCookieBaseOptions());
    res.clearCookie('refresh_token', this.getTokenCookieBaseOptions());
    res.clearCookie('bo_access_token', this.getTokenCookieBaseOptions());
    return { success: true, message: 'Toutes les sessions révoquées' };
  }

  @Post('reset-user-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  @HttpCode(HttpStatus.OK)
  async resetUserPassword(@Body() body: { userId: string; newPassword: string }) {
    if (!body.userId) return { success: false, message: 'userId requis' };
    if (!body.newPassword || body.newPassword.length < 4) return { success: false, message: 'Mot de passe trop court (4 caractères minimum)' };
    const user = await this.userRepo.findOne({ where: { id: body.userId } });
    if (!user) return { success: false, message: 'Utilisateur introuvable' };
    const bcrypt = require('bcryptjs');
    await this.userRepo.update(user.id, {
      passwordHash: await bcrypt.hash(body.newPassword, 10),
      mustChangePassword: true,
    } as any);
    return { success: true, message: 'Mot de passe réinitialisé' };
  }

  @Post('identificateur/:id/pin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin_general')
  @HttpCode(HttpStatus.OK)
  async setIdentificateurPin(@Param('id') id: string, @Body() body: { pin: string }, @Request() req: any) {
    if (!body.pin || !/^\d{4}$/.test(body.pin)) return { success: false, message: 'Le PIN doit contenir exactement 4 chiffres' };
    if (body.pin === '0000' || body.pin === '1234') return { success: false, message: 'Ce PIN est trop simple' };
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) return { success: false, message: 'Identificateur introuvable' };
    if ((user as any).role !== 'identificateur') return { success: false, message: 'Cet acteur n\'est pas un identificateur' };
    const stored = this.pinCrypto.encrypt(body.pin);
    await this.userRepo.update(id, { pinCodeEncryptedIdentificateur: stored } as any);
    const newPin = body.pin;
    await this.auditService.log({
      userId: req.user?.id ?? null,
      action: 'PIN_UPDATE',
      entite: 'identificateur',
      entiteId: id,
      details: {
        changedBy: req.user?.id ?? null,
        lastTwoDigits: typeof newPin === 'string' ? newPin.slice(-2) : null,
      },
      ip: req.ip ?? null,
    });
    return { success: true, message: 'PIN défini avec succès' };
  }

  @Post('identificateur/me/verify-pin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('identificateur')
  @HttpCode(HttpStatus.OK)
  async verifyIdentificateurPin(@Body() body: { pin: string }, @Request() req: any) {
    if (!body.pin || !/^\d{4}$/.test(body.pin)) {
      return { valid: false, message: 'Le PIN doit contenir exactement 4 chiffres' };
    }
    const user = await this.userRepo.findOne({ where: { id: req.user.id } });
    if (!user) return { valid: false, message: 'Utilisateur introuvable' };
    if ((user as any).role !== 'identificateur') {
      return { valid: false, message: 'Cet utilisateur n\'est pas un identificateur' };
    }
    if (!(user as any).pinCodeEncryptedIdentificateur) {
      return { valid: false, message: 'Aucun PIN défini pour cet identificateur' };
    }
    try {
      const pin = this.pinCrypto.decrypt((user as any).pinCodeEncryptedIdentificateur);
      const pinBuffer = Buffer.from(pin.trim().padEnd(4, '\0'));
      const inputBuffer = Buffer.from(body.pin.trim().padEnd(4, '\0'));
      const valid = pinBuffer.length === inputBuffer.length &&
        timingSafeEqual(pinBuffer, inputBuffer);
      return { valid };
    } catch {
      return { valid: false, message: 'Erreur lors de la vérification du PIN' };
    }
  }

  @Post('identificateur/me/change-pin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('identificateur')
  @HttpCode(HttpStatus.OK)
  async changeIdentificateurPin(
    @Body() body: { oldPin: string; newPin: string },
    @Request() req: any,
  ) {
    if (!body.oldPin || !/^\d{4}$/.test(body.oldPin)) {
      return { success: false, message: 'L\'ancien PIN doit contenir 4 chiffres' };
    }
    if (!body.newPin || !/^\d{4}$/.test(body.newPin)) {
      return { success: false, message: 'Le nouveau PIN doit contenir 4 chiffres' };
    }
    if (body.newPin === '1234') {
      return { success: false, message: 'Ce PIN est trop simple' };
    }
    if (body.oldPin === body.newPin) {
      return { success: false, message: 'Le nouveau PIN doit être différent de l\'ancien' };
    }
    const user = await this.userRepo.findOne({ where: { id: req.user.id } });
    if (!user || (user as any).role !== 'identificateur') {
      return { success: false, message: 'Accès refusé' };
    }
    if (!(user as any).pinCodeEncryptedIdentificateur) {
      return { success: false, message: 'Aucun PIN défini' };
    }
    try {
      const pin = this.pinCrypto.decrypt((user as any).pinCodeEncryptedIdentificateur);
      if (pin.trim() !== body.oldPin.trim()) {
        return { success: false, message: 'Ancien PIN incorrect' };
      }
      const newStored = this.pinCrypto.encrypt(body.newPin);
      await this.userRepo.update(req.user.id, { pinCodeEncryptedIdentificateur: newStored } as any);
      try {
        await this.feedbakSmsService.notifyPinChanged(
          (user as any).phone,
          (user as any).firstName || 'Utilisateur',
        );
      } catch {
        void 0;
      }
      return { success: true, message: 'PIN modifié avec succès' };
    } catch {
      return { success: false, message: 'Erreur lors du changement de PIN' };
    }
  }

  @Get('identificateur/:id/pin-decrypted')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin_general')
  async getDecryptedPin(@Param('id') id: string, @Request() req: any) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user || (user as any).role !== 'identificateur') {
      return { success: false, message: 'Identificateur introuvable' };
    }
    if (!(user as any).pinCodeEncryptedIdentificateur) {
      return { success: false, message: 'Aucun PIN défini' };
    }
    try {
      const pin = this.pinCrypto.decrypt((user as any).pinCodeEncryptedIdentificateur);
      await this.auditService.log({
        userId: req.user?.id ?? null,
        action: 'PIN_READ',
        entite: 'identificateur',
        entiteId: id,
        details: { context: 'BO admin lookup' },
        ip: req.ip ?? null,
      });
      return { success: true, pin: pin.trim() };
    } catch {
      return { success: false, message: 'Erreur lors du déchiffrement' };
    }
  }

  @Post('create-acteur')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain', 'identificateur')
  @HttpCode(HttpStatus.OK)
  async createActeur(@Body() body: CreateActeurDto, @Request() req: any) {
    try {
      const ROLES_ACTEURS = ['marchand', 'producteur', 'cooperateur'];
      const isCreatedByIdentificateur = req.user?.role === 'identificateur';
      const isCreatingActeur = ROLES_ACTEURS.includes((body as any)?.role);

      if (isCreatedByIdentificateur && isCreatingActeur) {
        if (req.user?.zoneId) {
          (body as any).zoneId = req.user.zoneId;
          (body as any).zone_id = req.user.zoneId;
        }
      }

      const canonicalPassword = getDefaultPasswordForRole((body as any).role);
      const result = await this.authService.signup({ ...body, password: canonicalPassword, mustChangePassword: true } as any);
      if (result.user?.id) {
        await this.userRepo.update(result.user.id, { mustChangePassword: true } as any);
      }
      let pinGenere: string | undefined;
      if ((body as any).role === 'identificateur' && result.user?.id) {
        const digits = ['2','3','4','5','6','7','8','9'];
        pinGenere = Array.from({ length: 4 }, () => digits[Math.floor(Math.random() * digits.length)]).join('');
        const stored = this.pinCrypto.encrypt(pinGenere);
        await this.userRepo.update(result.user.id, { pinCodeEncryptedIdentificateur: stored } as any);
        try {
          if ((body as any).phone) {
            await this.feedbakSmsService.notifyPinIdentificateurCreated(
              String((body as any).phone),
              String((body as any).firstName || 'Utilisateur'),
              pinGenere,
            );
          }
        } catch {
          void 0;
        }
      }
      return { user: result.user, success: true, pinGenere };
    } catch (e: any) {
      if (e.status === 409) throw e;
      throw e;
    }
  }

  @Post('create-super-admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @HttpCode(HttpStatus.OK)
  async createSuperAdmin(@Body() body: { phone: string; password: string; firstName: string; lastName: string }) {
    if (!body.phone || !body.password) return { success: false, error: 'phone et password requis' };
    const existing = await this.userRepo.findOne({ where: { phone: body.phone } });
    if (existing) return { success: false, error: 'Ce numéro existe déjà' };
    const bcrypt = require('bcryptjs');
    const user = this.userRepo.create({
      phone: body.phone,
      passwordHash: await bcrypt.hash(body.password, 10),
      firstName: body.firstName || 'Super',
      lastName: body.lastName || 'Admin',
      role: 'super_admin' as any,
    });
    await this.userRepo.save(user);
    return { success: true, message: 'Super admin créé', userId: user.id };
  }

  @Get('super-admin-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  async superAdminStatus() {
    const admin = await this.userRepo.findOne({ where: { role: 'super_admin' as any } });
    return { exists: !!admin };
  }

  @Post('webauthn/register/options')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async webauthnRegisterOptions(@Request() req: any) {
    const user = await this.userRepo.findOne({ where: { id: req.user.id } });
    if (!user) return { error: 'Utilisateur introuvable' };
    const existingCredentials = (user.webauthnCredentials || []).map((c) => ({
      id: c.credentialID,
      transports: c.transports as any,
    }));
    const options = await generateRegistrationOptions({
      rpName: 'Jùlaba',
      rpID: process.env.WEBAUTHN_RP_ID || 'julaba.online',
      userName: user.phone,
      userDisplayName: `${user.firstName} ${user.lastName}`.trim(),
      attestationType: 'none',
      excludeCredentials: existingCredentials as any,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });
    await this.userRepo.update(req.user.id, { webauthnChallenge: options.challenge } as any);
    return options;
  }

  @Post('webauthn/register/verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async webauthnRegisterVerify(@Request() req: any, @Body() body: RegistrationResponseJSON) {
    const user = await this.userRepo.findOne({ where: { id: req.user.id } });
    if (!user || !user.webauthnChallenge) return { verified: false, error: 'Challenge manquant' };
    try {
      const { verified, registrationInfo } = await verifyRegistrationResponse({
        response: body,
        expectedChallenge: user.webauthnChallenge,
        expectedOrigin: process.env.WEBAUTHN_ORIGIN || 'https://julaba.online',
        expectedRPID: process.env.WEBAUTHN_RP_ID || 'julaba.online',
      });
      if (verified && registrationInfo) {
        const { credential, credentialDeviceType, credentialBackedUp } = registrationInfo;
        const newCredential = {
          credentialID: credential.id,
          credentialPublicKey: Buffer.from(credential.publicKey).toString('base64url'),
          counter: credential.counter,
          deviceType: credentialDeviceType,
          backedUp: credentialBackedUp,
          transports: body.response.transports || [],
        };
        const existing = user.webauthnCredentials || [];
        await this.userRepo.update(req.user.id, {
          webauthnCredentials: [...existing, newCredential],
          webauthnChallenge: null,
        } as any);
        return { verified: true };
      }
      return { verified: false };
    } catch (e: any) {
      return { verified: false, error: e.message };
    }
  }

  @Post('webauthn/authenticate/options')
  @HttpCode(HttpStatus.OK)
  async webauthnAuthOptions(@Body() body: { phone: string }) {
    if (!body.phone) return { error: 'Numéro requis' };
    const trimmed = body.phone.trim();
    const digits = trimmed.replace(/\D/g, '');
    const phone = trimmed.startsWith('+225')
      ? trimmed.replace(/\s/g, '')
      : digits.startsWith('225')
        ? `+${digits}`
        : digits.startsWith('0')
          ? `+225${digits}`
          : `+225${digits}`;
    const user = await this.userRepo.findOne({ where: { phone } });
    if (!user) return { error: 'Utilisateur introuvable' };
    if (!user.webauthnCredentials?.length) {
      return { error: 'Aucune clé biométrique enregistrée pour ce compte' };
    }
    const allowCredentials = (user.webauthnCredentials || []).map((c) => ({
      id: c.credentialID,
      transports: c.transports as any,
    }));
    const options = await generateAuthenticationOptions({
      rpID: process.env.WEBAUTHN_RP_ID || 'julaba.online',
      userVerification: 'preferred',
      allowCredentials: allowCredentials as any,
    });
    await this.userRepo.update(user.id, { webauthnChallenge: options.challenge } as any);
    return { ...options, userId: user.id };
  }

  @Post('webauthn/authenticate/verify')
  @HttpCode(HttpStatus.OK)
  async webauthnAuthVerify(
    @Body() body: { response: AuthenticationResponseJSON; userId: string },
    @Res({ passthrough: true }) res: Response,
    @Request() req: any,
  ) {
    if (!body.userId || !body.response) return { verified: false, error: 'Données manquantes' };
    const user = await this.userRepo.findOne({ where: { id: body.userId } });
    if (!user || !user.webauthnChallenge) return { verified: false, error: 'Challenge manquant' };
    const credentialID = body.response.id;
    const credential = (user.webauthnCredentials || []).find((c) => c.credentialID === credentialID);
    if (!credential) return { verified: false, error: 'Credential introuvable' };
    try {
      const { verified, authenticationInfo } = await verifyAuthenticationResponse({
        response: body.response,
        expectedChallenge: user.webauthnChallenge,
        expectedOrigin: process.env.WEBAUTHN_ORIGIN || 'https://julaba.online',
        expectedRPID: process.env.WEBAUTHN_RP_ID || 'julaba.online',
        credential: {
          id: credential.credentialID,
          publicKey: Buffer.from(credential.credentialPublicKey, 'base64url'),
          counter: credential.counter,
          transports: credential.transports as any,
        },
      });
      if (verified) {
        const updated = (user.webauthnCredentials || []).map((c) =>
          c.credentialID === credentialID
            ? { ...c, counter: authenticationInfo.newCounter }
            : c,
        );
        await this.userRepo.update(user.id, {
          webauthnCredentials: updated,
          webauthnChallenge: null,
        } as any);
        const ipAddress = req.ip || req.headers['x-forwarded-for'];
        const result = await this.authService.loginById(user.id, req.headers['user-agent'], ipAddress as string);
        const isBO = BO_ROLES.includes(result.user?.role);
        this.setTokenCookies(res, result.accessToken, result.refreshToken, isBO);
        return { verified: true, user: result.user };
      }
      return { verified: false };
    } catch (e: any) {
      return { verified: false, error: e.message };
    }
  }

  private getTokenCookieBaseOptions() {
    const isProd = process.env.NODE_ENV === 'production';
    return { httpOnly: true, secure: isProd, sameSite: 'lax' as const, path: '/' };
  }

  private setTokenCookies(res: Response, accessToken: string, refreshToken: string, isBO = false) {
    const base = this.getTokenCookieBaseOptions();
    const tokenName = isBO ? 'bo_access_token' : 'access_token';
    res.cookie(tokenName, accessToken, { ...base, maxAge: 24 * 60 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...base, maxAge: 7 * 24 * 60 * 60 * 1000 });
  }

}
