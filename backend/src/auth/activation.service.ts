import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { ActivationCode } from './entities/activation-code.entity';
import { User, UserStatus } from '../users/entities/user.entity';
import { AuditService } from '../audit-log/audit-log.service';

const CODE_TTL_MS = 30 * 60 * 1000; // 30 min — expiration COURTE (séance d'enrôlement assistée)
const PINS_INTERDITS = new Set(['0000', '1234']);

/**
 * Activation P0.0 (ADR-002) : à l'enrôlement, aucun secret utilisable n'existe ; un code
 * à usage unique est émis. La marchande l'active sur SON téléphone et choisit son secret.
 * Le code n'établit JAMAIS de session normale ; sa consommation est atomique/idempotente.
 */
@Injectable()
export class ActivationService {
  private readonly logger = new Logger(ActivationService.name);

  constructor(
    @InjectRepository(ActivationCode) private readonly repo: Repository<ActivationCode>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  /** Émet un code d'activation à usage unique. Renvoie le CLAIR une seule fois. */
  async issueForUser(userId: string, createdBy: string | null, manager?: EntityManager): Promise<string> {
    const repo = manager ? manager.getRepository(ActivationCode) : this.repo;
    const selector = crypto.randomBytes(4).toString('hex'); // 8 hex, non secret
    const verifier = crypto.randomBytes(9).toString('hex'); // 18 hex, secret
    const verifierHash = await bcrypt.hash(verifier, 10);
    // Un seul code actif par compte : on consomme les précédents non utilisés.
    await repo
      .createQueryBuilder()
      .update(ActivationCode)
      .set({ usedAt: () => 'now()' })
      .where('user_id = :userId AND used_at IS NULL', { userId })
      .execute();
    await repo.save(
      repo.create({
        userId,
        selector,
        verifierHash,
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
        createdBy: createdBy ?? null,
      }),
    );
    this.logger.log(`Code d'activation émis pour ${userId} (par ${createdBy ?? 'système'})`);
    return `${selector}.${verifier}`;
  }

  /**
   * Consomme un code (ATOMIQUE) et pose le secret choisi par la marchande.
   * Échec = aucun effet (transaction), jamais de repli vers un PIN par défaut.
   */
  async activate(code: string, nouveauSecret: string): Promise<{ userId: string }> {
    const [selector, verifier] = String(code || '').split('.');
    if (!selector || !verifier) throw new BadRequestException("Code d'activation invalide.");
    if (!nouveauSecret || nouveauSecret.length < 4) throw new BadRequestException('Secret trop court (4 minimum).');
    if (PINS_INTERDITS.has(nouveauSecret)) throw new BadRequestException('Ce secret est trop simple.');

    return this.dataSource.transaction(async (m) => {
      const row = await m.getRepository(ActivationCode).findOne({ where: { selector } });
      if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
        throw new UnauthorizedException("Code d'activation invalide ou expiré.");
      }
      const ok = await bcrypt.compare(verifier, row.verifierHash);
      if (!ok) throw new UnauthorizedException("Code d'activation invalide ou expiré.");

      // Consommation ATOMIQUE : la ligne ne bascule qu'une seule fois (anti-rejeu, anti-course).
      const consume = await m
        .getRepository(ActivationCode)
        .createQueryBuilder()
        .update(ActivationCode)
        .set({ usedAt: () => 'now()' })
        .where('id = :id AND used_at IS NULL', { id: row.id })
        .execute();
      if (consume.affected !== 1) throw new UnauthorizedException('Code déjà utilisé.');

      const passwordHash = await bcrypt.hash(nouveauSecret, 10);
      await m.getRepository(User).update(row.userId, {
        passwordHash,
        status: UserStatus.ACTIF,
        mustChangePassword: false,
      } as any);
      this.logger.log(`Compte ${row.userId} activé (secret posé par la marchande).`);

      // LOT-ACTIVATION (SPEC-AUTH-CIBLE §1.1.3) — LA TRACE DU CONSENTEMENT.
      // L'écran n'appelle cette route qu'après le geste d'ELLE (« C'est mon
      // compte », toucher long ≥ 800 ms) : cette ligne horodatée est donc la
      // trace serveur de la marche posée — jointe au journal de l'émission du
      // code, elle raconte la double présence (l'agent a remis le billet, ELLE
      // a tenu le geste). Sans elle, l'activation ne serait qu'un UPDATE
      // anonyme : aucune preuve qu'une personne a dit oui.
      try {
        await this.auditService.log({
          userId: row.userId,
          action: 'ACTIV_CONSENTEMENT',
          entite: 'activation_code',
          entiteId: row.id,
          details: { horodatage: new Date().toISOString() },
        });
      } catch {
        // La trace ne doit jamais bloquer l'activation : si le journal est
        // indisponible, le compte reste activé et l'échec est assumé ici.
        this.logger.warn(`Trace ACTIV_CONSENTEMENT non écrite pour ${row.userId}`);
      }
      return { userId: row.userId };
    });
  }
}
