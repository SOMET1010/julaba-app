/**
 * LA CAISSE TUTOIE, ET N'AFFIRME PAS « AUCUN » SANS SAVOIR — CAI-01 / CAI-02.
 *
 * Banc terrain, écran 5 : « ZÉRO QUI MENT · vouvoie ». Le seul écran du
 * parcours de vente qui parlait à la marchande comme une inconnue polie — et
 * qui le faisait AUSSI à voix haute, puisque le grand titre était dit au
 * montage.
 *
 * Deux faits qu'il faut relire ensemble : le catalogue vocal (fr-ci) ne porte
 * AUCUN vouvoiement, et celui-ci n'y était pas arrivé par hasard — la phrase
 * vivait en double, à l'écran en dur et dans le catalogue.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = dirname(fileURLToPath(import.meta.url));
const lire = (f: string) => readFileSync(resolve(ici, f), 'utf-8');
/** Les commentaires CITENT le défaut d'avant : les juger rendrait le code muet. */
const sansCommentaires = (src: string) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};

const RE_VOUVOIEMENT = /\b(vous|votre|vos)\b|-vous\b/i;

console.log('\nLa caisse parle à Tantie, pas à une inconnue\n');

console.log('[1] Plus un seul vouvoiement sur les trois fichiers montés');
for (const f of ['POSCaisse.tsx', 'MicroVenteCaisse.tsx', 'ChoixUnite.tsx']) {
  const code = sansCommentaires(lire(f));
  const fautifs = code.split('\n').filter(l => RE_VOUVOIEMENT.test(l)).map(l => l.trim().slice(0, 70));
  ok(fautifs.length === 0, `${f} : ${fautifs.length ? fautifs.join(' | ') : 'aucun'}`);
}

console.log('\n[2] La question de l\'écran a UNE seule source');
{
  const code = sansCommentaires(lire('MicroVenteCaisse.tsx'));
  ok(/<h1\b[\s\S]{0,400}?t\('TATA_QUE_VENDRE'\)/.test(code),
     'le H1 lit la clé de catalogue — celle-là même qui est dite au montage');
  ok(!/'Que veux-tu vendre \?'/.test(code),
     'et la phrase n\'est recopiée nulle part : deux copies finissent toujours par diverger');
}

console.log('\n[3] Le catalogue vocal, lui, n\'a jamais vouvoyé — et toujours pas');
{
  const cat = readFileSync(resolve(ici, '..', '..', 'i18n', 'voice', 'catalog.ts'), 'utf-8');
  const m = cat.match(/id: 'TATA_QUE_VENDRE'[^\n]*?frActuel: '([^']*)'/);
  ok(!!m, 'la clé TATA_QUE_VENDRE existe');
  ok(!!m && !RE_VOUVOIEMENT.test(m[1]), `elle tutoie : « ${m?.[1]} »`);
}

console.log('\n[4] « Aucun produit » n\'est dit que lorsque le serveur l\'a répondu');
{
  const code = sansCommentaires(lire('POSCaisse.tsx'));
  ok(/etatCatalogue\.type === 'illisible'/.test(code),
     'l\'écran distingue « je n\'ai pas pu lire » de « tu n\'as rien »');
  ok(/etatCatalogue\.type === 'attente'/.test(code),
     'et « je vais chercher » de l\'un comme de l\'autre');
  {
    // Le point dur : « Aucun produit » doit être la branche PAR DÉFAUT d'un
    // choix, jamais la phrase unique d'un état vide. S'il repassait en tête,
    // le mensonge reviendrait sans qu'aucune autre assertion ne bouge.
    const i = code.indexOf('Aucun produit');
    const avant = i >= 0 ? code.slice(Math.max(0, i - 700), i) : '';
    ok(i >= 0 && /etatCatalogue\.type === 'illisible'/.test(avant),
       '« Aucun produit » vient APRÈS le tri des situations, jamais avant');
  }
}

console.log(echecs === 0
  ? '\n✅ La caisse tutoie, et ne dit « aucun » que lorsqu\'elle le sait.\n'
  : `\n❌ ${echecs} garde(s) tombée(s).\n`);
process.exit(echecs === 0 ? 0 : 1);
