import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User, UserStatus } from "../../users/entities/user.entity";
import { Request } from "express";

const cookieOrBearer = (req: Request): string | null => {
  if (req?.cookies?.bo_access_token) return req.cookies.bo_access_token;
  if (req?.cookies?.access_token) return req.cookies.access_token;
  const auth = req?.headers?.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: cookieOrBearer,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET"),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    // AGENT-A1, 05/10/2026 — UN JETON D'AGENT NE PASSE JAMAIS PAR ICI.
    //
    // Cette stratégie est celle des ÊTRES HUMAINS : elle charge un `User` et
    // rend tous ses droits. Un jeton d'agent porte `typ: 'agent'` et n'a pas
    // de `sub` utilisateur — mais rien n'empêcherait d'en forger un qui en
    // porte un. Sans ce refus, un tel jeton ouvrirait le compte entier d'une
    // marchande, bien au-delà des quatre gestes de la portée d'un agent.
    //
    // Les agents ont leur propre stratégie (`JwtAgentStrategy`), leur propre
    // garde, et aucune des deux ne sait charger un `User`. Les deux chemins ne
    // se croisent nulle part, et c'est ce croisement-là qu'on ferme.
    if (payload?.typ === 'agent') {
      throw new UnauthorizedException("Un jeton d'agent n'ouvre pas de session utilisateur");
    }
    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException("Utilisateur introuvable");
    if (user.status === UserStatus.SUSPENDU) throw new UnauthorizedException('Compte suspendu');
    if (user.status === UserStatus.EN_ATTENTE_ACTIVATION) throw new UnauthorizedException('Compte pas encore activé');
    if ((user as any).mustChangePassword === true) {
      const path = (req?.url || "").split("?")[0];
      const allow = ["auth/change-password", "auth/logout", "auth/logout-all", "auth/me", "users/me"];
      const permis = allow.some((suffix) => path.endsWith(suffix));
      if (!permis) {
        throw new UnauthorizedException("Changement de mot de passe requis");
      }
    }
    return user;
  }
}
