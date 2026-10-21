/**
 * Studio v1 — validation par paires (backlog V5), squelette.
 *
 * Écoute un clip de la file locale, vote 👍/👎. Règle Common Voice reprise
 * dans le doc de design : 2 votes positifs = validé, 2 négatifs = rejeté. La
 * validation ne demande AUCUNE lecture (écoute + geste).
 *
 * ⚠️ Portée de ce lot : la file est LOCALE À CET APPAREIL (pas de synchro
 * multi-appareils). Un vrai second regard multi-personnes suppose le point de
 * synchro à concevoir séparément — ici, la mécanique du vote et son verrou
 * 2-votes sont réels et testés (services/collecteVoixDB.ts).
 */
import { useEffect, useState } from 'react';
import { defaultCollecteStore, type ClipCollecte } from '../services/collecteVoixDB';

export default function ValidationCollecte() {
  const [clips, setClips] = useState<ClipCollecte[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});

  const recharger = async () => {
    const liste = await defaultCollecteStore().list();
    setClips(liste);
    setUrls((anciennes) => {
      const nouvelles: Record<string, string> = {};
      for (const c of liste) nouvelles[c.clip_id] = anciennes[c.clip_id] ?? URL.createObjectURL(c.audio);
      // Libère les ObjectURL des clips qui ont disparu (votés/supprimés).
      for (const [id, url] of Object.entries(anciennes)) if (!nouvelles[id]) URL.revokeObjectURL(url);
      return nouvelles;
    });
  };

  useEffect(() => {
    void recharger();
    return () => { for (const url of Object.values(urls)) URL.revokeObjectURL(url); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const voter = async (id: string, positif: boolean) => {
    await defaultCollecteStore().voter(id, positif);
    await recharger();
  };

  const enAttente = clips.filter((c) => c.statut === 'pending');
  const tranchees = clips.filter((c) => c.statut !== 'pending');

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 96px', fontFamily: 'inherit' }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Validation des clips</h1>
      <p style={{ color: '#555', fontSize: 14, marginTop: 0 }}>
        Écoute, puis 👍 ou 👎. Deux votes du même sens tranchent.
      </p>

      {enAttente.length === 0 && <p style={{ color: '#8A5A34' }}>Rien à valider pour l'instant.</p>}

      {enAttente.map((c) => (
        <article key={c.clip_id} data-clip={c.clip_id}
          style={{ border: '1px solid #ddd', borderRadius: 10, padding: '12px 14px', marginTop: 12, background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8A5A34', fontWeight: 700 }}>
            <span>{c.prompt_id}</span>
            <span>{c.duree_s.toFixed(1)} s</span>
          </div>
          <audio controls src={urls[c.clip_id]} style={{ width: '100%', marginTop: 8 }} />
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button onClick={() => void voter(c.clip_id, true)}
              style={{ flex: 1, minHeight: 48, borderRadius: 10, border: 'none', background: '#e3efe6', color: '#1e6b40', fontSize: 22, cursor: 'pointer' }}>
              👍 {c.votes_up > 0 ? `(${c.votes_up})` : ''}
            </button>
            <button onClick={() => void voter(c.clip_id, false)}
              style={{ flex: 1, minHeight: 48, borderRadius: 10, border: 'none', background: '#fbe4e0', color: '#a52f22', fontSize: 22, cursor: 'pointer' }}>
              👎 {c.votes_down > 0 ? `(${c.votes_down})` : ''}
            </button>
          </div>
        </article>
      ))}

      {tranchees.length > 0 && (
        <>
          <h2 style={{ fontSize: 15, marginTop: 28, color: '#8A5A34' }}>Déjà tranchés ({tranchees.length})</h2>
          {tranchees.map((c) => (
            <div key={c.clip_id} style={{ fontSize: 13, padding: '6px 0', color: c.statut === 'validated' ? '#1e6b40' : '#a52f22' }}>
              {c.prompt_id} — {c.statut === 'validated' ? '✓ validé' : '✗ rejeté'}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
