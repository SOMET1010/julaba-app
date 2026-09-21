/**
 * EMPREINTES DE COMPORTEMENT DES MODULES D'ARGENT — gate 8 du lot i18n.
 * Lancer : npm run test:i18n-empreintes-argent   (tsx, sans DOM)
 * Recalculer les constantes : tsx src/app/i18n/voice/validators/empreintesArgent.mts --calculer
 *
 * CE QUE ÇA PROUVE. La migration des phrases vers des clés i18n touche des
 * fichiers qui écrivent de l'argent (`machineEncaissement`,
 * `grammaireEncaissement`, `localIntent`, `relectureSpontanee`,
 * `dialoguesTata`, `vendreVocalUnifie`, `intentionsCaisse`, `fcfa`). La règle
 * de Patrick : « aucune logique métier modifiée ; le comportement doit rester
 * identique ». Un diff « hors chaînes » vide est difficile à prouver par le
 * texte du source ; on le prouve par le COMPORTEMENT : pour un corpus
 * d'entrées fixé et déterministe (l'énumération exhaustive de la machine,
 * des centaines de phrases pour la grammaire et l'intention locale, les
 * dialogues sur des lignes types), on hache TOUTES les sorties — état ET texte
 * — et on compare à l'empreinte relevée sur `576fd62`, la base d'avant le lot.
 *
 * Une empreinte qui change dit : « ce module ne répond plus pareil ». Comme
 * les textes font partie du hachage, « dit = affiché, mêmes chaînes » (invariant
 * (a) du QA) est prouvé du même coup.
 *
 * LES CONSTANTES ci-dessous ont été calculées sur `576fd62` AVANT toute
 * modification de ces modules, avec ce même fichier (`--calculer`).
 */
import { createHash } from 'node:crypto';

import { ETAT_INITIAL, empreintePanier, reduire, type EffetEncaissement, type EtatEncaissement, type EtatFinancier, type EvenementEncaissement, type LigneFinanciere } from '../../../services/machineEncaissement.js';
import { detecterEncaissement } from '../../../voice-offline/grammaireEncaissement.js';
import { intentLocal } from '../../../voice-offline/localIntent.js';
import { PHRASES_T1 } from '../../../voice-offline/vocabulaire.js';
import * as dialogues from '../../../services/dialoguesTata.js';
import { phraseLigneAjoutee, phraseRelecture as relectureSpontanee } from '../../../services/relectureSpontanee.js';
import { vendreVocalUnifie, type DependancesVendreVocalUnifie } from '../../../services/vendreVocalUnifie.js';
import { phraseReponse, type QuestionCaisse } from '../../../services/intentionsCaisse.js';
import { direCoupure, COUPURES } from '../../../utils/fcfa.js';
import { messageRupture } from '../../../services/ruptureStock.js';
import { creerLigneProvisoire } from '../../../services/ligneProvisoire.js';

/** Empreintes relevées sur 576fd62 (base du lot). */
export const EMPREINTES_BASE = {
  machine: '5e0a499ca8313f722d00d38e641837dbbb4e0d6901cf9d51e98256128f0ff52b',
  // Recalculée sur la SOURCE de 576fd62 avec la formule « par locale » (I18N-01) :
  // la fonction de base ignore le second argument, donc chaque locale y répond
  // comme fr-ci. L'ancienne valeur (corpus historique seul) était 0dd33503….
  grammaire: '63edc90fc7e3b924064fd15f0a94038ec1e9626d90602b62eaccebd8a0e2aa9d',
  intentLocal: 'f6c8bc76ebd92dcccddb9424b86ab749d70b3053db3c8dfccd07535d90dcaedd',
  dialogues: '89f1731f9425dede5d23e1a1958a79685b54c959cb8c6dba3e39d23c23c017b7',
  relecture: 'dcb722cc97358781a2a3eb0e2d58b89bee9c5dd6051dc90c0bf03a17bc64dd89',
  // REFIGÉE le 21/09/2026 — la seule empreinte de cette table qui ne vienne
  // plus de 576fd62, et c'est VOULU : le comportement de `vendreVocalUnifie` a
  // dû changer, parce qu'il était faux sur l'argent. Autorisation explicite de
  // Patrick pour ce correctif.
  //
  // CE QUI A ÉTÉ CORRIGÉ. Tout montant dicté était lu comme le TOTAL de la
  // vente. « Trois tas de tomates à 500 », catalogue à 500 le tas, entrait au
  // panier pour 500 F — le tiers. C'est désormais la GRAMMAIRE qui décide
  // (« à » → unitaire, « pour » ou une négociation → le lot), puis le
  // catalogue, puis la quantité 1 ; et ce que rien ne tranche n'est plus
  // deviné : il est DEMANDÉ.
  //
  // CE QUI BOUGE DANS LE CORPUS — vérifié ligne à ligne, 1 cas sur 10 :
  //   ['banane', 2, 400, 'regimes'] : produit INCONNU du catalogue, aucune
  //   préposition dans l'appel, quantité 2. 400 peut valoir 400 ou 800.
  //   AVANT : une ligne entrait au panier à 400 (200 l'unité), sans que rien
  //   ne le justifie. APRÈS : aucune ligne, aucun franc, et Tata pose la
  //   question — « 400 francs, c'est le prix d'un seul, ou de tous les 2 ? »
  //   (clé TATA_AMBIGUITE, critiqueArgent). C'est le cœur de la décision :
  //   on ne devine pas sur son argent.
  //
  // CE QUI NE BOUGE PAS, et qui est la preuve que le correctif est ciblé :
  //   ['tomate', 3, 1500, 'tas'] (guidage on ET off) reste à 1 500 — le
  //   catalogue confirme 3 × 500 ;
  //   les deux cas sans montant dicté (prix du catalogue), les deux refus
  //   d'unité incompatible, les deux prix manquants, et ['attiéké', 1, 100]
  //   (quantité 1 : les deux lectures donnent le même nombre) sont identiques.
  //
  // Les neuf autres empreintes de cette table sont INCHANGÉES et restent
  // celles de 576fd62 — `intentLocal` comprise : la lecture du montant est
  // portée par `extraction`, pas par l'intention locale.
  vendreVocal: '6aee0b5fd505fe3714bbe257bf311b832ba9e922d21fb08b81d6e87a263da700',
  questions: '3fb1e9e82b3b2c0dad9586a360419b0d7b18a5403ca6a42fce5e0c9d08621d7e',
  // Recalculée sur la source de 576fd62 après correction du corpus (la
  // première passe itérait les objets `Coupure` au lieu de leurs valeurs) :
  // même méthode, même source, empreinte des valeurs réelles.
  coupures: '398353c4c393fe932e3e9142cf23119a911bfaa46747209e73c50f5331c47ea6',
  rupture: 'aa384a97f5066746c6b36d79cf4efbb6caf8fb788e4ed5c5be3224570c314504',
};

/** Compteurs de l'énumération exhaustive, tels que le test de la machine les affiche. */
export const ENUMERATION_BASE = { conversations: 2_560_000, paiements: 19_312, violations: 0 };

// ── Corpus déterministes ─────────────────────────────────────────────────────

const TOMATES: LigneFinanciere = { productId: 'tomate', quantite: 4, total: 2000 };
const OIGNONS: LigneFinanciere = { productId: 'oignon', quantite: 2, total: 2000 };
const PIMENT: LigneFinanciere = { productId: 'piment', quantite: 1, total: 2000 };

function fin(lignes: LigneFinanciere[], recu: number): EtatFinancier {
  const total = lignes.reduce((s, l) => s + l.total, 0);
  return {
    panierVide: lignes.length === 0, total, recu,
    monnaie: Math.max(0, recu - total),
    suffisant: recu > 0 && recu >= total,
    empreinte: { total, recu, lignes: empreintePanier(lignes) },
  };
}

/** Le même espace que la section [9] du test de la machine. */
export function empreinteMachine(): { hash: string; conversations: number; paiements: number; violations: number } {
  const EVENEMENTS: EvenementEncaissement[] = ['encaisser', 'combien_doit', 'oui_valide', 'annuler_validation', 'etat_financier_change'];
  const FINS: EtatFinancier[] = [
    fin([], 0), fin([TOMATES], 0), fin([TOMATES], 1000), fin([TOMATES], 2000), fin([TOMATES], 5000),
    fin([TOMATES, OIGNONS], 5000), fin([TOMATES, OIGNONS, PIMENT], 5000), fin([TOMATES, OIGNONS, PIMENT], 10000),
  ];
  const h = createHash('sha256');
  let conversations = 0, paiements = 0, violations = 0;
  const PROFONDEUR = 4;
  const explorer = (etat: EtatEncaissement, trace: Array<{ f: EtatFinancier; effet: EffetEncaissement; apres: EtatEncaissement }>) => {
    if (trace.length === PROFONDEUR) { conversations++; return; }
    for (let ie = 0; ie < EVENEMENTS.length; ie++) for (let jf = 0; jf < FINS.length; jf++) {
      const ev = EVENEMENTS[ie];
      const f = FINS[jf];
      const r = reduire(etat, ev, f);
      const texte = r.effet.type === 'rien' ? '' : r.effet.texte;
      h.update(`${ie}${jf}|${r.etat.phase}|${r.etat.phase === 'attente_confirmation' ? r.etat.empreinte.lignes + r.etat.empreinte.total + r.etat.empreinte.recu : ''}|${r.effet.type}|${texte}\n`);
      const t = [...trace, { f, effet: r.effet, apres: r.etat }];
      if (r.effet.type === 'encaisser') {
        paiements++;
        const bienGarde = ev === 'oui_valide' && etat.phase === 'attente_confirmation'
          && etat.empreinte.total === f.empreinte.total && etat.empreinte.recu === f.empreinte.recu && etat.empreinte.lignes === f.empreinte.lignes
          && !f.panierVide && f.suffisant && f.total > 0;
        let relu = false;
        for (let k = trace.length - 1; k >= 0; k--) {
          const pas = trace[k];
          if (pas.apres.phase !== 'attente_confirmation') break;
          if (pas.effet.type === 'dire' && pas.effet.texte.endsWith('Je valide ?') && pas.f.empreinte.lignes === f.empreinte.lignes && pas.f.empreinte.total === f.empreinte.total && pas.f.empreinte.recu === f.empreinte.recu) { relu = true; break; }
        }
        if (!bienGarde || !relu) violations++;
      }
      explorer(r.etat, t);
    }
  };
  explorer(ETAT_INITIAL, []);
  return { hash: h.digest('hex'), conversations, paiements, violations };
}

/** Corpus de la grammaire : les phrases du test + une grille combinatoire fixe. */
export function corpusGrammaire(): string[] {
  const base = [
    'encaisse', 'on encaisse', 'Encaisse !', 'on encaisse ça', 'encaisse maintenant', "j'encaisse", 'bon, on encaisse', 'encaisser', 'termine la vente', 'finis la vente',
    'combien elle doit ?', 'combien elle doit', 'combien il doit', 'elle doit combien', 'ça fait combien', "c'est combien", 'le total', 'total', 'mon total', 'combien la cliente doit',
    'oui valide', 'oui, valide', 'Oui, valide !', '  oui   valide  ', 'oui je valide', 'ouais valide', 'ouais je valide', 'oui validé', "oui c'est bon valide", "oui c’est bon valide", 'oui on valide', 'oui valide ça', 'valide oui',
    'oui', 'ouais', "d'accord", 'ok', "c'est bon", "ouais c'est ça", 'valide', 'validé', 'je valide', 'ok valide', 'ça va valider', 'voilà, valide', 'oui je regarderai si je valide demain', 'bonjour', '', '   ', 'fini', "c'est tout", 'voilà',
    'oui je valide pas', 'oui valide pas', 'oui, je valide pas', 'oui valide la dépense', 'ma cliente a dit oui valide', 'oui je valide mon panier plus tard', 'oui valide rien', 'oui je ne valide plus', 'jamais valide', 'oui valide pour elle', 'bon oui valide', 'oui valide merci', 'oui valide oui valide',
    'oui valide non', 'non oui valide', 'oui valide, attends', 'non, pas valide', 'non', 'non non', 'non valide', 'annule', 'attends', 'arrête', 'pas encore', 'laisse', 'oui valide, non attends',
    'vends 3 tomates à 500 francs', 'vends 2 tas de piment', "deux kilos d'oignons à 1000", "j'ai dépensé 1000 pour le taxi", "combien j'ai vendu aujourd'hui", "combien j'ai gagné aujourd'hui", 'quel est mon bénéfice', 'ma meilleure vente',
    'encaisse deux tomates à 500', 'encaisse la vente', 'encaisse 500', 'attends, vends deux tomates à 500 francs', 'oui valide', 'oui  valide', 'οui valide', 'oui valide.', 'OUI VALIDE', 'Oui je valide',
  ];
  const prefixes = ['', 'oui ', 'non ', 'bon ', 'attends ', 'ma cliente dit ', 'euh '];
  const noyaux = ['encaisse', 'valide', 'oui valide', 'je valide', 'combien elle doit', 'total', "c'est combien", 'termine la vente', 'finis', 'laisse', 'arrête', 'pas encore', 'ça fait combien', 'oui on valide', 'valide oui'];
  const suffixes = ['', ' ça', ' la vente', ' pas', ' 500', ' merci', ' oui'];
  const grille: string[] = [];
  for (const p of prefixes) for (const n of noyaux) for (const s of suffixes) grille.push(`${p}${n}${s}`);
  return [...base, ...grille];
}

/**
 * Locales sous lesquelles la grammaire doit répondre comme fr-ci tant
 * qu'elles n'ont pas leurs propres intentions validées (I18N-01) : les
 * squelettes livrés, la préférence bambara, et une locale inconnue.
 */
export const LOCALES_EMPREINTE = ['fr-ci', 'dyu-ci', 'bci', 'any', 'bm', 'xx-inconnue'] as const;

/** Phrases du contre-audit I18N-01 : apostrophes droites/courbes, accents, ponctuation, espace insécable. */
export function corpusLocales(): string[] {
  return [
    "oui c'est bon valide", 'oui c’est bon valide', "c'est combien", 'c’est combien', 'oui valide ça', 'oui valide ca', 'Oui, valide !',
    'oui\u00a0valide', 'arrête', 'arrete', 'ça fait combien', 'non, pas valide', 'encaisse', 'on encaisse', 'termine la vente', 'combien elle doit ?',
    'elle doit combien', 'le total', 'oui', 'valide', 'ouais je valide', 'oui je valide pas', 'attends', 'pas encore', 'vends 3 tomates à 500 francs',
    "j'ai dépensé 1000 pour le taxi", 'oui validé', 'Encaisse !', 'ok valide', 'oui valide, non attends',
  ];
}

/**
 * Deux volets : (1) le corpus historique, appelé SANS locale (identique à
 * l'étape 0) ; (2) le corpus I18N-01, appelé AVEC chaque locale — sur la
 * source de 576fd62 (qui ignore le second argument) il donne la réponse fr-ci
 * pour chaque locale : c'est cette valeur qui est figée, et que la migration
 * doit rendre pour toute locale sans variantes validées.
 */
export function empreinteGrammaire(): string {
  const h = createHash('sha256');
  for (const phrase of corpusGrammaire()) h.update(`${phrase}→${String(detecterEncaissement(phrase))}\n`);
  for (const locale of LOCALES_EMPREINTE) for (const phrase of corpusLocales()) h.update(`${locale}|${phrase}→${String(detecterEncaissement(phrase, locale))}\n`);
  return h.digest('hex');
}

export function empreinteIntentLocal(): string {
  const h = createHash('sha256');
  const corpus = [
    ...PHRASES_T1.map((p) => p.texte),
    ...corpusGrammaire(),
    'vends 2 tomate à 500 francs', 'vends 1 tomate à 500 francs', 'vends 3 riz à 500 francs', 'dépense de 1000 francs pour le taxi', 'bonjour',
    'un tas de piment', 'deux tas de gombo', 'trois tomates', "j'ai dépensé pour le transport", 'vends des bananes', 'j\'ai vendu deux mille de poisson',
  ];
  for (const phrase of corpus) h.update(`${phrase}→${JSON.stringify(intentLocal(phrase))}\n`);
  return h.digest('hex');
}

/** Lignes types : unitaire, total, prix flou, sans unité, unité « unité », kg, sacs. */
function lignesTypes() {
  return [
    creerLigneProvisoire({ nomParle: 'tomate', quantite: 3, montant: 500, prixExplicite: 'unitaire', unite: 'tas' }, { produitId: 'p1', nomCatalogue: 'tomate', prixCatalogue: 500, unite: 'tas' }, { id: 'l1', creeLe: '2026-09-20T00:00:00Z' }),
    creerLigneProvisoire({ nomParle: 'riz', quantite: 1, montant: 14000, prixExplicite: 'total', unite: 'cuvette' }, { produitId: 'p2', nomCatalogue: 'riz', prixCatalogue: null, unite: 'cuvette' }, { id: 'l2', creeLe: '2026-09-20T00:00:00Z' }),
    creerLigneProvisoire({ nomParle: 'gombo', quantite: 2, montant: 1500 }, { produitId: null }, { id: 'l3', creeLe: '2026-09-20T00:00:00Z' }),
    creerLigneProvisoire({ nomParle: 'attiéké', quantite: 2, montant: 200, prixExplicite: 'unitaire', unite: 'unité' }, { produitId: null }, { id: 'l4', creeLe: '2026-09-20T00:00:00Z' }),
    creerLigneProvisoire({ nomParle: 'Riz local', quantite: 2, montant: 900, prixExplicite: 'unitaire', unite: 'kg' }, { produitId: 'p3', nomCatalogue: 'Riz local', prixCatalogue: 900, unite: 'kg' }, { id: 'l5', creeLe: '2026-09-20T00:00:00Z' }),
    creerLigneProvisoire({ nomParle: 'riz', quantite: 3, montant: 30000, prixExplicite: 'total', unite: 'sac' }, { produitId: null }, { id: 'l6', creeLe: '2026-09-20T00:00:00Z' }),
    creerLigneProvisoire({ nomParle: 'banane plantain', quantite: 1, montant: 100, prixExplicite: 'unitaire' }, { produitId: null }, { id: 'l7', creeLe: '2026-09-20T00:00:00Z' }),
  ];
}

export function empreinteDialogues(): string {
  const h = createHash('sha256');
  // Sur 576fd62 c'étaient des constantes exportées (INVITE…) ; ce sont
  // désormais des fonctions (invite()…) — on hache la VALEUR, sous le même label.
  const constante = (v: unknown) => (typeof v === 'function' ? (v as () => string)() : String(v));
  const NOMS: Array<[string, string]> = [['INVITE', 'invite'], ['RIEN_COMPRIS', 'rienCompris'], ['AJOUT_PANIER', 'ajoutPanier'], ['ANNULATION_ETAPE', 'annulationEtape'], ['ERREUR_MOTEUR', 'erreurMoteur']];
  for (const [label, nouveau] of NOMS) {
    const d = dialogues as Record<string, unknown>;
    h.update(`${label}=${constante(d[label] ?? d[nouveau])}\n`);
  }
  h.update(`prixManquant=${dialogues.phrasePrixManquant()}\n`);
  for (const nom of ['tomate', 'ce produit', '', 'banane plantain']) h.update(`quantiteManquante(${nom})=${dialogues.phraseQuantiteManquante(nom)}\n`);
  for (const [q, m] of [[3, 1500], [1, 500], [12, 12500]] as const) h.update(`ambiguite(${q},${m})=${dialogues.phraseAmbiguite(q, m)}\n`);
  for (const l of lignesTypes()) {
    h.update(`resumeQuantite=${dialogues.resumeQuantite(l)}|resumeLigne=${dialogues.resumeLigne(l)}|confirmation=${dialogues.phraseConfirmation(l)}|correction=${dialogues.phraseCorrectionRecue(l)}\n`);
  }
  for (const args of [
    { nom: 'tomate', quantite: 3, total: 1500, unite: 'tas' }, { nom: 'tomate', quantite: 2, total: 1000, unite: null }, { nom: 'tomate', quantite: 1, total: 500, unite: 'unité' },
    { nom: 'riz', quantite: 2, total: 1800, unite: 'kg' }, { nom: 'banane plantain', quantite: 5, total: 2500 }, { nom: 'gombo', quantite: 3, total: 300, unite: 'tas' },
  ]) h.update(`compris=${dialogues.phraseCompris(args)}\n`);
  return h.digest('hex');
}

export function empreinteRelecture(): string {
  const h = createHash('sha256');
  const etats = [
    { total: 1500, recu: 2000, nbLignes: 2 }, { total: 1500, recu: 1500, nbLignes: 2 }, { total: 1500, recu: 1000, nbLignes: 2 },
    { total: 1500, recu: 0, nbLignes: 2 }, { total: 0, recu: 0, nbLignes: 0 }, { total: 12500, recu: 15000, nbLignes: 3 }, { total: 1000, recu: 2000, nbLignes: 1 },
  ];
  for (const e of etats) for (const p of [null, ...etats]) h.update(`${JSON.stringify(e)}|${JSON.stringify(p)}→${relectureSpontanee(e, p)}\n`);
  for (const l of [
    { nom: 'tomate', quantite: 3, unite: 'tas', totalLigne: 1500, totalPanier: 4000 }, { nom: 'tomate', quantite: 2, unite: null, totalLigne: 1000, totalPanier: 1000 },
    { nom: 'tomate', quantite: 1, unite: 'unité', totalLigne: 500, totalPanier: 500 }, { nom: 'riz', quantite: 2, unite: 'kg', totalLigne: 1800, totalPanier: 5300 },
    { nom: 'gombo', quantite: 0, unite: 'tas', totalLigne: 100, totalPanier: 100 }, { nom: 'Autre article', quantite: 1, unite: 'unité', totalLigne: 12500, totalPanier: 12500 },
  ]) h.update(`ligne=${phraseLigneAjoutee(l)}\n`);
  return h.digest('hex');
}

export function empreinteVendreVocal(): string {
  const h = createHash('sha256');
  const produits = [
    { id: 'p-tomate', nom: 'Tomate', prix: 500, stock: 10, unite: 'tas', categorie: 'Légumes' },
    { id: 'p-piment', nom: 'Piment', prix: 500, stock: 10, unite: 'kg', categorie: 'Légumes' },
    { id: 'p-gombo', nom: 'Gombo', prix: 0, stock: 10, unite: 'tas', categorie: 'Légumes' },
  ];
  const cas: Array<[string | undefined, number, number, string | null | undefined, boolean]> = [
    ['tomate', 3, 1500, 'tas', true], ['tomate', 2, 0, null, true], ['piment', 1, 0, 'tas', true], ['gombo', 1, 0, null, true], ['banane', 2, 0, null, true],
    ['banane', 2, 400, 'regimes', true], [undefined, 1, 0, null, true], ['tomate', 3, 1500, 'tas', false], ['tomate', 4, 0, 'kilos', true], ['attiéké', 1, 100, null, true],
  ];
  for (const [nom, q, montant, unite, guidage] of cas) {
    const dits: string[] = [];
    const ajouts: unknown[] = [];
    const planifies: Array<() => void> = [];
    const deps: DependancesVendreVocalUnifie = {
      products: produits,
      addToCart: (p, qte, totalExact, origine) => { ajouts.push({ p: { ...p, id: p.id.startsWith('libre-') ? 'libre-X' : p.id }, qte, totalExact, origine }); },
      speak: (t) => { dits.push(t); },
      vibrerSucces: () => {},
      notifierAjoutPanier: (m) => { dits.push(`toast:${m}`); },
      proposerCreationProduit: (p) => { dits.push(`proposition:${JSON.stringify(p)}`); },
      stockage: { getItem: () => null, setItem: () => {} },
      estEnLigne: () => true,
      creerIdLigne: () => 'X',
      planifier: (effet) => { planifies.push(effet); },
      guidageVocalActif: () => guidage,
    };
    vendreVocalUnifie(nom, q, montant, deps, unite);
    for (const e of planifies) e();
    h.update(`${nom}|${q}|${montant}|${unite}|${guidage}→${JSON.stringify(dits)}|${JSON.stringify(ajouts)}\n`);
  }
  return h.digest('hex');
}

export function empreinteQuestions(): string {
  const h = createHash('sha256');
  const chiffres = [
    { ventes: 12500, depenses: 3000, caisse: 15000, nombreVentes: 7, topProduit: { nom: 'Tomate', quantite: 12 } },
    { ventes: 500, depenses: 0, nombreVentes: 1 }, { ventes: 0, depenses: 0 }, { ventes: 2000, depenses: 500 }, { ventes: 1000, depenses: 4000 },
    { ventes: 3000, depenses: 1000, topProduit: { nom: 'Piment' } }, { ventes: 0, depenses: 200, caisse: 0 },
  ];
  for (const q of ['ventes_jour', 'depenses_jour', 'solde_caisse', 'benefice_jour', 'meilleure_vente'] as QuestionCaisse[]) for (const c of chiffres) h.update(`${q}|${JSON.stringify(c)}→${phraseReponse(q, c)}\n`);
  return h.digest('hex');
}

export function empreinteCoupures(): string {
  const h = createHash('sha256');
  for (const v of [...COUPURES.map((c) => c.valeur), 25, 250, 15000, 75]) h.update(`${v}→${direCoupure(v)}\n`);
  return h.digest('hex');
}

export function empreinteRupture(): string {
  const h = createHash('sha256');
  for (const r of [[], [{ nom: 'tomate', manquant: 2 }], [{ nom: 'tomate', manquant: 2 }, { nom: 'oignon', manquant: 1 }], [{ nom: 'a', manquant: 1 }, { nom: 'b', manquant: 2 }, { nom: 'c', manquant: 3 }]]) {
    h.update(`${JSON.stringify(r)}→${messageRupture(r)}\n`);
  }
  return h.digest('hex');
}

export function calculerEmpreintes() {
  const machine = empreinteMachine();
  return {
    machine: machine.hash, enumeration: { conversations: machine.conversations, paiements: machine.paiements, violations: machine.violations },
    grammaire: empreinteGrammaire(), intentLocal: empreinteIntentLocal(), dialogues: empreinteDialogues(), relecture: empreinteRelecture(),
    vendreVocal: empreinteVendreVocal(), questions: empreinteQuestions(), coupures: empreinteCoupures(), rupture: empreinteRupture(),
  };
}

// ── Exécution ────────────────────────────────────────────────────────────────
const estPrincipal = process.argv[1] && /empreintesArgent\.mts$/.test(process.argv[1]);
if (estPrincipal) {
  const e = calculerEmpreintes();
  if (process.argv.includes('--calculer')) {
    console.log(JSON.stringify(e, null, 2));
  } else {
    let echecs = 0;
    const ok = (cond: boolean, quoi: string) => { if (cond) console.log('  ✓', quoi); else { console.log('  ✗', quoi); echecs++; } };
    console.log('\n[gate 8] Comportement des modules d\'argent identique à 576fd62');
    ok(e.enumeration.conversations === ENUMERATION_BASE.conversations && e.enumeration.paiements === ENUMERATION_BASE.paiements && e.enumeration.violations === ENUMERATION_BASE.violations,
      `énumération exhaustive : ${e.enumeration.conversations} conversations / ${e.enumeration.paiements} paiements / ${e.enumeration.violations} violation(s)`);
    for (const nom of Object.keys(EMPREINTES_BASE) as Array<keyof typeof EMPREINTES_BASE>) {
      ok(e[nom] === EMPREINTES_BASE[nom], `${nom} : empreinte ${e[nom].slice(0, 16)}… ${e[nom] === EMPREINTES_BASE[nom] ? '=' : '≠'} base ${EMPREINTES_BASE[nom].slice(0, 16)}…`);
    }
    console.log(echecs === 0 ? '\nLes modules d\'argent répondent exactement comme avant le lot i18n.' : `\n${echecs} empreinte(s) différente(s) : un comportement a changé.`);
    if (echecs > 0) process.exit(1);
  }
}
