/**
 * ENC-01 — « ENCAISSER » EST COMPRIS, ET L'ÉCRAN DIT « JE N'AI PAS COMPRIS ».
 *
 * REPRODUCTION DU DÉFAUT TERRAIN, APK `0459dc0`, rapporté par Patrick avec
 * deux captures. Les sept étapes sont rejouées telles qu'il les a écrites :
 *
 *   1. « 1 tomate à 5 000 F » → reconnue, panier = 5 000 F.
 *   2. L'UI affiche « Dis "encaisser" pour terminer ».
 *   3. Il appuie sur le micro.
 *   4. L'UI passe à « Je t'écoute ».
 *   5. Il dit « encaisser ».
 *   6. Résultat : « Je n'ai pas compris. Redis-moi. »
 *   7. Panier toujours à 5 000 F.
 *
 * CE QUE CE TEST AFFIRME, ET RIEN D'AUTRE. Le moteur COMPREND « encaisser »,
 * la machine d'encaissement RÉPOND, et l'écran affiche malgré tout le bandeau
 * d'échec. La rupture n'est pas dans le chemin de l'argent — elle est dans
 * `afficheEcoute`, qui ne sait parler que de VENTES.
 *
 *   `compris` vient de `libelleVenteComprise`, qui rend `null` pour tout
 *   `action.type !== 'vendre'`. Une intention d'encaissement parfaitement
 *   reconnue donne donc `compris = null` ; la transcription, elle, n'est pas
 *   vide ; et la dernière ligne d'`afficheEcoute` conclut « incompris ».
 *
 * C'EST LA FAUTE VOX-01 RETOURNÉE. Là-bas, « J'ai compris » voulait dire
 * « j'ai entendu » : un mot pour deux choses. Ici, « Je n'ai pas compris »
 * veut dire « ce n'était pas une vente » — le même défaut, dans l'autre sens,
 * et cette fois il tombe sur la commande que l'interface PROMET elle-même
 * deux lignes plus haut (« Dis "encaisser" pour terminer »).
 *
 * LE PANIER À 5 000 F N'EST PAS LE DÉFAUT. La machine ne paie que sur « oui
 * valide », après les billets : « encaisser » RELIT le compte, il n'encaisse
 * pas. Ce test le vérifie explicitement, pour qu'une correction future ne
 * confonde pas les deux et ne fasse pas payer un mot qui ne doit pas payer.
 *
 * ROUGE TANT QUE LE DÉFAUT VIT. Il doit le rester jusqu'à correction : c'est
 * sa raison d'être.
 *
 * Lancer : npm run test:encaissement-incompris
 */
import { afficheEcoute, libelleVenteComprise } from './ecouteCaisse.js';
import { intentLocal, intentLocalCaisse } from '../voice-offline/localIntent.js';
import { estIntentionEncaissement, INTENTIONS_ENCAISSEMENT } from '../voice-offline/grammaireEncaissement.js';
import { reduire, empreintePanier } from './machineEncaissement.js';
import type { EtatEncaissement, EtatFinancier } from './machineEncaissement.js';

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};

console.log('\nENC-01 — « encaisser » compris, écran qui dit le contraire (terrain 0459dc0)\n');

// ── ÉTAPE 1 — la vente qui précède, telle qu'elle a marché sur le terrain ──
console.log('[1] « 1 tomate à 5 000 » — la vente qui remplit le panier');
const vente = intentLocalCaisse('1 tomate à 5000')?.action;
ok(vente?.type === 'vendre', 'la vente est comprise');
// L'espace du montant est une FINE INSÉCABLE (U+202F), posée par
// `toLocaleString('fr-FR')` : on compare sur la même normalisation que
// l'écran, pas sur une espace ordinaire — sinon ce test rougirait pour une
// raison qui n'est pas le défaut terrain.
const libelleVente = (libelleVenteComprise(vente) ?? '').replace(/\u202f|\u00a0/g, ' ');
ok(libelleVente === '1 tomate à 5 000 F',
   `et elle s'affiche : ${JSON.stringify(libelleVenteComprise(vente))}`);

// Le panier réel qui en résulte : une ligne, 5 000 F, aucun billet touché.
const LIGNES = [{ ligneId: 'l-tomate', quantite: 1, total: 5000 }];
const fin: EtatFinancier = {
  total: 5000, recu: 0, panierVide: false,
  // Aucun billet touché : rien à rendre, et le reçu ne couvre pas.
  monnaie: 0, suffisant: false,
  empreinte: { total: 5000, recu: 0, lignes: empreintePanier(LIGNES) },
};

// ── ÉTAPE 5 — elle dit le mot que l'écran lui a promis ────────────────────
console.log('\n[5] Elle dit « encaisser » — le mot que l\'interface promet');
const MOT = 'encaisser';
const res = intentLocal(MOT);
ok(res !== null, 'intentLocal RECONNAÎT le mot (ce n\'est pas une panne de moteur)');
ok(res?.action?.type === 'encaisser', `l'action sortie est bien « encaisser » : ${JSON.stringify(res?.action)}`);
ok(estIntentionEncaissement(res?.action?.type ?? ''), 'et le micro de la caisse sait la router');
ok(INTENTIONS_ENCAISSEMENT.includes('encaisser'), 'elle est déclarée dans la liste de référence');

// ── La machine d'argent, sur l'état financier EXACT du terrain ────────────
console.log('\n[—] La machine d\'encaissement, sur le panier exact de Patrick');
const repos: EtatEncaissement = { phase: 'repos' };
const { etat, effet } = reduire(repos, 'encaisser', fin);
ok(etat.phase === 'preparation', 'elle entre en préparation');
ok(effet.type === 'dire', `elle a une phrase à dire : ${JSON.stringify(effet.type === 'dire' ? effet.texte : effet)}`);
ok(effet.type !== 'encaisser',
   'et elle N\'ENCAISSE PAS — le panier à 5 000 F est le comportement voulu, pas le défaut');

// ── ÉTAPE 6 — CE QUE L'ÉCRAN AFFICHE. La rupture est ici. ─────────────────
console.log('\n[6] Ce que le bandeau du micro affiche pour cette même phrase');
const compris = libelleVenteComprise(res?.action);
ok(compris === null, `« compris » est nul, parce que ce n'est pas une vente : ${JSON.stringify(compris)}`);

const vue = afficheEcoute({ ecoute: false, transcription: MOT, compris, saisieOuverte: false });
console.log(`      → bandeau rendu : « ${vue.type} »`);

ok(vue.type !== 'incompris',
   'LE BANDEAU NE DIT PAS « Je n\'ai pas compris » sur une intention comprise');

// Le démenti est déjà dans le même instant : la machine, elle, a une phrase.
ok(!(vue.type === 'incompris' && effet.type === 'dire'),
   'l\'écran et la machine ne se contredisent pas au même instant');

// ── Les trois autres commandes d'encaissement tombent dans le même trou ───
console.log('\n[+] Les quatre intentions d\'encaissement, une par une');
for (const [phrase, attendue] of [
  ['encaisser', 'encaisser'],
  ['combien elle doit', 'combien_doit'],
  ['oui valide', 'oui_valide'],
  ['non annule', 'annuler_validation'],
] as const) {
  const a = intentLocal(phrase)?.action;
  const reconnue = a?.type === attendue;
  const bandeau = afficheEcoute({
    ecoute: false, transcription: phrase,
    compris: libelleVenteComprise(a), saisieOuverte: false,
  }).type;
  ok(reconnue && bandeau !== 'incompris',
     `« ${phrase} » → moteur : ${a?.type ?? 'null'} | bandeau : ${bandeau}`);
}

console.log(`\n${echecs === 0 ? '✓ ENC-01 : aucun échec' : `✗ ENC-01 : ${echecs} échec(s) — le défaut terrain est reproduit`}\n`);
process.exit(echecs === 0 ? 0 : 1);
