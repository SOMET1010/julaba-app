import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { UsersBoListQueryDto } from './dto/users-bo-list-query.dto';
import { AuditService } from '../audit/audit.service';
import { generateInitialPassword, BO_ROLES } from '../auth/auth.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Normalise un téléphone vers le format canonique +225XXXXXXXXXX.
   * Génère aussi toutes les variantes possibles pour la recherche.
   */
  static normalizePhone(input: string): { canonical: string; variants: string[] } {
    if (!input) return { canonical: '', variants: [] };

    const cleaned = input.trim().replace(/\s+/g, '');
    const digits = cleaned.replace(/\D/g, '');

    if (digits.length === 0) return { canonical: '', variants: [] };

    let canonical: string;

    if (digits.startsWith('225')) {
      canonical = '+' + digits;
    } else if (digits.length === 10 && digits.startsWith('0')) {
      canonical = '+225' + digits;
    } else if (digits.length === 9) {
      canonical = '+2250' + digits;
    } else {
      canonical = '+225' + digits;
    }

    const variants = new Set<string>();
    variants.add(canonical);
    variants.add(input);
    variants.add(digits);
    variants.add('+' + digits);

    if (canonical.startsWith('+2250')) {
      variants.add('+225' + canonical.slice(5));
    }

    return { canonical, variants: Array.from(variants).filter((v) => v.length > 0) };
  }

  async findOne(id: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    const { passwordHash, pinCodeHash, ...safe } = user as any;
    return safe;
  }

  async findAll(query: UsersBoListQueryDto, requesterRole?: string): Promise<{ users: any[]; total: number; page: number; pages: number }> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    // @deprecated mapping cooperative -> cooperateur (frontend legacy), retrait sous-passe 5C
    let normalizedRole = query.role;
    if (normalizedRole === 'cooperative') {
      normalizedRole = 'cooperateur';
    }

    const { whereSql, whereParams } = this.buildActeursListWhereClause(query, normalizedRole, requesterRole);

    const countQuery = `SELECT COUNT(*)::int as total FROM users u ${whereSql}`;
    const countRows = await this.dataSource.query(countQuery, whereParams);
    const total = Number(countRows?.[0]?.total ?? 0);

    const dataQuery = `
      SELECT u.*
      FROM users u
      ${whereSql}
      ORDER BY u.created_at DESC
      LIMIT $${whereParams.length + 1} OFFSET $${whereParams.length + 2}
    `;
    const usersRaw = await this.dataSource.query(dataQuery, [...whereParams, limit, skip]);

    // Mapping snake_case -> camelCase + retrait champs sensibles
    const safeUsers = usersRaw.map((u: any) => {
      const { password_hash, pin_code_hash, ...rest } = u;
      // Conversion snake_case to camelCase pour les champs principaux
      return {
        ...rest,
        id: u.id,
        phone: u.phone,
        firstName: u.first_name,
        lastName: u.last_name,
        role: u.role,
        region: u.region,
        commune: u.commune,
        activity: u.activity,
        market: u.market,
        cooperativeName: u.cooperative_name,
        institutionName: u.institution_name,
        photoUrl: u.photo_url,
        status: u.status,
        validated: u.validated,
        createdAt: u.created_at,
        lastLoginAt: u.last_login_at,
        zoneId: u.zone_id,
        email: u.email,
      };
    });
    return { users: safeUsers, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  async countByRole(requesterRole?: string): Promise<{
    all: number;
    marchand: number;
    producteur: number;
    cooperateur: number;
    institution: number;
    identificateur: number;
    admin: number;
  }> {
    const ADMIN_ROLES = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN_GENERAL,
      UserRole.ADMIN_NATIONAL,
      UserRole.GESTIONNAIRE_ZONE,
      UserRole.OPERATEUR_TERRAIN,
    ];

    const rows = await this.userRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(user.id)', 'count')
      .groupBy('user.role')
      .getRawMany<{ role: string; count: string }>();

    const result = {
      all: 0,
      marchand: 0,
      producteur: 0,
      cooperateur: 0,
      institution: 0,
      identificateur: 0,
      admin: 0,
    };

    for (const row of rows) {
      const role = row.role as UserRole;
      if (role === UserRole.SUPER_ADMIN && requesterRole !== 'super_admin') {
        continue;
      }
      const count = parseInt(row.count, 10) || 0;
      result.all += count;

      if (ADMIN_ROLES.includes(role)) {
        result.admin += count;
      } else if (role === UserRole.MARCHAND) {
        result.marchand = count;
      } else if (role === UserRole.PRODUCTEUR) {
        result.producteur = count;
      } else if (role === UserRole.COOPERATEUR) {
        result.cooperateur = count;
      } else if (role === UserRole.INSTITUTION) {
        result.institution = count;
      } else if (role === UserRole.IDENTIFICATEUR) {
        result.identificateur = count;
      }
    }

    return result;
  }

  private buildActeursListWhereClause(
    query: UsersBoListQueryDto,
    normalizedRole?: string,
    requesterRole?: string,
  ): { whereSql: string; whereParams: any[] } {
    const whereParts: string[] = [
      "u.status != 'supprime'",
      'u.deleted_at IS NULL',
      `(
        u.role NOT IN ('marchand', 'producteur', 'cooperateur')
        OR EXISTS (
          SELECT 1 FROM identifications i
          WHERE i.acteur_id::text = u.id::text
            AND i.statut IN ('approuve', 'validee', 'en_attente', 'complement', 'rejete')
        )
      )`,
    ];
    const whereParams: any[] = [];

    if (requesterRole !== 'super_admin') {
      whereParts.push("u.role != 'super_admin'");
    }

    if (normalizedRole === 'admin') {
      whereParts.push(
        "u.role IN ('super_admin','admin_general','admin_national','gestionnaire_zone','operateur_terrain')",
      );
    } else if (normalizedRole && normalizedRole !== 'all') {
      whereParams.push(normalizedRole);
      whereParts.push(`u.role = $${whereParams.length}`);
    }

    // Scope BO additif : cible le groupe des rôles back-office (BO_ROLES),
    // en SQL parametre. Absent -> comportement inchange.
    if (query.scope === 'bo') {
      const placeholders = BO_ROLES.map((_, i) => `$${whereParams.length + i + 1}`).join(', ');
      whereParts.push(`u.role IN (${placeholders})`);
      whereParams.push(...BO_ROLES);
    }

    if (query.search) {
      whereParams.push(`%${query.search.toLowerCase()}%`);
      whereParts.push(
        `LOWER(CONCAT_WS(' ', COALESCE(u.first_name,''), COALESCE(u.last_name,''), COALESCE(u.phone,''))) LIKE $${whereParams.length}`,
      );
    }

    if (query.statut) {
      whereParams.push(query.statut);
      whereParts.push(`u.status = $${whereParams.length}`);
    }

    if (query.region) {
      whereParams.push(query.region);
      whereParts.push(`LOWER(u.region) = LOWER($${whereParams.length})`);
    }

    if (query.dateDepuis) {
      whereParams.push(query.dateDepuis);
      whereParts.push(`u.created_at >= $${whereParams.length}`);
    }

    return {
      whereSql: `WHERE ${whereParts.join(' AND ')}`,
      whereParams,
    };
  }

  async findByPhone(phone: string): Promise<any> {
    const { variants } = UsersService.normalizePhone(phone);
    if (variants.length === 0) {
      throw new NotFoundException('Téléphone invalide');
    }

    const user = await this.userRepository
      .createQueryBuilder('u')
      .where('u.phone IN (:...variants)', { variants })
      .getOne();

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    const { passwordHash, pinCodeHash, ...safe } = user as any;
    return safe;
  }

  async searchActorsForIdentificateur(query: string, limit: number = 10): Promise<any[]> {
    const trimmed = (query || '').trim();
    if (trimmed.length < 2) return [];

    const max = Math.min(Math.max(Number(limit) || 10, 1), 20);
    const lower = trimmed.toLowerCase();
    const digits = trimmed.replace(/\D/g, '');

    try {
      const sql = `
        SELECT
          id, phone, first_name, last_name, role,
          activity, market, commune, zone_id, photo_url, validated, status
        FROM users
        WHERE (
          LOWER(first_name) LIKE $1
          OR LOWER(last_name) LIKE $1
          OR phone LIKE $2
          OR REPLACE(REPLACE(phone, '+225', ''), ' ', '') LIKE $3
        )
        AND role IN ('marchand', 'producteur', 'cooperateur')
        
        ORDER BY first_name ASC, last_name ASC
        LIMIT $4
      `;

      const namePattern = `%${lower}%`;
      const isPhoneLike = digits.length >= 6;
      const { variants: phoneVariants } = isPhoneLike
        ? UsersService.normalizePhone(digits)
        : { variants: [] };
      const normalizedDigits = phoneVariants[0]?.replace(/\D/g, '') || digits;
      const phonePattern = isPhoneLike ? `%${normalizedDigits}%` : 'NEVER_MATCH_XYZ';
      const phoneNoPrefixPattern = isPhoneLike ? `%${normalizedDigits.replace(/^0/, '')}%` : 'NEVER_MATCH_XYZ';

      const rows = await this.userRepository.query(sql, [
        namePattern,
        phonePattern,
        phoneNoPrefixPattern,
        max,
      ]);

      return rows.map((r: any) => ({
        id: r.id,
        phone: r.phone,
        firstName: r.first_name,
        lastName: r.last_name,
        role: r.role,
        activity: r.activity,
        market: r.market,
        commune: r.commune,
        zoneId: r.zone_id,
        photoUrl: r.photo_url,
        validated: r.validated,
        status: r.status,
      }));
    } catch (error: any) {
      console.error('[searchActorsForIdentificateur] ERREUR SQL :', {
        message: error?.message,
        code: error?.code,
        detail: error?.detail,
        query: trimmed,
      });
      return [];
    }
  }

  async remove(id: string): Promise<void> {
    await this.userRepository.update(id, { status: UserStatus.SUPPRIME, deletedAt: new Date() });
  }

  async update(id: string, updates: Partial<User>, actorId?: string, ip?: string): Promise<User> {
    if (updates.email !== undefined && updates.email !== null) {
      const normalizedEmail = String(updates.email).trim().toLowerCase();
      if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        throw new BadRequestException('Adresse e-mail invalide');
      }
      if (normalizedEmail) {
        const existingWithEmail = await this.userRepository.findOne({
          where: { email: normalizedEmail },
        });
        if (existingWithEmail && existingWithEmail.id !== id) {
          throw new ConflictException('Cet e-mail est déjà utilisé par un autre compte');
        }
        updates.email = normalizedEmail;
      } else {
        updates.email = null as any;
      }
    }

    if (Object.keys(updates).length === 0) {
      return await this.findOne(id);
    }

    const before = await this.findOne(id);
    await this.userRepository.update(id, updates);
    const after = await this.findOne(id);

    // Construire description lisible des changements
    const changedFields = Object.keys(updates).filter(k => (before as any)[k] !== (updates as any)[k]);
    const description = changedFields.length > 0
      ? `Champs modifiés : ${changedFields.join(', ')}`
      : 'Mise à jour sans changement détecté';

    await this.dataSource.query(
      `INSERT INTO audit_logs (user_id, action, entite, entite_id, details, ip, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        actorId || id,
        'modification',
        'user',
        id,
        JSON.stringify({ description, before: changedFields.reduce((acc: any, k) => { acc[k] = (before as any)[k]; return acc; }, {}), after: changedFields.reduce((acc: any, k) => { acc[k] = (after as any)[k]; return acc; }, {}) }),
        ip || null,
      ]
    );

    return after;
  }

  async getHistorique(userId: string) {
    const logs = await this.dataSource.query(
      `SELECT id, action, entite, details, ip, created_at
       FROM audit_logs
       WHERE entite_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [userId]
    );

    const TECHNICAL_FIELDS = ['preferences', 'last_login_at', 'webauthn_challenge', 'pin_code_encrypted_identificateur', 'updated_at'];

    const ACTION_LABELS: Record<string, string> = {
      creation: 'Dossier cree',
      modification: 'Dossier modifie',
      suppression: 'Dossier supprime',
      validation: 'Dossier valide',
      rejet: 'Dossier rejete',
      soumission: 'Dossier soumis',
      connexion: 'Connexion',
      photo_modifiee: 'Photo modifiee',
      activite_modifiee: 'Activite modifiee',
      marche_modifie: 'Marche modifie',
    };

    const detectMeaningfulChange = (log: any): { keep: boolean; humanDescription: string } => {
      const details = log.details || {};

      if (!details.before && !details.after) {
        return { keep: true, humanDescription: ACTION_LABELS[log.action] || log.action };
      }

      const before = details.before || {};
      const after = details.after || {};
      const changedFields: string[] = [];

      for (const key of Object.keys(after)) {
        if (TECHNICAL_FIELDS.includes(key)) continue;
        const beforeVal = JSON.stringify(before[key]);
        const afterVal = JSON.stringify(after[key]);
        if (beforeVal !== afterVal) {
          changedFields.push(key);
        }
      }

      if (changedFields.length === 0) {
        return { keep: false, humanDescription: '' };
      }

      const FIELD_LABELS: Record<string, string> = {
        first_name: 'prenom',
        last_name: 'nom',
        phone: 'telephone',
        photo_url: 'photo',
        activity: 'activite',
        market: 'marche',
        commune: 'commune',
        nin: 'CNI',
        validated: 'statut de validation',
        status: 'statut',
        zone_id: 'zone',
        role: 'role',
      };

      const humanFields = changedFields.map((f) => FIELD_LABELS[f] || f).join(', ');
      return {
        keep: true,
        humanDescription: `Modification : ${humanFields}`,
      };
    };

    return logs
      .map((log: any) => {
        const { keep, humanDescription } = detectMeaningfulChange(log);
        if (!keep) return null;
        return {
          id: log.id,
          date: log.created_at,
          type: ACTION_LABELS[log.action] || log.action,
          description: humanDescription,
          details: log.details,
          ip: log.ip,
        };
      })
      .filter((x: any) => x !== null)
      .slice(0, 30);
  }

  async adminResetPassword(targetUserId: string, performedByUserId: string): Promise<{ success: boolean; defaultPassword: string; motDePasseInitial: string }> {
    const user = await this.userRepository.findOne({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const defaultPassword = generateInitialPassword();
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    await this.userRepository.update(targetUserId, {
      passwordHash,
      mustChangePassword: true,
    });

    await this.auditService.log({
      userId: performedByUserId ?? null,
      action: 'PASSWORD_ADMIN_RESET',
      entite: 'user',
      entiteId: targetUserId,
      details: { role: user.role },
    });

    return { success: true, defaultPassword, motDePasseInitial: defaultPassword };
  }
}
