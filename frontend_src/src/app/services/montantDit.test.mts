/**
 * ELLE DIT SON PRIX — VOX-03.
 *
 * LE DÉFAUT, constat de Patrick sur le terrain le 24/09 : « 2 tas de gombos »
 * → l'application demande le prix, « mais avec une interface pour saisir — si
 * je ne sais pas lire ? ».
 *
 * MESURE : `SaisieGuidee.tsx` contenait ZÉRO occurrence de `Mic`. Un pavé de
 * chiffres, un champ texte, et rien pour parler. C'est l'écran du PRIX, donc
 * de l'argent, chez précisément la personne pour qui JULABA existe.
 *
 * ET J'AVAIS AJOUTÉ UN MICRO DÉCORATIF (`AjoutProduitGuide.tsx:111`, écrit la
 * veille) : une icône `aria-hidden` dans un paragraphe, non cliquable, sous
 * le texte « ou dis-le à Tantie ». Une image qui promet la voix sans la
 * donner. Un écran muet est mauvais ; un écran qui MENT sur ce qu'il sait
 * faire est pire.
 *
 * CE MODULE NE FAIT QU'UNE CHOSE : lire un montant dans ce qu'elle a dit. Il
 * ne décide ni de l'unité, ni de la quantité, ni de la vente.
 *
 * ET IL NE DEVINE JAMAIS. Sans nombre clair, il rend `null` — le champ reste
 * vide et elle redit. C'est STK-02 : le prix vient d'elle, ou il n'existe pas.
 *
 * Lancer : npm run test:montant-dit
 */
import { readFileSync } from 'node:fs';
import { montantDit } from './montantDit.js';

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};

console.log('\nElle dit son prix, et on ne devine jamais\n');

console.log('[1] CE QU\'ELLE DIT VRAIMENT À L\'ÉCRAN DU PRIX');
{
  ok(montantDit('mille cinq cents') === 1500, '« mille cinq cents » → 1500');
  ok(montantDit('1500') === 1500, '« 1500 » → 1500');
  ok(montantDit('1500 francs') === 1500, '« 1500 francs » → 1500');
  ok(montantDit('mille cinq cents francs') === 1500, 'en toutes lettres avec la devise');
  ok(montantDit('deux mille') === 2000, '« deux mille » → 2000');
  ok(montantDit('cinq cents') === 500, '« cinq cents » → 500');
}

console.log('\n[2] ELLE RÉPOND À LA QUESTION, PAS EN CHIFFRES SECS');
{
  // Tantie demande « le tas, à combien ? ». On répond comme on parle.
  ok(montantDit('c\'est 1500') === 1500, '« c\'est 1500 »');
  ok(montantDit('à mille cinq cents') === 1500, '« à mille cinq cents »');
  ok(montantDit('je le vends 1500') === 1500, '« je le vends 1500 »');
  ok(montantDit('mille cinq cents le tas') === 1500, 'avec l\'unité derrière');
}

console.log('\n[3] SANS NOMBRE CLAIR, RIEN — ET LE CHAMP RESTE VIDE');
{
  for (const t of ['', '   ', 'euh', 'je ne sais pas', 'attends']) {
    ok(montantDit(t) === null, `${JSON.stringify(t)} → null, on ne remplit pas à sa place`);
  }
  // Zéro n'est pas un prix : il entrerait en caisse et fausserait chaque vente.
  ok(montantDit('zéro') === null, '« zéro » n\'est pas un prix');
  ok(montantDit('0') === null, '« 0 » non plus');
}

console.log('\n[4] LA RÈGLE, ÉNONCÉE COMME TELLE');
{
  // Un montant lu doit toujours être un nombre fini, strictement positif.
  const echantillons = ['1500', 'mille cinq cents', 'c\'est 2000 francs', 'bonjour', '', 'zéro'];
  const sorties = echantillons.map(montantDit);
  ok(sorties.every(v => v === null || (Number.isFinite(v) && v > 0)),
     'toute sortie est soit un vrai prix, soit rien — jamais un entre-deux');
}

console.log('\n[5] LES DEUX ÉCRANS DU PRIX LAISSENT PARLER — ET AUCUN NE FAIT SEMBLANT');
{
  const lire = (f: string) => readFileSync(new URL(`../components/marchand/${f}`, import.meta.url), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '').split('\n')
    .filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');

  for (const f of ['SaisieGuidee.tsx', 'AjoutProduitGuide.tsx']) {
    const code = lire(f);
    ok(/<BoutonDirePrix[\s/>]/.test(code), `${f} : elle peut DIRE son prix`);
    // Bornée à l'ÉLÉMENT : `ouvrirToutSeul` trouvé n'importe où dans le
    // fichier ne prouverait rien — c'est le piège qui a déjà donné six verts
    // pour la mauvaise raison cette session.
    ok(/<BoutonDirePrix[^>]*\souvrirToutSeul[\s/>]/.test(code), `${f} : et le micro s'ouvre tout seul (arbitrage de Patrick)`);
    // LE CLAVIER RESTE. La voix est le geste par défaut, pas le seul : qui
    // préfère taper doit pouvoir taper.
    ok(/CHIFFRES/.test(code), `${f} : le clavier reste disponible, en second`);
  }

  // CE QUE CE GARDE INTERDIT VRAIMENT : un micro qui fait semblant.
  // `AjoutProduitGuide` en portait un — icône `aria-hidden` dans un <p>, sous
  // « ou dis-le à Tantie », non cliquable. Un écran muet est mauvais ; un
  // écran qui MENT sur ce qu'il sait faire est pire.
  for (const f of ['SaisieGuidee.tsx', 'AjoutProduitGuide.tsx']) {
    const code = lire(f);
    ok(!/<Mic[^>]*aria-hidden/.test(code),
       `${f} : aucune icône de micro décorative — on ne promet pas la voix sans la donner`);
  }

  // Et le composant qui écoute passe bien par la règle pure : un second
  // lecteur de montants, ce serait deux vérités sur un prix.
  const bouton = lire('BoutonDirePrix.tsx');
  ok(/montantDit\(/.test(bouton), 'le micro lit le montant par la règle, pas à sa façon');
  // ET PAS DEUX LECTEURS. Un `parseInt` glissé à côté, et « mille cinq cents »
  // vaudrait 1500 ici et rien là : deux sens pour la même donnée, sur un prix.
  ok(!/parseInt|parseFloat|Number\(/.test(bouton),
     'et personne d\'autre ne relit un montant dans ce fichier');
  ok(/startLiveDictation\(/.test(bouton), 'et réutilise la dictée existante, sans en réécrire une');
}

console.log(echecs === 0
  ? '\n✅ Elle dit son prix, ou le champ reste vide.\n'
  : `\n❌ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
