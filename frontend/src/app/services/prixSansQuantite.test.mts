/**
 * F4NT-B — « TOMATE MILLE FRANCS » EST UNE VENTE, ET ELLE TRAVERSE.
 *
 * LE DÉFAUT, rapport terrain F4NT (APK d3cb6ce, Samsung SM-S938B, 01/10/2026).
 * Trois phrases dites sur la caisse, toutes transcrites CORRECTEMENT par
 * sherpa-onnx, toutes « je n'ai pas bien compris ». Mesuré avant correction :
 *
 *     extraire(« Tomate mille francs »)  → produit tomate, MONTANT 1000
 *     intentLocalCaisse(…)               → NULL
 *     lireVenteAuCatalogue(…)            → NULL
 *
 * L'extraction avait TOUT compris — le produit ET le prix. Les deux portes en
 * aval jetaient la phrase, pour deux raisons DIFFÉRENTES :
 *
 *  · `venteSansVerbe` exigeait une QUANTITÉ (`p.quantite != null`), alors que
 *    depuis le 18/09 une vente sans MONTANT passe (« le prix, l'application le
 *    connaît »). L'asymétrie n'avait pas de raison : la quantité manquante
 *    vaut 1, et c'est le cas normal au marché — un tas, un prix.
 *
 *  · `lireVenteAuCatalogue` prenait 1000 pour MILLE ARTICLES et le rejetait
 *    par son plafond de prudence (100). Or la phrase portait la preuve : elle
 *    a dit « FRANCS ». Personne ne dit « francs » pour compter des tas.
 *
 * CE MAILLON GARDE LES DEUX PORTES ENSEMBLE, et c'est le point. Corriger une
 * seule aurait donné à la même phrase deux sens selon le produit : une vente
 * pour les 28 noms du lexique en dur, un « pas compris » pour les 111 autres
 * du catalogue maître.
 *
 * Lancer : npm run test:prix-sans-quantite
 */
import { extraire } from '../voice-offline/extraction.js';
import { intentLocal, intentLocalCaisse } from '../voice-offline/localIntent.js';
import { lireVenteAuCatalogue } from './venteAuCatalogue.js';
import { vendreVocalUnifie } from './vendreVocalUnifie.js';

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};

/** Un étal réel : deux produits du lexique du moteur, deux qui n'y sont pas. */
const ETAL = [
  { id: '1', nom: 'Tomate', prix: 500 },
  { id: '2', nom: 'Gombo', prix: 300 },
  { id: '3', nom: 'Arachide grillée', prix: 200 },
  { id: '4', nom: 'Attiéké', prix: 300 },
] as never[];

console.log('\nF4NT-B — un produit et un prix suffisent à faire une vente\n');

// ── 1 · LA PORTE DU MOTEUR (28 noms du lexique en dur) ────────────────────
console.log('[1] le lexique du moteur — produit + prix, sans quantité dite');
for (const [phrase, produit, montant] of [
  ['Tomate mille francs', 'tomate', 1000],
  ['tomate 1000', 'tomate', 1000],
  ['gombo cinq cents', 'gombo', 500],
  ['piment 500 francs', 'piment', 500],
] as const) {
  const a = intentLocalCaisse(phrase)?.action;
  ok(a?.type === 'vendre', `${JSON.stringify(phrase)} → une vente`);
  ok(a?.produit === produit, `  … le produit est « ${produit} »`);
  ok(Number(a?.montant) === montant, `  … et le prix DIT est ${montant}, pas inventé`);
}

// ── 2 · LA PORTE DU CATALOGUE (les 111 absents du lexique) ────────────────
console.log('\n[2] son catalogue — « francs » est la preuve que c\'est un prix');
for (const [phrase, produit, montant] of [
  ['Arachide grillée mille francs', 'Arachide grillée', 1000],
  ['attieke 300 francs', 'Attiéké', 300],
  ['arachide grillée cinq mille francs', 'Arachide grillée', 5000],
] as const) {
  const v = lireVenteAuCatalogue(phrase, ETAL);
  ok(v?.produit === produit, `${JSON.stringify(phrase)} → « ${produit} »`);
  ok(v?.quantite === 1, '  … quantité 1, parce qu\'elle n\'en a dit aucune');
  ok(Number(v?.montant) === montant, `  … et le prix DIT est ${montant}`);
}

// ── 3 · CE QUI NE DEVIENT PAS UNE VENTE ───────────────────────────────────
// C'est `!!p.produit` qui tient la porte, et le plafond de prudence qui tient
// le reste. Aucune question sur les chiffres du jour ne porte de nombre : elles
// sont hors d'atteinte par construction, pas par chance.
console.log('\n[3] ce qui reste refusé — et pour une raison nommée');
for (const [phrase, pourquoi] of [
  ['oignon', 'un produit nu : ni quantité ni prix'],
  ['arachide grillée', 'un produit nu, même au catalogue'],
  ['Mille francs', 'un prix nu : aucun produit'],
  ['combien de tomate', 'une question : aucun nombre'],
  ["combien j'ai vendu", 'une question : aucun nombre'],
  ['bonjour', 'ni produit ni nombre'],
] as const) {
  const a = intentLocalCaisse(phrase)?.action;
  ok(a?.type !== 'vendre', `${JSON.stringify(phrase)} → refusé (${pourquoi})`);
  ok(lireVenteAuCatalogue(phrase, ETAL) == null, `  … et le catalogue le refuse aussi`);
}

// ── 4 · LA PRUDENCE EXISTANTE N'EST PAS ÉLARGIE ───────────────────────────
// Sans « francs », un grand nombre reste ambigu : 5000 peut être 5000 articles
// comme 5000 F. Le doute profite au silence — règle du 28/09, inchangée.
console.log('\n[4] sans « francs », le doute profite toujours au silence');
ok(lireVenteAuCatalogue('arachide grillée cinq mille', ETAL) == null,
   '« arachide grillée cinq mille » → silence, elle n\'a pas dit francs');
ok(lireVenteAuCatalogue('attieke cinq cents', ETAL) == null,
   '« attieke cinq cents » → silence aussi');

// ── 5 · CAT-01/02/03 INTACTS ──────────────────────────────────────────────
console.log('\n[5] les lots précédents ne bougent pas');
ok(lireVenteAuCatalogue('deux arachides grillées', ETAL)?.quantite === 2,
   'CAT-01 : « deux arachides grillées » → quantité 2');
ok(lireVenteAuCatalogue('deux arachides grillées', ETAL)?.montant == null,
   '  … et aucun prix inventé (il viendra du catalogue)');
ok(intentLocalCaisse('vends 500')?.action?.montant === 500,
   'CAT-02 : « vends 500 » → article libre à 500 F, intact');
ok(intentLocalCaisse('trois tomates')?.action?.quantite === 3,
   '« trois tomates » → quantité 3, intact');
ok(intentLocalCaisse('deux tas de piment a 500')?.action?.quantite === 2,
   '« deux tas de piment à 500 » → quantité 2, intact');

// ── 6 · HORS DE LA CAISSE, RIEN NE CHANGE ─────────────────────────────────
// `intentLocal` est lue par toutes les surfaces (stock, assistante, rejeu
// hors ligne) et son comportement est gelé par l'empreinte d'argent.
console.log('\n[6] hors de la caisse, la porte stricte ne bouge pas');
for (const p of ['Tomate mille francs', 'tomate 1000', 'gombo cinq cents']) {
  ok(intentLocal(p) === null, `${JSON.stringify(p)} → toujours NULL hors caisse`);
}

// ── 7 · LA PREUVE TRAVERSE JUSQU'À LA LIGNE DU PANIER ─────────────────────
// « Sur l'argent, la preuve doit TRAVERSER » : une intention juste qui
// n'arrive pas au panier ne vaut rien.
console.log('\n[7] le prix dit arrive au panier, et sans question posée');
for (const [phrase, attenduMontant] of [
  ['Tomate mille francs', 1000],
  ['Arachide grillée mille francs', 1000],
] as const) {
  const panier: unknown[][] = [];
  let question = '';
  const lu = extraire(phrase);
  const vente = lireVenteAuCatalogue(phrase, ETAL) ?? intentLocalCaisse(phrase)?.action;
  vendreVocalUnifie(
    String(vente?.produit ?? ''), Number(vente?.quantite) || 1, Number(vente?.montant) || 0,
    {
      products: ETAL, addToCart: (...x: unknown[]) => { panier.push(x); },
      speak: () => {}, vibrerSucces: () => {}, notifierAjoutPanier: () => {},
      proposerCreationProduit: () => {},
      stockage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } as unknown as Storage,
      estEnLigne: () => false, planifier: (e: () => void) => setTimeout(e, 0) as unknown as number,
      guidageVocalActif: () => false, creerIdLigne: () => 'f4nt',
      demanderPrix: undefined,
      signalerBlocage: ({ texte }: { texte: string }) => { question = texte; },
    } as never,
    lu.uniteParlee, lu.lecturePrix,
  );
  ok(panier.length === 1, `${JSON.stringify(phrase)} → UNE ligne au panier`);
  ok(question === '', '  … sans question posée : quantité 1, aucune ambiguïté de prix');
  const plat = JSON.stringify(panier[0]);
  ok(plat.includes(String(attenduMontant)),
     `  … et la ligne porte le prix DIT (${attenduMontant})`);
}

console.log(echecs === 0
  ? '\n✅ Un produit et un prix font une vente, aux DEUX portes, jusqu\'au panier.\n'
  : `\n❌ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
