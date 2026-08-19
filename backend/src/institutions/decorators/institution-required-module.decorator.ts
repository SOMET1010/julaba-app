import { SetMetadata } from '@nestjs/common';

// Metadonnee lue par InstitutionScopeGuard : declare quelle cle de
// `institutions.modules` (jsonb, module -> NiveauAcces) doit etre autorisee
// (niveau different de 'aucun'/absent) pour qu'une institution accede a la
// route. Sans effet pour les roles non-institution (super_admin/admin_general
// gardent une vue plateforme complete, inchangee par ce lot).
export const INSTITUTION_REQUIRED_MODULE_KEY = 'institutionRequiredModule';

export const RequireInstitutionModule = (moduleKey: string) =>
  SetMetadata(INSTITUTION_REQUIRED_MODULE_KEY, moduleKey);
