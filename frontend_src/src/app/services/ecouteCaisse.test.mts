/**
 * LE MICRO DE LA CAISSE S'ARRÊTE, ET NE MONTRE PLUS SES ENTRAILLES — VOX-01.
 *
 * Le cas réel, relevé sur le téléphone de Patrick le 22/09/2026 : six lignes
 * de transcription brute sous un « J'ai compris », et aucune vente au bout.
 * C'est cette phrase-là qui sert de témoin dans tout ce fichier.
 */
import {
  finDEcoute, afficheEcoute, libelleVenteComprise,
  SILENCE_FIN_MS, ECOUTE_MAX_MS, AVANT_PREMIER_MOT_MS,
} from './ecouteCaisse.js';

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};

/** La phrase que Patrick a vue à l'écran. Mot pour mot. */
const LE_PARAGRAPHE =
  "En outre. Est-ce que j'ai pas supprimé ça ? Il m'a semblé que j'ai aimé ça " +
  "pour dire un stop mais sauf que nous parlant ajoute dix piments à cinq cents et par d'autre";

console.log('\nLe micro de la caisse sait quand elle a fini — et ce qu\'il a le droit de dire\n');

console.log('[1] Quand cesser d\'écouter');
{
  const base = { ecoute: true, aParle: true, msDepuisOuverture: 3000, msDepuisDernierMot: 0 };
  ok(finDEcoute({ ...base }).cesser === false, 'elle parle encore : on n\'interrompt pas');
  ok(finDEcoute({ ...base, msDepuisDernierMot: SILENCE_FIN_MS - 1 }).cesser === false,
     `un silence de ${SILENCE_FIN_MS - 1} ms est une hésitation, pas une fin`);
  const fin = finDEcoute({ ...base, msDepuisDernierMot: SILENCE_FIN_MS });
  ok(fin.cesser === true && fin.raison === 'silence',
     `${SILENCE_FIN_MS} ms de silence closent la phrase — c'est le geste qui manquait`);
}
{
  // LE CAS DE PATRICK : elle parle SANS S'ARRÊTER. Sans plafond, le micro
  // accumulait 60 secondes de tout ce qui passait.
  const sansArret = { ecoute: true, aParle: true, msDepuisDernierMot: 200, msDepuisOuverture: ECOUTE_MAX_MS };
  const f = finDEcoute(sansArret);
  ok(f.cesser === true && f.raison === 'trop-long',
     'le plafond prime même si elle parle encore : une vente ne dure pas une minute');
  ok(finDEcoute({ ...sansArret, msDepuisOuverture: ECOUTE_MAX_MS - 1 }).cesser === false,
     'et il ne coupe pas une milliseconde trop tôt');
  ok(ECOUTE_MAX_MS < 60000, `le plafond (${ECOUTE_MAX_MS} ms) est bien SOUS les 60 s d'avant`);
}
{
  const muette = { ecoute: true, aParle: false, msDepuisDernierMot: 0 };
  ok(finDEcoute({ ...muette, msDepuisOuverture: AVANT_PREMIER_MOT_MS - 1 }).cesser === false,
     'elle touche, elle réfléchit, elle regarde son étal : on attend');
  const f = finDEcoute({ ...muette, msDepuisOuverture: AVANT_PREMIER_MOT_MS });
  ok(f.cesser === true && f.raison === 'rien-dit',
     'mais un micro ouvert sur rien se referme, et la raison est nommée');
  ok(AVANT_PREMIER_MOT_MS > SILENCE_FIN_MS,
     'on lui laisse PLUS de temps pour commencer que pour finir — sinon on coupe avant le premier mot');
}
ok(finDEcoute({ ecoute: false, aParle: true, msDepuisDernierMot: 99999, msDepuisOuverture: 99999 }).cesser === false,
   'micro fermé : rien à cesser, et surtout aucune boucle');

console.log('\n[2] « J\'ai compris » ne se dit que si on a compris');
{
  const a = afficheEcoute({ ecoute: false, transcription: LE_PARAGRAPHE, compris: null });
  ok(a.type === 'incompris',
     'le paragraphe de Patrick, sans extraction : « incompris » — PLUS de « J\'ai compris »');
}
{
  const a = afficheEcoute({ ecoute: false, transcription: 'ajoute dix piments à cinq cents', compris: '10 piments à 500 F' });
  ok(a.type === 'compris' && a.libelle === '10 piments à 500 F',
     'une vente extraite : on affiche LA VENTE');
}
{
  ok(afficheEcoute({ ecoute: false, transcription: '', compris: null }).type === 'repos',
     'rien dit, rien compris : la bulle invite, elle n\'accuse pas');
  ok(afficheEcoute({ ecoute: false, transcription: '   ', compris: null }).type === 'repos',
     'du blanc n\'est pas une phrase');
  ok(afficheEcoute({ ecoute: false, transcription: 'x', compris: '   ' }).type === 'incompris',
     'une compréhension vide n\'est pas une compréhension');
}

console.log('\n[3] LA TRANSCRIPTION BRUTE NE SORT JAMAIS');
{
  // LA PROPRIÉTÉ QUI TIENT TOUT LE MODULE. Quoi qu'on lui donne, ce qui sort
  // ne contient pas la phrase entendue — sauf si c'est exactement ce que le
  // moteur a compris, et alors ce n'est plus une transcription, c'est une vente.
  const entrees = [
    { ecoute: true, transcription: LE_PARAGRAPHE, compris: null },
    { ecoute: true, transcription: LE_PARAGRAPHE, compris: '10 piments à 500 F' },
    { ecoute: false, transcription: LE_PARAGRAPHE, compris: null },
    { ecoute: false, transcription: 'trois tomates', compris: null },
    { ecoute: false, transcription: '', compris: null },
  ];
  let fuite = '';
  for (const e of entrees) {
    const sortie = JSON.stringify(afficheEcoute(e));
    if (e.transcription.trim() && sortie.includes(e.transcription.slice(0, 24))) fuite = e.transcription;
  }
  ok(!fuite, `aucune sortie ne recopie la phrase entendue${fuite ? ' — fuite sur : ' + fuite.slice(0, 40) : ''}`);
}
{
  ok(afficheEcoute({ ecoute: true, transcription: LE_PARAGRAPHE, compris: null }).type === 'ecoute',
     'PENDANT l\'écoute, aucun texte : le micro qui bat suffit à dire qu\'on l\'entend');
  const a = afficheEcoute({ ecoute: true, transcription: LE_PARAGRAPHE, compris: '10 piments' });
  ok(a.type === 'ecoute',
     'et même une vente déjà extraite ne s\'affiche pas tant qu\'elle parle — on ne la double pas');
}

console.log('\n[4] Ce qui s\'affiche après « J\'ai compris » est la VENTE');
ok(libelleVenteComprise({ type: 'vendre', produit: 'piments', quantite: 10, montant: 500 }) === '10 piments à 500 F',
   'produit, quantité, prix — dans ses mots à elle');
ok(libelleVenteComprise({ type: 'vendre', produit: 'tomate', quantite: 3 }) === '3 tomate',
   'sans prix : on annonce ce qu\'on a, on n\'invente pas un « 0 F »');
ok(libelleVenteComprise({ type: 'vendre', produit: 'gombo' }) === '1 gombo',
   'sans quantité : une unité, comme le tactile');
ok(libelleVenteComprise(null) === null && libelleVenteComprise(undefined) === null,
   'rien extrait : rien à annoncer');
ok(libelleVenteComprise({ type: 'encaisser', produit: 'x', quantite: 1 }) === null,
   'une intention qui n\'est pas une vente n\'annonce pas une vente');
ok(libelleVenteComprise({ type: 'vendre', produit: '   ', quantite: 2 }) === null,
   'un produit sans nom n\'est pas un produit');
ok(libelleVenteComprise({ type: 'vendre', produit: 'igname', quantite: -4 }) === '1 igname',
   'une quantité absurde retombe sur une unité, jamais sur un nombre négatif');

console.log('\n[5] La règle, énoncée comme telle');
{
  const jamaisComprisSansComprehension = [LE_PARAGRAPHE, 'trois tomates', 'bonjour', ''].every(t =>
    afficheEcoute({ ecoute: false, transcription: t, compris: null }).type !== 'compris');
  ok(jamaisComprisSansComprehension,
     'AUCUNE transcription, si claire soit-elle, ne produit « J\'ai compris » à elle seule');
}

console.log(echecs === 0
  ? '\n✅ Le micro s\'arrête quand elle s\'arrête, et ne lui renvoie plus ses mots.\n'
  : `\n❌ ${echecs} règle(s) violée(s).\n`);
process.exit(echecs === 0 ? 0 : 1);
