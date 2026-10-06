/**
 * UN GESTE, UN SEUL NOM — CAI-08, puis CAI-10 + CAI-11.
 *
 * LE DÉFAUT, dans les mots de Patrick : « "Choisir à l'écran" ? j'ai mis deux
 * heures à comprendre ce que ça voulait dire ». Il a écrit l'application.
 *
 * CE QUE « CHOISIR » NE DIT PAS. Le verbe ne nomme aucun geste : on choisit
 * avec la tête, pas avec la main. Et « à l'écran » ne distingue rien — tout est
 * à l'écran, la voix aussi part d'un bouton à l'écran. Le bouton disait donc
 * « fais une opération mentale quelque part sur cette surface ».
 *
 * PIRE : LE MÊME GESTE AVAIT DEUX LANGUES. L'accueil annonce la caisse par
 * « Parler ou toucher les produits ». La caisse, une fois ouverte, proposait
 * « Choisir à l'écran ». Une marchande qui ne lit pas se fait lire l'accueil,
 * retient « toucher les produits », et ne le retrouve nulle part. C'est la
 * faute que ce dépôt combat partout : la même chose sous deux noms.
 *
 * ARBITRAGE DE PATRICK, 22/09/2026 : « TOUCHER LES PRODUITS ».
 *
 * CE QUE LE 23/09 A AJOUTÉ — LE MÊME DÉFAUT, DEUX ÉTAGES PLUS BAS.
 * Fermer CAI-08 avait nommé deux dettes voisines, et elles disaient la même
 * chose que lui :
 *
 *   CAI-10 — l'ICÔNE du bouton restait un CLAVIER pendant que sa phrase
 *   disait « Toucher les produits » et qu'il ouvre une grille de photos. Pour
 *   une marchande qui ne lit pas, l'icône EST le message : elle disait
 *   « écrire » là où la phrase disait « toucher ». Un troisième nom, muet.
 *
 *   CAI-11 — le PANNEAU que ce bouton ouvre s'intitulait « SAISIR SANS
 *   PARLER ». Troisième nom pour le même geste, et « saisir » n'est pas plus
 *   un geste de la main que « choisir » : on saisit au clavier. Et se définir
 *   par ce qu'on ne fait pas (« sans parler ») ne dit toujours pas quoi faire.
 *
 * ARBITRAGE DE PATRICK, 23/09/2026 : « Même geste partout : Toucher les
 * produits. » Un geste, un nom — dans les mots, dans le titre, dans l'icône.
 *
 * CE QUE CE TEST VÉRIFIE, ET POURQUOI IL NE FIGE PAS UNE PHRASE. Geler le
 * littéral obligerait à desserrer la garde à la première reformulation — c'est
 * exactement ce qui est arrivé au H1 de la caisse le 21/09. On vérifie la
 * RÈGLE : les deux écrans nomment le geste avec les mêmes mots, et le verbe
 * qu'ils emploient est un geste de la main.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = dirname(fileURLToPath(import.meta.url));
let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};
const source = (...p: string[]) => readFileSync(resolve(ici, '..', ...p), 'utf-8');

const CAISSE = source('components', 'marchand', 'MicroVenteCaisse.tsx');
const ACCUEIL = source('components', 'marchand', 'MarchandAccueilVoice.tsx');

/** Sans les commentaires : un mot écrit dans une explication n'est pas à l'écran. */
const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');

const caisse = sansCommentaires(CAISSE);
const accueil = sansCommentaires(ACCUEIL);

/** Les mots du geste tactile, quelle que soit la casse et l'apostrophe. */
const nommeLeGeste = (s: string) => /touche[rz]?\s+(les|tes)\s+produits/i.test(s);

console.log('\nLe geste de la main a UN nom, et c\'est le même partout\n');

console.log('[1] LES DEUX ÉCRANS NOMMENT LE GESTE DE LA MÊME FAÇON');
ok(nommeLeGeste(accueil),
   'l\'accueil annonce la caisse par « toucher les produits » (il le faisait déjà)');
ok(nommeLeGeste(caisse),
   'et la caisse, une fois ouverte, emploie LES MÊMES MOTS — c\'était « Choisir à l\'écran »');

console.log('\n[2] « CHOISIR À L\'ÉCRAN » A DISPARU DE LA SURFACE');
ok(!/Choisir à l[’']écran/i.test(caisse),
   'plus aucun « Choisir à l\'écran » affiché');
ok(!/Choisir la vente à l[’']écran/i.test(caisse),
   'ni en étiquette d\'accessibilité — ce que la synthèse vocale lit à sa place');

console.log('\n[3] LE BOUTON N\'A QU\'UN SEUL NOM');
{
  // Le texte VU et le texte DIT par un lecteur d'écran doivent être la même
  // phrase. Deux libellés pour un bouton, c'est deux boutons pour qui ne voit
  // pas la même chose que qui n'entend pas.
  const bloc = caisse.match(/<button[^>]*onClick=\{\(\) => setSaisieOuverte[\s\S]*?<\/button>/);
  ok(!!bloc, 'le bouton du repli tactile est bien là (il ne disparaît pas)');
  if (bloc) {
    const aria = bloc[0].match(/aria-label="([^"]*)"/)?.[1] ?? '';
    const visible = bloc[0].match(/>([^<>{}]*produits[^<>{}]*)</i)?.[1]?.trim() ?? '';
    ok(nommeLeGeste(aria), `l'étiquette lue nomme le geste — « ${aria} »`);
    ok(nommeLeGeste(visible), `le texte vu nomme le geste — « ${visible} »`);
    ok(aria.trim().toLowerCase() === visible.toLowerCase(),
       'et les deux sont LA MÊME phrase, au mot près');
  }
}

console.log('\n[4] LE VERBE EST UN GESTE DE LA MAIN');
{
  // La règle derrière l'arbitrage : un libellé d'action pour une marchande qui
  // ne lit pas doit nommer ce que fait SON CORPS. « Choisir » est mental.
  const VERBES_MENTAUX = ['choisir', 'sélectionner', 'selectionner', 'valider un choix'];
  const fautifs = VERBES_MENTAUX.filter(v => new RegExp(`${v}\\s+(à|a)\\s+l['’]écran`, 'i').test(caisse));
  ok(fautifs.length === 0,
     `aucun verbe mental n'est proposé comme geste${fautifs.length ? ' — ' + fautifs.join(', ') : ''}`);
}

console.log('\n[5] LE PANNEAU OUVERT PORTE LE MÊME NOM QUE LE BOUTON — CAI-11');
{
  const PANNEAU = sansCommentaires(source('components', 'marchand', 'SaisieGuidee.tsx'));
  ok(!/SAISIR SANS PARLER/i.test(PANNEAU),
     'plus de « SAISIR SANS PARLER » — un troisième nom pour le même geste');
  ok(!/\bsaisir\b/i.test(PANNEAU.match(/<p[^>]*>([^<]*)<\/p>/)?.[1] ?? ''),
     '« saisir » ne sert plus de titre : on saisit au clavier, on ne saisit pas un légume');
  ok(nommeLeGeste(PANNEAU),
     'le panneau nomme le geste avec LES MÊMES MOTS que le bouton qui l\'ouvre');
  // Se définir par ce qu'on NE fait pas ne dit pas quoi faire.
  ok(!/sans\s+parler/i.test(PANNEAU),
     'aucun titre en creux (« sans parler ») : on nomme le geste, pas son absence');
}

console.log('\n[6] L\'ICÔNE DIT LE MÊME GESTE QUE LA PHRASE — CAI-10');
{
  // Pour une marchande qui ne lit pas, l'icône EST le message. Une icône qui
  // contredit la phrase est un nom de plus, et c'est le seul qu'elle lira.
  const bloc = caisse.match(/<button[^>]*onClick=\{\(\) => setSaisieOuverte[\s\S]*?<\/button>/);
  const icone = bloc?.[0].match(/<([A-Z][A-Za-z0-9]*)\s+size=/)?.[1] ?? '';
  ok(icone !== 'Keyboard',
     `l'icône du bouton n'est plus un clavier — c'est « ${icone || '(aucune)'} »`);
  const ECRITURE = ['Keyboard', 'Type', 'PenLine', 'Pen', 'Pencil', 'Edit', 'Edit2', 'Edit3', 'TextCursor', 'TextCursorInput'];
  ok(!ECRITURE.includes(icone),
     'et elle ne dit pas « écrire » : ce bouton ouvre une grille de photos, pas un clavier');
  ok(icone !== '', 'le bouton garde une icône — la retirer ne dirait rien du tout');
  // Elle doit être IMPORTÉE : une icône fantôme casserait le build, mais on
  // préfère le dire ici, dans les mots de la règle.
  ok(new RegExp(`\\b${icone}\\b`).test(caisse.split('\n').filter(l => /^import/.test(l)).join('\n')),
     `l'icône « ${icone} » vient bien de la bibliothèque d'icônes`);
}

console.log(echecs === 0
  ? '\n✅ Un geste, un nom, et c\'est celui de la main.\n'
  : `\n❌ ${echecs} règle(s) violée(s).\n`);
process.exit(echecs === 0 ? 0 : 1);
