/**
 * BO-1 — XSS stocké sur la carte des acteurs (audit écosystème 10/2026,
 * `BOCarteActeurs.tsx:133`, sonde bo-a §BOCarteActeurs).
 *
 * LE DÉFAUT. La popup Leaflet recevait une CHAÎNE HTML où `acteur_nom`,
 * `commune`, `region`, `statut`, `type_acteur` et `id` étaient interpolés sans
 * échappement. Leaflet fait `innerHTML = content`. `acteur_nom` est écrit par
 * tout compte via `POST /identifications/draft` : un marchand pouvait donc
 * exécuter du script dans la session d'un administrateur du back-office.
 *
 * LA RÈGLE. La popup est construite en nœuds DOM, chaque valeur passe par
 * `textContent`, le bouton « Voir la fiche » est branché par écouteur (plus de
 * `onclick` en ligne, plus de `window.__selectActeur`).
 *
 * Lancer : npm run test:carte-xss   (tsx + jsdom)
 */
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { construirePopupActeur } from './carte-popup.js';

let echecs = 0;
const ok = (cond: boolean, label: string) => {
  if (cond) console.log('  ✅', label);
  else { console.log('  ❌', label); echecs++; }
};

const CHARGE = `<img src=x onerror="window.__pwned=1">`;
const ID_PIEGE = `x');window.__pwned=2;('`;

console.log('\n[1] Une valeur hostile reste du texte');
{
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' });
  const doc = dom.window.document;
  let ouvert: string | null = null;
  const el = construirePopupActeur(doc, {
    id: ID_PIEGE,
    acteur_nom: CHARGE,
    type_acteur: `<b>marchand</b>`,
    commune: `<script>window.__pwned=3</script>`,
    region: null,
    statut: `<svg onload="window.__pwned=4">`,
  }, '#123456', (id) => { ouvert = id; });
  doc.body.appendChild(el);

  ok(el.querySelectorAll('img, script, svg, b').length === 0, 'aucun élément injecté (img, script, svg, b)');
  ok(el.textContent!.includes(CHARGE), 'le nom hostile est affiché tel quel, comme texte');
  const attributsOn = [el, ...el.querySelectorAll('*')]
    .flatMap((n) => [...n.attributes].map((a) => a.name))
    .filter((nom) => nom.startsWith('on'));
  ok(attributsOn.length === 0, 'aucun attribut on* (onerror, onclick, onload…) sur aucun élément');
  ok((dom.window as any).__pwned === undefined, 'aucun script exécuté');

  const bouton = el.querySelector('button');
  ok(!!bouton, 'le bouton « Voir la fiche » existe');
  bouton?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  ok(ouvert === ID_PIEGE, 'le clic transmet l’identifiant exact, sans l’interpréter');
  ok((dom.window as any).__pwned === undefined, 'toujours aucun script exécuté après le clic');
}

console.log('\n[2] Valeurs absentes : libellés par défaut');
{
  const doc = new JSDOM('<!doctype html><body></body>').window.document;
  const el = construirePopupActeur(doc, { id: 'a1', type_acteur: 'producteur' }, '#000', () => undefined);
  ok(el.textContent!.includes('Acteur'), 'nom absent → « Acteur »');
  ok(el.textContent!.includes('Actif'), 'statut absent → « Actif »');
}

console.log('\n[3] L’écran n’interpole plus de HTML dans la popup');
{
  const src = readFileSync(new URL('./BOCarteActeurs.tsx', import.meta.url), 'utf8');
  ok(!/bindPopup\(\s*`/.test(src), 'bindPopup ne reçoit plus de gabarit HTML');
  ok(!src.includes('__selectActeur'), 'plus de fonction globale window.__selectActeur');
  ok(/bindPopup\(\s*construirePopupActeur\(/.test(src), 'bindPopup reçoit le nœud construit par construirePopupActeur');
}

console.log(echecs ? `\n❌ ${echecs} échec(s)` : '\n✅ carte des acteurs : pas d’injection HTML');
process.exit(echecs ? 1 : 0);
