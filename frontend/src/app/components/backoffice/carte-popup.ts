// BO-1 — Popup de la carte des acteurs, SANS HTML interpolé.
//
// Avant : une chaîne HTML où `acteur_nom` (écrit par tout compte via
// `POST /identifications/draft`), `commune`, `statut`, `type_acteur` et `id`
// étaient interpolés tels quels, puis rendus par Leaflet en `innerHTML` : XSS
// stocké dans la session d'un administrateur (audit écosystème 10/2026).
//
// Ici, chaque valeur passe par `textContent` et le bouton est branché par
// écouteur : aucune donnée n'est jamais interprétée comme du HTML ou du JS.
// `color` vient d'une table locale (COLORS / BO_PRIMARY), jamais du serveur.

export interface PointCarte {
  id: string;
  acteur_nom?: string | null;
  type_acteur?: string | null;
  commune?: string | null;
  region?: string | null;
  statut?: string | null;
}

export function construirePopupActeur(
  doc: Document,
  p: PointCarte,
  color: string,
  onVoir: (id: string) => void,
): HTMLElement {
  const bloc = (tag: string, style: string, texte: string) => {
    const el = doc.createElement(tag);
    el.setAttribute('style', style);
    el.textContent = texte;
    return el;
  };

  const racine = doc.createElement('div');
  racine.setAttribute('style', 'padding:12px 14px;min-width:180px;font-family:system-ui,sans-serif');
  racine.appendChild(bloc('div', 'font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px', String(p.type_acteur ?? '')));
  (racine.lastChild as HTMLElement).style.color = color;
  racine.appendChild(bloc('div', 'font-size:14px;font-weight:800;color:#1a1a1a;margin-bottom:2px', String(p.acteur_nom || 'Acteur')));
  racine.appendChild(bloc('div', 'font-size:11px;color:#888;margin-bottom:8px', String(p.commune || p.region || '')));

  const ligne = doc.createElement('div');
  ligne.setAttribute('style', 'display:flex;gap:6px;align-items:center');
  ligne.appendChild(bloc('span', 'display:inline-block;font-size:10px;font-weight:700;border-radius:20px;padding:2px 8px;background:#DCFCE7;color:#16a34a', String(p.statut || 'Actif')));

  const bouton = bloc('button', 'font-size:10px;font-weight:700;background:none;border-radius:8px;padding:2px 8px;cursor:pointer', 'Voir la fiche');
  bouton.setAttribute('type', 'button');
  bouton.style.color = color;
  bouton.style.border = `1px solid ${color}`;
  bouton.addEventListener('click', () => onVoir(p.id));
  ligne.appendChild(bouton);

  racine.appendChild(ligne);
  return racine;
}
