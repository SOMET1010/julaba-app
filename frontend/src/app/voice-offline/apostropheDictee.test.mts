/**
 * F4NT — L'APOSTROPHE DU TÉLÉPHONE NE CHANGE PAS LE SENS D'UNE PHRASE.
 *
 * LE DÉFAUT, mesuré sur le rapport terrain F4NT (APK d3cb6ce, Samsung
 * SM-S938B, 01/10/2026). sherpa-onnx transcrit « un tas d'oignon » avec
 * l'apostrophe TYPOGRAPHIQUE (U+2019), pas la droite (U+0027) :
 *
 *     « un tas d'oignon » (U+0027) → produit oignon, quantité 1   ✓
 *     « un tas d'oignon » (U+2019) → produit NUL, et montant = 1  ✗
 *
 * Le « un » de « un tas », privé de son produit, devenait UN FRANC.
 *
 * `normalise` avait bien une ligne pour ça — et elle ne faisait rien : sa
 * classe de caractères contenait deux fois l'apostrophe DROITE. Vérifié dans
 * tout l'historique du fichier : U+2019 n'y a jamais figuré. Une ligne née
 * vide, jamais exercée.
 *
 * POURQUOI AUCUN DES 124 MAILLONS NE L'A VUE, et c'est la leçon du maillon :
 * un test écrit avec une apostrophe LITTÉRALE dans son source ne prouve rien
 * — c'est précisément le caractère littéral qui s'est perdu. Et la recette
 * navigateur ne pouvait pas le voir non plus : son stub de transcription rend
 * ce qu'ON y écrit, jamais ce que sherpa rend sur l'appareil.
 *
 * DONC CE MAILLON N'ÉCRIT AUCUNE APOSTROPHE LITTÉRALE. Tout est en
 * échappements `\u...`, et il VÉRIFIE D'ABORD que ses propres entrées
 * contiennent bien le caractère attendu : un test qui aurait perdu son
 * apostrophe échouerait ici plutôt que de passer au vert sur rien.
 *
 * Lancer : npm run test:apostrophe-dictee
 */
import { extraire } from './extraction.js';
import { intentLocalCaisse } from './localIntent.js';

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};

console.log("\nF4NT — l'apostrophe de la dictée ne change pas le sens\n");

/** Les quatre formes qu'un moteur de dictée peut rendre, en échappements. */
const FORMES: ReadonlyArray<readonly [string, string]> = [
  ['U+2019 apostrophe typographique', '’'],
  ['U+2018 guillemet-apostrophe', '‘'],
  ['U+02BC lettre apostrophe', 'ʼ'],
  ['U+2032 prime', '′'],
];
const DROITE = String.fromCharCode(39);   // U+0027, la forme qui ne se perd pas

// ── 0 · LE MAILLON SE VÉRIFIE LUI-MÊME ────────────────────────────────────
// Si une conversion d'encodage écrase ces échappements un jour, ces deux
// assertions tombent — au lieu de laisser le maillon vert sur des entrées
// devenues toutes identiques.
console.log('0 · les entrées du maillon portent bien les caractères annoncés');
for (const [nom, car] of FORMES) {
  ok(car !== DROITE && car.codePointAt(0)! > 127, `${nom} est distinct de U+0027`);
}

// ── 1 · LE DÉFAUT EXACT DU RAPPORT F4NT ───────────────────────────────────
console.log("\n1 · « un tas d" + '’' + 'oignon », la phrase du rapport');
const refOignon = extraire(`un tas d${DROITE}oignon`);
ok(refOignon.produit === 'oignon', 'référence (U+0027) : le produit est oignon');
ok(refOignon.quantite === 1, 'référence (U+0027) : la quantité est 1');
ok(refOignon.montant == null, "référence (U+0027) : AUCUN montant — elle n'a pas dit de prix");

for (const [nom, car] of FORMES) {
  const p = extraire(`un tas d${car}oignon`);
  ok(p.produit === refOignon.produit, `${nom} : même produit que la forme droite`);
  ok(p.quantite === refOignon.quantite, `${nom} : même quantité que la forme droite`);
  // LA PLUS IMPORTANTE : le « un » ne doit JAMAIS devenir un franc.
  ok(p.montant == null, `${nom} : le « un » de « un tas » n'est pas UN FRANC`);
}

// ── 2 · LA VENTE TRAVERSE, PAS SEULEMENT L'EXTRACTION ─────────────────────
console.log('\n2 · la vente arrive jusqu' + '’' + 'à la caisse');
for (const [nom, car] of FORMES) {
  const v = intentLocalCaisse(`un tas d${car}oignon`);
  ok(v?.action?.type === 'vendre', `${nom} : la caisse y lit une vente`);
  ok(v?.action?.produit === 'oignon', `${nom} : et c'est de l'oignon`);
  ok(v?.action?.montant == null, `${nom} : aucun montant inventé`);
}

// ── 3 · LES AUTRES ÉLISIONS COURANTES AU MARCHÉ ───────────────────────────
// `normalise` traite `d'` et `l'` ; une marchande dit aussi « j'ai ».
console.log('\n3 · les autres élisions, dites au marché');
const ELISIONS = [
  ['d', 'oignon', 'de'],
  ['l', 'igname', 'le'],
] as const;
for (const [lettre, mot] of ELISIONS) {
  const droite = extraire(`deux ${lettre}${DROITE}${mot}`);
  for (const [nom, car] of FORMES) {
    const courbe = extraire(`deux ${lettre}${car}${mot}`);
    ok(
      courbe.produit === droite.produit && courbe.quantite === droite.quantite && courbe.montant === droite.montant,
      `« deux ${lettre}'${mot} » : ${nom} lue comme la forme droite`,
    );
  }
}

// ── 4 · CE QUI NE DOIT PAS CHANGER ────────────────────────────────────────
// La normalisation ne touche QUE les apostrophes. Une phrase qui n'en porte
// aucune doit rendre exactement ce qu'elle rendait.
console.log('\n4 · ce qui ne porte pas d' + '’' + 'apostrophe ne bouge pas');
ok(extraire('deux tas de gombo').produit === 'gombo', '« deux tas de gombo » : intacte');
ok(extraire('deux tas de gombo').quantite === 2, '« deux tas de gombo » : quantité 2');
ok(extraire('vends pour 500').montant === 500, '« vends pour 500 » : montant 500, intacte');
ok(extraire('trois tomates').quantite === 3, '« trois tomates » : intacte');

console.log(`\n${echecs === 0 ? '✓ tout vert' : `✗ ${echecs} échec(s)`}\n`);
process.exit(echecs === 0 ? 0 : 1);
