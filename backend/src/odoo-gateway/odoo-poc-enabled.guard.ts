import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';

/**
 * Le POC Odoo est désactivé par défaut : le fait que `OdooGatewayModule` soit
 * importé dans AppModule ne doit pas suffire à rendre `/odoo-poc/*` utilisable
 * en production. Activation explicite via ODOO_POC_ENABLED=true (démo/dev
 * uniquement) — absent ou toute autre valeur → 404, comme si la route
 * n'existait pas (pas un 403, qui confirmerait son existence).
 */
@Injectable()
export class OdooPocEnabledGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    if (process.env.ODOO_POC_ENABLED !== 'true') {
      throw new NotFoundException();
    }
    return true;
  }
}
