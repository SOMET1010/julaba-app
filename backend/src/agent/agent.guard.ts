/**
 * LA GARDE D'UN AGENT — AGENT-A1/A2/A4, 05/10/2026.
 *
 * Trois questions, dans cet ordre, et chacune peut tout arrêter :
 *   1. le jeton est-il celui d'un agent vivant ? (JwtAgentStrategy)
 *   2. sa portée couvre-t-elle CE geste ? (@PorteeRequise)
 *   3. la marchande visée l'a-t-elle autorisé, depuis cet appareil ?
 *
 * L'ORDRE N'EST PAS UNE COMMODITÉ. La portée se vérifie avant la délégation :
 * un agent sans droit d'écrire n'a aucune raison qu'on aille lire en base
 * pour qui il prétend agir. On refuse au plus tôt, avec le moins
 * d'information rendue.
 *
 * LA MARCHANDE EST DÉSIGNÉE PAR UN EN-TÊTE, PAS PAR LE CORPS. Le corps est la
 * donnée métier ; l'en-tête est le contexte d'autorisation. Les mélanger
 * permettrait à une requête de viser une marchande dans son en-tête et d'en
 * écrire une autre dans son corps — c'est le contrôleur qui impose ensuite
 * que l'écriture aille bien à la marchande autorisée (voir AGENT-A4).
 */
import {
  CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AgentService } from './agent.service';
import { agentPeut, type PorteeAgent } from './portee-agent';
import type { PrincipalAgent } from './jwt-agent.strategy';

export const CLE_PORTEE = 'portee_agent_requise';

/** À poser sur chaque route d'agent. Sans elle, la garde REFUSE : une route
 *  qu'on a oublié de qualifier ne doit pas être la plus permissive. */
export const PorteeRequise = (portee: PorteeAgent) => SetMetadata(CLE_PORTEE, portee);

/** L'en-tête qui désigne la marchande pour laquelle l'agent agit. */
export const ENTETE_MARCHAND = 'x-julaba-marchand';
/** L'appareil — le fil WhatsApp — auquel la délégation est liée. */
export const ENTETE_APPAREIL = 'x-julaba-appareil';

@Injectable()
export class AgentGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly agents: AgentService,
  ) {}

  async canActivate(contexte: ExecutionContext): Promise<boolean> {
    const req = contexte.switchToHttp().getRequest();
    const agent: PrincipalAgent | undefined = req.user;
    if (!agent?.estAgent) throw new UnauthorizedException("Jeton d'agent requis");

    const requise = this.reflector.getAllAndOverride<PorteeAgent | undefined>(CLE_PORTEE, [
      contexte.getHandler(), contexte.getClass(),
    ]);
    // Pas de portée déclarée = refus. Une route non qualifiée est une erreur
    // de câblage, et une erreur de câblage ne doit jamais ouvrir une porte.
    if (!requise) throw new ForbiddenException('Route non qualifiée pour un agent');
    if (!agentPeut(agent.portees, requise)) throw new ForbiddenException('Portée insuffisante');

    const marchandId = String(req.headers?.[ENTETE_MARCHAND] ?? '').trim();
    const appareil = String(req.headers?.[ENTETE_APPAREIL] ?? '').trim();
    if (!marchandId || !appareil) throw new ForbiddenException('Marchande ou appareil non désigné');

    const autorise = await this.agents.delegationValide(agent.id, marchandId, appareil, Date.now());
    if (!autorise) throw new ForbiddenException('Aucune délégation active pour cette marchande');

    // Le contrôleur écrira POUR CETTE marchande — jamais pour celle que le
    // corps de la requête prétendrait désigner (AGENT-A4).
    req.marchandDelegue = marchandId;
    req.appareilDelegue = appareil;
    return true;
  }
}
