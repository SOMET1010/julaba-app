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
  plancherDeBruit, seuilDeParole, parleMaintenant, NIVEAU_PAROLE, MARGE_VOIX,
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

  // MIC-02A — LA GARDE DE PATRICK, 02/10/2026. Le banc OSS-02 a mesuré qu'à
  // 1 500 ms une hésitation de 2 s fermait le micro à 4,26 s alors qu'elle
  // parlait jusqu'à 5,50 s. Cette garde dit la règle en clair : DEUX SECONDES
  // D'HÉSITATION RESTENT DANS LA MÊME PHRASE. Elle est écrite en millisecondes
  // ABSOLUES, pas en `SILENCE_FIN_MS - 1` : une garde qui se recalcule depuis
  // la constante qu'elle surveille ne surveille rien.
  ok(finDEcoute({ ...base, msDepuisDernierMot: 2000 }).cesser === false,
     'deux secondes d\'hésitation restent DANS la phrase — elle regarde son étal, elle cherche son prix');
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

console.log('\n[1 bis] MIC-02B — le seuil s\'adapte au fond, puis il ne bouge plus');
{
  // LA MÉDIANE, PAS LA MOYENNE. Un claquement de cageot au milieu d'un fond
  // calme : la moyenne monterait, la médiane non. Si le plancher montait pour
  // un seul échantillon, le seuil monterait pour toute la phrase.
  ok(plancherDeBruit([2, 2, 2, 90, 2, 2, 2]) === 2,
     'un bruit isolé ne relève pas le plancher — c\'est une médiane, pas une moyenne');

  // PIÈCE CALME : le seuil tombe SOUS l'ancien 12, et c'est ce qui rattrape une
  // voix faible — celle d'une marchande qui parle doucement ou tient mal le
  // téléphone.
  ok(seuilDeParole(plancherDeBruit([0, 1, 0, 1, 0])) < NIVEAU_PAROLE,
     'en pièce calme, on entend PLUS bas qu\'avant : une voix faible n\'est plus perdue');

  // MARCHÉ BRUYANT : le seuil monte avec le fond. Sans ça, le bruit seul
  // déclarait qu\'elle parlait — un faux positif mesuré au banc OSS-02.
  const marche = seuilDeParole(plancherDeBruit([18, 20, 19, 21, 20]));
  ok(marche > NIVEAU_PAROLE && !parleMaintenant(20, marche),
     'au marché, le fond ne passe plus pour une voix — le faux positif est fermé');
  ok(parleMaintenant(marche + 1, marche),
     'mais une voix qui porte AU-DESSUS du fond reste entendue');

  // LE REPLI. Sans mesure, le comportement est EXACTEMENT celui d'avant ce lot.
  ok(seuilDeParole(null) === NIVEAU_PAROLE && seuilDeParole(plancherDeBruit([])) === NIVEAU_PAROLE,
     'sans fond mesurable, on retombe sur NIVEAU_PAROLE — jamais sur un seuil inventé');
  ok(parleMaintenant(NIVEAU_PAROLE) === true && parleMaintenant(NIVEAU_PAROLE - 1) === false,
     'et l\'appel sans seuil se comporte comme avant, au niveau près');

  ok(seuilDeParole(10) === 10 + MARGE_VOIX,
     'le seuil est bien le fond PLUS la marge, et rien d\'autre');
  ok(seuilDeParole(-5) === MARGE_VOIX,
     'un plancher absurde ne fabrique pas un seuil négatif');
}

console.log('\n[2] « J\'ai compris » ne se dit que si on a compris');
{
  const a = afficheEcoute({ ecoute: false, transcription: LE_PARAGRAPHE, compris: null, intentionComprise: false, saisieOuverte: false });
  ok(a.type === 'incompris',
     'le paragraphe de Patrick, sans extraction : « incompris » — PLUS de « J\'ai compris »');
}
{
  const a = afficheEcoute({ ecoute: false, transcription: 'ajoute dix piments à cinq cents', compris: '10 piments à 500 F', intentionComprise: true, saisieOuverte: false });
  ok(a.type === 'compris' && a.libelle === '10 piments à 500 F',
     'une vente extraite : on affiche LA VENTE');
}
{
  ok(afficheEcoute({ ecoute: false, transcription: '', compris: null, intentionComprise: false, saisieOuverte: false }).type === 'repos',
     'rien dit, rien compris : la bulle invite, elle n\'accuse pas');
  ok(afficheEcoute({ ecoute: false, transcription: '   ', compris: null, intentionComprise: false, saisieOuverte: false }).type === 'repos',
     'du blanc n\'est pas une phrase');
  ok(afficheEcoute({ ecoute: false, transcription: 'x', compris: '   ', intentionComprise: false, saisieOuverte: false }).type === 'incompris',
     'une compréhension vide n\'est pas une compréhension');
}

console.log('\n[3] LA TRANSCRIPTION BRUTE NE SORT JAMAIS');
{
  // LA PROPRIÉTÉ QUI TIENT TOUT LE MODULE. Quoi qu'on lui donne, ce qui sort
  // ne contient pas la phrase entendue — sauf si c'est exactement ce que le
  // moteur a compris, et alors ce n'est plus une transcription, c'est une vente.
  const entrees = [
    { ecoute: true, transcription: LE_PARAGRAPHE, compris: null, intentionComprise: false, saisieOuverte: false },
    { ecoute: true, transcription: LE_PARAGRAPHE, compris: '10 piments à 500 F', intentionComprise: true, saisieOuverte: false },
    { ecoute: false, transcription: LE_PARAGRAPHE, compris: null, intentionComprise: false, saisieOuverte: false },
    { ecoute: false, transcription: 'trois tomates', compris: null, intentionComprise: false, saisieOuverte: false },
    { ecoute: false, transcription: '', compris: null, intentionComprise: false, saisieOuverte: false },
  ];
  let fuite = '';
  for (const e of entrees) {
    const sortie = JSON.stringify(afficheEcoute(e));
    if (e.transcription.trim() && sortie.includes(e.transcription.slice(0, 24))) fuite = e.transcription;
  }
  ok(!fuite, `aucune sortie ne recopie la phrase entendue${fuite ? ' — fuite sur : ' + fuite.slice(0, 40) : ''}`);
}
{
  ok(afficheEcoute({ ecoute: true, transcription: LE_PARAGRAPHE, compris: null, intentionComprise: false, saisieOuverte: false }).type === 'ecoute',
     'PENDANT l\'écoute, aucun texte : le micro qui bat suffit à dire qu\'on l\'entend');
  const a = afficheEcoute({ ecoute: true, transcription: LE_PARAGRAPHE, compris: '10 piments', intentionComprise: true, saisieOuverte: false });
  ok(a.type === 'ecoute',
     'et même une vente déjà extraite ne s\'affiche pas tant qu\'elle parle — on ne la double pas');
}

console.log('\n[4] Ce qui s\'affiche après « J\'ai compris » est la VENTE');
ok(libelleVenteComprise({ type: 'vendre', produit: 'piments', quantite: 10, montant: 500 }) === '10 piments à 500 F',
   'produit, quantité, prix — dans ses mots à elle');
// VOIX-07 (1384b8c) a fait passer ce libellé par `plurielNom` : « 3 tomates »,
// la même forme que la voix dit. L'assertion était restée au singulier —
// c'est ELLE qui avait vieilli, pas le code.
ok(libelleVenteComprise({ type: 'vendre', produit: 'tomate', quantite: 3 }) === '3 tomates',
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
    afficheEcoute({ ecoute: false, transcription: t, compris: null, intentionComprise: false, saisieOuverte: false }).type !== 'compris');
  ok(jamaisComprisSansComprehension,
     'AUCUNE transcription, si claire soit-elle, ne produit « J\'ai compris » à elle seule');
}

/**
 * VOX-06 — ELLE PARLE, ET RIEN DANS SA MAIN NE LUI DIT QU'ON L'ENTEND.
 *
 * LE DÉFAUT. `vibrerTic` n'était appelé que par `PaveMontant`, c'est-à-dire au
 * CLAVIER. Le flux vocal n'en avait aucun. Or pendant qu'elle parle il ne se
 * passe rien du tout : pas de son (le micro est ouvert, Tantie se tait
 * exprès), pas de texte (`afficheEcoute` rend `{type:'ecoute'}`, et c'est la
 * règle — « PENDANT L'ÉCOUTE, AUCUN TEXTE »), pas de vibration. Plusieurs
 * secondes de vide devant une marchande qui ne lit pas. Le réflexe est de
 * répéter ou de crier, ce qui dégrade la reconnaissance : le silence de
 * l'appareil fabrique lui-même l'échec qu'il va annoncer.
 *
 * LA RÈGLE QU'ON FIGE ICI : un tic, au PREMIER franchissement du seuil, et un
 * seul par écoute. Le relevé bat toutes les 250 ms ; sans drapeau, trois
 * secondes de parole feraient douze vibrations — un téléphone qui tremble en
 * continu n'est plus un signal, c'est une panne.
 *
 * POURQUOI LA BOUCLE EST REJOUÉE ICI. Le drapeau vit dans `MicroVenteCaisse`
 * (c'est `aParleRef`, qui porte déjà exactement ce fait), et un ref React ne
 * se teste pas sans DOM. Ce banc rejoue donc l'algorithme de l'écran sur le
 * module PUR qu'il appelle vraiment — `parleMaintenant`, `seuilDeParole`,
 * `finDEcoute` — et `caisseMicroPermanent` vérifie, en lisant la source, que
 * l'écran tient bien cette version-là. Les deux ensemble, pas l'un sans
 * l'autre : la même méthode que MIC-01.
 */
console.log('\nVOX-06 — sa main sait qu\'on l\'entend, une fois et une seule');

interface Ecoute { vibrations: number; premierTicMs: number | null; raison: string | null }
function rejouerEcoute(niveauA: (ms: number) => number, seuil = NIVEAU_PAROLE): Ecoute {
  // Exactement la boucle de l'écran : relevé toutes les 250 ms, le drapeau
  // « elle a déjà parlé » sert d'accusé de réception déjà envoyé.
  let aParle = false, dernierSon = 0, vibrations = 0, premierTicMs: number | null = null;
  for (let ms = 250; ms <= ECOUTE_MAX_MS; ms += 250) {
    if (parleMaintenant(niveauA(ms), seuil)) {
      if (!aParle) { vibrations++; premierTicMs = ms; }
      aParle = true;
      dernierSon = ms;
    }
    const fin = finDEcoute({ ecoute: true, aParle, msDepuisDernierMot: ms - dernierSon, msDepuisOuverture: ms });
    if (fin.cesser) return { vibrations, premierTicMs, raison: fin.raison };
  }
  return { vibrations, premierTicMs, raison: null };
}

{
  // Elle appuie, elle hésite une seconde, puis elle dit sa vente pendant 3 s.
  const parle = (ms: number) => (ms >= 1000 && ms <= 4000 ? 40 : 0);
  const e = rejouerEcoute(parle);
  ok(e.vibrations === 1, `une vibration, et une seule, sur toute l'écoute (obtenu ${e.vibrations})`);
  ok(e.premierTicMs === 1000, `elle arrive au PREMIER mot, pas à la fin du traitement (obtenu ${e.premierTicMs} ms)`);
  // Ce que coûterait l'oubli du drapeau, chiffré : le relevé ne s'arrête pas
  // de battre parce qu'elle parle.
  let sansDrapeau = 0;
  for (let ms = 250; ms <= 4000; ms += 250) if (parleMaintenant(parle(ms), NIVEAU_PAROLE)) sansDrapeau++;
  ok(sansDrapeau > 10 && e.vibrations === 1,
     `sans drapeau le téléphone vibrerait ${sansDrapeau} fois sur la même phrase — c'est la panne, pas le signal`);
}
{
  // MIC-02A rejoué côté main : deux secondes d'hésitation restent DANS la même
  // phrase, donc le même accusé de réception. On ne lui retique pas dessus.
  const hesite = (ms: number) => (ms <= 1500 || ms >= 3500 ? 40 : 0);
  const e = rejouerEcoute(hesite);
  ok(e.vibrations === 1, `elle hésite au milieu de sa phrase : toujours UNE vibration (obtenu ${e.vibrations})`);
}
{
  // Le cas qui compte autant que l'autre : elle n'a rien dit. Vibrer là serait
  // mentir — « je t'ai entendue » alors que le micro n'a rien eu.
  const e = rejouerEcoute(() => 0);
  ok(e.vibrations === 0 && e.raison === 'rien-dit',
     `seuil jamais franchi : aucune vibration (obtenu ${e.vibrations}, fin « ${e.raison} »)`);
  // Et le fond du marché n'est pas une voix : MIC-02B l'a déjà dit pour la
  // fermeture du micro, c'est la même vérité pour sa main.
  const fond = rejouerEcoute(() => NIVEAU_PAROLE - 1);
  ok(fond.vibrations === 0, `un bruit sous le seuil ne fabrique pas d'accusé de réception (obtenu ${fond.vibrations})`);
  const seuilMarche = seuilDeParole(plancherDeBruit([18, 20, 19, 21, 19]));
  const bruitMarche = rejouerEcoute(() => 21, seuilMarche);
  ok(bruitMarche.vibrations === 0,
     `au marché, le seuil monte avec le fond (${seuilMarche}) et le fond ne vibre pas (obtenu ${bruitMarche.vibrations})`);
  ok(rejouerEcoute((ms) => (ms >= 1000 ? seuilMarche + 5 : 19), seuilMarche).vibrations === 1,
     'mais sa voix, elle, passe — et vibre une fois');
}
{
  // LE PIÈGE DE L'UNICITÉ MAL POSÉE : un drapeau porté par la session, et non
  // par l'écoute, ne vibrerait plus jamais après la première phrase de la
  // journée. Chaque ouverture du micro est une écoute neuve.
  const parle = (ms: number) => (ms >= 500 && ms <= 2500 ? 40 : 0);
  const deux = [rejouerEcoute(parle), rejouerEcoute(parle)];
  ok(deux.every(e => e.vibrations === 1),
     `deux écoutes successives : un tic chacune (obtenu ${JSON.stringify(deux.map(e => e.vibrations))})`);
}

console.log(echecs === 0
  ? '\n✅ Le micro s\'arrête quand elle s\'arrête, et ne lui renvoie plus ses mots.\n'
  : `\n❌ ${echecs} règle(s) violée(s).\n`);
process.exit(echecs === 0 ? 0 : 1);
