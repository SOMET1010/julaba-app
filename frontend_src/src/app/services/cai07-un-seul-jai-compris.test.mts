/**
 * CAI-07 — UN SEUL « J'AI COMPRIS » À L'ÉCRAN, JAMAIS DEUX.
 *
 * LE DÉFAUT, mesuré le 23/09/2026 sur l'état du jour. Deux blocs FRÈRES du
 * même `<section>` de `MicroVenteCaisse` portaient la même formule :
 *
 *   L656  bandeau vert   « J'ai compris : 2 gombo »        (vueEcoute)
 *   L730  SaisieGuidee → ConfirmationLigne
 *         « J'ai compris : 2 gombos à 500 francs… C'est bon ? »
 *
 * Aucune des deux conditions ne mentionnait l'autre, et `transcript` n'est
 * JAMAIS remis à vide dans `useVoiceCore` : le bandeau survivait à tout.
 *
 * ET L'ÉCRAN OUVRAIT LE SECOND LUI-MÊME. `signalerBlocage` — une vente
 * comprise dont le prix est introuvable — fait `setSaisieOuverte(true)`. Le
 * commentaire d'alors décrivait déjà l'état sans y voir un défaut : « cette
 * vente comprise se terminait en silence absolu SOUS le bandeau J'ai
 * compris ». On avait ajouté un panneau sous le premier au lieu de retirer
 * le premier.
 *
 * CE QUE ÇA COÛTE, ET POURQUOI C'EST LA MÊME FAUTE QUE PARTOUT AILLEURS.
 * « J'ai compris » avait DEUX SENS en même temps : « j'ai extrait une vente
 * de ta phrase » (déjà passé, peut-être échoué) et « voici ce que je vais
 * enregistrer, confirme » (en cours, engage l'argent). Pour une marchande qui
 * ne lit pas, le premier contredit le second à l'instant où elle décide.
 * Ne jamais donner deux sens à la même donnée.
 *
 * ARBITRAGE DE PATRICK, 23/09 : « un seul J'ai compris à la fois. Le bandeau
 * micro est transitoire. Dès que SaisieGuidee s'ouvre, il doit disparaître. »
 * Et : « ne change pas les libellés pour contourner le défaut » — on retire
 * un panneau, on ne renomme pas un mot pour que deux textes cessent de se
 * ressembler.
 *
 * LE CHEMIN TESTÉ EST CELUI DE PATRICK, DE BOUT EN BOUT :
 *   « deux gombos » → prix manquant → saisie guidée → prix → Vérifier.
 *
 * Lancer : npm run test:cai07-un-seul-compris
 */
import { afficheEcoute, libelleVenteComprise } from './ecouteCaisse.js';
import { intentLocalCaisse } from '../voice-offline/localIntent.js';
import { vendreVocalUnifie } from './vendreVocalUnifie.js';
import { creerLigneProvisoire } from './ligneProvisoire.js';
import { phraseConfirmation } from './dialoguesTata.js';
import { readFileSync } from 'node:fs';

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};

/** Le seul juge : combien de fois cette formule est-elle LISIBLE à l'écran. */
const FORMULE = /J['’]ai compris/g;
const compte = (...textes: (string | null)[]) =>
  textes.filter(Boolean).join(' || ').match(FORMULE)?.length ?? 0;

/** Le texte que porte le bandeau vert, tel que `MicroVenteCaisse` l'écrit. */
const texteBandeau = (vue: ReturnType<typeof afficheEcoute>) =>
  vue.type === 'compris' ? `J'ai compris : ${vue.libelle}` : null;

console.log('\nCAI-07 — un seul « J\'ai compris » à l\'écran\n');

// ── LE PARCOURS RÉEL, INSTANT PAR INSTANT ─────────────────────────────────
const PHRASE = 'deux gombos';
const action = intentLocalCaisse(PHRASE)?.action;
const compris = libelleVenteComprise(action);

console.log('[1] Elle dicte « deux gombos » — le moteur comprend, sans prix');
ok(action?.type === 'vendre', 'la phrase produit bien une intention de vente');
ok(compris === '2 gombo', `la vente comprise se met en mots : ${JSON.stringify(compris)}`);

console.log('\n[2] Instant A — micro seul : le bandeau a le droit d\'exister');
{
  const vue = afficheEcoute({ ecoute: false, transcription: PHRASE, compris, saisieOuverte: false });
  ok(vue.type === 'compris', 'compréhension simple, aucune saisie ouverte → bandeau possible');
  ok(compte(texteBandeau(vue)) === 1, 'un seul « J\'ai compris » à cet instant');
}

console.log('\n[3] Instant B — le prix manque : l\'écran ouvre la saisie LUI-MÊME');
// L'état que `MicroVenteCaisse` tient : muté par le callback de blocage.
const ecran = { saisieOuverte: false, texteBlocage: '' };
const panier: unknown[] = [];
await vendreVocalUnifie(action?.produit as string, (action?.quantite as number) || 1, 0, {
  products: [],
  addToCart: (...a: unknown[]) => { panier.push(a); },
  speak: () => {},
  vibrerSucces: () => {},
  notifierAjoutPanier: () => {},
  proposerCreationProduit: () => {},
  stockage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } as unknown as Storage,
  estEnLigne: () => false,
  planifier: (e: () => void) => setTimeout(e, 0) as unknown as number,
  guidageVocalActif: () => false,
  creerIdLigne: () => 'cai07',
  demanderPrix: undefined,
  signalerBlocage: ({ texte }: { texte: string }) => { ecran.saisieOuverte = true; ecran.texteBlocage = texte; },
} as never, null, null);
ok(panier.length === 0, 'la vente n\'est PAS partie au panier : il manque le prix');
ok(ecran.saisieOuverte === true, `la saisie guidée s'ouvre sans geste — « ${ecran.texteBlocage} »`);

console.log('\n[4] Instant C — saisie guidée ouverte : le bandeau micro DISPARAÎT');
{
  const vue = afficheEcoute({ ecoute: false, transcription: PHRASE, compris, saisieOuverte: ecran.saisieOuverte });
  ok(vue.type !== 'compris', 'plus de bandeau « J\'ai compris » pendant la saisie');
  ok(vue.type !== 'incompris',
     'et surtout pas « Je n\'ai pas compris » : elle AVAIT compris — ce serait un mensonge, pas un correctif');
  ok(vue.type === 'repos', 'la bulle revient au repos : un autre écran porte la parole');
  ok(compte(texteBandeau(vue)) === 0, 'zéro « J\'ai compris » venant du micro');
}

console.log('\n[5] Instant D — elle donne le prix et touche « Vérifier »');
{
  const ligne = creerLigneProvisoire(
    { nomParle: 'gombo', quantite: 2, montant: 500, prixExplicite: 'unitaire' },
    { produitId: null },
  );
  const texteConfirmation = phraseConfirmation(ligne);
  const vue = afficheEcoute({ ecoute: false, transcription: PHRASE, compris, saisieOuverte: true });
  ok(/J['’]ai compris/.test(texteConfirmation),
     `ConfirmationLigne porte bien la formule : ${JSON.stringify(texteConfirmation)}`);
  const total = compte(texteBandeau(vue), texteConfirmation);
  ok(total === 1,
     `À L'INSTANT DE LA DÉCISION FINANCIÈRE : ${total} « J'ai compris » à l'écran (attendu 1 — celui qui engage l'argent)`);
}

console.log('\n[6] Aucun instant du parcours n\'en montre deux');
{
  const instants: Array<[string, number]> = [];
  const ligne = creerLigneProvisoire(
    { nomParle: 'gombo', quantite: 2, montant: 500, prixExplicite: 'unitaire' },
    { produitId: null },
  );
  const conf = phraseConfirmation(ligne);
  for (const [nom, ecoute, saisie, confirmation] of [
    ['elle parle',                true,  false, false],
    ['micro seul, compris',       false, false, false],
    ['saisie ouverte (saisie)',   false, true,  false],
    ['saisie ouverte (confirm.)', false, true,  true ],
    ['micro rouvert sur saisie',  true,  true,  false],
  ] as Array<[string, boolean, boolean, boolean]>) {
    const vue = afficheEcoute({ ecoute, transcription: PHRASE, compris, saisieOuverte: saisie });
    instants.push([nom, compte(texteBandeau(vue), confirmation ? conf : null)]);
  }
  for (const [nom, n] of instants) console.log(`      ${nom.padEnd(28)} → ${n}`);
  ok(instants.every(([, n]) => n <= 1), 'jamais deux à la fois, à aucun instant');
}

console.log('\n[7] LA PREUVE TRAVERSE — l\'écran passe bien l\'état à la règle');
{
  // Une règle pure verte pendant que l'écran garde l'ancien comportement,
  // c'est une garde qui ne garde rien.
  const src = readFileSync(new URL('../components/marchand/MicroVenteCaisse.tsx', import.meta.url), 'utf8');
  const appel = src.split('\n').find(l => l.includes('afficheEcoute({')) ?? '';
  ok(/saisieOuverte/.test(appel),
     `l'appel à afficheEcoute reçoit saisieOuverte : ${appel.trim().slice(0, 120)}`);
  const bandeau = src.split('\n').find(l => l.includes("vueEcoute.type === 'compris'")) ?? '';
  ok(bandeau !== '', 'le bandeau reste piloté par vueEcoute — la règle est le seul juge');
  // Anti-contournement : la formule ne doit pas avoir été renommée ici.
  ok(/J'ai compris : \{vueEcoute\.libelle\}/.test(src),
     'le libellé du bandeau n\'a PAS été maquillé pour éviter la collision (arbitrage de Patrick)');
}

console.log(echecs === 0
  ? '\n✅ Un seul « J\'ai compris » — celui qui engage l\'argent.\n'
  : `\n❌ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
