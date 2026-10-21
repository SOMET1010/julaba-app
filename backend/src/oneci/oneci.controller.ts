import {
  Controller, Get, HttpException, HttpStatus, Param, Req, UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { OneciService } from './oneci.service';
import { AuditService } from '../audit-log/audit-log.service';
import { masquerNni, validerNni } from './nni.util';

// ── INSTITUTION-01 [P0] — AUDIT-ACTEUR-INSTITUTION-2026-10-19 §3 ─────────────
// Avant correction : `@UseGuards(JwtAuthGuard)` SEUL — tout compte authentifié
// (marchand compromis, producteur, institution…) avait le pouvoir du
// régulateur sur le RNPP, sans rôle, sans throttle dédié, sans journal d'accès
// NNI. Le lookup ONECI renvoie de la PII nationale (nom, prénoms, date de
// naissance, genre) : il est désormais fail-closed.
//
// Décision de rôles (réalité fonctionnelle vérifiée le 19/10, HEAD 3585954) :
//  - `identificateur` : consommateur principal — pré-remplissage de la fiche
//    d'identification terrain `/identificateur/fiche-identification`
//    (FicheIdentificationDynamique.tsx:2900).
//  - `super_admin` / `admin_general` : « Nouvel acteur » BO — bouton gated par
//    CAN_CREATE_ADMIN (BOActeurs.tsx:790, permissions-bo.ts:19-21) et
//    VISIBLE_PROFILS complets (FicheIdentificationDynamiqueBO.tsx:1100-1105).
//  - `admin_national` / `gestionnaire_zone` : créateurs d'acteurs métier dans
//    le BO (VISIBLE_PROFILS :1106-1108 ; périmètre `enrolement.write` de la
//    matrice bo-permissions).
//  - Explicitement EXCLUS (fail-closed) :
//      · `operateur_terrain` — VISIBLE_PROFILS vide pour ce rôle (:1109), pas
//        d'écran OT qui appelle /oneci ;
//      · `institution` — AUCUN écran institution n'appelle /oneci : le
//        dashboard régulateur (institution-dashboard.controller.ts) ne
//        consomme pas OneciService et le grep front `components/institution/`
//        renvoie 0 hit. Divergence assumée avec la recommandation §6.1 de
//        l'audit (qui listait 'institution') : donner un accès RNPP sans
//        écran élargit la surface PII sans besoin fonctionnel. À réviser si
//        un écran régulateur RNPP voit le jour (avec InstitutionScopeGuard +
//        journal).
//      · marchand / producteur / cooperateur — aucun appel (l'exploit
//        INSTITUTION-01 « JWT quelconque » est fermé).
//
// Journal d'accès (INSTITUTION-01 §6.1 + INSTITUTION-05, motif AuditService
// du repo cf. identifications.controller / admin-wallets) : chaque appel
// autorisé écrit audit_logs { acteur, rôle, route GABARIT, résultat, NNI
// masqué, IP }. JAMAIS la valeur du NNI ni les champs d'identité renvoyés.
@Roles('identificateur', 'super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('oneci')
export class OneciController {
  constructor(
    private readonly svc: OneciService,
    private readonly audit: AuditService,
  ) {}

  /** Lookup RNPP par NNI — PII nationale : rôles stricts + throttle + journal. */
  @Get('lookup/:nni')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async lookup(@Param('nni') nni: string, @CurrentUser() user: User, @Req() req: any) {
    let nniPropre: string;
    try {
      nniPropre = validerNni(nni);
    } catch (err) {
      // Format invalide : tracé SANS aucune valeur (ni masque) — il n'y a pas
      // de NNI, seulement une tentative à journaliser pour la forensique.
      await this.journaliserAcces(req, user, 'ONECI_LOOKUP_NNI', { resultat: 'nni_invalide' });
      throw err;
    }
    try {
      const result = await this.svc.lookupByNni(nniPropre);
      await this.journaliserAcces(req, user, 'ONECI_LOOKUP_NNI', {
        nni_masque: masquerNni(nniPropre),
        resultat: 'trouve',
        ...(result?.sandboxMode ? { sandbox: true } : {}),
      });
      return result;
    } catch (err: any) {
      const introuvable =
        err instanceof HttpException && err.getStatus() === HttpStatus.NOT_FOUND;
      await this.journaliserAcces(req, user, 'ONECI_LOOKUP_NNI', {
        nni_masque: masquerNni(nniPropre),
        resultat: introuvable ? 'introuvable' : 'erreur_upstream',
      });
      throw err;
    }
  }

  /**
   * Quota RNPP (métrique d'abonnement, pas de PII) — vision plateforme.
   * Aucun consommateur front aujourd'hui : fail-closed sur les deux seuls
   * rôles de supervision plateforme (CAN_VIEW_ALERTS, permissions-bo.ts:33-36).
   */
  @Get('quota')
  @Roles('super_admin', 'admin_general')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async quota(@CurrentUser() user: User, @Req() req: any) {
    try {
      const result = await this.svc.getQuota();
      await this.journaliserAcces(req, user, 'ONECI_QUOTA', { resultat: 'succes' });
      return result;
    } catch (err: any) {
      await this.journaliserAcces(req, user, 'ONECI_QUOTA', { resultat: 'erreur_upstream' });
      throw err;
    }
  }

  // ── Journal d'accès (motif audit-log du repo) ──────────────────────────────
  // Route GABARIT (jamais l'URL concrète : le NNI y figure) + acteur + rôle +
  // action + résultat. AuditService.log capture ses propres erreurs : jamais
  // bloquant pour la réponse.
  private journaliserAcces(
    req: any,
    user: User | undefined,
    action: 'ONECI_LOOKUP_NNI' | 'ONECI_QUOTA',
    details: Record<string, unknown>,
  ): Promise<void> {
    return this.audit.log({
      userId: user?.id ?? null,
      action,
      entite: 'oneci',
      entiteId: null,
      details: {
        route: action === 'ONECI_QUOTA' ? '/oneci/quota' : '/oneci/lookup/:nni',
        methode: 'GET',
        role: user?.role ?? null,
        ...details,
      },
      ip: req?.ip ?? null,
    });
  }
}
