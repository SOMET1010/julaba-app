/**
 * B2/B3 — COMMUNE ET MARCHÉ DU PROFIL VIENNENT DU BACK-OFFICE (retour PIE, 07/10).
 *
 * Ce que ce banc tient :
 *   1. la lecture passe par le service `marches-api` (réseau simulé), sur la
 *      route publique, sans les marchés en attente de validation ;
 *   2. la commune et le marché proposés sont ceux du référentiel, le marché
 *      filtré par la commune, les marchés désactivés exclus ;
 *   3. une valeur actuelle hors liste est CONSERVÉE (en tête) ;
 *   4. référentiel injoignable → listes vides → saisie libre d'avant ;
 *   5. le profil branche bien ces listes, et les DIT.
 *
 * Lancer : npm run test:lieux-marchands
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fetchMarchesPublics } from './api/marches-api.js';
import { listesDuProfil } from './lieuxMarchands.js';

let echecs = 0;
const ok = (c: boolean, l: string) => { console.log(c ? '  ✅' : '  ❌', l); if (!c) echecs++; };
const eq = (a: unknown, b: unknown, l: string) => {
  const v = JSON.stringify(a) === JSON.stringify(b);
  ok(v, v ? l : `${l} (attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`);
};

(globalThis as any).localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const REFERENTIEL = [
  { id: '1', nom: 'Marché de Gouro', commune: 'Adjamé', statut: 'valide', actif: true },
  { id: '2', nom: 'Forum', commune: 'Adjamé', statut: null, actif: true },
  { id: '3', nom: 'Grand marché', commune: 'Treichville', statut: 'valide', actif: true },
  { id: '4', nom: 'Marché fermé', commune: 'Yopougon', statut: 'valide', actif: false },
  { id: '5', nom: 'Sans commune', commune: null, actif: true },
];

const urls: string[] = [];
(globalThis as any).fetch = async (url: string) => {
  urls.push(String(url));
  return new Response(JSON.stringify(REFERENTIEL), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

console.log('\n[1] Lecture par le service, route publique');
const marches = await fetchMarchesPublics();
ok(urls.length === 1 && /\/marches\?exclude_statut=en_attente$/.test(urls[0]), `GET /marches?exclude_statut=en_attente (${urls[0]})`);
eq(marches.length, 5, 'le service rend la liste telle quelle');

console.log('\n[2] Listes issues du référentiel');
const vide = listesDuProfil(marches, '', '');
eq(vide.communes, ['Adjamé', 'Treichville'], 'communes = celles qui portent un marché ouvert, triées');
ok(!vide.marches.includes('Marché fermé'), 'un marché désactivé ne se propose pas');
eq(listesDuProfil(marches, 'Adjamé', '').marches, ['Forum', 'Marché de Gouro'], 'marchés filtrés par la commune choisie');
eq(listesDuProfil(marches, 'Treichville', 'Grand marché').marches, ['Grand marché'], 'valeur connue : pas de doublon');

console.log('\n[3] Valeur actuelle hors liste conservée');
const hors = listesDuProfil(marches, 'Cocody', 'Marché de Cocody');
eq(hors.communes[0], 'Cocody', 'commune saisie avant la liste : gardée en tête');
eq(listesDuProfil(marches, 'Adjamé', 'Mon vieux marché').marches, ['Mon vieux marché', 'Forum', 'Marché de Gouro'], 'marché hors liste : gardé en tête');

console.log('\n[4] Référentiel vide ou injoignable → saisie libre');
eq(listesDuProfil([], 'Adjamé', 'Forum'), { communes: [], marches: [] }, 'aucune liste : le champ redevient libre');
(globalThis as any).fetch = async () => new Response('{"message":"boom"}', { status: 500 });
let rejete = false;
try { await fetchMarchesPublics(); } catch { rejete = true; }
ok(rejete, 'une panne serveur remonte une erreur (le hook la rattrape, la liste reste vide)');

console.log('\n[5] Le profil branche les listes, et les dit');
const modal = readFileSync(fileURLToPath(new URL('../components/shared/ProfilUnifieModal.tsx', import.meta.url)), 'utf8');
ok(/listesDuProfil\(allMarches, identite\.commune, identite\.marche\)/.test(modal), 'listes calculées depuis le référentiel et la saisie en cours');
ok(/<ListeDite valeur=\{identite\.commune\} options=\{listes\.communes\}/.test(modal), 'Commune : liste du référentiel');
ok(/<ListeDite valeur=\{identite\.marche\} options=\{listes\.marches\}/.test(modal), 'Marché : liste du référentiel');
ok(/speak\('Choisis ta commune dans la liste\.'\)/.test(modal) && /speak\('Choisis ton marché dans la liste\.'\)/.test(modal), 'les deux consignes sont dites');
ok(!/placeholder="Marché" value=\{identite\.marche\}/.test(modal), 'plus de texte libre en dur pour le marché');
ok(/market: identite\.marche/.test(modal) && /commune: identite\.commune/.test(modal), 'contrat inchangé : `market` et `commune` restent des noms');
const hook = readFileSync(fileURLToPath(new URL('../hooks/useMarchesByCommune.ts', import.meta.url)), 'utf8');
ok(/fetchMarchesPublics\(/.test(hook) && !/fetch\(`\$\{API_URL\}\/marches\?/.test(hook), 'le hook lit par le service, plus de fetch direct sur /marches');

console.log(echecs === 0 ? '\nCommune et marché : référentiel ✅\n' : `\n${echecs} échec(s) ❌\n`);
if (echecs) process.exit(1);
