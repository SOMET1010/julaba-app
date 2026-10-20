/**
 * MODULES HORS PILOTE QUI PORTENT DE L'ARGENT — MASQUÉS, ET ÇA SE PROUVE.
 *
 * DÉCISION DE PATRICK, 07/10/2026 : « Masque les modules hors pilote qui
 * portent des actions d'argent, sans rien supprimer. » Voir modulesPilote.ts.
 *
 * Un masquage qu'on ne vérifie pas se rouvre en silence : une route Keiwa
 * ajoutée pour un nouveau profil, un onglet remis dans roleConfig, et une
 * marchande retrouve un bouton qui débite un wallet. Cette garde prouve les
 * DEUX sens du drapeau `VITE_JULABA_MODULES_HORS_PILOTE` :
 *   · absent (le cas de l'APK et de Render) ⇒ routes renvoyées vers l'accueil
 *     du profil, entrées de menu absentes ;
 *   · `true` (build de démonstration) ⇒ tout est visible.
 *
 * SA LIMITE : elle lit les règles et le SOURCE, pas l'APK rendu. Le contrôle
 * visuel sur le build pilote reste à faire avant J0.
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const NOM = 'VITE_JULABA_MODULES_HORS_PILOTE';

// ── SONDE : relancée dans un processus fils, avec ou sans le drapeau ────────
// roleConfig lit le drapeau À L'IMPORT (comme le bundle au build) : pour
// prouver les deux sens, il faut deux processus, pas un seul.
if (process.argv.includes('--sonde')) {
  const { ROLE_CONFIGS } = await import('./roleConfig.js');
  const m = await import('./modulesPilote.js');
  console.log(JSON.stringify({
    marchand: ROLE_CONFIGS.marchand.bottomBar.items.map((i) => i.path),
    producteur: ROLE_CONFIGS.producteur.bottomBar.items.map((i) => i.path),
    visibles: m.modulesHorsPiloteVisibles(),
    redirection: m.redirectionHorsPilote('/marchand/keiwa'),
  }));
  process.exit(0);
}

const {
  MODULES_HORS_PILOTE, modulesHorsPiloteVisibles, redirectionHorsPilote,
  moduleDuChemin, sansModulesMasques, accueilDuProfil,
} = await import('./modulesPilote.js');

let echecs = 0;
const ok = (c: boolean, m: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${m}`);
  if (!c) echecs++;
};
const lire = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

console.log('\nModules hors pilote qui portent de l\'argent : masqués hors drapeau\n');

console.log('[1] Le drapeau : seul `true` rallume, tout le reste masque');
ok(modulesHorsPiloteVisibles(undefined) === false, 'absent → masqué');
for (const v of ['', 'false', '0', 'TRUE', 'True', 'oui', '1']) {
  ok(modulesHorsPiloteVisibles(v) === false, `« ${v} » → masqué`);
}
ok(modulesHorsPiloteVisibles('true') === true, '« true » → visible');

console.log('\n[2] Drapeau absent : chaque route masquée renvoie à l\'accueil de SON profil');
const MASQUEES: Array<[string, string]> = [
  ['/marchand/keiwa', '/marchand'],
  ['/marchand/keiwa/transfert', '/marchand'],
  ['/producteur/keiwa/paiements', '/producteur'],
  ['/cooperative/keiwa/banque', '/cooperative'],
  ['/institution/keiwa/carte', '/institution'],
  // IDENT-06 (20/10/2026) : l'identificateur est SORTI de PROFILS_KEIWA — ses
  // routes Keiwa ont été retirées de routes.tsx (IDENTIFICATEUR-16, 19/10),
  // le masque n'a plus rien à couvrir sur son namespace. La garde contre une
  // résurrection est l'ABSENCE de route (NotFound), pas le masque : la ligne
  // est déplacée dans la liste OUVERTES ci-dessous.
  ['/backoffice/keiwa', '/backoffice/dashboard'],
  ['/marchand/tontines', '/marchand'],
  ['/marchand/tontines/42', '/marchand'],
  ['/marchand/protection-sociale', '/marchand'],
  ['/producteur/protection-sociale', '/producteur'],
  ['/marchand/cooperative', '/marchand'],
  ['/marchand/cooperative/', '/marchand'],
  ['/marchand/commandes', '/marchand'],
  ['/producteur/commandes', '/producteur'],
  ['/cooperative/commandes', '/cooperative'],
  ['/marchand/marche', '/marchand'],
  ['/pay/abc-123', '/'],
  ['/pay/success', '/'],
  ['/paiement/failed', '/'],
];
for (const [chemin, accueil] of MASQUEES) {
  ok(redirectionHorsPilote(chemin, false) === accueil, `${chemin} → ${accueil}`);
}

console.log('\n[3] Le pilote et les écrans sans argent restent OUVERTS');
const OUVERTES = [
  '/marchand', '/marchand/caisse', '/marchand/stock', '/marchand/depense',
  '/marchand/cahier', '/marchand/resume-caisse', '/marchand/ventes-passees',
  '/marchand/profil', '/marchand/parametres',
  '/marchand/cooperative/besoin',          // soumettre un besoin : aucun argent
  '/marchand/keiwatch',                    // un préfixe n'avale pas un voisin
  '/producteur', '/producteur/production', '/producteur/recoltes',
  '/cooperative', '/cooperative/membres', '/cooperative/finances', '/cooperative/marche',
  '/identificateur', '/identificateur/identification',
  '/identificateur/keiwa/historique',     // plus masquée : route morte (IDENT-06) — NotFound, pas redirection
  '/institution', '/institution/acteurs',
  '/backoffice/dashboard', '/backoffice/acteurs',
  '/', '/login', '/payer-plus-tard',
];
for (const chemin of OUVERTES) {
  ok(redirectionHorsPilote(chemin, false) === null, `${chemin} reste ouvert`);
}

console.log('\n[4] Drapeau à `true` : RIEN n\'est redirigé');
for (const [chemin] of MASQUEES) {
  ok(redirectionHorsPilote(chemin, true) === null, `${chemin} visible`);
}

console.log('\n[5] Aucune route Keiwa / tontine / paiement de routes.tsx n\'échappe à la liste');
// On LIT routes.tsx (il importe des écrans .tsx, hors Vite on ne l'importe
// pas) et on recompose les chemins complets parent + enfant.
{
  const routes = lire('../routes.tsx');
  let parent = '';
  const complets: string[] = [];
  for (const ligne of routes.split('\n')) {
    const p = ligne.match(/\{\s*path:\s*"(\/[^"]*)",\s*element:\s*<\w+Layout|\{\s*path:\s*"(\/backoffice)",\s*element:\s*<BORoot/);
    if (p) { parent = p[1] ?? p[2]; continue; }
    const absolu = ligne.match(/\{\s*path:\s*"(\/[^"]+)"/);
    if (absolu) { complets.push(absolu[1]); continue; }
    const enfant = ligne.match(/\{\s*path:\s*"([^"/][^"]*)"/);
    if (enfant && parent) complets.push(`${parent}/${enfant[1]}`);
  }
  const argent = complets.filter((c) =>
    /\/keiwa(\/|$)|\/tontines|\/protection-sociale|^\/marchand\/cooperative$|\/commandes$|^\/marchand\/marche$|^\/pay(\/|$)|^\/paiement(\/|$)/.test(c));
  // PLANCHER RECALÉ (20/10) : 40 → 38. Le 19/10, IDENTIFICATEUR-16 (commit
  // b91f6a8) a retiré de l'espace identificateur ses 6 routes keiwa —
  // décision, pas érosion : « Keiwa retire de l'espace identificateur ».
  // Caisse, tontines, commandes, marché : tout est toujours là, et toutes
  // couvertes par MODULES_HORS_PILOTE (assertions ci-dessous). Le plancher
  // traque l'ÉROSION silencieuse : une route qui disparaît sans décision
  // recale la garde, elle ne la franchit pas.
  ok(argent.length >= 38, `${argent.length} routes d'argent hors pilote trouvées dans routes.tsx`);
  const echappees = argent.filter((c) => moduleDuChemin(c.replace(/:[a-zA-Z]+/g, 'x')) === null);
  ok(echappees.length === 0, `toutes couvertes par MODULES_HORS_PILOTE${echappees.length ? ' — ÉCHAPPENT : ' + echappees.join(', ') : ''}`);
  ok(complets.includes('/marchand/caisse') && complets.includes('/marchand/keiwa'),
    'rien n\'est supprimé : la caisse ET Keiwa sont toujours déclarées dans routes.tsx');
}

console.log('\n[6] La garde est posée à la RACINE de toutes les routes');
{
  const racine = lire('../components/layout/RootLayout.tsx');
  ok(/redirectionHorsPilote\(pathname\)/.test(racine), 'RootLayout appelle redirectionHorsPilote(pathname)');
  ok(/<Navigate to=\{accueil\} replace \/>/.test(racine), '… et renvoie par <Navigate replace>');
  ok(/element:\s*<RootLayout \/>/.test(lire('../routes.tsx')), 'RootLayout est bien l\'élément racine de routes.tsx');
}

console.log('\n[7] Les entrées de menu suivent le drapeau');
{
  const items = [{ path: '/marchand' }, { path: '/marchand/commandes' }, { path: '/marchand/profil' }];
  ok(sansModulesMasques(items, false).map((i) => i.path).join() === '/marchand,/marchand/profil',
    'sansModulesMasques retire « Commandes » quand c\'est masqué');
  ok(sansModulesMasques(items, true).length === 3, '… et la garde quand c\'est visible');

  const sonde = (env: Record<string, string | undefined>) => {
    const e = { ...process.env, ...env };
    if (env[NOM] === undefined) delete e[NOM];
    const r = spawnSync(process.execPath, [...process.execArgv, fileURLToPath(import.meta.url), '--sonde'],
      { env: e, encoding: 'utf8' });
    try { return JSON.parse(r.stdout.trim().split('\n').pop() ?? ''); }
    catch { console.log(r.stdout, r.stderr); return null; }
  };
  const sans = sonde({ [NOM]: undefined });
  ok(sans?.visibles === false, 'build SANS drapeau : modules masqués');
  ok(sans?.redirection === '/marchand', 'build SANS drapeau : /marchand/keiwa → /marchand');
  ok(sans && !sans.marchand.includes('/marchand/commandes'), 'build SANS drapeau : pas d\'onglet Commandes marchand');
  ok(sans && !sans.producteur.includes('/producteur/commandes'), 'build SANS drapeau : pas d\'onglet Commandes producteur');
  ok(sans && sans.marchand.includes('/marchand') && sans.marchand.includes('/marchand/profil'),
    'build SANS drapeau : Accueil et Moi restent');
  const avec = sonde({ [NOM]: 'true' });
  ok(avec?.visibles === true, 'build AVEC drapeau=true : modules visibles');
  ok(avec?.redirection === null, 'build AVEC drapeau=true : /marchand/keiwa ouvert');
  ok(avec && avec.marchand.includes('/marchand/commandes') && avec.producteur.includes('/producteur/commandes'),
    'build AVEC drapeau=true : les onglets Commandes reviennent');

  // Les tuiles qui ne portent pas de chemin dans une liste : on lit le source.
  ok(/showKeiwa && moduleVisible\('keiwa'\)/.test(lire('../components/shared/RoleDashboard.tsx')),
    'RoleDashboard : la carte Keiwa (accueils producteur, coopérative) suit le drapeau');
  ok(/\.\.\.\(moduleVisible\('keiwa'\) \? \[\{\s*\n\s*id: 'keiwa'/.test(lire('../components/backoffice/BOLayout.tsx')),
    'BOLayout : le groupe « Keiwa Wallet » suit le drapeau');
  // IDENT-06 (20/10/2026) : plus aucune ligne Keiwa côté identificateur —
  // ni masquée ni visible. L'acteur est monétiquement neutre (IDENTIFICATEUR-16,
  // arbitrage A-02) : la garde s'assure que « Mon Keiwa » ne revient PAS,
  // même dans un build hors pilote ouvert.
  const parametres = lire('../components/shared/UniversalParametres.tsx');
  ok(!/Mon Keiwa/.test(parametres),
    'UniversalParametres : aucun « Mon Keiwa » côté identificateur (neutre, IDENT-06)');
  ok(!/identificateur\/keiwa/.test(parametres.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')),
    'UniversalParametres : aucune navigation vers /identificateur/keiwa (route morte)');
}

console.log('\n[7-bis] DGE-11 : les modules institution viennent du serveur, la config BO persiste');
{
  // DGE-11 (20/10/2026) : la liste en dur des modules institution et le
  // bouton « Enregistrer » condamné (isBackendReady=false) étaient les deux
  // moitiés du même mensonge — le front inventait des accès que l'API
  // renvoyait en 403, et le BO croyait configurer sans écrire un octet.
  // La source de vérité est institutions.modules, appliquée fail-closed par
  // InstitutionScopeGuard ; le contrat serveur est verrouillé par
  // dge-11-modules-persistes.spec.ts. Ici on verrouille le front.
  const accesInst = lire('../contexts/InstitutionAccessContext.tsx');
  const accesInstCode = accesInst.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  ok(!/useState[^;]*\(\s*\[\s*'dashboard'/.test(accesInstCode),
    'InstitutionAccessContext : plus AUCUNE liste de modules en dur (DGE-11)');
  ok(/['"]\/institutions['"]/.test(accesInstCode),
    'InstitutionAccessContext : modules lus sur GET /institutions (fiche auto-scopée)');
  ok(!/grantAccess/.test(accesInstCode),
    'InstitutionAccessContext : fin des grant/revoke locaux qui n\u2019écrivaient nulle part');
  ok(/niveau !== 'aucun'/.test(accesInstCode),
    'InstitutionAccessContext : même règle que le guard (présent et ≠ aucun)');
  const boCfg = lire('../components/backoffice/BOConfigInstitution.tsx');
  const boCfgCode = boCfg.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  ok(/\/institutions\/\$\{/.test(boCfgCode) && /method:\s*'PATCH'/.test(boCfgCode),
    'BOConfigInstitution : la configuration persiste par PATCH /institutions/:id (DGE-11)');
  ok(!/isBackendReady/.test(boCfgCode) && !/admin\/config/.test(boCfgCode),
    'BOConfigInstitution : fin du bouton condamné et du /admin/config fantôme');
  const layoutInst = lire('../components/institution/InstitutionLayout.tsx');
  ok(!/module:\s*'supervision'|module:\s*'analytics'/.test(layoutInst),
    'InstitutionLayout : navItems alignés sur les clés serveur (dashboard/acteurs/audit)');
}

console.log('\n[7-ter] IDENT-03 : l\u2019état « complement » est visible sur le Suivi, avec son action');
{
  // IDENT-03 (20/10/2026) : SuiviIdentifications collapssait « complement » →
  // « submitted » (badge « En cours ») — le 4ᵉ état du workflow était
  // invisible ici alors que l'écran Acteurs le distingue correctement.
  // La garde verrouille les QUATRE pièces : état distinct, badge, KPI+filtre,
  // action « Compléter » branchée sur le mode complément existant de la
  // fiche (aucun nouveau flux inventé).
  const suivi = lire('../components/identificateur/SuiviIdentifications.tsx');
  const suiviCode = suivi.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  ok(!/case 'complement':\s*\n\s*return 'submitted';/.test(suiviCode),
    'SuiviIdentifications : « complement » n\u2019est plus collapsé en « submitted » (IDENT-03)');
  ok(/case 'complement':\s*\n\s*return 'complement';/.test(suiviCode),
    'SuiviIdentifications : « complement » est un état à part entière');
  ok(/Complément demandé/.test(suivi),
    'SuiviIdentifications : badge « Complément demandé » affiché (IDENT-03)');
  ok(/handleCompleter[\s\S]*mode:\s*'complement'/.test(suiviCode),
    'SuiviIdentifications : action « Compléter » branchée sur le mode complément de la fiche');
}

console.log('\n[7-quater] IDENT-08 : l\u2019Academy identificateur enseigne le VRAI workflow');
{
  // IDENT-08 (20/10/2026) : le quiz enseignait « 4 statuts » alors que la
  // machine serveur en compte SIX (brouillon/en_attente/approuve/valide/
  // rejete/complement, statuts-identification.ts), et il taisait les outils
  // réels (reprise de brouillon, complément, ONECI, sous-profil) ainsi que
  // la neutralité monétique (A-02, wallets fermés côté serveur). La garde
  // verrouille l'essentiel du curriculum dédié.
  const academy = lire('../components/academy/academyQuestions.ts');
  const academyCode = academy.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  ok(!/4 statuts : Brouillon, Soumis, Validé, Rejeté/.test(academy),
    'Academy : plus de « 4 statuts » (faux — la machine serveur en a 6) (IDENT-08)');
  ok(/6 états : brouillon, en attente/.test(academy),
    'Academy : la machine à 6 états est enseignée (IDENT-08)');
  ok(/monétairement neutre|monetairement neutre/.test(academy) && /403/.test(academy),
    'Academy : neutralité monétique enseignée (IDENTIFICATEUR-16, wallet 403 serveur)');
  ok(/reprise de session/.test(academy) && /ONECI/.test(academy) && /sous-profil/i.test(academy),
    'Academy : outils réels enseignés (reprise brouillon, ONECI, sous-profil)');
  ok(/XXXXXX 6780/.test(academy) && /P0\.0/.test(academy),
    'Academy : PII masquée + activation P0.0 enseignées');
}

console.log('\n[8] Le défaut est le côté sûr : les builds livrés ne posent PAS le drapeau');
{
  const apk = readFileSync(new URL('../../../../.github/workflows/apk.yml', import.meta.url), 'utf8');
  const render = readFileSync(new URL('../../../../render.yaml', import.meta.url), 'utf8');
  ok(!apk.includes(NOM), 'apk.yml ne pose pas le drapeau → APK masqué');
  ok(!render.includes(NOM), 'render.yaml ne pose pas le drapeau → julaba-web masqué');
  ok(accueilDuProfil('/inconnu/x') === '/', 'un chemin hors profil repart de la porte unique `/`');
  ok(MODULES_HORS_PILOTE.length > 0, `${MODULES_HORS_PILOTE.length} règles de masquage déclarées`);
}

console.log(echecs === 0
  ? '\n✅ Modules hors pilote masqués hors drapeau, visibles avec — rien de supprimé.\n'
  : `\n❌ ${echecs} échec(s).\n`);
process.exit(echecs === 0 ? 0 : 1);
