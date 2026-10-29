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

import { Controller, Post, Get, Param, Body, Query, HttpCode, HttpStatus, UseGuards, Request, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Response } from 'express';
import { verifyRegistrationResponse, generateRegistrationOptions } from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/types';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { User } from '../users/entities/user.entity';
import { CodeRecuperation } from './entities/code-recuperation.entity';
import { genererCodeRecuperation, normaliserCodeRecuperation } from './code-recuperation';
import {
  ouvrirSessionRecuperation,
  sessionVivante,
  poserConsentement,
  poserChallengeWebauthn,
  consommerSessionRecuperation,
} from './session-recuperation';
import { attenteApresEchecs, attenteEnClair } from './verrou-pin';
import { repondreAEcheanceUniforme } from './anti-enumeration';
import { poserCookiesJetonsActeur } from './cookies-jetons';
import { AuditService } from '../audit-log/audit-log.service';
import { FeedbakSmsService } from '../feedbak-sms/feedbak-sms.service';
import { AuthService } from './auth.service';

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
    private readonly authService: AuthService,
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

  // ═════════════════════════════════════════════════════════════════════════
  // LE PARCOURS À TROIS MARCHES — sur le NOUVEAU téléphone de la marchande.
  //
  //   MARCHE 1  initier        — l'agent tape le numéro + le code. Public :
  //                              elle n'a AUCUNE session, c'est le sens même
  //                              de la récupération. L'échéance de réponse est
  //                              uniforme et le refus ne dit jamais QUOI a
  //                              échoué (anti-énumération, AUTH-07).
  //   MARCHE 2  consentement   — LE GESTE D'ELLE. « C'est mon compte », tenu
  //                              longuement, hors de la poche de quiconque
  //                              détient le code. Horodaté, journalisé. LE
  //                              CODE SEUL NE SUFFIT JAMAIS (§3.1.3) : sans
  //                              cette marche posée, la marche 3 est murée.
  //   MARCHE 3  ré-enrôlement  — options puis vérification WebAuthn sur SON
  //                              nouveau téléphone : residentKey required,
  //                              userVerification required, userID = user.id
  //                              (le pivot du LOT-WA-01 — le userHandle
  //                              rapportera QUI se connecte au quotidien).
  //                              Les anciennes clés (téléphone perdu) sont
  //                              RÉVOQUÉES À CET INSTANT (§3.1.4), le code est
  //                              consommé (usage unique), les sessions ouvertes
  //                              tombent, et elle repart connectée — guidée
  //                              par la voix côté écran.
  // ═════════════════════════════════════════════════════════════════════════

  @Post('initier')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async initier(@Body() body: { phone?: string; code?: string }, @Request() req: any) {
    const debut = Date.now();
    // Un seul refus, quel que soit ce qui a échoué : numéro inconnu, compte non
    // éligible, code inconnu, code expiré, code révoqué, code faux — la durée
    // et la réponse ne doivent rien apprendre à qui sonde (AUTH-07).
    const REFUS = { success: false, message: 'Numéro ou code refusé' };
    let reponse: object = REFUS;
    try {
      const phone = normaliserTelephone(body?.phone);
      const codeSaisi = normaliserCodeRecuperation(body?.code);
      if (!phone || !codeSaisi) {
        reponse = REFUS;
      } else {
      const compte = await this.userRepo.findOne({ where: { phone } });
      if (!compte) {
        reponse = REFUS;
      } else {
      const code = await this.codesRepo.findOne({
        where: { userId: compte.id, statut: 'actif' },
        order: { genereLe: 'DESC' },
      });
      if (!code) {
        reponse = REFUS;
      } else {
      const maintenant = Date.now();
      if (code.expireLe && code.expireLe.getTime() <= maintenant) {
        reponse = REFUS;
      } else if (code.verrouLe && code.verrouLe.getTime() > maintenant) {
        // Le verrou ne se cache pas : il n'apprend l'existence de rien — il
        // n'est atteignable qu'après de vrais échecs sur une vraie ligne.
        reponse = {
          success: false,
          code: 'ATTENTE',
          message: `Trop d'essais. Attends ${attenteEnClair(code.verrouLe.getTime() - maintenant)}.`,
        };
      } else {
      const verifie = await bcrypt.compare(codeSaisi, code.codeHash);
      if (!verifie) {
        // L'échelle d'attente, côté serveur (§4.4) : 3 échecs → 5 min,
        // 6 → 15, 9 et plus → 1 heure. Le compteur vit sur la LIGNE du code,
        // il survit aux redémarrages — contrairement à un compteur mémoire.
        const echecs = (code.echecs ?? 0) + 1;
        const attenteMs = attenteApresEchecs(echecs);
        await this.codesRepo.update(code.id, {
          echecs,
          verrouLe: attenteMs > 0 ? new Date(maintenant + attenteMs) : null,
        });
        await this.auditService.log({
          userId: null,
          action: 'RECOUV_CODE_VERIFIE_ECHEC',
          entite: 'code_recuperation',
          entiteId: code.id,
          // Aucun fragment du code présenté — même un faux n'est pas journalisé.
          details: { compteCible: compte.id, echecs },
          ip: req.ip ?? null,
        });
        reponse = REFUS;
      } else {
        // Le code est bon : la marche 1 est posée. Il n'est PAS encore
        // consommé — il le sera au ré-enrôlement mené à bout. Un parcours
        // interrompu (le serveur redémarre, le réseau coupe) reprend à la
        // marche 1, sans brûler le code d'une tentative inaboutie.
        await this.codesRepo.update(code.id, { echecs: 0, verrouLe: null });
        const jeton = ouvrirSessionRecuperation(compte.id, code.id);
        await this.auditService.log({
          userId: null,
          action: 'RECOUV_CODE_VERIFIE_OK',
          entite: 'code_recuperation',
          entiteId: code.id,
          details: { compteCible: compte.id },
          ip: req.ip ?? null,
        });
        reponse = { success: true, jeton };
      }
      }
      }
      }
      }
    } catch {
      reponse = REFUS;
    }
    // TOUTES les sorties passent ici : la durée mesurée depuis l'extérieur ne
    // dépend plus du chemin pris (AUTH-07, échéance uniforme).
    await repondreAEcheanceUniforme(debut);
    return reponse;
  }

  // MARCHE 2 — le geste d'ELLE. Le client n'appelle cette route qu'après le
  // toucher long sur « C'est mon compte » ; le serveur ne peut pas voir un
  // doigt, mais il PEUT tracer l'événement, l'horodater, et refuser d'ouvrir
  // la marche 3 tant que ce trace n'existe pas. C'est la trace qui, jointe au
  // journal du ré-enrôlement, raconte la double présence (§3.2).
  @Post('consentement')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async consentement(@Body() body: { jeton?: string }, @Request() req: any) {
    const session = sessionVivante(body?.jeton, 'code_valide');
    if (!session) {
      return { success: false, message: 'Session de récupération inconnue ou expirée' };
    }
    const posee = poserConsentement(body!.jeton!);
    if (!posee) {
      return { success: false, message: 'Session de récupération inconnue ou expirée' };
    }
    await this.auditService.log({
      userId: null,
      action: 'RECOUV_CONSENTEMENT',
      entite: 'code_recuperation',
      entiteId: session.codeId,
      // Le consentement horodaté (§3.1.3) : qui (le compte), quand (NOW),
      // sur quelle session. C'est la trace serveur du geste physique.
      details: { compteCible: session.userId, horodatage: posee.consentementLe },
      ip: req.ip ?? null,
    });
    return { success: true, etape: 'consentement' };
  }

  // MARCHE 3a — les options d'enrôlement, données UNIQUEMENT à une session
  // qui a déjà posé les deux premières marches. Le challenge vit dans la
  // session (elle n'a pas de ligne user à prêter) — en mémoire, TTL court,
  // écrasé à chaque nouvelle demande.
  @Post('webauthn/options')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async optionsReenrolement(@Body() body: { jeton?: string }) {
    const session = sessionVivante(body?.jeton, 'consentement');
    if (!session) {
      return { error: 'Session de récupération inconnue, expirée, ou geste manquant' };
    }
    const compte = await this.userRepo.findOne({ where: { id: session.userId } });
    if (!compte) return { error: 'Compte introuvable' };
    const options = await generateRegistrationOptionsPourRecuperation(compte);
    const posee = poserChallengeWebauthn(body!.jeton!, options.challenge);
    if (!posee) return { error: 'Session de récupération inconnue, expirée, ou geste manquant' };
    return options;
  }

  // MARCHE 3b — le verdict. Trois portes ici, toutes serveur : la session est
  // à « consentement » (le code ET le geste existent), le challenge posé par
  // /webauthn/options est celui de la réponse, et la vérification
  // cryptographique passe. Alors — et seulement alors — les anciennes clés
  // meurent, le code est consommé, et elle repart connectée.
  @Post('re-enroler')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async reEnroler(
    @Body() body: { jeton?: string; reponse?: RegistrationResponseJSON },
    @Res({ passthrough: true }) res: Response,
    @Request() req: any,
  ) {
    if (!body?.jeton || !body?.reponse) {
      return { verified: false, error: 'Données manquantes' };
    }
    const session = sessionVivante(body.jeton, 'consentement');
    if (!session || !session.challengeWebauthn) {
      return { verified: false, error: 'Récupération incomplète : le code et le geste sont requis' };
    }
    const compte = await this.userRepo.findOne({ where: { id: session.userId } });
    if (!compte) return { verified: false, error: 'Compte introuvable' };

    let registrationInfo: Awaited<ReturnType<typeof verifyRegistrationResponse>>['registrationInfo'];
    try {
      const verdict = await verifyRegistrationResponse({
        response: body.reponse,
        expectedChallenge: session.challengeWebauthn,
        expectedOrigin: process.env.WEBAUTHN_ORIGIN || 'https://julaba.online',
        expectedRPID: process.env.WEBAUTHN_RP_ID || 'julaba.online',
      });
      if (!verdict.verified || !verdict.registrationInfo) {
        // Le geste a échoué : la session SURVIT (le doigt se repose), le
        // client peut redemander des options — un nouveau challenge, même
        // parcours. Rien n'a été consommé.
        return { verified: false };
      }
      registrationInfo = verdict.registrationInfo;
    } catch (e: any) {
      return { verified: false, error: e?.message };
    }

    const { credential, credentialDeviceType, credentialBackedUp } = registrationInfo!;
    const nouvelleCle = {
      credentialID: credential.id,
      credentialPublicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: body.reponse.response?.transports || [],
    };

    // §3.1.4 — LES ANCIENNES CLÉS MEURENT ICI. Tout authentificateur lié à ce
    // compte (le téléphone perdu, volé, réinstallé) cesse d'exister côté
    // serveur : remplacées, pasArchivees. Le journal porte combien — la trace
    // de la révocation, pas un musée.
    const anciennes = compte.webauthnCredentials || [];
    await this.userRepo.update(compte.id, {
      webauthnCredentials: [nouvelleCle],
      webauthnChallenge: null,
    } as any);

    // Le code a servi : usage unique, horodaté. Toute session de récupération
    // du compte ferme avec lui (usage unique aussi).
    await this.codesRepo.update(session.codeId, {
      statut: 'consomme',
      consommeLe: new Date(),
    });
    consommerSessionRecuperation(body.jeton);

    // Les sessions ouvertes du compte tombent : un téléphone qu'on remplace
    // (volé ? prêté ?) ne doit rien garder d'ouvert.
    await this.authService.revokeAllUserTokens(compte.id);

    await this.auditService.log({
      userId: null,
      action: 'RECOUV_RE_ENROLEMENT',
      entite: 'code_recuperation',
      entiteId: session.codeId,
      details: {
        compteCible: compte.id,
        anciennesClesRevoquees: anciennes.length,
        nouvelleCle: { deviceType: credentialDeviceType, backedUp: credentialBackedUp },
        consentementLe: session.consentementLe,
      },
      ip: req.ip ?? null,
    });

    // Elle repart connectée — le parcours ne s'arrête pas sur un écran de
    // félicitations à traduire pour elle : la suite est la sienne, guidée
    // par la voix. Jetons en cookies (web) ET dans le corps (APK), comme
    // la connexion par empreinte.
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const resultat = await this.authService.loginById(
      compte.id,
      req.headers['user-agent'],
      ipAddress as string,
    );
    poserCookiesJetonsActeur(res, resultat.accessToken, resultat.refreshToken);
    return {
      verified: true,
      user: resultat.user,
      accessToken: resultat.accessToken,
      refreshToken: resultat.refreshToken,
    };
  }
}

/**
 * Les options d'enrôlement du ré-enrôlement — mêmes exigences que
 * l'enrôlement ordinaire (SPEC-AUTH-CIBLE §2.1) : credential DÉCOUVRABLE
 * (residentKey 'required') et userVerification 'required' — c'est SON doigt
 * sur SON nouveau téléphone. userID = user.id : le pivot du LOT-WA-01,
 * l'assertion usernameless quotidienne rapportera ce userHandle.
 */
async function generateRegistrationOptionsPourRecuperation(compte: User) {
  return generateRegistrationOptions({
    rpName: 'Jùlaba',
    rpID: process.env.WEBAUTHN_RP_ID || 'julaba.online',
    userName: (compte as any).phone,
    userID: new TextEncoder().encode(compte.id) as any,
    userDisplayName: `${(compte as any).firstName ?? ''} ${(compte as any).lastName ?? ''}`.trim(),
    attestationType: 'none',
    excludeCredentials: (compte.webauthnCredentials || []).map((c) => ({
      id: c.credentialID,
      transports: c.transports as any,
    })) as any,
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
    },
  });
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
