/**
 * ÉTABLIR ET RETIRER UNE DÉLÉGATION — AGENT-A2, 05/10/2026.
 *
 * ── POURQUOI CES ROUTES NE PASSENT PAS PAR `AgentGuard` ──────────────────
 *
 * `AgentGuard` exige une délégation ACTIVE. Ces routes servent précisément à
 * en créer une : les y soumettre rendrait toute première délégation
 * impossible. Elles n'exigent donc que le jeton d'agent — et c'est sans
 * danger, parce que demander un code N'ACCORDE RIEN : le code part par SMS
 * chez la marchande, et rien ne se passe tant qu'elle ne l'a pas donné.
 *
 * ── ET POURQUOI IL N'Y A PAS DE PORTÉE « delegation » ────────────────────
 *
 * `PORTEES_INTERDITES` interdit qu'un agent détienne un droit nommé sur les
 * délégations. Ce n'est pas une contradiction avec ces routes : un agent peut
 * DEMANDER, il ne peut pas ACCORDER. La seule chose qui accorde, c'est un
 * code que la marchande a reçu sur sa ligne téléphonique et qu'elle a choisi
 * de transmettre.
 *
 * ── LA RÉVOCATION APPARTIENT À LA MARCHANDE ──────────────────────────────
 *
 * Elle passe par le jeton UTILISATEUR, pas par celui de l'agent. Un agent ne
 * doit pas pouvoir révoquer — ni les autres, ni lui-même pour effacer une
 * trace. Et elle ne supprime aucune ligne : une délégation révoquée explique
 * des écritures passées, et on ne détruit pas la trace de ce qui a autorisé
 * de l'argent.
 */
import { BadRequestException, Body, Controller, Delete, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AgentService } from './agent.service';
import type { PrincipalAgent } from './jwt-agent.strategy';
import type { User } from '../users/entities/user.entity';

@Controller('agent/delegation')
export class AgentDelegationController {
  constructor(private readonly agents: AgentService) {}

  /**
   * L'agent demande l'autorisation d'agir pour une marchande. Un code part
   * par SMS — JAMAIS par WhatsApp : le canal doit être un que l'agent ne
   * contrôle pas, sinon quiconque tient le WhatsApp s'auto-délègue.
   *
   * La réponse est la MÊME que le numéro existe ou non. Sans cela, un agent
   * énumérerait les comptes en lisant la différence.
   */
  @UseGuards(AuthGuard('jwt-agent'))
  @Post('demander')
  async demander(@Body() body: any, @Req() req: any) {
    const agent: PrincipalAgent = req.user;
    const marchandId = String(body?.marchand_id ?? '').trim();
    const appareil = String(body?.appareil ?? '').trim();
    if (!marchandId || !appareil) throw new BadRequestException('marchand_id et appareil requis');

    await this.agents.demanderCode(agent.id, marchandId, appareil, Date.now());
    return { envoye: true, canal: 'sms' };
  }

  /**
   * La marchande a lu son SMS et donné le code. La délégation naît ici.
   *
   * Le verdict NOMME sa raison — expiré, déjà utilisé, trop d'essais — parce
   * que l'agent doit pouvoir dire à la marchande quoi faire. Mais il ne dit
   * jamais si le numéro existait : « inconnu » couvre à la fois un mauvais
   * code et une demande qui n'a jamais eu lieu.
   */
  @UseGuards(AuthGuard('jwt-agent'))
  @Post('confirmer')
  async confirmer(@Body() body: any, @Req() req: any) {
    const agent: PrincipalAgent = req.user;
    const marchandId = String(body?.marchand_id ?? '').trim();
    const appareil = String(body?.appareil ?? '').trim();
    const code = String(body?.code ?? '').trim();
    if (!marchandId || !appareil || !code) {
      throw new BadRequestException('marchand_id, appareil et code requis');
    }
    const etat = await this.agents.confirmerCode(agent.id, marchandId, code, appareil, Date.now());
    if (etat.valide === true) return { delegue: true };
    return { delegue: false, raison: etat.raison };
  }

  /**
   * La marchande retire son autorisation. Sans `agent_id`, elle retire TOUT :
   * c'est le geste qu'on veut simple quand on ne sait pas ce qui se passe.
   */
  @UseGuards(JwtAuthGuard)
  @Delete()
  async revoquer(@CurrentUser() user: User, @Query('agent_id') agentId?: string, @Query('appareil') appareil?: string) {
    const combien = await this.agents.revoquer(user.id, Date.now(), agentId, appareil);
    return { revoquees: combien };
  }

  /** Ce que la marchande voit quand elle demande qui agit pour elle. */
  @UseGuards(JwtAuthGuard)
  @Get('miennes')
  async miennes(@CurrentUser() user: User) {
    return { delegations: await this.agents.delegationsDe(user.id) };
  }
}
