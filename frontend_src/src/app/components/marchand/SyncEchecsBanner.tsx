// Bandeau de surfaçage des rejets DÉFINITIFS de la file hors-ligne (4xx sortis
// de la file au rejeu). Rendre visible est OBLIGATOIRE : sans lui, une vente
// refusée disparaîtrait silencieusement. Composant additif, sans logique caisse.
import { useCaisse } from '../../contexts/CaisseContext';

export function SyncEchecsBanner() {
  const { syncEchecs, syncLettresMortes, purgerEchecSync } = useCaisse();
  if (syncEchecs <= 0) return null;
  const pluriel = syncEchecs > 1 ? 's' : '';
  return (
    <div
      role="alert"
      style={{
        background: '#F6E2DF', color: '#AE3A38', border: '1px solid #AE3A38',
        borderRadius: 10, padding: '10px 14px', margin: '8px 0', fontSize: 14,
      }}
    >
      <strong>
        {syncEchecs} opération{pluriel} hors-ligne refusée{pluriel}
      </strong>{' '}
      — non enregistrée{pluriel} par le serveur, à revoir.
      <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
        {syncLettresMortes.slice(0, 5).map((l) => (
          <li key={l.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span>
              {l.endpoint === '/caisse/vente' ? 'Vente' : 'Dépense'} — {l.echec?.message || 'refusée'}
            </span>
            <button
              type="button"
              onClick={() => { void purgerEchecSync(l.id); }}
              style={{ background: 'none', border: 'none', color: '#AE3A38', textDecoration: 'underline', cursor: 'pointer' }}
            >
              Retirer
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
