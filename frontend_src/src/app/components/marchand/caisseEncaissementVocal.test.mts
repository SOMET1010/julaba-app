/**
 * Garde-fou de câblage — L'ENCAISSEMENT À LA VOIX (VOIX-01, lot C).
 * Lancer : npm run test:caisse-encaissement   (tsx, sans DOM)
 *
 * LA BASE, MESURÉE. Sur `cc26647`, `intentLocal` renvoyait `null` pour
 * « encaisse », « on encaisse », « combien elle doit », « oui valide »,
 * « valide », « oui » et « d'accord » : la caisse répondait « Je n'ai pas bien
 * compris ». Sur `f0c965c`, la grammaire et la machine existaient, mais RIEN ne
 * les appelait : ce fichier, lancé contre les sources de `f0c965c`, est rouge
 * (le nombre d'échecs est noté dans le commit qui l'introduit).
 *
 * POURQUOI LIRE LE SOURCE. Un module pur non branché ne casse rien : il est
 * simplement inutile. Et un branchement qui contourne la machine — un
 * `handlePay()` appelé depuis le micro, une intention retirée d'une des deux
 * listes — ne casse rien non plus : il ouvre juste une seconde porte vers
 * l'argent, sans relecture. Ce sont des défauts silencieux ; on les rend
 * bruyants ici.
 *
 * CE QUE CE TEST PROUVE, en deux temps :
 *   [A] le câblage, par lecture des sources (sans les commentaires) ;
 *   [B] la chaîne RÉELLE : phrase → `intentLocal` → `action.type` → `reduire`,
 *       avec les modules qui tournent sur le téléphone. C'est cette traversée
 *       qui manquait : les deux modules purs avaient chacun leur logique, mais
 *       personne n'avait fait passer une phrase de bout en bout.
 *
 * CE QU'IL NE DIT PAS : il ne monte pas React. Que `handlePay` soit bien
 * appelé au moment de l'effet `encaisser` est prouvé par le source, pas par un
 * clic ; la primitive elle-même (verrou, gardes, enregistrement) est celle du
 * bouton tactile, déjà couverte ailleurs.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { intentLocal } from '../../voice-offline/localIntent.js';
import { INTENTIONS_ENCAISSEMENT, estIntentionEncaissement } from '../../voice-offline/grammaireEncaissement.js';
import { ETAT_INITIAL, empreintePanier, phraseRelecture, reduire, type EtatEncaissement, type EtatFinancier, type EvenementEncaissement } from '../../services/machineEncaissement.js';

const lire = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
// Sans les commentaires : ces fichiers RACONTENT le câblage qu'on vérifie, et
// une phrase de commentaire ne doit faire ni passer ni échouer un test.
const sansCommentaires = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

const codeIntent = sansCommentaires(lire('../../voice-offline/localIntent.ts'));
const codeMicro = sansCommentaires(lire('./MicroVenteCaisse.tsx'));
const codeCaisse = sansCommentaires(lire('./POSCaisse.tsx'));

let echecs = 0;
const ok = (cond: boolean, quoi: string) => {
  if (cond) console.log('  ✓', quoi);
  else { console.log('  ✗', quoi); echecs++; }
};

console.log('\n[A1] intentLocal consulte la grammaire d\'encaissement EN PREMIER');
ok(/from '\.\/grammaireEncaissement'/.test(codeIntent), 'localIntent importe la grammaire');
const posGrammaire = codeIntent.indexOf('detecterEncaissement(');
const posExtraire = codeIntent.indexOf('extraire(');
ok(posGrammaire !== -1, 'et l\'appelle');
ok(posGrammaire !== -1 && posExtraire !== -1 && posGrammaire < posExtraire,
  'AVANT `extraire` — sinon « combien elle doit » deviendrait un crédit');

console.log('\n[A2] Le micro TRANSMET l\'intention, il n\'encaisse jamais');
ok(!/\bhandlePay\b/.test(codeMicro), 'MicroVenteCaisse ne contient pas `handlePay`');
ok(!/\benregistrerVente\b/.test(codeMicro), 'ni `enregistrerVente`');
ok(/onIntentionEncaissement:\s*\(intention:\s*IntentionEncaissement\)\s*=>\s*void/.test(codeMicro),
  'il déclare la prop `onIntentionEncaissement` (obligatoire : sans elle, les phrases d\'encaissement seraient avalées)');
// Au tout début de onAction, avant toute vente : l'intention part vers la
// caisse et on s'arrête là.
const debutOnAction = codeMicro.indexOf('onAction: async (data) =>');
const premierAppel = codeMicro.indexOf('onIntentionEncaissement(', debutOnAction);
const premiereVente = codeMicro.indexOf("action?.type === 'vendre'", debutOnAction);
ok(debutOnAction !== -1 && premierAppel !== -1 && premiereVente !== -1 && premierAppel < premiereVente,
  'onAction appelle `onIntentionEncaissement(...)` avant de regarder « vendre »');
ok(/estIntentionEncaissement\([^)]*\)\)\s*\{\s*onIntentionEncaissement\([^)]*\);\s*return;\s*\}/.test(codeMicro),
  'et `return` aussitôt : rien d\'autre ne se passe sur une phrase d\'encaissement');

console.log('\n[A3] Les quatre intentions sont dans les DEUX listes du moteur');
ok(INTENTIONS_ENCAISSEMENT.length === 4 && ['encaisser', 'combien_doit', 'oui_valide', 'annuler_validation'].every(i => INTENTIONS_ENCAISSEMENT.includes(i as never)),
  'la liste de référence porte exactement les quatre');
const bypass = codeMicro.match(/confirmationBypassIntents:\s*\[([^\]]*)\]/);
const horsLigne = codeMicro.match(/offlineLocalIntents:\s*\[([^\]]*)\]/);
ok(!!bypass && /\.\.\.INTENTIONS_ENCAISSEMENT/.test(bypass[1]) && /'vendre'/.test(bypass[1]),
  `confirmationBypassIntents = [${bypass?.[1].trim()}] — c'est l'effet métier qui parle, pas le moteur`);
ok(!!horsLigne && /\.\.\.INTENTIONS_ENCAISSEMENT/.test(horsLigne[1]) && /'vendre'/.test(horsLigne[1]),
  `offlineLocalIntents = [${horsLigne?.[1].trim()}] — elles n'écrivent rien au serveur elles-mêmes`);

console.log('\n[A4] La caisse possède la machine et appelle handlePay UNE fois, depuis l\'effet `encaisser`');
ok(/from '\.\.\/\.\.\/services\/machineEncaissement'/.test(codeCaisse), 'POSCaisse importe la machine');
ok(/\breduire\(/.test(codeCaisse), 'et la fait tourner (`reduire`)');
const appelsHandlePay = (codeCaisse.match(/\bhandlePay\(\)/g) || []).length;
ok(appelsHandlePay === 1, `\`handlePay()\` est appelé exactement une fois dans POSCaisse (${appelsHandlePay})`);
ok(/effet\.type === 'encaisser'[\s\S]{0,400}?\bhandlePay\(\)/.test(codeCaisse),
  'et cet appel est dans la branche de l\'effet `encaisser`');
ok(/onClick=\{handlePay\}/.test(codeCaisse), 'le bouton « Payer en espèces » appelle toujours la même primitive');
ok(/const handlePay = async \(\) =>/.test(codeCaisse), 'qui reste `async () =>`, sans paramètre : voix et doigt convergent sur la même fonction et le même verrou');
ok(/'etat_financier_change'/.test(codeCaisse) && /useEffect\(\(\) => \{[\s\S]{0,600}?'etat_financier_change'/.test(codeCaisse),
  'un useEffect envoie `etat_financier_change` : le panier ou le reçu qui bouge invalide la confirmation');
// UN CHANGEMENT DE PANIER NE PAIE JAMAIS. Depuis le complément du lot C, la
// machine relit d'elle-même sur `etat_financier_change` (billets touchés
// après « encaisse »), et POSCaisse DIT cet effet. Le jour où quelqu'un ferait
// émettre `encaisser` à cette branche, un article ajouté ou un billet touché
// écrirait de l'argent sans « oui valide ». On le rend impossible à deux
// niveaux : dans le source de la machine, et sur toutes ses entrées.
const codeMachine = sansCommentaires(lire('../../services/machineEncaissement.ts'));
const brancheChangement = codeMachine.match(/case 'etat_financier_change':[\s\S]*?(?=\n\s*case ')/);
ok(brancheChangement !== null, 'la machine a une branche `etat_financier_change`');
ok(brancheChangement !== null && !/type:\s*'encaisser'/.test(brancheChangement[0]),
  'cette branche ne contient aucun `type: \'encaisser\'` : un changement de panier ou de reçu ne paie jamais');
ok(brancheChangement !== null && /phraseRelecture\(/.test(brancheChangement[0]),
  'mais elle sait relire (phraseRelecture) : c\'est Tata qui relit d\'elle-même quand les billets couvrent');
const blocEffet = codeCaisse.match(/useEffect\(\(\) => \{[\s\S]{0,600}?'etat_financier_change'[\s\S]*?\}, \[cleEmpreinte\]\)/);
ok(blocEffet !== null && /if \(effet\.type === 'dire'\) speak\(effet\.texte\)/.test(blocEffet[0]),
  'le useEffect de POSCaisse DIT l\'effet `dire` rendu par ce changement (sinon la relecture spontanée serait muette)');
ok(blocEffet !== null && !/handlePay/.test(blocEffet[0]),
  'et ce useEffect ne contient pas `handlePay` : il parle, il ne paie pas');
const ligneRendu = codeCaisse.split('\n').find(l => l.includes('<MicroVenteCaisse produitPreselectionne'));
ok(!!ligneRendu && /onIntentionEncaissement=\{onIntentionEncaissement\}/.test(ligneRendu || ''),
  'le micro reçoit `onIntentionEncaissement` sur sa ligne de rendu');

console.log('\n[B1] Les phrases traversent intentLocal avec la bonne intention');
const typeDe = (p: string) => intentLocal(p)?.action.type ?? null;
for (const [phrase, attendu] of [
  ['encaisse', 'encaisser'],
  ['on encaisse', 'encaisser'],
  ['combien elle doit ?', 'combien_doit'],
  ['oui valide', 'oui_valide'],
  ['non, pas valide', 'annuler_validation'],
  ['oui', null],
  ["d'accord", null],
  ['valide', null],
  ['bonjour', null],
  ["combien j'ai vendu aujourd'hui", null],
] as const) {
  ok(typeDe(phrase) === attendu, `« ${phrase} » → ${String(attendu)}${typeDe(phrase) === attendu ? '' : ` (obtenu : ${String(typeDe(phrase))})`}`);
}
{
  const r = intentLocal('encaisse');
  ok(!!r && r.needsConfirmation === false && r.response === '' && r.intent === 'encaisser',
    'un résultat d\'encaissement : needsConfirmation false, response vide (la machine parle, pas le moteur)');
}
{
  const v = intentLocal('vends 3 tomates à 500 francs');
  ok(!!v && v.action.type === 'vendre' && v.action.quantite === 3 && v.action.montant === 500 && v.needsConfirmation === true,
    '« vends 3 tomates à 500 francs » reste une vente (3 × 500), pas un encaissement');
  const corr = intentLocal('attends, vends deux tomates à 500 francs');
  ok(!!corr && corr.action.type === 'vendre' && corr.action.quantite === 2,
    '« attends, vends deux tomates à 500 francs » reste une vente : un refus qui porte une vente entière est une correction, pas un abandon (mesuré : c\'était une vente sur f0c965c)');
}
ok(intentLocal('vends 3 tomates à 500 francs')?.action.type !== undefined && !estIntentionEncaissement(intentLocal('vends 3 tomates à 500 francs')!.action.type),
  'le micro ne routerait pas cette vente vers la caisse');

console.log('\n[B2] La chaîne complète : phrase → intentLocal → machine, sur le compte réel');
// Le panier tel que POSCaisse le voit : lignes (productId, quantite, total exact ou prix × quantité).
const panier = (lignes: Array<{ productId: string; quantite: number; prix: number; totalExact?: number }>, recu: number): EtatFinancier => {
  const l = lignes.map(i => ({ productId: i.productId, quantite: i.quantite, total: i.totalExact ?? i.prix * i.quantite }));
  const total = l.reduce((s, x) => s + x.total, 0);
  const insuffisant = recu > 0 && recu < total;
  return { panierVide: l.length === 0, total, recu, monnaie: Math.max(0, recu - total), suffisant: recu > 0 && !insuffisant, empreinte: { total, recu, lignes: empreintePanier(l) } };
};
/** Rejoue ce que la caisse fait d'une phrase : intentLocal, puis reduire si c'est de l'encaissement. */
function parler(etat: EtatEncaissement, phrase: string, f: EtatFinancier) {
  const r = intentLocal(phrase);
  const type = r?.action.type;
  if (!type || !estIntentionEncaissement(type)) return { etat, effet: { type: 'hors_encaissement' as const }, type };
  const evenement: EvenementEncaissement = type;
  return { ...reduire(etat, evenement, f), type };
}
{
  const f = panier([{ productId: 'tomate', quantite: 4, prix: 500 }, { productId: 'oignon', quantite: 2, prix: 1000 }], 5000);
  let etat: EtatEncaissement = ETAT_INITIAL;
  let s = parler(etat, 'combien elle doit ?', f); etat = s.etat;
  ok(s.effet.type === 'dire' && etat.phase === 'repos', '« combien elle doit ? » → Tata annonce, état inchangé');
  s = parler(etat, 'oui valide', f); etat = s.etat;
  ok(s.effet.type !== 'encaisser', '« oui valide » sans relecture préalable → pas de paiement (relecture)');
  s = parler(etat, 'non', f); etat = s.etat;
  ok(s.effet.type === 'dire' && etat.phase === 'repos', '« non » → annulé');
  s = parler(etat, 'encaisse', f); etat = s.etat;
  ok(s.effet.type === 'dire' && s.effet.texte === phraseRelecture(f) && etat.phase === 'attente_confirmation', '« encaisse » → relecture du compte 4 000 / reçu 5 000');
  s = parler(etat, 'oui', f); etat = s.etat;
  ok(s.type == null && etat.phase === 'attente_confirmation', '« oui » seul → rien, l\'attente reste ouverte');
  s = parler(etat, "d'accord", f); etat = s.etat;
  ok(s.type == null && etat.phase === 'attente_confirmation', '« d\'accord » → rien non plus');
  // Un article de plus pendant que la cliente cherche sa monnaie : 6 000.
  const f2 = panier([{ productId: 'tomate', quantite: 4, prix: 500 }, { productId: 'oignon', quantite: 2, prix: 1000 }, { productId: 'piment', quantite: 1, prix: 2000 }], 5000);
  const inval = reduire(etat, 'etat_financier_change', f2); etat = inval.etat;
  s = parler(etat, 'oui valide', f2); etat = s.etat;
  ok(s.effet.type !== 'encaisser', 'panier passé à 6 000 → « oui valide » ne paie PAS');
  ok(s.effet.type === 'dire' && s.effet.texte.includes((6000).toLocaleString('fr-FR')), 'Tata relit le nouveau compte (6 000)');
  // Elle touche un billet de 5 000 de plus : 10 000 reçus.
  const f3 = panier([{ productId: 'tomate', quantite: 4, prix: 500 }, { productId: 'oignon', quantite: 2, prix: 1000 }, { productId: 'piment', quantite: 1, prix: 2000 }], 10000);
  etat = reduire(etat, 'etat_financier_change', f3).etat;
  s = parler(etat, 'on encaisse', f3); etat = s.etat;
  ok(s.effet.type === 'dire' && s.effet.texte === phraseRelecture(f3), '« on encaisse » → relecture 6 000 / reçu 10 000 / rends 4 000');
  s = parler(etat, 'oui valide', f3); etat = s.etat;
  ok(s.effet.type === 'encaisser', 'ENFIN « oui valide » sur le compte relu → effet encaisser (c\'est ici, et seulement ici, que POSCaisse appelle handlePay)');
  const bis = parler(etat, 'oui valide', f3);
  ok(bis.effet.type !== 'encaisser', 'un second « oui valide » ne paie pas une seconde fois');
}
{
  // Total exact d'une ligne dictée (500 F pour 3) : c'est lui qui entre dans
  // l'empreinte, pas prix × quantité — comme dans handlePay.
  const a = panier([{ productId: 'tomate', quantite: 3, prix: 167, totalExact: 500 }], 500);
  const b = panier([{ productId: 'tomate', quantite: 3, prix: 167 }], 500);
  ok(a.empreinte.lignes !== b.empreinte.lignes && a.total === 500, 'l\'empreinte suit le total EXACT de la ligne (500), pas 3 × 167');
}

console.log('\n[B3] `etat_financier_change` n\'émet jamais `encaisser`, quel que soit l\'état');
{
  const T = { productId: 'tomate', quantite: 4, prix: 500 };
  const fins = [panier([], 0), panier([T], 0), panier([T], 1000), panier([T], 2000), panier([T], 5000)];
  const etats: EtatEncaissement[] = [
    { phase: 'repos' }, { phase: 'preparation' },
    ...fins.map(f => ({ phase: 'attente_confirmation' as const, empreinte: f.empreinte })),
  ];
  let paiements = 0;
  let relectures = 0;
  for (const e of etats) for (const f of fins) {
    const r = reduire(e, 'etat_financier_change', f);
    if (r.effet.type === 'encaisser') paiements++;
    if (r.effet.type === 'dire') relectures++;
  }
  ok(paiements === 0, `${etats.length * fins.length} combinaisons état × compte : 0 effet encaisser (${paiements})`);
  ok(relectures > 0, `et ${relectures} relecture(s) spontanée(s) quand le reçu vient couvrir`);
}

console.log(echecs === 0 ? '\nTous les tests de câblage passent.' : `\n${echecs} échec(s).`);
if (echecs > 0) process.exit(1);
