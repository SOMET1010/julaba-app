/**
 * L'ÉCHEC DU MICRO SE DIT, IL NE S'AFFICHE PAS SEULEMENT — STK-22.
 * Lancer : npm run test:bouton-dire-produit
 *
 * LE DÉFAUT QU'ON FERME. « Ajouter en parlant » est LA voie principale d'une
 * marchande qui ne lit pas. Quand le micro ne répond pas, l'écran affichait
 * « Le micro ne répond pas. Touche "Ajouter un produit". » — et se taisait.
 *
 * L'échec du seul chemin qu'elle sait emprunter lui était donc annoncé par le
 * seul canal qu'elle ne peut pas lire. Elle appuie, rien ne se passe, rien ne
 * le lui dit : aucune raison de deviner qu'il faut toucher l'autre bouton.
 *
 * Retour terrain du 26/09, sur Render : « le micro n'entend pas le nom du
 * produit » et « elle ne parle pas à toutes les étapes ». En voici une.
 *
 * ET UNE SEULE SOURCE POUR CE REFUS. Le texte affiché et le texte dit sont la
 * même constante. Deux littéraux auraient fini par diverger — on aurait lu une
 * chose et entendu l'autre, ce qui est pire que le silence.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const brut = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'BoutonDireProduit.tsx'), 'utf8');

/**
 * On juge le CODE, pas ce qu'on en raconte. Sans ce filtre, le commentaire qui
 * explique le défaut (« Cet écran affichait "Le micro ne répond pas" ») passait
 * pour un second littéral et faisait échouer la garde. Un test qui accuse un
 * commentaire apprend à ignorer ses propres alertes.
 */
const src = brut
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n').map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');

let failures = 0;
const ok = (c: boolean, label: string, detail = '') => {
  if (c) console.log('  ✅', label);
  else { console.log('  ❌', label, detail ? `\n     ${detail}` : ''); failures++; }
};

console.log('\n[1] le refus du micro est DIT, pas seulement affiché');
ok(/dire\?\.\(MICRO_INDISPONIBLE\)/.test(src),
   'la branche d\'échec appelle `dire` avec le message',
   'sans ça, l\'écran se tait au moment précis où elle a besoin qu\'on lui parle');

console.log('\n[2] une seule source : l\'écran et la voix ne peuvent pas diverger');
ok(/const MICRO_INDISPONIBLE = /.test(src), 'le message est une constante nommée');
ok((src.match(/MICRO_INDISPONIBLE/g) || []).length >= 3,
   'elle sert à la fois au texte affiché et au texte dit');
ok(!/Le micro ne répond pas/.test(src.replace(/const MICRO_INDISPONIBLE = [^;]+;/, '')),
   'et le message n\'est écrit en dur nulle part ailleurs dans le CODE');

console.log('\n[3] le message dit le GESTE, pas seulement la panne');
const m = /const MICRO_INDISPONIBLE = '([^']*)'/.exec(src);
ok(!!m, 'message trouvé');
ok(!!m && /touche|appuie/i.test(m[1]),
   'il nomme ce qu\'elle doit faire ensuite',
   m ? `message : « ${m[1]} »` : '');

console.log('\n[4] rien compris ≠ micro en panne — deux refus, deux phrases');
ok(/n'ai pas entendu de produit/.test(src),
   'le cas « j\'ai écouté mais je n\'ai rien reconnu » garde sa propre phrase',
   'les confondre enverrait toucher un bouton alors qu\'il suffisait de répéter');

console.log(failures === 0
  ? '\nLe micro qui lâche ne lâche plus en silence ✅\n'
  : `\n${failures} échec(s).\n`);
process.exit(failures === 0 ? 0 : 1);
