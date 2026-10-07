import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { Institution } from './institution.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { masquerTelephone } from '../users/remise-code-bo';

// Rattachement BO d'un compte de rôle `institution` à SA fiche institution.
// C'est `institutions.responsable_id` qui ouvre `/institution/*`
// (InstitutionScopeGuard) : sans ce lien, le compte reçoit 403 partout.
//
// Une institution = un responsable, un responsable = une institution. Cette
// unicité est vérifiée ici (lecture préalable) ; aucun index unique en base
// ne la tient sous la concurrence — l'ajouter est une migration, donc un
// arbitrage (voir STATUS.md, backlog).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ResponsableExpose {
  id: string;
  nom: string;
  telephone: string;
}

@Injectable()
export class InstitutionResponsableService {
  constructor(
    @InjectRepository(Institution) private readonly institutions: Repository<Institution>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  /** `undefined` = champ absent (rien à faire) ; `null` = détacher. */
  lire(body: Record<string, unknown>): string | null | undefined {
    if (!('responsable_id' in body)) return undefined;
    const v = body.responsable_id;
    if (v === null || v === '') return null;
    if (typeof v !== 'string' || !UUID.test(v)) {
      throw new BadRequestException('responsable_id doit être l\'identifiant d\'un compte.');
    }
    return v;
  }

  /** Refuse (400) un compte absent ou d'un autre rôle, (409) un compte déjà responsable ailleurs. */
  async verifier(responsableId: string, institutionId?: string): Promise<void> {
    const user = await this.users.findOne({ where: { id: responsableId } });
    if (!user || user.role !== UserRole.INSTITUTION) {
      throw new BadRequestException(
        'Le responsable doit être un compte existant de rôle institution. Créez d\'abord ce compte, puis rattachez-le.',
      );
    }
    const deja = await this.institutions.findOne({
      where: institutionId
        ? { responsable_id: responsableId, id: Not(institutionId) }
        : { responsable_id: responsableId },
    });
    if (deja) {
      throw new ConflictException(`Ce compte est déjà responsable de l'institution « ${deja.nom} ».`);
    }
  }

  /** Ajoute `responsable` (nom + téléphone masqué) à chaque fiche qui en a un. */
  async exposer<T extends { responsable_id?: string | null }>(fiches: T[]): Promise<(T & { responsable: ResponsableExpose | null })[]> {
    const ids = [...new Set(fiches.map((f) => f.responsable_id).filter((id): id is string => !!id))];
    const comptes = ids.length ? await this.users.find({ where: { id: In(ids) } }) : [];
    const parId = new Map(comptes.map((u) => [u.id, u]));
    return fiches.map((f) => {
      const u = f.responsable_id ? parId.get(f.responsable_id) : undefined;
      const responsable = u
        ? { id: u.id, nom: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(), telephone: masquerTelephone(u.phone) }
        : null;
      return { ...f, responsable };
    });
  }
}
