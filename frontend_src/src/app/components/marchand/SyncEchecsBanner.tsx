// Bandeau de surfaçage des rejets DÉFINITIFS de la file hors-ligne (4xx sortis
// de la file au rejeu). Rendre visible est OBLIGATOIRE : sans lui, une vente
// refusée disparaîtrait silencieusement. Composant additif, sans logique caisse.
import { useCaisse } from '../../contexts/CaisseContext';

export function SyncEchecsBanner() {
  const { syncEchecs, syncLettresMortes, purgerEchecSync } = useCaisse();
  if (syncEchecs <= 0) return null;
  const pluriel = syncEchecs > 1 ? 's' : '';
  return (
    // La marge vit sur l'EMPILEMENT, pas sur le bandeau : c'est la colonne que
    // la maquette prévoit pour les bandeaux de file (en attente, puis refusés).
    // Un seul y est rendu aujourd'hui ; l'autre attend son lot (voir rapport A9).
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '8px 0' }}>
    <div
      role="alert"
      style={{
        background: '#F6E2DF', color: '#AE3A38', border: '1px solid #AE3A38',
        borderRadius: 10, padding: '10px 14px', fontSize: 14,
      }}
    >
      <strong>
        {syncEchecs} opération{pluriel} hors-ligne refusée{pluriel}
      </strong>{' '}
      — non enregistrée{pluriel} par le serveur, à revoir.
      <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
        {syncLettresMortes.slice(0, 5).map((l) => (
          <li key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span>
              {l.endpoint === '/caisse/vente' ? 'Vente' : 'Dépense'} — {l.echec?.message || 'refusée'}
            </span>
            {/* 44 px de haut : « Retirer » était un mot souligné de 14 px, donc
                une cible d'environ 18 px — sous le seuil tactile de la charte,
                et c'est le bouton qui fait disparaître une ligne d'argent. */}
            <button
              type="button"
              onClick={() => { void purgerEchecSync(l.id); }}
              style={{ minHeight: 44, padding: '0 8px', flexShrink: 0, background: 'none', border: 'none', color: '#AE3A38', textDecoration: 'underline', cursor: 'pointer' }}
            >
              Retirer
            </button>
          </li>
        ))}
      </ul>
    </div>
    </div>
  );
}
