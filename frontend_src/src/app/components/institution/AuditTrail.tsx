import React from 'react';
import { SubPageLayout } from '../layout/SubPageLayout';
import { DonneeIndisponible } from './DonneeIndisponible';

// Le journal d'audit n'a pas de route `/institution/*` : `/audit` est réservé
// aux administrateurs (403 pour ce rôle). L'écran le dit au lieu d'afficher
// une liste vide qui ferait croire à « aucune action ».
export function AuditTrail() {
  return (
    <SubPageLayout role="institution" title="Audit Trail" subtitle="Historique complet des actions">
      <div className="pb-32 lg:pb-8 pt-2">
        <DonneeIndisponible
          titre="Journal d'audit indisponible"
          raison="Le journal des actions n'est pas encore ouvert aux institutions. Demandez-le à l'administrateur Jùlaba."
        />
      </div>
    </SubPageLayout>
  );
}
