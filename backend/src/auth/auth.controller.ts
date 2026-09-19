import { Controller, Post, Get, Patch, Delete, Param, Body, HttpCode, HttpStatus, UseGuards, Request, Res, ForbiddenException } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthService, BO_ROLES, ACTEUR_ROLES, getDefaultPasswordForRole } from './auth.service';
import { ActivationService } from './activation.service';
import { SignupDto } from './dto/signup.dto';
import { CreateActeurDto } from './dto/create-acteur.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../users/entities/user.entity';
import { Identification } from '../identifications/identification.entity';
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
import { attenteApresEchecs, essaisAvantAttente, estVerrouHeriteSansFin } from './verrou-pin';
import { genererPinIdentificateurAcceptable } from './pin-identificateur';
import { AuditService } from '../audit/audit.service';
import { PinCryptoService } from './pin-crypto.service';
import { stripSensitiveUserFields } from '../users/sanitize-user.util';

// Verrouillage PIN acteur : 9 échecs cumulés -> blocage SANS expiration temporelle.
// Le blocage est matérialisé par une date très lointaine (~100 ans) ; seul
// l'endpoint de déblocage identificateur le lève (remise à zéro).
// Politique déplacée dans verrou-pin.ts : une échelle d'attente, pas un mur.

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken) private readonly tokenRepo: Repository<RefreshToken>,
    private readonly feedbakSmsService: FeedbakSmsService,
    private readonly auditService: AuditService,
    private readonly pinCrypto: PinCryptoService,
    private readonly activationService: ActivationService,
  ) {}

  // Activation P0.0 (ADR-002) : la marchande consomme le code d'activation reçu à
  // l'enrôlement et POSE SON secret. Public (elle n'a pas encore de session) ; le code
  // n'ouvre QUE cette route, jamais une session normale. Throttle serré en plus du
  // caractère aléatoire du code (selector+verifier) et de son usage unique.
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('activer')
  @HttpCode(HttpStatus.OK)
  async activer(@Body() body: { code: string; nouveauSecret: string }) {
    await this.activationService.activate(body?.code, body?.nouveauSecret);
    return { success: true };
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
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
    // Jetons aussi dans le corps (auth mobile sans cookie cross-domaine).
    return { user: { ...result.user, mustChangePassword: result.user.mustChangePassword ?? false }, success: true, accessToken: result.accessToken, refreshToken: result.refreshToken };
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('check-phone')
  @HttpCode(HttpStatus.OK)
  async checkPhone(@Body() body: { phone: string }): Promise<{ exists: boolean }> {
    if (!body?.phone) return { exists: false };
    const phone = body.phone.startsWith('+225') ? body.phone : `+225${body.phone.replace(/\D/g, '').slice(0, 10)}`;
    return this.authService.checkPhone(phone);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
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

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Request() req: any, @Res({ passthrough: true }) res: Response) {
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const result = await this.authService.login(loginDto, deviceInfo, ipAddress);
    const isBO = BO_ROLES.includes(result.user?.role);
    this.setTokenCookies(res, result.accessToken, result.refreshToken, isBO);
    // On renvoie AUSSI les jetons dans le corps : sur mobile, les cookies
    // cross-domaine (julaba-web ↔ julaba-api) sont bloqués. Le frontend stocke
    // ces jetons et les envoie en en-tête Authorization -> connexion fiable partout.
    return { user: result.user, success: true, accessToken: result.accessToken, refreshToken: result.refreshToken };
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
      // LE JETON DE RAFRAÎCHISSEMENT PART AUSSI DANS LE CORPS — HYGIÈNE-1 axe 2.
      // `login` le fait déjà, et pour une raison écrite juste au-dessus : sur
      // mobile, les cookies cross-domaine (julaba-web ↔ julaba-api) sont
      // bloqués. `refresh` ne l'avait jamais suivi. Conséquence dans l'APK : le
      // téléphone rejouait indéfiniment le MÊME jeton stocké, puisqu'il n'en
      // recevait jamais le suivant. Or la rotation marque l'ancien « used », et
      // rejouer un jeton « used » est traité comme une COMPROMISSION :
      // `rotateRefreshToken` révoque alors TOUTES les sessions de la marchande.
      // Une session qui se renouvelle normalement finissait donc par déconnecter
      // partout celle qui vend. La rotation est maintenant complète des deux
      // côtés : celui qui présente un jeton reçoit son successeur.
      return { success: true, accessToken: result.accessToken, refreshToken: result.refreshToken };
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
    return { user: user ? stripSensitiveUserFields(user as any) : null };
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

    // Verrou hérité de l'ancienne politique (100 ans) : la règle qui l'a posé
    // n'existe plus, on le lève au lieu de le subir.
    if (estVerrouHeriteSansFin(user.lockedUntil)) {
      await this.userRepo.update(user.id, { failedPinAttempts: 0, lockedUntil: null });
      user.lockedUntil = null;
      user.failedPinAttempts = 0;
    }

    // Attente en cours : on ne vérifie même pas le PIN, et on dit combien il reste.
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      return { valid: false, locked: true, attenteMs: user.lockedUntil.getTime() - Date.now() };
    }

    const valid = await bcrypt.compare(body.pin, user.pinCodeHash);
    if (valid) {
      await this.userRepo.update(user.id, { failedPinAttempts: 0, lockedUntil: null });
      return { valid: true };
    }

    const attempts = (user.failedPinAttempts ?? 0) + 1;
    const attente = attenteApresEchecs(attempts);
    if (attente > 0) {
      await this.userRepo.update(user.id, {
        failedPinAttempts: attempts,
        lockedUntil: new Date(Date.now() + attente),
      });
      return { valid: false, locked: true, attenteMs: attente };
    }
    await this.userRepo.update(user.id, { failedPinAttempts: attempts });
    return { valid: false, locked: false, essaisRestants: essaisAvantAttente(attempts) };
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

  // Suppression de compte avec anonymisation (loi ivoirienne n°2013-450 sur la
  // protection des données à caractère personnel). Le principe : SEULE
  // l'identité de la personne est purgée. L'ID technique et le journal
  // d'argent (wallets / wallet_transactions) ne sont JAMAIS touchés — l'argent
  // est sacré (CONSTITUTION §7) et l'intégrité référentielle de l'historique
  // financier ne doit jamais être cassée par une suppression de compte : le
  // solde et les transactions restent rattachés au même user_id, seule
  // l'identité qui y est attachée disparaît.
  //
  // Liste des champs personnels identifiants purgés sur `users` (au-delà de
  // phone/passwordHash/firstName/lastName déjà couverts) :
  //  - Contact direct       : email
  //  - Image                : photoUrl
  //  - Documents officiels   : nin (numéro d'identification nationale),
  //                            numCNPS, numCMU, recepisse
  //  - État civil             : dateNaissance, lieuNaissance,
  //                            situationMatrimoniale
  //  - Adresse / localisation : region, commune, quartierVillage,
  //                            regionAutre, communeAutre, districtAutre,
  //                            departementAutre, boitePostale, regionId,
  //                            communeId, districtId, departementId, zoneId
  //  - Métadonnées d'identité : entiteMetadata (contient un référent NOMMÉ
  //                            pour les comptes entité/admin)
  // Champs délibérément CONSERVÉS car non identifiants une fois ce qui
  // précède purgé : id, role, sousProfilMarchand, genre, nationalite (données
  // démographiques agrégées, non identifiantes), activity/market/
  // cooperativeName/institutionName (profil commercial, pas identité de la
  // personne), createdAt, préférences fonctionnelles, wallet et historique de
  // transactions (argent gelé — jamais modifié ici).
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

    await this.userRepo.manager.transaction(async (manager) => {
      await manager.update(User, req.user.id, {
        phone: `deleted_${req.user.id}`,
        passwordHash: '',
        firstName: 'Compte',
        lastName: 'Supprimé',
        // Statut dédié « supprimé » (distinct de REJETE, qui signifie un
        // dossier d'identification refusé — un compte auto-supprimé n'est
        // pas un dossier rejeté, cela fausserait les statistiques admin).
        status: UserStatus.SUPPRIME,
        email: null,
        photoUrl: null,
        nin: null,
        numCNPS: null,
        numCMU: null,
        recepisse: null,
        dateNaissance: null,
        lieuNaissance: null,
        situationMatrimoniale: null,
        region: null,
        commune: null,
        quartierVillage: null,
        regionAutre: null,
        communeAutre: null,
        districtAutre: null,
        departementAutre: null,
        boitePostale: null,
        regionId: null,
        communeId: null,
        districtId: null,
        departementId: null,
        zoneId: null,
        entiteMetadata: null,
      } as any);

      // Table liée `identifications` : l'enrôlement de CET utilisateur en
      // tant qu'acteur identifié conserve une photo/des documents (base64)
      // et des coordonnées GPS personnelles (latitude/longitude) dans
      // `documents` / `form_data` / `latitude` / `longitude`. On les purge.
      // On CONSERVE le workflow non-identifiant (statut, zone, commission de
      // l'identificateur, dates) : ce n'est pas une donnée personnelle de cet
      // utilisateur mais l'historique d'activité — potentiellement rémunérée
      // — de l'identificateur qui a réalisé l'enrôlement.
      await manager
        .createQueryBuilder()
        .update(Identification)
        .set({
          documents: null,
          form_data: null,
          acteur_nom: 'Compte Supprimé',
          region: null,
          commune: null,
          latitude: null,
          longitude: null,
        } as any)
        .where('acteur_id = :id', { id: req.user.id })
        .execute();
    });

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
  async resetUserPassword(@Body() body: { userId: string; newPassword: string }, @Request() req: any) {
    if (!body.userId) return { success: false, message: 'userId requis' };
    if (!body.newPassword || body.newPassword.length < 4) return { success: false, message: 'Mot de passe trop court (4 caractères minimum)' };
    const user = await this.userRepo.findOne({ where: { id: body.userId } });
    if (!user) return { success: false, message: 'Utilisateur introuvable' };
    const bcrypt = require('bcryptjs');
    await this.userRepo.update(user.id, {
      passwordHash: await bcrypt.hash(body.newPassword, 10),
      mustChangePassword: true,
    } as any);
    // Audit de cette action sensible (jamais le mot de passe en clair, ni son hash).
    await this.auditService.log({
      userId: req.user?.id ?? null,
      action: 'PASSWORD_RESET',
      entite: 'user',
      entiteId: user.id,
      details: {
        changedBy: req.user?.id ?? null,
        targetRole: (user as any).role ?? null,
      },
      ip: req.ip ?? null,
    });
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

    // ── SEC-07 : CETTE ROUTE N'AVAIT AUCUN COMPTEUR ──────────────────────────
    //
    // Elle comparait en temps constant — bien — puis acceptait un nombre
    // ILLIMITÉ d'essais sur 4 096 combinaisons. Quelques minutes suffisaient à
    // les épuiser depuis une session ouverte, par exemple sur un téléphone
    // volé non verrouillé. Le PIN identificateur protège la modification des
    // fiches acteurs : ce n'était pas une protection, c'était un péage.
    //
    // L'arbitrage « 4 chiffres, alphabet 2–9 » (cf. pin-identificateur.ts) est
    // posé SUR ce verrou. Sans lui, il ne tient pas. Ce sont donc deux moitiés
    // du même choix, et les tests vérifient les deux ensemble.
    const verrou = await this.attenteVerrouPinIdentificateur(user);
    if (verrou) return { valid: false, ...verrou };

    try {
      const pin = this.pinCrypto.decrypt((user as any).pinCodeEncryptedIdentificateur);
      const pinBuffer = Buffer.from(pin.trim().padEnd(4, '\0'));
      const inputBuffer = Buffer.from(body.pin.trim().padEnd(4, '\0'));
      const valid = pinBuffer.length === inputBuffer.length &&
        timingSafeEqual(pinBuffer, inputBuffer);
      if (valid) {
        await this.reussitePinIdentificateur(user.id);
        return { valid: true };
      }
      return { valid: false, ...(await this.echecPinIdentificateur(user)) };
    } catch {
      return { valid: false, message: 'Erreur lors de la vérification du PIN' };
    }
  }

  // ── LE VERROU DU PIN IDENTIFICATEUR, EN UN SEUL ENDROIT ───────────────────
  //
  // Il utilise l'échelle de `verrou-pin.ts` (3 échecs → 5 min, 6 → 15 min,
  // 9 et au-delà → 1 h, jamais définitif) mais SES PROPRES COLONNES.
  //
  // Pourquoi pas `failedPinAttempts` / `lockedUntil` ? Parce qu'une connexion
  // par mot de passe réussie les remet à zéro (`auth.service.login`). Partager
  // ces champs offrirait le contournement exact que Patrick a demandé de
  // rendre impossible : rater trois fois le PIN, se déconnecter, se
  // reconnecter, recommencer indéfiniment. Ici, seul un PIN JUSTE remet le
  // compteur à zéro — ou une réinitialisation, qui change le secret.

  private async attenteVerrouPinIdentificateur(
    user: User,
  ): Promise<{ locked: true; attenteMs: number } | null> {
    const jusqua = (user as any).identificateurPinLockedUntil as Date | null;
    if (estVerrouHeriteSansFin(jusqua)) {
      await this.userRepo.update(user.id, {
        failedIdentificateurPinAttempts: 0,
        identificateurPinLockedUntil: null,
      } as any);
      (user as any).identificateurPinLockedUntil = null;
      (user as any).failedIdentificateurPinAttempts = 0;
      return null;
    }
    if (jusqua && jusqua.getTime() > Date.now()) {
      return { locked: true, attenteMs: jusqua.getTime() - Date.now() };
    }
    return null;
  }

  private async reussitePinIdentificateur(id: string): Promise<void> {
    await this.userRepo.update(id, {
      failedIdentificateurPinAttempts: 0,
      identificateurPinLockedUntil: null,
    } as any);
  }

  private async echecPinIdentificateur(
    user: User,
  ): Promise<{ locked: boolean; attenteMs?: number; essaisRestants?: number }> {
    const essais = ((user as any).failedIdentificateurPinAttempts ?? 0) + 1;
    const attente = attenteApresEchecs(essais);
    if (attente > 0) {
      await this.userRepo.update(user.id, {
        failedIdentificateurPinAttempts: essais,
        identificateurPinLockedUntil: new Date(Date.now() + attente),
      } as any);
      return { locked: true, attenteMs: attente };
    }
    await this.userRepo.update(user.id, { failedIdentificateurPinAttempts: essais } as any);
    return { locked: false, essaisRestants: essaisAvantAttente(essais) };
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
    // Même verrou qu'à la vérification : sans lui, `change-pin` serait
    // simplement l'autre porte par où deviner le code, à volonté.
    const verrouChangement = await this.attenteVerrouPinIdentificateur(user);
    if (verrouChangement) {
      return { success: false, message: 'Trop d’essais. Réessaie plus tard.', ...verrouChangement };
    }
    try {
      const pin = this.pinCrypto.decrypt((user as any).pinCodeEncryptedIdentificateur);
      if (pin.trim() !== body.oldPin.trim()) {
        const etat = await this.echecPinIdentificateur(user);
        return { success: false, message: 'Ancien PIN incorrect', ...etat };
      }
      await this.reussitePinIdentificateur(req.user.id);
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

  // ── SEC-05 / SEC-2 : LE PIN N'EST PLUS JAMAIS RENDU ──────────────────────
  //
  // CE QUI ÉTAIT ICI. `GET identificateur/:id/pin-decrypted` déchiffrait le PIN
  // et le renvoyait en clair à tout `super_admin` ou `admin_general`. L'audit
  // `PIN_READ` traçait la lecture ; il ne l'empêchait pas. Le secret était
  // révélable à volonté depuis le back-office — ce qui vidait de son sens le
  // correctif SEC-01, où l'on venait d'interdire au PIN d'entrer dans un
  // journal : on protégeait la trace d'un code que l'application donnait
  // toujours sur demande.
  //
  // CE QUI LE REMPLACE, et pourquoi ce n'est PAS la même chose. Une
  // réinitialisation, pas une récupération. Le serveur tire un nouveau code,
  // l'envoie par SMS, et ne le dit à personne d'autre — pas même à
  // l'administrateur qui a déclenché l'opération. La réponse ne porte donc
  // aucun secret, et il n'existe plus aucune route capable d'en révéler un.
  //
  // CE QU'ON A REFUSÉ D'ÉCRIRE. Un repli « on affiche le code une seule fois si
  // le SMS échoue ». Arbitrage de Patrick, 19/09/2026 : « on recréerait SEC-05
  // sous une forme un peu plus propre ». En cas d'échec d'envoi on remonte
  // `SMS_NON_DELIVRE` et on propose de renvoyer — jamais le code.
  //
  // CE QUI RESTE OUVERT, et c'est écrit au registre : AUTH-RECOVERY-01, le cas
  // « numéro perdu ou changé ». Il n'a pas de solution ici, et improviser une
  // récupération de compte dans cette route serait rouvrir SEC-05 par la
  // fenêtre.
  @Post('identificateur/:id/reinitialiser-pin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin_general')
  @HttpCode(HttpStatus.OK)
  async reinitialiserPinIdentificateur(@Param('id') id: string, @Request() req: any) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user || (user as any).role !== 'identificateur') {
      return { success: false, code: 'INTROUVABLE', message: 'Identificateur introuvable' };
    }
    const phone = (user as any).phone;
    if (!phone) {
      // Sans numéro il n'y a pas de canal : on ne réinitialise pas dans le vide,
      // et surtout on n'invente pas un canal de secours. C'est AUTH-RECOVERY-01.
      return { success: false, code: 'SANS_NUMERO', message: 'Cet identificateur n’a pas de numéro : le code ne peut pas être envoyé' };
    }

    const nouveauPin = genererPinIdentificateurAcceptable();
    await this.userRepo.update(id, {
      pinCodeEncryptedIdentificateur: this.pinCrypto.encrypt(nouveauPin),
      // L'ancien code cesse d'exister À CET INSTANT : il est écrasé, pas
      // marqué obsolète. Et le verrou repart à zéro, sinon la personne
      // recevrait un code qu'elle ne pourrait pas utiliser avant une heure.
      failedIdentificateurPinAttempts: 0,
      identificateurPinLockedUntil: null,
    } as any);

    // Les sessions ouvertes tombent. Un code réinitialisé l'est souvent parce
    // qu'on soupçonne quelque chose ; laisser vivre les sessions existantes
    // rendrait le geste décoratif.
    await this.authService.revokeAllUserTokens(id);

    await this.auditService.log({
      userId: req.user?.id ?? null,
      action: 'PIN_RESET',
      entite: 'identificateur',
      entiteId: id,
      // Aucun fragment du code, pas même les deux derniers chiffres : sur
      // 4 chiffres, en divulguer deux divise l'espace de recherche par 64.
      details: { resetBy: req.user?.id ?? null, canal: 'sms' },
      ip: req.ip ?? null,
    });

    const envoye = await this.feedbakSmsService.notifyPinIdentificateurReset(
      String(phone),
      String((user as any).firstName || 'Utilisateur'),
      nouveauPin,
    );

    // Le code est déjà changé, même si le SMS n'est pas parti : on ne revient
    // pas en arrière sur une invalidation de secret. L'écran doit dire la
    // vérité — « le code a changé, mais le SMS n'est pas passé » — et proposer
    // de renvoyer. Il ne doit pas proposer de l'afficher.
    if (!envoye) {
      return { success: false, code: 'SMS_NON_DELIVRE', pinChange: true };
    }
    return { success: true };
  }

  // Renvoi du SMS après un `SMS_NON_DELIVRE`. Ce n'est PAS une seconde
  // réinitialisation : ce serait envoyer un troisième code et perdre celui que
  // la personne a peut-être déjà reçu. On ne peut pas relire le code stocké
  // sans rouvrir SEC-05, donc renvoyer, ici, c'est réinitialiser à nouveau —
  // assumé et dit tel quel. La temporisation empêche d'en faire un robinet.
  @Throttle({ default: { limit: 3, ttl: 600000 } })
  @Post('identificateur/:id/renvoyer-pin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin_general')
  @HttpCode(HttpStatus.OK)
  async renvoyerPinIdentificateur(@Param('id') id: string, @Request() req: any) {
    return this.reinitialiserPinIdentificateur(id, req);
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
      // M8 : la politique de création de rôle est appliquée DANS le service en
      // fonction du rôle du créateur (req.user.role). Un identificateur ou un
      // operateur_terrain ne peut créer que des acteurs non privilégiés.
      const result = await this.authService.signup(
        { ...body, password: canonicalPassword, mustChangePassword: true } as any,
        undefined, undefined, req.user?.role,
      );
      if (result.user?.id) {
        await this.userRepo.update(result.user.id, { mustChangePassword: true } as any);
      }
      // SEC-06 / SEC-07 — le code ne repart plus dans la réponse, et il n'est
      // plus tiré avec `Math.random()`.
      //
      // CE QUI CHANGE SUR LE TERRAIN, et c'est un arbitrage assumé de Patrick
      // (19/09/2026) : l'administrateur qui crée un identificateur ne peut plus
      // lui lire son code sur place. Le geste devient création → SMS →
      // première authentification. C'est plus lent d'une minute, et c'est la
      // seule façon d'avoir un secret que seule la personne connaît.
      //
      // `smsCodeEnvoye` dit si le SMS est parti. Il ne porte AUCUN fragment du
      // code : c'est un état d'acheminement, pas un lot de consolation.
      let smsCodeEnvoye: boolean | undefined;
      if ((body as any).role === 'identificateur' && result.user?.id) {
        const codeInitial = genererPinIdentificateurAcceptable();
        const stored = this.pinCrypto.encrypt(codeInitial);
        await this.userRepo.update(result.user.id, { pinCodeEncryptedIdentificateur: stored } as any);
        if ((body as any).phone) {
          smsCodeEnvoye = await this.feedbakSmsService.notifyPinIdentificateurCreated(
            String((body as any).phone),
            String((body as any).firstName || 'Utilisateur'),
            codeInitial,
          );
        } else {
          smsCodeEnvoye = false;
        }
      }
      return { user: result.user, success: true, smsCodeEnvoye };
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
        // Jetons AUSSI dans le corps (comme /login) : sur mobile les cookies
        // cross-domaine sont bloqués -> sans ça, l'empreinte « réussit » puis la
        // requête suivante est 401 et l'utilisateur retombe sur l'écran de login.
        return {
          verified: true,
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        };
      }
      return { verified: false };
    } catch (e: any) {
      return { verified: false, error: e.message };
    }
  }

  private getTokenCookieBaseOptions() {
    const isProd = process.env.NODE_ENV === 'production';
    // Multi-domaines (frontend et backend sur des domaines DIFFÉRENTS, ex. Render V2) :
    // le navigateur n'envoie le cookie cross-site que si SameSite=None + Secure.
    // En PRODUCTION on prend donc 'none' par défaut (le déploiement V2 est cross-domaine
    // et sert en HTTPS) — sans quoi le cookie de session n'est jamais renvoyé et
    // l'utilisateur paraît « jamais connecté ». En dev : 'lax' (même origine).
    // Toujours surchargeable via COOKIE_SAMESITE.
    const sameSite =
      (process.env.COOKIE_SAMESITE as 'lax' | 'none' | 'strict') ||
      (isProd ? 'none' : 'lax');
    const secure = isProd || sameSite === 'none';
    return { httpOnly: true, secure, sameSite, path: '/' };
  }

  private setTokenCookies(res: Response, accessToken: string, refreshToken: string, isBO = false) {
    const base = this.getTokenCookieBaseOptions();
    const tokenName = isBO ? 'bo_access_token' : 'access_token';
    res.cookie(tokenName, accessToken, { ...base, maxAge: 24 * 60 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...base, maxAge: 7 * 24 * 60 * 60 * 1000 });
  }

}
