/**
 * LE JETON D'UN AGENT — AGENT-A1, 05/10/2026.
 *
 * UNE STRATÉGIE À PART, ET C'EST TOUT LE DESSIN. `JwtStrategy` charge un
 * `User` et rend ses droits ; elle est faite pour un être humain. On n'y a
 * donc PAS ajouté une branche « sauf si c'est un agent » : une branche se
 * franchit, et le jour où quelqu'un la déplace, un agent devient marchande.
 * Deux chemins séparés ne se croisent nulle part.
 *
 * Symétriquement, `JwtStrategy` REFUSE désormais tout jeton portant
 * `typ: 'agent'` — sans quoi un jeton d'agent forgé avec un `sub` de
 * marchande ouvrirait son compte entier.
 *
 * CETTE STRATÉGIE NE SAIT PAS CHARGER UN UTILISATEUR, et ne le saura jamais.
 * Elle rend un principal d'agent : un identifiant, des portées, des plafonds.
 * Pas un `User`, pas un téléphone, pas un PIN.
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AgentService, type CompteAgent } from './agent.service';
import { porteesDuJeton } from './portee-agent';

/** Ce qu'un agent est, pour le reste du serveur. Volontairement pauvre. */
export interface PrincipalAgent extends CompteAgent {
  readonly estAgent: true;
}

/** En-tête, jamais cookie : un agent est un serveur, pas un navigateur. */
const bearerSeul = (req: Request): string | null => {
  const auth = req?.headers?.authorization;
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
};

@Injectable()
export class JwtAgentStrategy extends PassportStrategy(Strategy, 'jwt-agent') {
  constructor(
    configService: ConfigService,
    private readonly agents: AgentService,
  ) {
    super({
      jwtFromRequest: bearerSeul,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any): Promise<PrincipalAgent> {
    if (payload?.typ !== 'agent' || !payload?.agentId) {
      throw new UnauthorizedException("Jeton d'agent invalide");
    }
    const compte = await this.agents.compte(String(payload.agentId));
    if (!compte) throw new UnauthorizedException("Agent inconnu");
    if (!compte.actif) throw new UnauthorizedException("Agent révoqué");

    // LA PORTÉE EFFECTIVE EST L'INTERSECTION du jeton et du compte. Un jeton
    // ancien ne peut donc pas garder un droit qu'on vient de retirer au
    // compte ; et un jeton forgé ne peut pas s'en ajouter un que le compte
    // n'a pas. Les deux sens comptent — c'est ce qui rend la révocation
    // immédiate sans attendre l'expiration du jeton.
    const duJeton = porteesDuJeton(payload.portees);
    const effectives = duJeton.filter((p) => compte.portees.includes(p));
    return { ...compte, portees: effectives, estAgent: true };
  }
}
