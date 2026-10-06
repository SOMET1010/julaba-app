/**
 * UNE VENTE DICTÉE SANS PRIX NE SE PERD PAS — défaut terrain du 21/09/2026.
 * Lancer : npm run test:vente-sans-prix   (tsx, sans DOM ni navigateur)
 *
 * CE QUI A ÉTÉ VU SUR UN VRAI TÉLÉPHONE (propriétaire du produit, catalogue
 * VIDE) : elle dicte « cinq tomates », le bandeau vert « J'ai compris : Cinq
 * tomates » s'affiche… et c'est TOUT. Aucune ligne, aucun prix demandé, aucun
 * mot. Ses mots : « je peux vendre un article sans prix il ne fais que ecrire
 * ce que jai dis 3 tomates et cest tout ».
 *
 * CE QUE CE TEST EXÉCUTE (il ne recopie aucune chaîne attendue) : le VRAI
 * chemin de la dictée, maillon par maillon —
 *   extraire → intentLocal → vendreVocalUnifie → ce qui arrive au panier.
 * Plus un garde-fou de SOURCE : la demande de prix doit être CÂBLÉE de la voix
 * (`MicroVenteCaisse`) vers le chemin d'adoption qui existe déjà dans la
 * caisse (`POSCaisse`) — celui qui demande « Quel est ton prix ? » puis met
 * l'article au catalogue ET au panier.
 *
 * LA RÈGLE QU'IL FIGE, et elle porte sur son argent :
 *   1. aucune ligne n'entre au panier sans montant — jamais 0 F en silence ;
 *   2. mais une vente comprise ne disparaît pas non plus : le prix est
 *      DEMANDÉ, l'écran s'ouvre PRÉ-REMPLI (nom et quantité dits) ;
 *   3. et aucun prix n'est inventé — ni dernier prix connu, ni moyenne.
 *
 * CE QU'IL NE PROUVE PAS : le rendu React réel ni le moteur STT. Le parcours
 * joué de bout en bout, lui, est au banc : `apercu-caisse/parcours.mjs`
 * (il exige Chromium, donc il reste hors de `verify`).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extraire } from '../../voice-offline/extraction.js';
import { intentLocal, intentLocalCaisse } from '../../voice-offline/localIntent.js';
import { vendreVocalUnifie, type DependancesVendreVocalUnifie, type ProduitPourPanier } from '../../services/vendreVocalUnifie.js';
import type { ProduitAppariable } from '../../services/venteVocale.js';

let echecs = 0;
const ok = (cond: boolean, quoi: string) => {
  if (cond) console.log('  ✅', quoi);
  else { console.log('  ❌', quoi); echecs++; }
};

/** Les sources voisines (rejouable sur un autre état du dépôt : passer le dossier en argument). */
const dossier = process.argv[2] ?? fileURLToPath(new URL('.', import.meta.url));
const sansCommentaires = (src: string) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const micro = sansCommentaires(readFileSync(join(dossier, 'MicroVenteCaisse.tsx'), 'utf8'));
const caisse = sansCommentaires(readFileSync(join(dossier, 'POSCaisse.tsx'), 'utf8'));

/** Journal des effets réels d'un appel — rien n'est simulé côté module testé. */
function creerDeps(products: ProduitAppariable[], guidage = true) {
  const panier: [ProduitPourPanier, number, number | undefined][] = [];
  const dits: string[] = [];
  const demandes: { nom: string; quantite: number; unite: string | null }[] = [];
  const deps: DependancesVendreVocalUnifie = {
    products,
    addToCart: (produit, quantite, totalExact) => { panier.push([produit, quantite, totalExact]); },
    speak: (t) => { dits.push(t); },
    vibrerSucces: () => {},
    notifierAjoutPanier: () => {},
    proposerCreationProduit: () => {},
    stockage: null,
    estEnLigne: () => false,
    planifier: () => {},
    guidageVocalActif: () => guidage,
    creerIdLigne: () => 'test-1',
    demanderPrix: (d) => { demandes.push({ nom: d.nom, quantite: d.quantite, unite: d.unite }); },
  };
  return { deps, panier, dits, demandes };
}

/** Le vrai parcours, de la transcription au panier. */
function dicter(phrase: string, products: ProduitAppariable[], guidage = true) {
  const p = extraire(phrase);
  const local = intentLocalCaisse(phrase);
  const j = creerDeps(products, guidage);
  if (local?.action?.type === 'vendre') {
    const brut = Number(local.action.montant);
    const montant = Number.isFinite(brut) && brut > 0 ? brut : 0;
    // `p.lecturePrix` : ce que la GRAMMAIRE a entendu du montant (« à » →
    // unitaire, « pour » → le lot). Ce harnais s'annonce comme « le vrai
    // parcours » ; l'oublier ici le ferait diverger de MicroVenteCaisse, qui
    // le transmet — et un harnais qui ne rejoue plus le vrai chemin ne prouve
    // plus rien de ce chemin.
    vendreVocalUnifie(local.action.produit, local.action.quantite || 1, montant, j.deps, p.uniteParlee, p.lecturePrix);
  }
  return { extraction: p, local, ...j };
}

// Le catalogue du compte de terrain : VIDE (« Produits : Aucun produit »).
const CATALOGUE_VIDE: ProduitAppariable[] = [];
// Produit connu MAIS sans prix de vente — l'autre branche du même trou.
const TOMATE_SANS_PRIX: ProduitAppariable[] = [{ id: 'p1', nom: 'Tomate', prix: 0, stock: 10, unite: 'unité' }];
// Produit connu, prix réel — le cas qui marchait déjà et ne doit pas bouger.
const TOMATE: ProduitAppariable[] = [{ id: 'p1', nom: 'Tomate', prix: 500, prix_achat: 300, stock: 10, unite: 'unité' }];

console.log("\n[0] La lecture COMMUNE ne bouge pas : la caisse seule a sa porte");
for (const phrase of ['cinq tomates', '3 tomates']) {
  ok(intentLocal(phrase) === null,
    `${JSON.stringify(phrase)} reste null pour intentLocal (stock, assistante, rejeu hors ligne : rien ne change)`);
}

console.log("\n[1] « cinq tomates » : sur la CAISSE, ce qu'elle dit est une vente");
for (const phrase of ['cinq tomates', '3 tomates']) {
  const { extraction, local } = dicter(phrase, CATALOGUE_VIDE);
  ok(extraction.produit === 'tomate' && extraction.quantite != null,
    `${JSON.stringify(phrase)} : l'extraction voit le produit et la quantité (obtenu ${JSON.stringify({ produit: extraction.produit, quantite: extraction.quantite })})`);
  ok(local !== null, `${JSON.stringify(phrase)} : la dictée n'est pas jetée par intentLocal (obtenu ${JSON.stringify(local)})`);
  ok(local?.action?.type === 'vendre', `${JSON.stringify(phrase)} : c'est une VENTE (obtenu ${JSON.stringify(local?.action)})`);
  ok(local?.action?.montant == null, `${JSON.stringify(phrase)} : et aucun montant n'est inventé au passage`);
}

console.log("\n[1b] …mais la règle reste étroite : on ne vend pas dans le doute");
for (const [phrase, pourquoi] of [
  ['bonjour', 'ni produit ni quantité'],
  ['tomate', 'un produit sans quantité'],
  ['ajoute 10 tomates au stock', 'un mot de stock'],
  ['enleve 2 tomates', 'un retrait'],
] as [string, string][]) {
  const { local } = dicter(phrase, CATALOGUE_VIDE);
  ok(local?.action?.type !== 'vendre', `${JSON.stringify(phrase)} n'est pas une vente (${pourquoi}) — obtenu ${JSON.stringify(local?.action ?? null)}`);
}
{
  const a = dicter('annule les 3 tomates', CATALOGUE_VIDE);
  ok(a.local?.action?.type === 'annuler_validation', `« annule les 3 tomates » reste une annulation (obtenu ${JSON.stringify(a.local?.action)})`);
}

console.log('\n[2] Catalogue VIDE : rien au panier, mais le prix est DEMANDÉ');
{
  const { panier, demandes } = dicter('cinq tomates', CATALOGUE_VIDE);
  ok(panier.length === 0, `aucune ligne n'entre au panier (obtenu ${JSON.stringify(panier)})`);
  ok(demandes.length === 1, `le prix est demandé exactement une fois (obtenu ${demandes.length})`);
  ok(demandes[0]?.nom?.toLowerCase().includes('tomate'), `la demande porte le produit dit (obtenu ${JSON.stringify(demandes[0])})`);
  ok(demandes[0]?.quantite === 5, `et la quantité dite, pour qu'elle n'ait pas à la redire (obtenu ${JSON.stringify(demandes[0]?.quantite)})`);
}

console.log("\n[3] Le silence n'est plus possible, même quand la voix est coupée (profil « je lis »)");
{
  const { panier, dits, demandes } = dicter('cinq tomates', CATALOGUE_VIDE, false);
  ok(dits.length === 0, 'profil « je lis » : Tata ne parle pas — comme avant');
  ok(panier.length === 0, 'et rien ne part au panier');
  ok(demandes.length === 1, `mais l'écran, lui, demande le prix (obtenu ${demandes.length})`);
}

console.log('\n[4] Produit CONNU mais sans prix de vente : même règle');
{
  const { panier, demandes } = dicter('cinq tomates', TOMATE_SANS_PRIX);
  ok(panier.length === 0, `aucune ligne à 0 F (obtenu ${JSON.stringify(panier)})`);
  ok(demandes.length === 1, `le prix est demandé (obtenu ${demandes.length})`);
}

console.log('\n[5] Ce qui marchait marche encore : prix au catalogue, et montant dicté');
{
  const a = dicter('cinq tomates', TOMATE);
  ok(a.panier.length === 1 && a.panier[0][2] === 2500, `prix catalogue × quantité (obtenu ${JSON.stringify(a.panier[0]?.[2])})`);
  ok(a.demandes.length === 0, 'aucune demande de prix quand le catalogue en a un');
  const b = dicter('vends cinq tomates pour 2000 francs', CATALOGUE_VIDE);
  ok(b.panier.length === 1 && b.panier[0][2] === 2000, `montant dicté prioritaire, même sans catalogue (obtenu ${JSON.stringify(b.panier[0]?.[2])})`);
  ok(b.demandes.length === 0, "et rien à demander : elle a dit le prix");
}

console.log('\n[6] La demande de prix est CÂBLÉE de la voix vers la caisse (source)');
ok(/intentLocalCaisse\(texte\)/.test(micro), 'la caisse relit elle-même ce que le moteur n\'a pas compris (intentLocalCaisse)');
ok(/if \(intentLocal\(texte\)\) return;/.test(micro), 'et seulement cela : elle ne repasse jamais derrière une phrase déjà comprise');
ok(/demanderPrix\s*:/.test(micro), 'MicroVenteCaisse câble demanderPrix dans les dépendances de vendreVocalUnifie');
ok(/demanderPrixAuParent\(/.test(micro), 'et la transmet à la caisse (FournisseurDemandePrix), au lieu de se taire');
ok(/<FournisseurDemandePrix demander=\{ouvrirPrixManquant\}>/.test(caisse), 'POSCaisse s\'abonne à cette demande');
ok(/const ouvrirPrixManquant/.test(caisse) && /setShowLibre\(true\)/.test(caisse),
  "et ouvre lui-même l'écran qui demande le prix — la marchande n'a plus à le trouver");

console.log("\n[7] L'écran ouvert par la dictée est PRÉ-REMPLI, et n'invente aucun prix (source)");
ok(/setVenteDictee\(\{ nom: propre, quantite: qte, unite: uniteDite \}\)/.test(caisse), 'le nom, la quantité et l\'unité dits sont retenus');
ok(/setLibreDesc\(propre\)/.test(caisse), 'le libellé est pré-rempli : plus de ligne sans nom quand elle a parlé');
ok(/setLibreMontant\(''\)/.test(caisse), "le montant, lui, reste VIDE : c'est à elle de le donner");
ok(/quantiteDictee/.test(caisse), 'et la quantité dite part sur la ligne, pas 1 par défaut');
ok(!/venteDictee[\s\S]{0,200}prixVente|dernierPrix|moyennePrix/.test(caisse), 'aucun prix de repli n\'est pioché ailleurs');


// ── VOX-03 — L'ÉCRAN DU PRIX DE LA CAISSE A UN MICRO ────────────────────────
//
// MESURÉ SUR L'APK `ca2e817`, journal du 02/10/2026 21:38 :
//
//     21:38:52.627  TTS  « Piment. Quel est ton prix ? »
//     21:38:54.423  TTS_FIN
//        ... 38 secondes, AUCUN ECOUTE_DEBUT ...
//     21:39:33.369  TTS  « 5 Piments, dix mille francs. »
//
// Le micro ne s'est jamais rouvert : les 10 000 F sont entrés AU CLAVIER. La
// question était posée à la voix, la réponse exigée au doigt — sur l'écran de
// l'argent, devant une marchande qui ne lit pas. C'est exactement le défaut que
// `docs/REGLE-VOICE-FIRST.md` nomme : « la voix disparaît précisément au moment
// où la charge cognitive augmente ».
//
// `BoutonDirePrix` existait, testé, dans `SaisieGuidee` et `AjoutProduitGuide`.
// Il manquait sur CE chemin-ci — celui qui s'ouvre quand une vente DICTÉE n'a
// pas de prix, c'est-à-dire le chemin de la marchande qui parle.
console.log('\n[VOX-03] L\'écran du prix de la caisse a un micro');
{
  ok(/import \{ BoutonDirePrix \}/.test(caisse),
     'POSCaisse importe BoutonDirePrix — la brique existante, pas une seconde');
  ok(/<BoutonDirePrix[\s\S]{0,400}onMontant=\{\(m\) =>[\s\S]{0,2000}setLibreMontant\(String\(m\)\);/.test(caisse),
     'le montant dit remplit le MÊME champ que le clavier — une seule source de prix');
  ok(/\{guidageVocal\(\) && \([\s\S]{0,200}<BoutonDirePrix/.test(caisse),
     'et il ne s\'affiche pas quand elle a coupé le guidage vocal');
  // QTE-02 — LE MICRO S'OUVRE TOUT SEUL, ET C'EST LA RÈGLE.
  //
  // Constat de Patrick, 03/10/2026 : « si elle ne sait pas lire, elle
  // n'appuiera jamais dessus. » Un bouton qu'il faut savoir trouver ne sert
  // pas une marchande qui ne lit pas. L'ordre importe autant que l'ouverture :
  // `BoutonDirePrix` DIT la question, attend, PUIS écoute — sinon le micro
  // transcrit Tantie en train de parler.
  ok(/<BoutonDirePrix[\s\S]{0,200}ouvrirToutSeul/.test(caisse),
     'le micro s\'ouvre TOUT SEUL : elle n\'a pas à savoir qu\'un bouton existe');
  ok(/<BoutonDirePrix[\s\S]{0,300}question=\{texteMessage\('TATA_QUEL_PRIX'/.test(caisse),
     'et c\'est LUI qui pose la question, dans le bon ordre');
  ok(!/direMessage\('TATA_QUEL_PRIX'/.test(caisse),
     'l\'écran ne la dit plus : une seule voix, jamais deux fois la même question');

  // QTE-01 — L'ÉCRAN DIT CE QUE LE PANIER VA RECEVOIR.
  // Mesuré sur `a525fe6` : « cinq piments », prix 2 000 F, écran « Combien ? 1
  // · Total : 2 000 F » pendant que le panier recevait CINQ piments pour
  // 10 000 F. L'ajout lit `venteDictee`, l'affichage lit `libreQte` — et rien
  // ne posait `libreQte`.
  ok(/setVenteDictee\(\{ nom: propre, quantite: qte[\s\S]{0,900}setLibreQte\(qte\)/.test(caisse),
     'la quantité DITE est posée dans l\'état que l\'écran affiche, pas seulement dans celui qu\'il enregistre');
  ok(/value=\{libreMontant\}/.test(caisse),
     'le clavier reste, inchangé, pour qui préfère taper');

  // QTE-03 — ET IL NE S'IMPOSE PAS. Capture du 03/10/2026 : `autoFocus` faisait
  // ouvrir le pavé numérique d'Android par-dessus la moitié de l'écran — le
  // bouton « Dire le prix » compris — alors que la page venait de demander le
  // prix à la voix. Pour une marchande qui ne lit pas, c'est l'inverse exact de
  // ce qu'on lui dit de faire.
  ok(/autoFocus=\{!guidageVocal\(\)\}/.test(caisse),
     'le pavé numérique ne s\'ouvre pas tout seul quand le guidage vocal parle');

  // AMB-01 — LE PRIX DIT NE SE DEVINE PAS ENTRE « CHACUN » ET « EN TOUT ».
  //
  // Mesuré sur l'APK `e758a37`, 03/10/2026 : « cinq piments » puis « cinq cents
  // francs » a écrit 2 500 F — 500 pris pour un prix UNITAIRE, sans rien
  // demander. C'était juste ce jour-là (Patrick voulait bien dire 500 F le
  // piment). Mais « donne-moi cinq piments, c'est mille francs » aurait écrit
  // 5 000 F, et l'aurait ANNONCÉ comme un fait.
  //
  // L'application savait déjà ne pas deviner : `TATA_AMBIGUITE` est marqué
  // `critiqueArgent: true` et `prixVocal` le lève dès que la quantité dépasse
  // un. Ce chemin ne le consultait pas — la voix avait été branchée sur un
  // formulaire tactile, où le champ EST un prix unitaire par construction.
  ok(/setPrixDitAArbitrer\(\{ montant: m, quantite: qteDite \}\)/.test(caisse),
     'un prix DIT sur plusieurs unités n\'entre pas dans le champ sans être arbitré');
  ok(/direMessage\('TATA_AMBIGUITE'/.test(caisse),
     'et Tantie pose la question — celle qui existe déjà, pas une nouvelle');
  ok(/if \(m > 0 && qteDite > 1\)/.test(caisse),
     'sur UNE seule unité il n\'y a rien à arbitrer : le prix entre directement');
  // LA RÈGLE VIT AILLEURS, PURE ET TESTÉE. En réécrire une seconde ici, ce
  // serait deux façons de diviser un prix — donc deux totaux possibles.
  ok(/import \{ resoudrePrix \} from '\.\.\/\.\.\/services\/ligneProvisoire'/.test(caisse),
     'le partage du prix passe par `resoudrePrix`, jamais par une division écrite ici');
  // ET CHAQUE RÉPONSE DIT CE QU'ELLE VA ÉCRIRE : un bouton « en tout » qui ne
  // montrerait pas le prix par unité laisserait découvrir le total APRÈS coup.
  ok(/chacun — total \{formatF/.test(caisse) && /en tout — \{formatF/.test(caisse),
     'chaque réponse porte le montant qu\'elle va écrire, avant qu\'elle choisisse');
}


// ── AMB-02 — LA FEUILLE D'ARBITRAGE NE DOIT PAS RESSEMBLER À UN FORMULAIRE ──
//
// AMB-01 pose la bonne question sur deux grands boutons tactiles qui portent
// chacun leur total. Mais elle la pose SUR LE MÊME PANNEAU que le champ du
// montant (`inputMode="numeric"`, donc le pavé numérique d'Android au premier
// contact), la recherche au catalogue, le libellé, le choix d'unité et le
// « combien ».
//
// Pour une marchande qui ne lit pas, ce qui s'ouvre alors n'est pas une
// question à deux réponses : c'est un FORMULAIRE — « l'application me demande
// d'écrire » — et elle se bloque, au moment précis où il ne lui reste qu'à
// toucher l'une des deux cases. C'est la doctrine maison prise à revers :
// aucune information importante uniquement en texte, et surtout aucune
// DEMANDE importante qui ne se comprenne qu'en lisant.
//
// QTE-03 avait retiré l'`autoFocus` pour que le pavé ne s'IMPOSE plus ; il
// restait à ne pas PROPOSER d'écrire pendant qu'on attend un choix.
console.log("\n[AMB-02] Pendant l'arbitrage parlé, il ne reste que les deux réponses");
{
  ok(/const arbitrageSansClavier = !!prixDitAArbitrer && guidageVocal\(\);/.test(caisse),
     'le masquage a un nom, et il exige les DEUX faits : un prix à arbitrer ET le guidage vocal');
  // LE PROFIL « JE LIS » NE PERD RIEN. Sans guidage vocal, `arbitrageSansClavier`
  // est faux par construction : chaque garde ci-dessous est alors toujours
  // vraie et la feuille est celle d'avant, au caractère près. Même logique
  // qu'`autoFocus={!guidageVocal()}` — on ne retire jamais à l'une ce qui sert
  // à l'autre.
  ok(/&& guidageVocal\(\)/.test(caisse) && !/const arbitrageSansClavier = !!prixDitAArbitrer;/.test(caisse),
     'sans guidage vocal, le clavier est la voie normale et rien ne disparaît');

  ok(/\{!arbitrageSansClavier && \([\s\S]{0,300}<input\s+value=\{libreMontant\}/.test(caisse),
     'le champ du montant — donc le pavé numérique d\'Android — disparaît pendant l\'arbitrage');
  ok(/\{refChoisie && !arbitrageSansClavier && \(/.test(caisse),
     'le sélecteur d\'unités aussi : un sélecteur est encore une chose à remplir');
  const massques = (caisse.match(/\{!refChoisie && !arbitrageSansClavier && \(/g) || []).length;
  ok(massques === 2,
     `la recherche au catalogue et le bloc « Quoi ? / unité / combien » disparaissent également (${massques}/2)`);
  ok(/\{!arbitrageSansClavier && \(\s*<button\s+type="button"\s+onClick=\{refChoisie \? adopterReference : ajouterMontantLibre\}/.test(caisse),
     'et le bouton « Ajouter », de toute façon désactivé sans prix, ne traîne pas sous les deux réponses');

  // CE QUI RESTE, ET QUI DOIT RESTER.
  ok(/\{prixDitAArbitrer && \(/.test(caisse) && !/\{prixDitAArbitrer && !arbitrageSansClavier/.test(caisse),
     'les deux blocs d\'arbitrage, eux, ne sont jamais masqués — c\'est tout ce qu\'il reste à toucher');
  ok(/data-test="rappel-dictee"/.test(caisse) && !/\{venteDictee && !arbitrageSansClavier/.test(caisse),
     'le rappel de ce qu\'elle a dit reste : il ne demande rien, il lui rend sa phrase');
  // `BoutonDirePrix` N'EST PAS MASQUÉ, ET C'EST UNE RÈGLE, PAS UN OUBLI. Le
  // masquer le DÉMONTERAIT, et son `ouvrirToutSeul` reposerait « Quel est ton
  // prix ? » au retour de l'arbitrage — la boucle de questions que
  // `arbitrageDemandeRef` vient tout juste de fermer rentrerait par la fenêtre.
  const avantMicro = caisse.slice(Math.max(0, caisse.indexOf('<BoutonDirePrix') - 300), caisse.indexOf('<BoutonDirePrix'));
  ok(!/arbitrageSansClavier/.test(avantMicro),
     'le micro, lui, survit à l\'arbitrage : le démonter relancerait la question à chaque retour');

  // ET LE RETOUR À LA NORMALE N'EST PAS UNE PROMESSE : il est dans le même
  // geste que l'arbitrage. Les deux boutons remettent `prixDitAArbitrer` à
  // `null`, donc `arbitrageSansClavier` à faux, donc la feuille entière.
  ok(/const poser = \(r: \{ prixUnitaire: number \| null \}\) => \{[\s\S]{0,200}setPrixDitAArbitrer\(null\);/.test(caisse),
     'toucher une des deux réponses rend la feuille complète dans le même geste');
}

console.log(echecs === 0 ? '\n✅ Tout est vert\n' : `\n❌ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
