import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { InstitutionScope } from '../guards/institution-scope.guard';

// Recupere le perimetre (`InstitutionScope`) pose par `InstitutionScopeGuard`
// sur la requete. `undefined` pour un role non-institution (super_admin,
// admin_general) : ces roles ne sont pas scopes par ce lot, ils gardent la
// vue plateforme complete deja existante.
export const CurrentInstitutionScope = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): InstitutionScope | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.institutionScope;
  },
);
