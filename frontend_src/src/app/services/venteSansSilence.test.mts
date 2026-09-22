/**
 * UN « J'AI COMPRIS » NE PEUT PAS DÉBOUCHER SUR RIEN — 22/09/2026.
 * Lancer : npm run test:vente-sans-silence   (tsx, sans DOM ni navigateur)
 *
 * LE DÉFAUT, SIGNALÉ DEUX FOIS PAR PATRICK SUR LE MÊME ÉCRAN. Catalogue vide,
 * il dicte « trois tomates ». Le bandeau vert « J'ai compris : Trois tomates »
 * s'affiche, et c'est tout. Ses mots : « Cet écran me dérange, il est
 * visuellement ET sonorement muet. »
 *
 * Le lot de la veille avait bouché UNE des issues — celle où la caisse sait
 * demander le prix (`demanderPrix`). Il en restait une troisième, que personne
 * n'avait regardée, et c'est elle qui fait exactement le silence décrit :
 *
 *     pas de `demanderPrix`  ET  guidage vocal coupé (profil « je lis »)
 *         → `vendreVocalUnifie` retournait SANS RIEN FAIRE.
 *
 * La phrase de refus n'existait qu'À L'INTÉRIEUR du `if (guidageVocalActif())`.
 * Coupez la voix, retirez l'écran de prix, et il ne restait littéralement
 * aucune ligne de code pour dire à la marchande que sa vente ne passait pas.
 * `TantieSagesseModal` est précisément un appelant sans `demanderPrix`.
 *
 * CE QUE CE TEST FIGE — et c'est une règle, pas un détail d'affichage :
 *   1. aucune ligne au panier sans prix (inchangé : jamais 0 F en silence) ;
 *   2. mais une vente comprise laisse TOUJOURS une trace — un écran de prix,
 *      ou à défaut un signalement VISIBLE ; jamais zéro effet ;
 *   3. l'écrit et le dit portent EXACTEMENT la même phrase, résolue depuis le
 *      catalogue i18n : les deux canaux ne peuvent pas diverger ;
 *   4. et les deux surfaces réelles câblent ce filet (garde de SOURCE), pour
 *      qu'une troisième ne rouvre pas le trou en l'oubliant.
 *
 * Ce que ce test NE prouve pas : le rendu React ni le STT. Le parcours joué de
 * bout en bout est au banc `apercu-caisse/parcours.mjs`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { intentLocalCaisse } from '../voice-offline/localIntent.js';
import { extraire } from '../voice-offline/extraction.js';
import { vendreVocalUnifie, type DependancesVendreVocalUnifie, type ProduitPourPanier } from './vendreVocalUnifie.js';
import type { ProduitAppariable } from './venteVocale.js';

let echecs = 0;
const ok = (cond: boolean, quoi: string, obtenu?: unknown) => {
  if (cond) console.log('  ✅', quoi);
  else { console.log('  ❌', quoi, obtenu === undefined ? '' : `— obtenu ${JSON.stringify(obtenu)}`); echecs++; }
};

const racine = fileURLToPath(new URL('..', import.meta.url));
const sansCommentaires = (src: string) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const lire = (chemin: string) => sansCommentaires(readFileSync(racine + chemin, 'utf8'));

/** Le catalogue de terrain : VIDE (« Produits : Aucun produit »). */
const CATALOGUE_VIDE: ProduitAppariable[] = [];

/**
 * Le vrai parcours de la dictée, depuis la phrase. `avecEcranDePrix` et
 * `guidage` reproduisent les quatre combinaisons de surfaces réelles.
 */
function dicter(phrase: string, { avecEcranDePrix, guidage }: { avecEcranDePrix: boolean; guidage: boolean }) {
  const panier: [ProduitPourPanier, number, number | undefined][] = [];
  const dits: string[] = [];
  const demandes: unknown[] = [];
  const signalements: { texte: string; raison: string; nom: string; quantite: number }[] = [];
  const deps: DependancesVendreVocalUnifie = {
    products: CATALOGUE_VIDE,
    addToCart: (produit, quantite, totalExact) => { panier.push([produit, quantite, totalExact]); },
    speak: (t) => { dits.push(t); },
    vibrerSucces: () => {},
    notifierAjoutPanier: () => {},
    proposerCreationProduit: () => {},
    stockage: null,
    estEnLigne: () => false,
    planifier: () => {},
    guidageVocalActif: () => guidage,
    creerIdLigne: () => 'ligne-1',
    ...(avecEcranDePrix ? { demanderPrix: (d: unknown) => { demandes.push(d); } } : {}),
    signalerBlocage: (info) => { signalements.push(info); },
  };
  const p = extraire(phrase);
  const local = intentLocalCaisse(phrase);
  if (local?.action?.type === 'vendre') {
    const brut = Number(local.action.montant);
    const montant = Number.isFinite(brut) && brut > 0 ? brut : 0;
    vendreVocalUnifie(local.action.produit, local.action.quantite || 1, montant, deps, p.uniteParlee, p.lecturePrix);
  }
  return { local, panier, dits, demandes, signalements };
}

console.log("\n[1] Le cas de Patrick : catalogue vide, « trois tomates », voix COUPÉE, aucun écran de prix");
{
  const r = dicter('trois tomates', { avecEcranDePrix: false, guidage: false });
  ok(r.local?.action?.type === 'vendre', 'la caisse comprend bien une vente', r.local?.action);
  ok(r.panier.length === 0, 'aucune ligne au panier sans prix — la règle sur son argent ne bouge pas', r.panier);
  ok(r.dits.length === 0, 'profil « je lis » : Tata se tait, comme avant', r.dits);
  // C'EST LA LIGNE QUI ÉTAIT ROUGE : avant le correctif, zéro effet de zéro canal.
  const effets = r.dits.length + r.demandes.length + r.signalements.length;
  ok(effets > 0, 'mais la vente comprise laisse une TRACE : le silence total n\'est plus possible', effets);
  ok(r.signalements.length === 1, 'exactement un signalement visible', r.signalements);
  ok(/tomate/i.test(r.signalements[0]?.texte || ''), 'qui nomme le produit qu\'elle a dit', r.signalements[0]);
  ok(r.signalements[0]?.raison === 'prix_manquant', 'et dit POURQUOI la vente s\'arrête', r.signalements[0]);
  ok(r.signalements[0]?.quantite === 3, 'en gardant la quantité dictée, pour ne pas la faire redire', r.signalements[0]);
}

console.log('\n[2] Voix ALLUMÉE, toujours sans écran de prix : l\'écrit et le dit portent la MÊME phrase');
{
  const r = dicter('trois tomates', { avecEcranDePrix: false, guidage: true });
  ok(r.dits.length === 1, 'Tata dit une phrase', r.dits);
  ok(r.signalements.length === 1, 'et la même est montrée', r.signalements);
  ok(r.dits[0] === r.signalements[0]?.texte,
    'MOT POUR MOT : deux canaux qui divergent, c\'est deux vérités pour une vente',
    { dit: r.dits[0], montre: r.signalements[0]?.texte });
  ok(r.panier.length === 0, 'et toujours rien au panier', r.panier);
}

console.log('\n[3] Avec un écran de prix (la caisse) : rien ne change — c\'est lui qui prend le relais');
for (const guidage of [true, false]) {
  const r = dicter('trois tomates', { avecEcranDePrix: true, guidage });
  ok(r.demandes.length === 1, `guidage=${guidage} : le prix est demandé une fois`, r.demandes.length);
  ok(r.signalements.length === 0, `guidage=${guidage} : aucun doublon — un seul canal à la fois`, r.signalements);
  ok(r.panier.length === 0, `guidage=${guidage} : rien au panier avant le prix`, r.panier);
}

console.log('\n[4] Le filet est CÂBLÉ sur les deux surfaces réelles (source)');
{
  const micro = lire('components/marchand/MicroVenteCaisse.tsx');
  const tantie = lire('components/assistant/TantieSagesseModal.tsx');
  ok(/signalerBlocage\s*:/.test(micro), 'MicroVenteCaisse câble signalerBlocage');
  ok(/signalerBlocage[\s\S]{0,200}setSaisieOuverte\(true\)/.test(micro),
    'et ouvre SON repli tactile sur place, au lieu de renvoyer la marchande chercher un bouton');
  ok(/signalerBlocage\s*:/.test(tantie), 'TantieSagesseModal aussi — c\'est l\'appelant qui n\'a jamais su demander un prix');
  const module = lire('services/vendreVocalUnifie.ts');
  ok(/deps\.signalerBlocage\?\.\(/.test(module) && !/guidageVocalActif\(\)[\s\S]{0,80}signalerBlocage/.test(module),
    'et dans le module, le signalement est HORS du garde de guidage vocal — sinon le trou se rouvre');
}

console.log(echecs === 0 ? '\n✅ Tout est vert\n' : `\n❌ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
