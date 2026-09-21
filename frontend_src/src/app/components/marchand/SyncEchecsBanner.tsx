// Bandeaux de la FILE HORS-LIGNE, dans la colonne que la maquette leur réserve.
//
// Deux nouvelles y vivent, et c'est volontaire qu'elles soient au même endroit :
//   • les rejets DÉFINITIFS (4xx sortis de la file au rejeu). Rendre visible est
//     OBLIGATOIRE : sans lui, une vente refusée disparaîtrait silencieusement ;
//   • les ventes GARDÉES QUI VIENNENT DE PARTIR (OFF-02). La marchande a été
//     prévenue que sa vente attendait (OFF-01) ; il faut lui dire quand elle
//     part. C'est la même file, le même moment, la même colonne — inventer une
//     seconde surface pour la bonne nouvelle aurait fait deux endroits à
//     regarder pour un seul sujet.
//
// LE NOM DU FICHIER EST DÉSORMAIS PLUS ÉTROIT QUE SON CONTENU. Il n'est pas
// renommé ici, et pas par pudeur : ce fichier appartient au périmètre d'argent
// gelé, un renommage l'en ferait sortir et entrer sous un autre nom dans le
// même diff qu'une correction d'argent — exactement ce que le garde refuse.
// À renommer dans un lot d'outillage, seul.
//
// Composant additif, sans aucune logique de caisse : il ne lit que le contexte.
import { useCaisse } from '../../contexts/CaisseContext';

export function SyncEchecsBanner() {
  const { syncEchecs, syncLettresMortes, purgerEchecSync, ventesSynchronisees, accuserVentesSynchronisees } = useCaisse();
  // Rien à dire : on ne laisse pas un bandeau permanent occuper le premier écran.
  if (syncEchecs <= 0 && !ventesSynchronisees) return null;
  const pluriel = syncEchecs > 1 ? 's' : '';
  const parties = ventesSynchronisees?.ventes ?? 0;
  const restantes = ventesSynchronisees?.restantes ?? 0;
  return (
    // La marge vit sur l'EMPILEMENT, pas sur le bandeau : c'est la colonne que
    // la maquette prévoit pour les bandeaux de file (parties, puis refusés).
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '8px 0' }}>
    {ventesSynchronisees ? (
      // `status` et non `alert` : une bonne nouvelle ne coupe pas la parole à
      // un lecteur d'écran au milieu d'un encaissement.
      <div
        role="status"
        style={{
          background: '#E3F1E6', color: '#1E6B35', border: '1px solid #1E6B35',
          borderRadius: 10, padding: '10px 14px', fontSize: 14,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
        }}
      >
        <span>
          <strong>
            {parties === 1 ? 'Ta vente est partie' : `${parties} ventes sont parties`}
          </strong>{' '}
          {/* JAMAIS « tout est parti » : tant qu'il reste des ventes en file,
              le bandeau le dit — c'est de l'argent encore en route. */}
          — {restantes > 0
            ? `il en reste ${restantes} à envoyer`
            : (parties === 1 ? 'le serveur l’a reçue' : 'le serveur les a reçues')}.
        </span>
        {/* 44 px de haut : la charte tactile vaut aussi pour ce qui fait
            disparaître une information d'argent. */}
        <button
          type="button"
          onClick={() => accuserVentesSynchronisees()}
          style={{ minHeight: 44, padding: '0 8px', flexShrink: 0, background: 'none', border: 'none', color: '#1E6B35', textDecoration: 'underline', cursor: 'pointer' }}
        >
          J’ai vu
        </button>
      </div>
    ) : null}
    {syncEchecs > 0 ? (
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
    ) : null}
    </div>
  );
}
