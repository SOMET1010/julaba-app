/**
 * ══════════════════════════════════════════════════════════════════════════
 * BANC TERRAIN — le parcours de la marchande, écran par écran, dans l'ordre.
 * ══════════════════════════════════════════════════════════════════════════
 *
 *   cd frontend_src && node apercu-caisse/banc-terrain.mjs
 *
 * POURQUOI CE BANC EXISTE. Nos bancs ont déclaré DEUX FOIS un parcours vert
 * alors qu'il était mort sur le téléphone. Ils vérifiaient qu'une intention
 * partait et qu'un panier contenait trois lignes. Ils ne demandaient jamais si
 * une marchande COMPREND l'écran. Celui-ci pose, à chaque écran du parcours,
 * les trois questions qu'une personne pose en dix secondes :
 *
 *   1. EST-IL DANS LA CHARTE ?  jetons `--caisse-*` contre couleurs en dur
 *      dans les fichiers RÉELLEMENT montés par cet écran.
 *   2. PARLE-T-IL ?  non pas « le source contient un appel à la voix », mais
 *      QUELLES PHRASES SONT RÉELLEMENT DEMANDÉES au moteur audio au montage et
 *      à chaque geste — et ce qu'il en advient (jouée, refusée, échouée).
 *   3. MÈNE-T-IL QUELQUE PART ?  chaque élément visible qui a l'air touchable
 *      est TOUCHÉ, et l'on regarde si quelque chose bouge. Un bouton sans
 *      gestionnaire, une carte décorative, une confirmation qui ne fait rien
 *      ensuite : le banc les voit, parce qu'il touche vraiment.
 *
 * CE QUI LE SÉPARE DU BANC PRÉCÉDENT (`apercu-caisse/capture.mjs`). Celui-là
 * remplaçait CaisseContext et AppContext par des stubs, dont l'état PAR DÉFAUT
 * était peuplé : 8 produits, un panier de 3 lignes, 12 500 F de caisse. Il
 * mesurait donc un écran que l'application ne rend pour personne. Ici :
 *   • AUCUN stub, AUCUN alias — la vraie application, le vrai routeur, les
 *     vrais contextes (`apercu-caisse/banc-terrain/vite.config.ts`) ;
 *   • LE CATALOGUE EST VIDE et la caisse à zéro, par défaut — le cas de
 *     Patrick, celui d'une marchande qui ouvre l'application la première fois.
 *     Si un écran ne marche que peuplé, c'est un défaut, pas une excuse ;
 *   • aucune requête ne sort de la machine : ce qui manque manque pour de vrai.
 *
 * CE QU'IL NE PROUVE PAS. Il ne juge pas le SON (headless : rien n'est
 * audible ; il lit ce que le moteur a demandé et ce qu'il en a fait). Il ne
 * reconnaît pas la parole (pas de micro). Il ne juge pas la beauté.
 *
 * VARIABLES :
 *   PW_CHROMIUM           exécutable Chromium (déjà présent, rien n'est installé)
 *   BANC_SORTIE           dossier des captures (défaut docs/parcours/captures/banc-terrain)
 *   BANC_MAX_ELEMENTS     éléments touchés par écran (défaut 24)
 *   BANC_SEUIL_CHARTE     part minimale de jetons de charte (défaut 0.5)
 *   BANC_ECRANS=1,4       ne juger que ces écrans, dans l'ordre du parcours
 *   VITE_JULABA_VOICE_PREVIEW=true   rejoue avec les clips « prototype » actifs
 *
 * Sortie 1 dès qu'un écran du parcours est MUET, mène NULLE PART, ou tombe
 * sous le seuil de charte.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ici = dirname(fileURLToPath(import.meta.url));
const racine = resolve(ici, '..');               // frontend_src
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const PORT = 5197;
const ORIGINE = `http://127.0.0.1:${PORT}`;
const VIEWPORT = { width: 390, height: 844 };
const EXECUTABLE = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SORTIE = process.env.BANC_SORTIE
  || resolve(racine, '..', 'docs', 'parcours', 'captures', 'banc-terrain');
const MAX_ELEMENTS = Number(process.env.BANC_MAX_ELEMENTS || 24);
// La couronne compte 25 écrans : les toucher tous à 24 éléments, c'est ~600
// démarrages de navigateur. On en examine moins par écran, et le rapport DIT
// combien n'ont pas été examinés — un banc qui tronque en silence ment.
const MAX_COURONNE = Number(process.env.BANC_COURONNE_MAX || 12);
const plafond = station => (station.rang === 'couronne' ? MAX_COURONNE : MAX_ELEMENTS);
const SEUIL_CHARTE = Number(process.env.BANC_SEUIL_CHARTE || 0.5);

// ═══════════════════════════════════════════════════════════════════════════
// A. LE PARCOURS — dans l'ordre. On ne juge pas l'écran 5 avant l'écran 4.
// ═══════════════════════════════════════════════════════════════════════════
//
// `semences` : ce que le téléphone SAIT DÉJÀ en arrivant sur cet écran. Ce sont
// les mêmes clés que l'application écrit elle-même (EntryGate, AppContext) —
// on ne fabrique aucun état qu'elle ne produirait pas. La session marchande est
// celle d'un compte CACHÉ (AppContext garde la session en cache quand le réseau
// est mort) : sans réseau, c'est le seul chemin, et c'est le chemin du marché.
//
// `sources` : les fichiers que CET écran monte réellement. C'est sur eux, et
// pas sur un dossier entier, que la charte est comptée.

const MARCHANDE = {
  id: 'banc-terrain-marchande',
  role: 'marchand',
  firstName: 'Awa',
  lastName: 'Koné',
  phone: '0700000000',
  genre: 'femme',
  validated: true,
  estMembreCooperative: false,
};

const SPLASH_VU = { julaba_seen_splash: 'true' };
const ONBOARDING_FAIT = { ...SPLASH_VU, julaba_completed_onboarding: 'true' };
const SESSION_MARCHANDE = {
  ...ONBOARDING_FAIT,
  julaba_auth_user: JSON.stringify(MARCHANDE),
};

const TRONC = [
  {
    n: 1,
    id: 'entree-akwaba',
    rang: 'tronc',
    titre: 'Entrée — Akwaba (premier écran du téléphone)',
    chemin: '/',
    semences: {},
    preuve: "Ton commerce",
    sources: ['src/app/components/auth/Welcome.tsx'],
  },
  {
    n: 2,
    id: 'entree-presentation',
    rang: 'tronc',
    titre: 'Entrée — Tantie Nanti Lou se présente',
    chemin: '/',
    semences: SPLASH_VU,
    preuve: "Moi, c'est Tantie Nanti Lou.",
    sources: ['src/app/components/auth/OnboardingSlides.tsx'],
  },
  {
    n: 3,
    id: 'entree-numero',
    rang: 'tronc',
    titre: 'Entrée — Ton numéro (connexion)',
    chemin: '/',
    semences: ONBOARDING_FAIT,
    preuve: 'Ton numéro',
    sources: ['src/app/components/auth/LoginPassword.tsx'],
  },
  {
    n: 4,
    id: 'accueil-marchand',
    rang: 'tronc',
    titre: 'Accueil marchand — le comptoir',
    chemin: '/marchand',
    semences: SESSION_MARCHANDE,
    preuve: 'Vendre',
    sources: [
      'src/app/components/marchand/MarchandHome.tsx',
      'src/app/components/marchand/MarchandAccueilVoice.tsx',
      'src/app/components/layout/AppLayout.tsx',
    ],
  },
  {
    n: 5,
    id: 'caisse',
    rang: 'tronc',
    titre: 'Caisse — la surface de vente',
    chemin: '/marchand/caisse',
    semences: SESSION_MARCHANDE,
    preuve: 'Que voulez-vous vendre ?',
    sources: [
      'src/app/components/marchand/POSCaisse.tsx',
      'src/app/components/marchand/MicroVenteCaisse.tsx',
      'src/app/components/marchand/ChoixUnite.tsx',
    ],
    // L'état de la VENTE, lu à l'écran : c'est le seul juge du piège de la
    // confirmation (« J'ai compris : Trois tomates » qui ne fait rien ensuite).
    etatMetier: `() => {
      const t = document.body.innerText || '';
      const m = t.match(/Total[^0-9]{0,20}([0-9][0-9  ]*)\\s*F/i);
      const lignes = document.querySelectorAll('[class*="panier"] li, [class*="panier-ligne"]').length;
      return (m ? m[1].replace(/\\s/g, '') : 'sans-total') + '/' + lignes;
    }`,
  },
];

// ── LA COURONNE ─────────────────────────────────────────────────────────────
//
// Les écrans du TRONC (1 à 5) forment une chaîne : on ne juge pas le 5 avant le
// 4, et un écran raté arrête tout — c'est le chemin qu'une marchande PARCOURT.
// Les autres ne forment pas une chaîne : ce sont les portes qui s'ouvrent depuis
// le comptoir, en étoile. Chacune se juge SEULE, et une porte fermée n'empêche
// pas de regarder les suivantes — sinon le banc n'aurait jamais donné la carte
// complète, seulement le premier trou.
//
// Les PREUVES ci-dessous ne sont pas écrites de tête : elles viennent du relevé
// de `apercu-caisse/banc-terrain/reconnaitre.mjs`, qui a ouvert chaque route
// et lu ce que l'écran affiche vraiment. Si une route change, on relance la
// reconnaissance — on ne devine pas un nouveau texte.
//
// `sources` porte aussi AppLayout : il est RÉELLEMENT monté sous /marchand (il
// dessine l'en-tête et la barre du bas). Le taire ferait mesurer un écran que
// personne ne voit.

const COURONNE = [
  {
    n: 6,
    id: 'cahier',
    rang: 'couronne',
    titre: 'Cahier de dépenses',
    chemin: '/marchand/cahier',
    semences: SESSION_MARCHANDE,
    preuve: "Mes dépenses",
    sources: [
      'src/app/components/marchand/MarchandDepenses.tsx',
      'src/app/components/layout/AppLayout.tsx',
    ],
  },
  {
    n: 7,
    id: 'depense',
    rang: 'couronne',
    titre: 'Noter une dépense',
    chemin: '/marchand/depense',
    semences: SESSION_MARCHANDE,
    preuve: "Quelle dépense ?",
    sources: [
      'src/app/components/marchand/DepenseForm.tsx',
      'src/app/components/layout/AppLayout.tsx',
    ],
  },
  {
    n: 8,
    id: 'stock',
    rang: 'couronne',
    titre: 'Mes produits (stock)',
    chemin: '/marchand/stock',
    semences: SESSION_MARCHANDE,
    preuve: "Mes produits",
    sources: [
      'src/app/components/marchand/GestionStock.tsx',
      'src/app/components/layout/AppLayout.tsx',
    ],
  },
  {
    n: 9,
    id: 'ventes-passees',
    rang: 'couronne',
    titre: 'Ventes passées',
    chemin: '/marchand/ventes-passees',
    semences: SESSION_MARCHANDE,
    preuve: "Ventes passées",
    sources: [
      'src/app/components/marchand/VentesPassees.tsx',
      'src/app/components/layout/AppLayout.tsx',
    ],
  },
  {
    n: 10,
    id: 'resume-caisse',
    rang: 'couronne',
    titre: 'Résumé de la caisse',
    chemin: '/marchand/resume-caisse',
    semences: SESSION_MARCHANDE,
    preuve: "Résumé détaillé",
    sources: [
      'src/app/components/marchand/ResumeCaisse.tsx',
      'src/app/components/layout/AppLayout.tsx',
    ],
  },
  {
    n: 11,
    id: 'commandes',
    rang: 'couronne',
    titre: 'Mes commandes',
    chemin: '/marchand/commandes',
    semences: SESSION_MARCHANDE,
    preuve: "Mes commandes",
    sources: [
      'src/app/components/marchand/MesCommandes.tsx',
      'src/app/components/layout/AppLayout.tsx',
    ],
  },
  {
    n: 12,
    id: 'alertes',
    rang: 'couronne',
    titre: 'Alertes',
    chemin: '/marchand/alertes',
    semences: SESSION_MARCHANDE,
    preuve: "Alertes",
    sources: [
      'src/app/components/marchand/MarchandAlertes.tsx',
      'src/app/components/layout/AppLayout.tsx',
    ],
  },
  {
    n: 13,
    id: 'profil',
    rang: 'couronne',
    titre: 'Mon profil',
    chemin: '/marchand/profil',
    semences: SESSION_MARCHANDE,
    preuve: "Mon profil",
    sources: [
      'src/app/components/marchand/MarchandProfil.tsx',
      'src/app/components/layout/AppLayout.tsx',
    ],
  },
  {
    n: 14,
    id: 'parametres',
    rang: 'couronne',
    titre: 'Paramètres',
    chemin: '/marchand/parametres',
    semences: SESSION_MARCHANDE,
    preuve: "Paramètres",
    sources: [
      'src/app/components/marchand/Parametres.tsx',
      'src/app/components/layout/AppLayout.tsx',
    ],
  },
  {
    n: 15,
    id: 'marche',
    rang: 'couronne',
    titre: 'Marché virtuel',
    chemin: '/marchand/marche',
    semences: SESSION_MARCHANDE,
    preuve: "Marché virtuel",
    sources: [
      'src/app/components/marchand/MarcheVirtuel.tsx',
      'src/app/components/layout/AppLayout.tsx',
    ],
  },
  {
    n: 16,
    id: 'recoltes-prevues',
    rang: 'couronne',
    titre: 'Récoltes prévues',
    chemin: '/marchand/recoltes-prevues',
    semences: SESSION_MARCHANDE,
    preuve: "Récoltes prévues",
    sources: [
      'src/app/components/marchand/RecoltesPrevues.tsx',
      'src/app/components/layout/AppLayout.tsx',
    ],
  },
  {
    n: 17,
    id: 'cooperative',
    rang: 'couronne',
    titre: 'Ma coopérative',
    chemin: '/marchand/cooperative',
    semences: SESSION_MARCHANDE,
    preuve: "Ma coopérative",
    sources: [
      'src/app/components/marchand/MaCooperative.tsx',
      'src/app/components/layout/AppLayout.tsx',
    ],
  },
  {
    n: 18,
    id: 'cooperative-besoin',
    rang: 'couronne',
    titre: 'Soumettre un besoin',
    chemin: '/marchand/cooperative/besoin',
    semences: SESSION_MARCHANDE,
    preuve: "Soumettre un besoin",
    sources: [
      'src/app/components/marchand/BesoinMarchand.tsx',
      'src/app/components/layout/AppLayout.tsx',
    ],
  },
  {
    n: 19,
    id: 'tontines',
    rang: 'couronne',
    titre: 'Mes tontines',
    chemin: '/marchand/tontines',
    semences: SESSION_MARCHANDE,
    preuve: "Mes tontines",
    sources: [
      'src/app/components/marchand/Tontines.tsx',
      'src/app/components/layout/AppLayout.tsx',
    ],
  },
  {
    n: 20,
    id: 'tontine-detail',
    rang: 'couronne',
    titre: 'Une tontine',
    chemin: '/marchand/tontines/1',
    semences: SESSION_MARCHANDE,
    preuve: "Tontine",
    sources: [
      'src/app/components/marchand/TontineDetail.tsx',
      'src/app/components/layout/AppLayout.tsx',
    ],
  },
  {
    n: 21,
    id: 'protection-sociale',
    rang: 'couronne',
    titre: 'Ma protection sociale',
    chemin: '/marchand/protection-sociale',
    semences: SESSION_MARCHANDE,
    preuve: "Ma protection sociale",
    sources: [
      'src/app/components/marchand/ProtectionSociale.tsx',
      'src/app/components/layout/AppLayout.tsx',
    ],
  },
  {
    n: 22,
    id: 'fidelite',
    rang: 'couronne',
    titre: 'Fidélité clients',
    chemin: '/marchand/fidelite',
    semences: SESSION_MARCHANDE,
    preuve: "Fidélité",
    sources: [
      'src/app/components/marchand/Fidelite.tsx',
      'src/app/components/layout/AppLayout.tsx',
    ],
  },
  {
    n: 23,
    id: 'academy',
    rang: 'couronne',
    titre: 'Academy',
    chemin: '/marchand/academy',
    semences: SESSION_MARCHANDE,
    preuve: "Julaba Academy",
    sources: [
      'src/app/components/academy/UniversalAcademy.tsx',
      'src/app/components/layout/AppLayout.tsx',
    ],
  },
  {
    n: 24,
    id: 'keiwa',
    rang: 'couronne',
    titre: 'Keiwa — le portefeuille',
    chemin: '/marchand/keiwa',
    semences: SESSION_MARCHANDE,
    preuve: "Crée ton code PIN",
    sources: [
      'src/app/components/wallet/WalletPage.tsx',
      'src/app/components/layout/AppLayout.tsx',
    ],
  },
  {
    n: 25,
    id: 'keiwa-transfert',
    rang: 'couronne',
    titre: 'Keiwa — transfert',
    chemin: '/marchand/keiwa/transfert',
    semences: SESSION_MARCHANDE,
    preuve: "Transfert",
    sources: [
      'src/app/components/wallet/TransfertPage.tsx',
      'src/app/components/layout/AppLayout.tsx',
    ],
  },
  {
    n: 26,
    id: 'keiwa-paiements',
    rang: 'couronne',
    titre: 'Keiwa — paiements',
    chemin: '/marchand/keiwa/paiements',
    semences: SESSION_MARCHANDE,
    preuve: "Paiements",
    sources: [
      'src/app/components/wallet/PaiementsPage.tsx',
      'src/app/components/layout/AppLayout.tsx',
    ],
  },
  {
    n: 27,
    id: 'keiwa-banque',
    rang: 'couronne',
    titre: 'Keiwa — ma banque',
    chemin: '/marchand/keiwa/banque',
    semences: SESSION_MARCHANDE,
    preuve: "Lier ma banque",
    sources: [
      'src/app/components/wallet/BanquePage.tsx',
      'src/app/components/layout/AppLayout.tsx',
    ],
  },
  {
    n: 28,
    id: 'keiwa-carte',
    rang: 'couronne',
    titre: 'Keiwa — ma carte',
    chemin: '/marchand/keiwa/carte',
    semences: SESSION_MARCHANDE,
    preuve: "Ma carte",
    sources: [
      'src/app/components/wallet/CartePage.tsx',
      'src/app/components/layout/AppLayout.tsx',
    ],
  },
  {
    n: 29,
    id: 'keiwa-historique',
    rang: 'couronne',
    titre: 'Keiwa — transactions',
    chemin: '/marchand/keiwa/historique',
    semences: SESSION_MARCHANDE,
    preuve: "Transactions",
    sources: [
      'src/app/components/wallet/HistoriquePage.tsx',
      'src/app/components/layout/AppLayout.tsx',
    ],
  },
  {
    n: 30,
    id: 'support',
    rang: 'couronne',
    titre: 'Support',
    chemin: '/marchand/support',
    semences: SESSION_MARCHANDE,
    preuve: "Support JÙLABA",
    sources: [
      'src/app/components/shared/SupportPage.tsx',
      'src/app/components/layout/AppLayout.tsx',
    ],
  },
];

const PARCOURS = [...TRONC, ...COURONNE];

// ═══════════════════════════════════════════════════════════════════════════
// B. QUESTION 1 — EST-IL DANS LA CHARTE ?
// ═══════════════════════════════════════════════════════════════════════════
//
// La charte de la caisse, c'est `--caisse-*` dans styles/commerce.css : une
// seule source de vérité pour les couleurs, les polices, les espacements, les
// rayons et la cible tactile de 44 px. Un écran qui écrit `#B74725` à la main
// ne suit pas la charte : il la CONTREDIT en silence, et le jour où la charte
// bouge, il ne bouge pas.
//
// On compte, dans les fichiers que l'écran monte réellement :
//   jetons  = occurrences de `--caisse-…`
//   durs    = couleurs écrites en dur `#rgb` / `#rrggbb`
// La PART = jetons / (jetons + durs). Seuil proposé : 0,5 — la moitié au moins
// des décisions de couleur/mesure passe par la charte. Et un plancher : un
// écran à ZÉRO jeton est hors charte, quelle que soit la part (c'est le cas de
// 28 des 31 écrans atteignables aujourd'hui ; le banc doit le dire, pas le
// taire). Le seuil est déplaçable par BANC_SEUIL_CHARTE : il sert à suivre une
// remontée, jamais à fermer les yeux — il est imprimé dans le rapport.

const RE_JETON = /--caisse-[a-z0-9-]+/gi;
const RE_DUR = /#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi;

function mesurerCharte(station) {
  let jetons = 0, durs = 0;
  const detail = [];
  for (const rel of station.sources) {
    const chemin = resolve(racine, rel);
    if (!existsSync(chemin)) { detail.push({ fichier: rel, absent: true }); continue; }
    const src = readFileSync(chemin, 'utf-8');
    const j = (src.match(RE_JETON) || []).length;
    const d = (src.match(RE_DUR) || []).length;
    jetons += j; durs += d;
    detail.push({ fichier: rel, jetons: j, durs: d });
  }
  const total = jetons + durs;
  const part = total === 0 ? 0 : jetons / total;
  const verdict = jetons === 0
    ? (durs === 0 ? 'hors charte (aucun jeton — feuille tierce)' : 'hors charte (zéro jeton)')
    : part < SEUIL_CHARTE ? 'sous le seuil' : 'dans la charte';
  return { jetons, durs, part, verdict, ok: jetons > 0 && part >= SEUIL_CHARTE, detail };
}

// ═══════════════════════════════════════════════════════════════════════════
// C. LE NAVIGATEUR — une station propre à chaque mesure.
// ═══════════════════════════════════════════════════════════════════════════

const bloquees = new Set();

/** Une lecture de données, c'est un `fetch`/`XHR` — pas un module importé.
 *
 *  PREMIÈRE VERSION, FAUSSE, GARDÉE EN MÉMOIRE : elle reconnaissait l'appel à
 *  son URL, `/api/`. Or le dépôt range ses clients dans `src/app/services/api/`,
 *  et le banc comptait donc six « lectures serveur » sur un écran qui n'avait
 *  fait qu'IMPORTER du code. Tous les écrans devenaient coupables. Le type de
 *  ressource, lui, ne se trompe pas : un module est un `script`, une lecture
 *  est un `fetch`. */
const estLectureDeDonnees = (requete) => {
  const t = requete.resourceType();
  if (t !== 'fetch' && t !== 'xhr') return false;
  // Le service worker va rechercher la coquille de l'application (`/`,
  // `/index.html`) par `fetch` : c'est la page elle-même, pas une donnée.
  const chemin = new URL(requete.url()).pathname;
  return chemin !== '/' && chemin !== '/index.html';
};

async function ouvrirStation(navigateur, station) {
  const lecturesRatees = [];
  const contexte = await navigateur.newContext({
    viewport: VIEWPORT, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR',
  });
  // Rien ne sort de la machine. Une marchande au marché n'a pas de réseau, et
  // l'application doit tenir debout sans lui. Ce qui manque manque pour de vrai.
  await contexte.route('**/*', route => {
    const u = route.request().url();
    if (estLectureDeDonnees(route.request())) lecturesRatees.push(u.split('?')[0].slice(0, 120));
    if (u.startsWith(ORIGINE) || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    bloquees.add(u.split('?')[0]);
    return route.abort();
  });
  // Le téléphone SAIT déjà ceci en arrivant. Écrit avant tout script de la page.
  await contexte.addInitScript(semences => {
    try {
      for (const [k, v] of Object.entries(semences)) localStorage.setItem(k, v);
    } catch { /* mode privé : l'application le supporte, le banc aussi */ }
  }, station.semences);

  const erreurs = [];
  const page = await contexte.newPage();
  page.on('pageerror', e => erreurs.push(String(e && e.message ? e.message : e)));
  page.on('console', m => { if (m.type() === 'error') erreurs.push('[console] ' + m.text().slice(0, 200)); });
  await page.goto(ORIGINE + station.chemin, { waitUntil: 'domcontentloaded' });
  return { contexte, page, erreurs, lecturesRatees };
}

/** Attend la PREUVE que l'écran est là — pas un timer, un texte que la marchande voit. */
async function attendreEcran(page, station) {
  await page.getByText(station.preuve, { exact: false }).first().waitFor({ timeout: 25000 });
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.waitForTimeout(900); // fin des animations d'entrée (motion)
}

// ═══════════════════════════════════════════════════════════════════════════
// D. QUESTION 2 — PARLE-T-IL ?
// ═══════════════════════════════════════════════════════════════════════════
//
// On ne lit pas le source. On lit ce que le moteur audio a REÇU et ce qu'il en
// a fait, par les deux instrumentations existantes (voir banc-terrain/journal.ts).
// Un écran est MUET s'il ne demande rien au montage ET si aucun de ses éléments
// touchés ne demande quoi que ce soit. « Demandé puis refusé » et « demandé puis
// échoué » sont rapportés à part : ce n'est pas la même panne.

const LIRE_VOIX = `() => {
  const b = window.__banc;
  if (!b) return { absent: true };
  b.armer();
  const j = b.journal();
  const demandes = j.filter(e => e.ev === 'TTS_DEMANDE').map(e => ({ api: e.d && e.d.api, texte: (e.d && e.d.texte) || '' }));
  const ignorees = j.filter(e => e.ev === 'TTS_IGNOREE').map(e => ({ source: e.d && e.d.source, raison: e.d && e.d.raison }));
  const fins = j.filter(e => e.ev === 'TTS_FIN').map(e => (e.d && e.d.resultat) || '?');
  const cles = b.cles().map(c => ({ id: c.id, texte: c.texte }));
  return { demandes, ignorees, fins, cles };
}`;

/** `page.evaluate` d'une SOURCE de fonction fléchée : Playwright évalue une
 *  expression, on l'appelle donc explicitement. */
const ev = (page, source) => page.evaluate(`(${source})()`);

const VOIX_VIDE = { demandes: [], ignorees: [], fins: [], cles: [] };

/** Lit les deux journaux. Un geste peut RECHARGER la page (lien, `location.href`) :
 *  l'observation se réinstalle alors, mais plus tard. On laisse un instant, puis
 *  on le DIT au lieu de prétendre que l'écran s'est tu. */
async function lireVoix(page, { tolerant = false } = {}) {
  for (let essai = 0; essai < 3; essai++) {
    const v = await ev(page, LIRE_VOIX).catch(() => ({ absent: true }));
    if (!v.absent) return v;
    await page.waitForTimeout(600);
  }
  if (tolerant) return { ...VOIX_VIDE, perdu: true };
  throw new Error("L'observation du banc n'est pas chargée (journal.ts) — config Vite ?");
}

async function viderVoix(page) {
  await page.evaluate(() => { const b = window.__banc; if (b) { b.vider(); b.armer(); } });
}

// ═══════════════════════════════════════════════════════════════════════════
// E. QUESTION 3 — MÈNE-T-IL QUELQUE PART ?
// ═══════════════════════════════════════════════════════════════════════════
//
// On inventorie ce qui, à l'écran, A L'AIR TOUCHABLE : les vrais contrôles
// (button, lien, rôle bouton, champ) ET ce qui n'en est pas un mais porte un
// curseur « main » — la carte décorative qui trompe l'œil. Puis on TOUCHE, un
// par un, en repartant d'un écran neuf à chaque fois, et on regarde si quelque
// chose bouge : l'adresse, le texte à l'écran, le stockage, la voix.
//
// Une IMPASSE, c'est : rien n'a bougé. Un élément NON ATTEIGNABLE, c'est : le
// doigt ne peut pas l'atteindre (recouvert, hors écran, désactivé sans le dire).
// Et le piège qui nous a coûté deux jours : une CONFIRMATION apparaît
// (« J'ai compris : … ») sans que l'état de la vente change — le banc le voit
// parce qu'il lit l'état de la vente, pas seulement le texte affiché.

const INVENTAIRE = `() => {
  const SEL = 'button, a[href], [role="button"], input:not([type="hidden"]), select, textarea, summary, [contenteditable="true"]';
  const vu = new Set();
  const liste = [];
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    if (r.bottom < -200 || r.top > window.innerHeight + 2000) return false;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return false;
    if (el.closest('[aria-hidden="true"]')) return false;
    return true;
  };
  const nom = (el) => (
    el.getAttribute('aria-label') || (el.innerText || '').trim() || el.getAttribute('title') ||
    el.getAttribute('placeholder') || el.getAttribute('alt') || ''
  ).replace(/\\s+/g, ' ').trim().slice(0, 48);
  // Le sélecteur de profil (components/dev/ProfileSwitcher) n'existe que sous
  // \`import.meta.env.DEV\` : le banc tourne sur un serveur de dev, une marchande
  // ne le verra JAMAIS. On l'écarte pour ne pas compter un bouton qui n'est pas
  // dans l'application livrée — c'est le seul écart, et il est nommé.
  const outilDeDev = (el) => !!el.closest('[class*="z-[9999]"], [class*="z-[10000]"]');
  const pousser = (el, genre) => {
    if (vu.has(el) || outilDeDev(el)) return;
    vu.add(el);
    const r = el.getBoundingClientRect();
    liste.push({
      genre,
      balise: el.tagName.toLowerCase(),
      nom: nom(el) || '(sans nom)',
      largeur: Math.round(r.width), hauteur: Math.round(r.height),
      desactive: !!(el.disabled || el.getAttribute('aria-disabled') === 'true'),
      dansEcran: r.top >= 0 && r.bottom <= window.innerHeight,
    });
    el.setAttribute('data-banc', String(liste.length - 1));
  };
  document.querySelectorAll(SEL).forEach(el => { if (visible(el)) pousser(el, 'controle'); });
  // Ce qui a l'air cliquable sans être un contrôle : le doigt y va quand même.
  document.querySelectorAll('div,span,section,article,li,img,p,h1,h2,h3,strong,em').forEach(el => {
    if (!visible(el) || el.closest(SEL)) return;
    if (getComputedStyle(el).cursor !== 'pointer') return;
    let p = el.parentElement;
    while (p) { if (vu.has(p)) return; p = p.parentElement; }
    pousser(el, 'faux-air-cliquable');
  });
  return liste;
}`;

const EMPREINTE = `() => {
  const h = (s) => { let x = 5381; for (let i = 0; i < s.length; i++) x = ((x * 33) ^ s.charCodeAt(i)) >>> 0; return x.toString(36); };
  const root = document.getElementById('root');
  let st = '';
  try {
    for (const k of Object.keys(localStorage).sort()) {
      if (k === 'julaba_journal_voix') continue; // le journal bouge tout seul
      st += k + '=' + localStorage.getItem(k) + ';';
    }
  } catch { /* ignore */ }
  const texte = (root ? root.innerText || '' : '').replace(/\\s+/g, ' ').trim();
  const a = document.activeElement;
  return {
    url: location.pathname + location.search,
    dom: h(root ? root.innerHTML : ''),
    texte: h(texte),
    brut: texte.slice(0, 4000),
    stockage: h(st),
    // Un champ qui prend le foyer OUVRE le clavier du téléphone : c'est un
    // effet, même si aucun mot ne change à l'écran.
    foyer: a ? a.tagName + '#' + (a.getAttribute('aria-label') || a.getAttribute('placeholder') || '') : '',
  };
}`;

const RE_CONFIRMATION = /j['’]ai compris|c['’]est noté|bien compris|tu as dit/i;

// À L'ŒIL — ce que Patrick voit AVANT de toucher quoi que ce soit : est-ce que
// l'écran tient dans le téléphone ? Rapporté, jamais masqué ; ce n'est pas un
// des trois verdicts, c'est le premier regard.
const A_LOEIL = `() => {
  const large = document.documentElement.scrollWidth;
  const deborde = [];
  document.querySelectorAll('button, a[href], [role="button"], input, h1, h2, strong').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    if (r.right > window.innerWidth + 1 || r.left < -1) {
      deborde.push(((el.getAttribute('aria-label') || el.innerText || el.tagName) + '').replace(/\\s+/g, ' ').trim().slice(0, 40));
    }
  });
  const petites = [];
  document.querySelectorAll('button, a[href], [role="button"]').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    if (r.width < 44 || r.height < 44) {
      petites.push((((el.getAttribute('aria-label') || el.innerText || el.tagName) + '').replace(/\\s+/g, ' ').trim().slice(0, 30)) + ' ' + Math.round(r.width) + '×' + Math.round(r.height));
    }
  });
  return { large, deborde: deborde.slice(0, 8), petites: petites.slice(0, 8) };
}`;

async function auditerTouches(navigateur, station, inventaire) {
  const resultats = [];
  const aExaminer = inventaire.slice(0, plafond(station));
  for (let i = 0; i < aExaminer.length; i++) {
    const el = aExaminer[i];
    const { contexte, page } = await ouvrirStation(navigateur, station);
    try {
      await attendreEcran(page, station);
      await ev(page, INVENTAIRE);           // repose les marqueurs data-banc
      await viderVoix(page);
      const avant = await ev(page, EMPREINTE);
      const metierAvant = station.etatMetier ? await ev(page, station.etatMetier) : null;

      // HORS DE PORTÉE veut dire : le doigt n'y arrive pas — recouvert, hors de
      // l'écran, invisible. Une animation qui n'a pas fini de se poser n'est PAS
      // cela : Playwright refuse alors de cliquer sur un élément « instable », et
      // compter ça comme un défaut ferait mentir le banc dans l'autre sens. On
      // distingue donc les deux, et l'on insiste dans le second cas.
      const cible = page.locator(`[data-banc="${i}"]`).first();
      let atteignable = true, raison = '', force = false;
      try {
        await cible.click({ timeout: 2500 });
      } catch (e) {
        const message = String(e.message || e).split('\n')[0].slice(0, 140);
        if (/intercepts pointer events|outside of the viewport|not visible|hidden/i.test(String(e.message || e))) {
          atteignable = false;
          raison = message;
        } else {
          try { await cible.click({ timeout: 2500, force: true }); force = true; }
          catch { atteignable = false; raison = message; }
        }
      }
      await page.waitForTimeout(900);

      const apres = await ev(page, EMPREINTE).catch(() => ({ ...avant, brut: avant.brut, url: '(page perdue)' }));
      const metierApres = station.etatMetier ? await ev(page, station.etatMetier).catch(() => null) : null;
      const voix = await lireVoix(page, { tolerant: true });

      const change = {
        adresse: avant.url !== apres.url,
        texte: avant.texte !== apres.texte,
        dom: avant.dom !== apres.dom,
        stockage: avant.stockage !== apres.stockage,
        // Le foyer ne compte QUE s'il tombe sur un champ de saisie : cela ouvre
        // le clavier du téléphone, donc il s'est passé quelque chose. Un bouton
        // qui prend le foyer parce qu'on vient de le toucher n'est pas un effet
        // — c'est le toucher lui-même, et le compter masquerait les impasses.
        foyer: avant.foyer !== apres.foyer && /^(INPUT|TEXTAREA|SELECT)/.test(apres.foyer || ''),
        voix: voix.demandes.length > 0 || voix.cles.length > 0,
      };
      const mene = change.adresse || change.texte || change.stockage || change.voix || change.foyer || change.dom;

      // LE PIÈGE QUI NOUS A COÛTÉ DEUX JOURS : une confirmation apparaît
      // (« J'ai compris : Trois tomates ») et rien ne suit. On ne se contente
      // donc pas de voir le texte changer — c'est précisément ce que le banc
      // précédent prenait pour une réussite. On exige que l'ÉTAT DE LA VENTE
      // bouge, ou l'adresse, ou le stockage.
      const confirmation = RE_CONFIRMATION.test(apres.brut) && !RE_CONFIRMATION.test(avant.brut);
      const confirmationSansSuite = confirmation
        && !change.adresse && !change.stockage
        && (metierAvant === null || metierAvant === metierApres);

      resultats.push({
        ...el, atteignable, raison, force, mene, change, confirmationSansSuite,
        voix: { demandes: voix.demandes.length, cles: voix.cles.map(c => c.id), ignorees: voix.ignorees.length },
        texteApres: apres.brut.slice(0, 600),
      });
    } finally {
      await contexte.close();
    }
  }
  return { resultats, tronque: inventaire.length > aExaminer.length ? inventaire.length - aExaminer.length : 0 };
}

// ═══════════════════════════════════════════════════════════════════════════
// E bis. QUESTION 4 — DIT-IL ZÉRO ALORS QU'IL N'A PAS PU DEMANDER ?
// ═══════════════════════════════════════════════════════════════════════════
//
// LE DÉFAUT QUI A COÛTÉ LA CONFIANCE DE PATRICK. Il avait fait des ventes. Les
// « Ventes passées » affichaient 0. Pas « je n'ai pas pu lire » : ZÉRO. Un zéro
// et une absence de réponse sont deux choses, et l'écran en faisait une seule —
// c'est la faute nommée dans la doctrine : « ne jamais donner deux sens à la
// même donnée ». Sur l'argent, c'est pire qu'un bogue : ça ment.
//
// Le banc ne le voyait pas. Il le voit maintenant, et SANS deviner, parce qu'il
// sait DEUX choses qu'un lecteur d'écran seul ne sait pas :
//
//   1. l'écran a-t-il DEMANDÉ au serveur ? (un appel `/api/`, échoué ici) ;
//   2. l'écran dit-il quand même « 0 » ou « aucun » ?
//
// Un écran VRAIMENT vide — « Aucun produit » alors que le catalogue local est
// vide et qu'aucun serveur n'a été sollicité — ne dit rien de faux : ce n'est
// pas un défaut, et le banc ne l'accuse pas. Le défaut, c'est l'écran qui a
// demandé, n'a pas obtenu, et affirme quand même un chiffre.
//
// La sortie est l'ABSENCE de sortie : « — », ou des mots qui nomment l'échec.
// C'est exactement ce que porte la réparation des Ventes passées.

const RE_AFFIRME_VIDE = /(^|[^0-9])0([^0-9,.]|$)|\baucun(e|es)?\b|\brien\b|\bvide\b/i;
// Le tiret cadratin « — » ne NOMME pas l'échec : il se contente de ne pas
// mentir. Le compter comme un aveu laisserait passer tout écran qui porte un
// séparateur décoratif — c'est ce qui a d'abord blanchi « Mes commandes ».
// On exige des MOTS : la marchande ne lit pas, on les lui dira.
const RE_NOMME_ECHEC = /pas pu|n['’]ai pas|impossible|r[ée]essa|hors ligne|hors-ligne|connexion|pas de r[ée]seau|serveur|indisponible/i;

const LIRE_AFFIRMATIONS = `() => {
  const root = document.getElementById('root');
  const texte = (root ? root.innerText || '' : '');
  // On juge les LIGNES, pas le bloc entier : « 0 » sur une ligne et « pas pu »
  // trois écrans plus bas ne se répondent pas l'un l'autre sous les yeux d'une
  // marchande. Une ligne courte qui porte un chiffre, c'est un compteur.
  const lignes = texte.split('\\n').map(s => s.trim()).filter(Boolean);
  // ... SAUF quand ce chiffre est une TOUCHE. L'écran de connexion et celui du
  // code PIN portent un pavé numérique : leur « 0 » est un bouton qu'on presse,
  // pas un compte qu'on annonce. Le banc les a d'abord accusés tous les deux.
  const touches = new Set();
  document.querySelectorAll('button, a[href], [role="button"]').forEach(el => {
    const n = (el.getAttribute('aria-label') || el.innerText || '').replace(/\\s+/g, ' ').trim();
    if (n) touches.add(n);
  });
  return { lignes, touches: [...touches], longueur: texte.length };
}`;

function jugerZero(affirmations, lecturesRatees) {
  const aDemande = lecturesRatees.length > 0;
  const touches = new Set(affirmations.touches || []);
  const vides = affirmations.lignes.filter(
    l => l.length <= 40 && RE_AFFIRME_VIDE.test(l) && !touches.has(l),
  );
  // On NOMME la ligne qui innocente l'écran. Un verdict qu'on ne peut pas
  // relire est un verdict qu'on ne peut pas contredire — et le banc s'est
  // déjà trompé une fois ici.
  const aveux = affirmations.lignes.filter(l => RE_NOMME_ECHEC.test(l)).slice(0, 4);
  return {
    aDemande,
    lectures: [...new Set(lecturesRatees)].slice(0, 6),
    affirmations: vides.slice(0, 8),
    echecNomme: aveux.length > 0,
    aveux,
    // Le refus : il a demandé, il n'a pas obtenu, et il affirme quand même.
    ment: aDemande && vides.length > 0 && aveux.length === 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// E ter. QUESTION 5 — À QUI PARLE-T-IL ?
// ═══════════════════════════════════════════════════════════════════════════
//
// Tantie Nanti Lou TUTOIE. Le catalogue vocal (i18n/voice/locales/fr-ci) ne
// contient pas un seul vouvoiement — c'est sa voix, et c'est la règle. Mais des
// écrans hérités vouvoient encore, et l'un d'eux, la caisse, fait LIRE À VOIX
// HAUTE son propre titre : « Que voulez-vous vendre ? ». La marchande entend
// alors une inconnue polie, pas Tantie.
//
// C'est le même défaut de fond que « trois zéro zéro zéro » : une seule chaîne
// sert l'œil et l'oreille. On mesure donc les deux séparément.
//
// SIGNALÉ, PAS ENCORE REFUSÉ : corriger le vouvoiement touche soit `frMarche`
// (qui appartient à Manus — validateLocale exige `null` partout), soit un test
// figé (caisseCharte fige le H1). L'arbitrage appartient à Patrick, et un banc
// ne tranche pas à sa place. Le jour où il tranche, cette question rejoint les
// refus — la ligne est déjà là pour ça.

const RE_VOUVOIEMENT = /\b(vous|votre|vos)\b|-vous\b/i;

const LIRE_ADRESSE = `() => {
  const root = document.getElementById('root');
  const texte = (root ? root.innerText || '' : '');
  return texte.split('\\n').map(s => s.trim()).filter(Boolean)
    .filter(l => /\\b(vous|votre|vos)\\b|-vous\\b/i.test(l)).slice(0, 8);
}`;

function jugerAdresse(aLEcran, demandesVoix) {
  const parle = demandesVoix.filter(d => RE_VOUVOIEMENT.test(d.texte || ''))
    .map(d => (d.texte || '').slice(0, 80));
  return { aLEcran, parle, vouvoie: aLEcran.length > 0 || parle.length > 0 };
}

// ═══════════════════════════════════════════════════════════════════════════
// F. LE PASSAGE — l'écran N mène-t-il à l'écran N+1 ?
// ═══════════════════════════════════════════════════════════════════════════
// Un écran peut réussir les trois questions et rester un cul-de-sac : rien
// dessus n'ouvre la suite du parcours. On le vérifie sur les traces des
// touches déjà faites, sans un clic de plus.

function chercherPassage(touches, suivante) {
  // Une porte de la couronne n'a pas de « suivante » : elle s'ouvre depuis le
  // comptoir et y ramène. Chercher un passage y serait un faux défaut.
  if (!suivante || suivante.rang !== 'tronc') return null;
  const trouve = touches.find(t => t.texteApres && t.texteApres.includes(suivante.preuve));
  return trouve ? { ouvertPar: trouve.nom } : { ouvertPar: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// G. EXÉCUTION
// ═══════════════════════════════════════════════════════════════════════════

mkdirSync(SORTIE, { recursive: true });

const viteBin = resolve(dirname(require.resolve('vite/package.json')), 'bin/vite.js');
// NODE_ENV=production ÉTEINT `import.meta.env.DEV` (Vite 6 : isProduction =
// NODE_ENV === 'production'), même sur le serveur de développement. Sans cela
// le banc compte des boutons que l'application LIVRÉE ne contient pas — le
// sélecteur de profil, « 🐞 Rapport de test », « Revoir le tutoriel », le badge
// « · DEV », la ligne de version. Le dépôt a déjà payé ce piège une fois
// (scripts/mesure-ecrans.cjs, point 2). On juge l'écran de la marchande.
const serveur = spawn(
  process.execPath,
  [viteBin, '--config', 'apercu-caisse/banc-terrain/vite.config.ts', '--logLevel', 'warn'],
  { cwd: racine, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_ENV: 'production' } },
);
serveur.stderr.on('data', d => process.stderr.write(`[vite] ${d}`));

async function attendreServeur() {
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch(ORIGINE + '/'); if (r.ok) return; } catch { /* pas encore */ }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Le serveur Vite ne répond pas sur ' + ORIGINE);
}

const rapport = [];
let code = 0;
const navigateur = await chromium.launch({
  headless: true, executablePath: EXECUTABLE,
  args: ['--no-sandbox', '--font-render-hinting=none', '--autoplay-policy=no-user-gesture-required'],
});

try {
  await attendreServeur();

  // BANC_ECRANS=1,4 : ne juger que ces écrans. Sert à rejouer UN écran après
  // l'avoir touché, ou à comparer deux configurations de voix sans repayer les
  // cinq. L'ordre du parcours est conservé — on n'invente pas un autre chemin.
  const choisis = (process.env.BANC_ECRANS || '').split(',').map(x => Number(x.trim())).filter(Boolean);
  for (let s = 0; s < PARCOURS.length; s++) {
    const station = PARCOURS[s];
    if (choisis.length && !choisis.includes(station.n)) continue;
    const ligne = { n: station.n, id: station.id, rang: station.rang, titre: station.titre, chemin: station.chemin };
    process.stderr.write(`\n── Écran ${station.n} — ${station.titre}\n`);

    // Écran 1 : la charte, sans navigateur — elle ne dépend que du source.
    ligne.charte = mesurerCharte(station);

    const { contexte, page, erreurs, lecturesRatees } = await ouvrirStation(navigateur, station);
    try {
      try {
        await attendreEcran(page, station);
        ligne.atteint = true;
      } catch (e) {
        ligne.atteint = false;
        ligne.pourquoi = String(e.message || e).split('\n')[0].slice(0, 200);
        ligne.erreursPage = erreurs.slice(0, 5);
        await page.screenshot({ path: resolve(SORTIE, `${station.n}-${station.id}-NON-ATTEINT.png`) }).catch(() => {});
        rapport.push(ligne);
        code = 1;
        if (station.rang === 'tronc') {
          // Le tronc est une CHAÎNE : on ne juge pas l'écran suivant avant
          // d'avoir jugé celui-ci. Une marchande bloquée ne voit pas la suite.
          process.stderr.write(`   ✗ écran non atteint — on s'arrête ici, comme au marché.\n`);
          break;
        }
        // La couronne est une ÉTOILE : une porte fermée n'en ferme aucune autre.
        // On le note et on va voir la suivante — c'est la carte qu'on veut.
        process.stderr.write(`   ✗ porte fermée — on continue, les autres ne dependent pas d'elle.\n`);
        continue;
      }

      // La voix DU MONTAGE : ce que l'écran dit tout seul quand il apparaît.
      ligne.voixMontage = await lireVoix(page);
      ligne.capture = `${station.n}-${station.id}.png`;
      await page.screenshot({ path: resolve(SORTIE, ligne.capture) });
      await page.screenshot({ path: resolve(SORTIE, `${station.n}-${station.id}-pleine.png`), fullPage: true });

      ligne.aLoeil = await ev(page, A_LOEIL);
      // Q4 et Q5 se lisent SUR L'ÉCRAN POSÉ, avant qu'un doigt n'ait rien changé :
      // c'est ce que la marchande voit en arrivant.
      ligne.zero = jugerZero(await ev(page, LIRE_AFFIRMATIONS), lecturesRatees);
      ligne.adresse = jugerAdresse(await ev(page, LIRE_ADRESSE), ligne.voixMontage.demandes);
      const inventaire = await ev(page, INVENTAIRE);
      ligne.interactifs = inventaire.length;
      ligne.erreursPage = erreurs.slice(0, 5);
    } finally {
      await contexte.close();
    }

    // La voix DES GESTES et les impasses : un écran neuf par élément touché.
    const { resultats, tronque } = await auditerTouches(navigateur, station, await (async () => {
      const { contexte, page } = await ouvrirStation(navigateur, station);
      try { await attendreEcran(page, station); return await ev(page, INVENTAIRE); }
      finally { await contexte.close(); }
    })());
    ligne.touches = resultats;
    ligne.tronque = tronque;

    // Verdicts.
    const parlantsAuGeste = resultats.filter(t => t.voix.demandes > 0 || t.voix.cles.length > 0);
    ligne.voix = {
      auMontage: ligne.voixMontage.demandes.length,
      clesAuMontage: ligne.voixMontage.cles.map(c => c.id),
      refuseesAuMontage: ligne.voixMontage.ignorees.length,
      auGeste: parlantsAuGeste.length,
      muet: ligne.voixMontage.demandes.length === 0 && ligne.voixMontage.cles.length === 0 && parlantsAuGeste.length === 0,
    };
    ligne.impasses = resultats.filter(t => t.atteignable && !t.mene && !t.desactive);
    // Un bouton DÉSACTIVÉ n'est pas une impasse : c'est un état (« ton numéro
    // est vide, donc on ne peut pas entrer »). Ce qui est un défaut, c'est un
    // élément vivant que le doigt n'atteint pas — recouvert, hors de l'écran.
    ligne.desactives = resultats.filter(t => !t.atteignable && t.desactive);
    ligne.inatteignables = resultats.filter(t => !t.atteignable && !t.desactive);
    ligne.confirmationsSansSuite = resultats.filter(t => t.confirmationSansSuite);
    ligne.passage = chercherPassage(resultats, PARCOURS[s + 1]);

    if (ligne.voix.muet) code = 1;
    if (ligne.impasses.length > 0) code = 1;
    if (ligne.inatteignables.length > 0) code = 1;
    if (ligne.confirmationsSansSuite.length > 0) code = 1;
    if (!ligne.charte.ok) code = 1;
    // Le zéro qui ment est un refus : sur l'argent, la confiance ne se négocie
    // pas. Le vouvoiement, lui, est SIGNALÉ sans refuser — voir E ter.
    if (ligne.zero?.ment) code = 1;

    rapport.push(ligne);
  }
} finally {
  await navigateur.close().catch(() => {});
  serveur.kill('SIGTERM');
}

// ═══════════════════════════════════════════════════════════════════════════
// H. LE TABLEAU — pour un humain, pas pour une machine.
// ═══════════════════════════════════════════════════════════════════════════

// Une colonne qui coupe un titre au milieu d'un mot rend le tableau illisible :
// on tronque proprement et on garde toujours deux espaces de séparation.
const pad = (s, n) => {
  const t = String(s);
  return (t.length > n - 2 ? t.slice(0, n - 3) + '…' : t).padEnd(n, ' ');
};

console.log('\n╔══════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║  BANC TERRAIN — parcours de la marchande, catalogue VIDE, sans réseau, 390 × 844      ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════════════╝\n');
console.log(`  Seuil de charte : part de jetons --caisse-* ≥ ${SEUIL_CHARTE} ET au moins un jeton.`);
console.log(`  Clips « prototype » : ${process.env.VITE_JULABA_VOICE_PREVIEW === 'true' ? 'ACTIFS' : 'éteints (comme un build livré)'}`);
console.log(`  Éléments touchés par écran : ${MAX_ELEMENTS} dans le tronc, ${MAX_COURONNE} dans la couronne.\n`);

// Deux sections, parce que ce sont deux choses : le CHEMIN qu'une marchande
// parcourt, et les PORTES qui s'ouvrent depuis son comptoir.
const titreSection = {
  tronc: 'LE CHEMIN — ce qu’elle traverse, dans l’ordre, pour vendre',
  couronne: 'LES PORTES — ce qui s’ouvre depuis le comptoir, chacune jugée seule',
};
let sectionCourante = null;

for (const l of rapport) {
  if (l.rang !== sectionCourante) {
    sectionCourante = l.rang;
    console.log(`\n  ${titreSection[l.rang] || l.rang}`);
    console.log('  ' + pad('Écran', 34) + pad('Charte', 24) + pad('Voix', 34) + 'Ne mène nulle part');
    console.log('  ' + '─'.repeat(112));
  }
  if (!l.atteint) {
    console.log('  ' + pad(`${l.n}. ${l.titre}`, 34) + 'NON ATTEINT — ' + l.pourquoi);
    continue;
  }
  const charte = `${l.charte.jetons} jet / ${l.charte.durs} dur (${Math.round(l.charte.part * 100)} %)`;
  const voix = l.voix.muet
    ? 'MUET'
    : `${l.voix.auMontage} au montage, ${l.voix.auGeste}/${l.touches.length} au geste`;
  const imp = `${l.impasses.length}/${l.touches.length}`
    + (l.inatteignables.length ? ` · ${l.inatteignables.length} HORS DE PORTÉE` : '')
    + (l.confirmationsSansSuite.length ? ` · ${l.confirmationsSansSuite.length} CONFIRMATION SANS SUITE` : '')
    + (l.zero?.ment ? ' · ZÉRO QUI MENT' : '')
    + (!l.zero?.ment && l.zero?.aDemande && l.zero?.affirmations.length && l.zero?.echecNomme ? ' · zéro à relire' : '')
    + (l.adresse?.vouvoie ? ' · vouvoie' : '');
  console.log('  ' + pad(`${l.n}. ${l.titre}`, 34) + pad(charte, 24) + pad(voix, 34) + imp);
}

console.log('\n  ── Ce que le banc a vu, écran par écran ──────────────────────────────────────────\n');
for (const l of rapport) {
  console.log(`  ÉCRAN ${l.n} — ${l.titre}   (${l.chemin})`);
  if (!l.atteint) {
    console.log(`     ✗ NON ATTEINT : ${l.pourquoi}`);
    if (l.erreursPage?.length) l.erreursPage.forEach(e => console.log(`       erreur de page : ${e}`));
    console.log('');
    continue;
  }
  console.log(`     capture   : ${resolve(SORTIE, l.capture)}`);
  console.log(`     charte    : ${l.charte.verdict} — ${l.charte.jetons} jetons --caisse-*, ${l.charte.durs} couleurs en dur`);
  for (const d of l.charte.detail) {
    console.log(`                 ${d.absent ? '(absent) ' : ''}${d.fichier} : ${d.jetons ?? '-'} jet / ${d.durs ?? '-'} dur`);
  }
  if (l.voix.muet) {
    console.log(`     voix      : MUET — rien n'est demandé au moteur audio, ni au montage ni sous le doigt.`);
  } else {
    console.log(`     voix      : ${l.voix.auMontage} demande(s) au montage`
      + (l.voix.clesAuMontage.length ? ` [clés : ${l.voix.clesAuMontage.join(', ')}]` : '')
      + (l.voix.refuseesAuMontage ? `, ${l.voix.refuseesAuMontage} refusée(s)` : '')
      + ` ; ${l.voix.auGeste} élément(s) sur ${l.touches.length} parlent sous le doigt.`);
    for (const t of l.touches.filter(x => x.voix.demandes > 0 || x.voix.cles.length)) {
      console.log(`                 « ${t.nom} » → ${t.voix.demandes} demande(s)${t.voix.cles.length ? ` [${t.voix.cles.join(', ')}]` : ''}`);
    }
  }
  if (l.aLoeil) {
    console.log(`     à l'œil   : largeur de défilement ${l.aLoeil.large} px (écran 390)`
      + (l.aLoeil.deborde.length ? ` — ${l.aLoeil.deborde.length} élément(s) sortent de l'écran : ${l.aLoeil.deborde.join(' | ')}` : '')
      + (l.aLoeil.petites.length ? ` — ${l.aLoeil.petites.length} cible(s) sous 44 px : ${l.aLoeil.petites.join(' | ')}` : ''));
  }
  console.log(`     touchable : ${l.interactifs} élément(s) visibles${l.tronque ? ` (${l.tronque} non examinés — BANC_MAX_ELEMENTS)` : ''}`);
  if (l.impasses.length) {
    console.log(`     IMPASSES  : ${l.impasses.length} — touché, rien ne bouge :`);
    l.impasses.forEach(t => console.log(`                 · « ${t.nom} » (${t.balise}, ${t.genre}, ${t.largeur}×${t.hauteur})`));
  } else {
    console.log(`     impasses  : aucune`);
  }
  if (l.desactives?.length) {
    console.log(`     désactivés: ${l.desactives.length} (un état, pas un défaut) : ${l.desactives.map(t => t.nom).join(' | ')}`);
  }
  if (l.inatteignables.length) {
    console.log(`     HORS DE PORTÉE : le doigt n'y arrive pas, et ce n'est pas un état :`);
    l.inatteignables.forEach(t => console.log(`                 · « ${t.nom} » — ${t.raison}`));
  }
  const forces = l.touches.filter(t => t.force);
  if (forces.length) {
    console.log(`     (touchés en insistant, l'animation n'était pas posée : ${forces.map(t => t.nom).join(' | ')})`);
  }
  if (l.confirmationsSansSuite.length) {
    console.log(`     PIÈGE     : une confirmation s'affiche et rien ne suit :`);
    l.confirmationsSansSuite.forEach(t => console.log(`                 · « ${t.nom} »`));
  }
  const pt = l.touches.filter(t => t.mene && t.change.dom && !t.change.texte && !t.change.adresse && !t.change.stockage && !t.change.voix);
  if (pt.length) {
    console.log(`     à vérifier: ${pt.length} élément(s) ne changent QUE le DOM (aucun mot, aucune adresse, aucune voix) :`);
    pt.forEach(t => console.log(`                 · « ${t.nom} »`));
  }
  if (l.zero) {
    if (l.zero.ment) {
      console.log(`     ZÉRO QUI MENT : l'écran a demandé au serveur (${l.zero.lectures.length} lecture(s)), n'a rien obtenu,`);
      console.log(`                 et affirme quand même : ${l.zero.affirmations.map(a => `« ${a} »`).join('  ')}`);
      console.log(`                 aucun mot ne dit qu'il n'a pas pu lire. Un zéro et une absence de réponse ne sont pas la même chose.`);
    } else if (l.zero.aDemande && l.zero.affirmations.length && l.zero.echecNomme) {
      // NI blanchi NI accusé. Le banc voit un aveu d'échec ET des chiffres de
      // vide, mais il ne peut pas établir que l'aveu COUVRE ces chiffres —
      // « Impossible de charger les négociations » n'explique pas quatre
      // compteurs à zéro. Prétendre le contraire serait refaire, dans l'autre
      // sens, l'erreur que ce banc existe pour ne plus commettre.
      console.log(`     zéro      : À RELIRE À L'ŒIL — il affirme ${l.zero.affirmations.map(a => `« ${a} »`).join(' ')}`);
      console.log(`                 et nomme un échec : ${l.zero.aveux.map(a => `« ${a} »`).join(' ')}`);
      console.log(`                 le banc ne peut pas dire si cet aveu explique CES chiffres-là.`);
    } else if (l.zero.affirmations.length && !l.zero.aDemande) {
      console.log(`     zéro      : honnête — le vide est local (aucune lecture serveur), donc vrai.`);
    } else if (!l.zero.affirmations.length) {
      console.log(`     zéro      : rien à reprocher — l'écran n'affirme aucun vide chiffré.`);
    }
  }
  if (l.adresse?.vouvoie) {
    console.log(`     ADRESSE   : cet écran VOUVOIE — Tantie tutoie (0 vouvoiement dans le catalogue vocal).`);
    if (l.adresse.aLEcran.length) console.log(`                 à l'écran : ${l.adresse.aLEcran.map(x => `« ${x} »`).join('  ')}`);
    if (l.adresse.parle.length) console.log(`                 À VOIX HAUTE : ${l.adresse.parle.map(x => `« ${x} »`).join('  ')}`);
    console.log(`                 (signalé, pas un refus : l'arbitrage appartient à Patrick — voir E ter)`);
  }
  if (l.passage) {
    console.log(`     passage   : ${l.passage.ouvertPar ? `« ${l.passage.ouvertPar} » ouvre l'écran suivant` : "AUCUN élément touché n'ouvre l'écran suivant"}`);
  }
  if (l.erreursPage?.length) l.erreursPage.forEach(e => console.log(`     erreur    : ${e}`));
  console.log('');
}

const chemin = resolve(SORTIE, 'banc-terrain.json');
writeFileSync(chemin, JSON.stringify({
  seuilCharte: SEUIL_CHARTE,
  clipsPrototype: process.env.VITE_JULABA_VOICE_PREVIEW === 'true',
  requetesBloquees: [...bloquees].slice(0, 40),
  ecrans: rapport,
}, null, 2));
console.log(`  Rapport complet : ${chemin}`);
console.log(`  Requêtes sorties de la machine : 0 (${bloquees.size} bloquées — l'écran est jugé hors réseau).`);
console.log(code === 0
  ? '\n  ✓ Chaque écran du parcours est dans la charte, parle, et mène quelque part.\n'
  : "\n  ✗ Le parcours n'est PAS praticable en l'état — voir ci-dessus.\n");
process.exit(code);
