import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

const ADMIN_ROLES = ['admin_general', 'super_admin', 'admin_national', 'gestionnaire_zone', 'operateur_terrain'];

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Pas de restriction de rôle → laisser passer (JWT guard gère l'auth)
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Pas encore authentifié → laisser JwtAuthGuard retourner 401
    if (!user) return false;

    const hasRole = requiredRoles.some(role => {
      if (role === 'ADMIN') return ADMIN_ROLES.includes(user.role);
      return user.role === role;
    });

    if (!hasRole) {
      throw new ForbiddenException(`Accès refusé. Rôle requis: ${requiredRoles.join(', ')}`);
    }
    return true;
  }
}
