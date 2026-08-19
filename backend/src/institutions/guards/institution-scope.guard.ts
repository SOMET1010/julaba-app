import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Institution } from '../institution.entity';
import { INSTITUTION_REQUIRED_MODULE_KEY } from '../decorators/institution-required-module.decorator';

export type NiveauAcces = 'lecture' | 'ecriture' | 'complet' | 'admin_general' | 'aucun';

export interface InstitutionScope {
  institutionId: string;
  zoneId: string;
  modules: Record<string, NiveauAcces>;
}

// Correctif d'isolement inter-institutions (audit securite/vie privee).
//
// AVANT ce guard : les controleurs `/institution/...` ne portaient qu'un
// garde de role generique (`@Roles('institution', ...)`). Un compte
// institution authentifie voyait alors TOUTES les donnees nationales
// (acteurs, transactions), avec un simple log d'avertissement documentant le
// fallback ("Filtrage par institution_id indisponible ... fallback sur
// acteurs globaux") au lieu d'un filtrage reel.
//
// CE GUARD : pour le role `institution` uniquement, resout le perimetre reel
// de l'institution (zone + modules autorises) via la table `institutions`,
// deja liee au compte utilisateur par `institutions.responsable_id = user.id`
// -- lien cree automatiquement a l'inscription (voir AuthService.signup) et
// deja utilise par le meme motif pour les cooperatives. Attache ce perimetre
// a la requete (`request.institutionScope`) pour que les controleurs filtrent
// reellement leurs requetes SQL.
//
// FAIL-CLOSED : si aucune institution liee n'est trouvee, ou si sa zone n'est
// pas configuree, ou si le module demande n'est pas autorise -> 403. JAMAIS de
// fallback silencieux sur "tout voir". Un administrateur doit configurer le
// perimetre via `PATCH /institutions/:id` (zone_id, modules) avant que le
// compte institution puisse consulter ses donnees.
//
// super_admin / admin_general : non concernes par ce guard (vue plateforme
// complete deja existante, inchangee). Les autres roles autorises sur les
// memes routes (ex: aucun aujourd'hui hors institution/super_admin/admin_general)
// passent egalement sans etre scopes ici -- ce guard ne s'applique qu'au role
// `institution` explicitement.
@Injectable()
export class InstitutionScopeGuard implements CanActivate {
  private readonly logger = new Logger(InstitutionScopeGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Institution)
    private readonly institutionsRepo: Repository<Institution>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // L'authentification est verifiee par JwtAuthGuard en amont ; si jamais ce
    // guard s'executait sans utilisateur, on refuse plutot que de crasher.
    if (!user) return false;

    if (user.role !== 'institution') {
      // Role non concerne par l'isolement institution (super_admin,
      // admin_general...) : vue plateforme complete inchangee.
      return true;
    }

    const institution = await this.institutionsRepo.findOne({
      where: { responsable_id: user.id } as any,
    });

    if (!institution || !institution.zone_id) {
      this.logger.warn(
        `[INSTITUTION_SCOPE] Compte institution ${user.id} sans perimetre configure ` +
          `(institution liee absente ou zone_id manquant) -> acces refuse (fail-closed, ` +
          `aucun fallback sur les donnees globales).`,
      );
      throw new ForbiddenException(
        "Perimetre non configure pour ce compte institution. Un administrateur doit " +
          "renseigner la zone (et les modules autorises) via la fiche institution avant " +
          "que ce compte puisse consulter des donnees.",
      );
    }

    const requiredModule = this.reflector.getAllAndOverride<string | undefined>(
      INSTITUTION_REQUIRED_MODULE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredModule) {
      const modules = (institution.modules || {}) as Record<string, NiveauAcces>;
      const niveau = modules[requiredModule];
      if (!niveau || niveau === 'aucun') {
        this.logger.warn(
          `[INSTITUTION_SCOPE] Institution ${institution.id} sans acces au module "${requiredModule}" (niveau=${niveau ?? 'absent'}).`,
        );
        throw new ForbiddenException(`Acces au module "${requiredModule}" non autorise pour cette institution.`);
      }
    }

    const scope: InstitutionScope = {
      institutionId: institution.id,
      zoneId: institution.zone_id,
      modules: (institution.modules || {}) as Record<string, NiveauAcces>,
    };
    request.institutionScope = scope;
    return true;
  }
}
