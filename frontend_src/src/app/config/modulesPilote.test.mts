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
  ['/identificateur/keiwa/historique', '/identificateur'],
  ['/backoffice/keiwa', '/backoffice/dashboard'],
  ['/marchand/tontines', '/marchand'],
  ['/marchand/tontines/42', '/marchand'],
  ['/marchand/protection-sociale', '/marchand'],
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
  ok(argent.length >= 40, `${argent.length} routes d'argent hors pilote trouvées dans routes.tsx`);
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
  ok(/moduleVisible\('keiwa'\) && \(\s*\n\s*<Section title="Wallet et Commissions"/.test(lire('../components/shared/UniversalParametres.tsx')),
    'UniversalParametres : « Mon Keiwa » (identificateur) suit le drapeau');
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
