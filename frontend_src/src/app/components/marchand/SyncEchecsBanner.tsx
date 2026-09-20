// Bandeau de surfaçage des rejets DÉFINITIFS de la file hors-ligne (4xx sortis
// de la file au rejeu). Rendre visible est OBLIGATOIRE : sans lui, une vente
// refusée disparaîtrait silencieusement. Composant additif, sans logique caisse.
import { useCaisse } from '../../contexts/CaisseContext';
import { useApp } from '../../contexts/AppContext';
import { Volume2 } from 'lucide-react';

export function SyncEchecsBanner() {
  const { syncEnAttente, syncOperationsEnAttente, syncEchecs, syncLettresMortes, purgerEchecSync } = useCaisse();
  const { speak } = useApp();
  if (syncEnAttente <= 0 && syncEchecs <= 0) return null;
  const pluriel = syncEchecs > 1 ? 's' : '';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '8px 0' }}>
      {syncEnAttente > 0 && (
        <div role="status" style={{
          background: '#FFF4D6', color: '#6B4A00', border: '1px solid #D6A93B',
          borderRadius: 12, padding: '11px 12px', fontSize: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <strong style={{ flex: 1 }}>
              {syncEnAttente} opération{syncEnAttente > 1 ? 's' : ''} gardée{syncEnAttente > 1 ? 's' : ''} sur ce téléphone
            </strong>
            <button type="button"
              aria-label="Écouter l'état des opérations en attente"
              onClick={() => { void speak(`${syncEnAttente} opération${syncEnAttente > 1 ? 's' : ''} gardée${syncEnAttente > 1 ? 's' : ''} sur ce téléphone. Pas encore envoyée${syncEnAttente > 1 ? 's' : ''}.`); }}
              style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid #D6A93B', background: '#fff', color: '#6B4A00', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <Volume2 size={22} />
            </button>
          </div>
          <div style={{ marginTop: 5 }}>Jùlaba réessaiera quand le réseau sera stable.</div>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {syncOperationsEnAttente.slice(0, 3).map((op) => (
              <li key={op.id}>
                {op.endpoint === '/caisse/vente' ? 'Vente' : 'Dépense'} · {Math.round(Number(op.payload.montant || 0)).toLocaleString('fr-FR')} F
              </li>
            ))}
          </ul>
        </div>
      )}
      {syncEchecs > 0 && (
      <div role="alert" style={{
        background: '#F6E2DF', color: '#AE3A38', border: '1px solid #AE3A38',
        borderRadius: 10, padding: '10px 14px', fontSize: 14,
      }}>
      <strong>
        {syncEchecs} opération{pluriel} à vérifier
      </strong>
      <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
        {syncLettresMortes.slice(0, 5).map((l) => {
          const refusee = l.echec?.cause === 'rejet_metier'
            || (!l.echec?.cause && !!l.echec?.status && l.echec.status >= 400 && l.echec.status < 500);
          return (
          <li key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span>{l.endpoint === '/caisse/vente' ? 'Vente' : 'Dépense'} — {refusee ? 'refusée par le serveur' : 'envoi non terminé'}</span>
            <button
              type="button"
              onClick={() => { void purgerEchecSync(l.id); }}
              style={{ minHeight: 44, padding: '0 8px', background: 'none', border: 'none', color: '#AE3A38', textDecoration: 'underline', cursor: 'pointer' }}
            >
              Retirer
            </button>
          </li>
        );})}
      </ul>
      </div>
      )}
    </div>
  );
}
