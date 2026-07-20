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
    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException("Utilisateur introuvable");
    if (user.status === UserStatus.SUSPENDU) throw new UnauthorizedException('Compte suspendu');
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
