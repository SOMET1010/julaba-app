// ──────────────────────────────────────────────────────────────────────────
// recuperation.controller.ts — LE CHANTIER DÉDIÉ (SPEC-AUTH-CIBLE §3).
//
// AUTH-RECOVERY-01 (arbitrage Patrick 19/09/2026) tenait une ligne rouge :
// NE PAS improviser une récupération dans les routes existantes — /login,
// /webauthn/*, la réinitialisation de PIN — car chaque greffe rouvrirait
// SEC-05 (un secret révélable) ou affaiblirait le chemin ordinaire. Toute la
// récupération vit donc ICI, dans son propre contrôleur, avec ses propres
// routes, son propre modèle de menace :
//
//   L'IDENTIFICATEUR EST EN SEMI-CONFIANCE. Il détient le code, il aide, il
//   tape à la place de la marchande — mais il ne doit JAMAIS pouvoir entrer
//   dans sa caisse. Le parcours exige donc le code (marche 1) ET le geste de
//   la marchande (marche 2, « C'est mon compte », horodaté) avant tout
//   ré-enrôlement (marche 3). Le code seul ne suffit JAMAIS (§3.1.3, décision
//   du 16/08 §8.4).
//
// LA REMISE DU CODE, ET POURQUOI AUCUN ÉCRAN NE L'AFFICHE. Le téléphone de la
// marchande est précisément ce qui manque ; le code part par SMS au téléphone
// DE L'AGENT (son propre compte, son propre numéro). C'est la même discipline
// que la réinitialisation de PIN (SEC-05) : le serveur tire le code, l'envoie
// par un canal journalisé, ne le dit à personne d'autre — pas même à l'admin
// qui a déclenché l'opération. La réponse ne porte aucun secret ; en cas
// d'échec d'envoi on remonte SMS_NON_DELIVRE et on propose de renvoyer —
// jamais d'afficher. « Renvoyer » régénère : le hash rend le code illisible,
// un ancien code ne peut pas repartir ; l'ancien est révoqué, un nouveau naît
// (invariant : UN SEUL code actif par compte).
// ──────────────────────────────────────────────────────────────────────────

import { Controller, Post, Get, Param, Body, Query, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { User } from '../users/entities/user.entity';
import { CodeRecuperation } from './entities/code-recuperation.entity';
import { genererCodeRecuperation, normaliserCodeRecuperation } from './code-recuperation';
import { AuditService } from '../audit-log/audit-log.service';
import { FeedbakSmsService } from '../feedbak-sms/feedbak-sms.service';

/** Un code vit 7 jours — largement le temps d'organiser l'assistance, jamais la permanence. */
export const DUREE_VIE_CODE_RECUPERATION_MS = 7 * 24 * 60 * 60 * 1000;

/** Les comptes éligibles : les acteurs voice-first (les BO ont leur propre reset). */
const COMPTES_ELIGIBLES = ['marchand', 'producteur', 'cooperateur', 'institution', 'identificateur'];

/** Qui peut faire naître un code : les mêmes rôles qui enrôlent sur le terrain. */
const ROLES_GENERATION = ['super_admin', 'admin_general', 'gestionnaire_zone', 'operateur_terrain', 'identificateur'];

@Controller('auth/recuperation')
export class RecuperationController {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(CodeRecuperation) private readonly codesRepo: Repository<CodeRecuperation>,
    private readonly auditService: AuditService,
    private readonly feedbakSmsService: FeedbakSmsService,
  ) {}

  // ── Faire naître un code ────────────────────────────────────────────────
  //
  // Le détenteur du code est l'AGENT : le code part sur SON téléphone. La
  // réponse de cette route ne contient JAMAIS le code — ni en cas de succès,
  // ni en cas d'échec d'envoi (SMS_NON_DELIVRE, comme le reset de PIN : on
  // propose de renvoyer, on n'affiche pas).
  //
  // INVARIANT : un seul code actif par compte. Un code a de la valeur parce
  // que son détenteur tient le secret ; en révoquer un pour en faire naître
  // un autre ne donne jamais PLUS de pouvoir à quiconque — ça réduit la
  // surface. Le renvoi (numéro mal tapé, SMS perdu) est donc la même route :
  // l'ancien code meurt journalisé (RECOUV_CODE_REMPLACE), un nouveau part.
  @Post('codes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ROLES_GENERATION)
  @Throttle({ default: { limit: 10, ttl: 600000 } })
  @HttpCode(HttpStatus.OK)
  async genererCode(
    @Body() body: { phone?: string },
    @Request() req: any,
  ) {
    const phone = normaliserTelephone(body?.phone);
    if (!phone) return { success: false, code: 'NUMERO_INVALIDE', message: 'Numéro invalide' };

    // Sans numéro de l'agent, pas de canal de remise : on ne règle pas ce
    // problème en affichant le code à l'écran (SEC-05) — même réponse que la
    // réinitialisation de PIN sans numéro (AUTH-RECOVERY-01, ligne voisine).
    const telephoneAgent = String((req.user as any)?.phone || '').trim();
    if (!telephoneAgent) {
      return { success: false, code: 'SANS_NUMERO_AGENT', message: 'Ton compte n\'a pas de numéro : le code ne peut pas t\'être envoyé' };
    }

    const compte = await this.userRepo.findOne({ where: { phone } });
    if (!compte || !COMPTES_ELIGIBLES.includes((compte as any).role)) {
      return { success: false, code: 'INTROUVABLE', message: 'Compte introuvable ou non éligible' };
    }

    // L'ancien code actif meurt AVANT que le nouveau naisse — l'invariant se
    // vérifie mieux qu'il ne se croie : si le processus casse entre les deux,
    // on reste à ZÉRO code actif, jamais à deux.
    const anciens = await this.codesRepo.find({ where: { userId: compte.id, statut: 'actif' } });
    for (const ancien of anciens) {
      await this.codesRepo.update(ancien.id, {
        statut: 'revoque',
        revoqueLe: new Date(),
        revoquePar: req.user?.id ?? null,
      });
      await this.auditService.log({
        userId: req.user?.id ?? null,
        action: 'RECOUV_CODE_REMPLACE',
        entite: 'code_recuperation',
        entiteId: ancien.id,
        details: { compteCible: compte.id, par: 'regeneration' },
        ip: req.ip ?? null,
      });
    }

    const codeClair = genererCodeRecuperation();
    const codeHash = await bcrypt.hash(codeClair, 10);
    const expireLe = new Date(Date.now() + DUREE_VIE_CODE_RECUPERATION_MS);
    const sauve = await this.codesRepo.save({
      userId: compte.id,
      codeHash,
      statut: 'actif' as const,
      generePar: req.user?.id ?? null,
      expireLe,
      echecs: 0,
      verrouLe: null,
    } as Partial<CodeRecuperation>);

    await this.auditService.log({
      userId: req.user?.id ?? null,
      action: 'RECOUV_CODE_GENERE',
      entite: 'code_recuperation',
      entiteId: sauve.id,
      // Aucun fragment du code, pas même un préfixe : le hash est le seul
      // vestige, et le canal de remise est le SMS de l'agent.
      details: { compteCible: compte.id, ttlJours: 7, canal: 'sms-agent' },
      ip: req.ip ?? null,
    });

    const envoye = await this.feedbakSmsService.notifyCodeRecuperationAgent(
      telephoneAgent,
      codeClair,
    );
    if (!envoye) {
      // Le code existe, il est valide, mais personne ne le tient : c'est un
      // code mort-né. La vérité de l'écran : « le SMS n'est pas passé,
      // renvoyez » — qui régénère. On ne propose JAMAIS l'affichage.
      return { success: false, code: 'SMS_NON_DELIVRE', codeCree: true, codeId: sauve.id };
    }
    return { success: true, codeId: sauve.id, expireLe };
  }

  // ── Voir l'état des codes d'un compte (jamais les codes eux-mêmes) ──────
  //
  // Pour révoquer, un admin doit trouver la ligne. Elle donne l'état, les
  // dates, les compteurs — jamais le hash, jamais le moindre caractère du
  // code : il n'existe plus nulle part de toute façon.
  @Get('codes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin_general')
  @HttpCode(HttpStatus.OK)
  async listerCodes(@Query('phone') phoneBrut?: string) {
    const phone = normaliserTelephone(phoneBrut);
    if (!phone) return { success: true, codes: [] };
    const compte = await this.userRepo.findOne({ where: { phone } });
    if (!compte) return { success: true, codes: [] };
    const codes = await this.codesRepo.find({
      where: { userId: compte.id },
      order: { genereLe: 'DESC' },
      take: 20,
    });
    return {
      success: true,
      codes: codes.map((c) => ({
        id: c.id,
        statut: c.statut,
        genereLe: c.genereLe,
        expireLe: c.expireLe,
        consommeLe: c.consommeLe,
        revoqueLe: c.revoqueLe,
        generePar: c.generePar,
        echecs: c.echecs,
        verrouLe: c.verrouLe,
      })),
    };
  }

  // ── Tuer un code ────────────────────────────────────────────────────────
  //
  // Révocable (§3.1.4) : un admin peut tuer un code vivant — numéro changé,
  // suspicion, erreur de remise. Tuer un code ne ferme aucune porte à la
  // marchande : un code ne OUVRE rien sans son geste de présence.
  @Post('codes/:id/revoquer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin_general')
  @HttpCode(HttpStatus.OK)
  async revoquerCode(@Param('id') id: string, @Request() req: any) {
    const code = await this.codesRepo.findOne({ where: { id } });
    if (!code) return { success: false, code: 'INTROUVABLE', message: 'Code introuvable' };
    if (code.statut !== 'actif') return { success: true, dejaMort: true, statut: code.statut };
    await this.codesRepo.update(id, {
      statut: 'revoque',
      revoqueLe: new Date(),
      revoquePar: req.user?.id ?? null,
    });
    await this.auditService.log({
      userId: req.user?.id ?? null,
      action: 'RECOUV_CODE_REVOCATION',
      entite: 'code_recuperation',
      entiteId: id,
      details: { compteCible: code.userId },
      ip: req.ip ?? null,
    });
    return { success: true };
  }
}

/**
 * `0840404040`, `+2250840404040`, `+225 08 40 40 40 40` → `+2250840404040`.
 * Même forme que le chemin de repli WebAuthn par numéro (auth.controller) —
 * une seule vérité sur ce qu'est un numéro bien formé.
 */
export function normaliserTelephone(brut: unknown): string | null {
  if (typeof brut !== 'string') return null;
  const trimmed = brut.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  return trimmed.startsWith('+225')
    ? trimmed.replace(/\s/g, '')
    : digits.startsWith('225')
      ? `+${digits}`
      : digits.startsWith('0')
        ? `+225${digits}`
        : `+225${digits}`;
}
