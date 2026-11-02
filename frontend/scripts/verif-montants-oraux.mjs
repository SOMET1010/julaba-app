#!/usr/bin/env node
/**
 * GARDE : LES MONTANTS DITS NE SONT JAMAIS DES CHIFFRES — rang 4
 * (LOT-PROUVE-APPAREIL, P1-3, audit voice-first 29/10).
 *
 * LE DÉFAUT QU'ON EMPÊCHE DE REVENIR. Neuf écrans parlaient leurs montants
 * par `toLocaleString()` : « Tu as gagné 3 000 francs ». Or la synthèse
 * locale (et pire, `speechSynthesis` dans la WebView Android) peut ÉPELLER
 * ce qui lui arrive formaté : « trois zéro zéro zéro francs » — le défaut
 * exact qui a fait naître `deuxFormes.ts` (voir son en-tête). Le chemin
 * structuré (catalogue i18n → `interpolerParle` → `formeParlee`) est propre ;
 * la dette vivait dans les composants qui parlent EN DIRECT, hors catalogue.
 *
 * LA RÈGLE, EN CLAIR : une ligne qui ARRIVE À UNE BOUCHE ne formate pas un
 * nombre à l'écran. Tout montant (ou quantité) destiné à `speak` /
 * `speakAuto` / `speakClipOrText` / `speakFn` / `dire` / `parle` / une
 * `phraseVoix` passe par `nombreEnMotsFr` (i18n/voice/argent/deuxFormes).
 *
 * CE QUE LA GARDE NE DIT PAS : que les gabarits écrits (aria-label, affichage
 * `3 000 F`) sont faux — ils sont BONS pour l'œil, c'est `formeEcran`. Elle
 * ne couvre pas non plus les gabarits du catalogue i18n (ils sont déjà
 * gardés par `test:i18n-empreintes-argent`) ni les toasts/notifications
 * écrites (jamais dites). Multi-ligne qui esquiverait : possible en théorie,
 * mais le défaut courant (l'interpolation dans l'appel) devient BRUYANT —
 * même philosophie que test-coffre-web.
 *
 * Lancer : npm run test:montants-oraux
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..', 'src');

const BOUCHES = /(?:\bspeak\s*\(|\bspeakAuto\s*\(|\bspeakClipOrText\s*\(|\bspeakFn\b|\bdire\s*\(|\bparle\s*\(|phraseVoix\b)/;
const FORMATAGE_ECRAN = /\.toLocaleString\s*\(/;

let echecs = 0;
const verifier = (ok, quoi, pourquoi) => {
  if (ok) { console.log(`  ✓ ${quoi}`); return; }
  echecs++;
  console.log(`  ✗ ${quoi}`);
  if (pourquoi) console.log(`      ${pourquoi}`);
};

function fichiers(dir) {
  const sorties = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) sorties.push(...fichiers(p));
    else if (/\.(tsx?|mts)$/.test(e)) sorties.push(p);
  }
  return sorties;
}

const cibles = fichiers(RACINE)
  .map((p) => p.replace(RACINE + '/', ''))
  // Les modules d'argent DÉFINISSENT les outils (nombreEnMotsFr s'y raconte) ;
  // leurs tests citent les défauts qu'on ferme. Les deux ne parlent pas.
  .filter((rel) => !rel.startsWith('i18n/voice/argent/'));

const fautifs = [];
for (const rel of cibles) {
  const src = readFileSync(join(RACINE, rel), 'utf8');
  const lignes = src.split('\n');
  for (let i = 0; i < lignes.length; i++) {
    const brute = lignes[i];
    const ligne = brute.replace(/(^|[^:])\/\/.*$/, '$1').replace(/\/\*[\s\S]*?\*\//g, '');
    if (BOUCHES.test(ligne) && FORMATAGE_ECRAN.test(ligne)) {
      fautifs.push(`${rel}:${i + 1}`);
    }
  }
}

console.log('\nLes montants dits ne sont jamais des chiffres (rang 4)');
verifier(cibles.length > 100, `source balayée (${cibles.length} fichiers)`,
  'un balayage vide rendrait la garde muette.');
verifier(fautifs.length === 0,
  fautifs.length === 0 ? 'aucun montant formaté arrive à une bouche' : `montants formatés dits à voix haute (${fautifs.join(' ; ')})`,
  "passe par nombreEnMotsFr (i18n/voice/argent/deuxFormes) : « trois mille francs », pas « 3 000 » épelé par la synthèse.");

if (echecs > 0) { console.log('\n✗ montants oraux — échec'); process.exit(1); }
console.log('✓ montants oraux — tout ce qui se dit est en lettres (rang 4, LOT-PROUVE-APPAREIL)');
