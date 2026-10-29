/**
 * LA TOUCHE RETOUR N'ARRACHE PLUS LA CAISSE DES MAINS.
 *
 * Ce que ce test verrouille : sur l'APK, la touche retour recule d'un écran
 * quand il y en a un, et ne ferme JAMAIS l'application sans prévenir — le
 * premier appui à la racine avertit, le second (sous 2 secondes) ferme.
 * Sur le web, la touche retour de l'appareil n'existe pas : non-opération.
 *
 * Le cas piégé est le lien profond : un WebView qui démarre sur un
 * historique étranger peut déclarer « je peux reculer » alors que reculer
 * sortirait de l'application. La garde exige donc DEUX votes (WebView +
 * react-router) avant de reculer — sinon on bascule en « quitter » assumé.
 *
 * Lancer : npm run test:retour-appareil
 */
import type { PontAppareil } from './retourAppareil.js';
import { installerRetourAppareil, DELAI_DOUBLE_APPUI_MS } from './retourAppareil.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};

console.log('\nLa touche retour n\'arrache plus la caisse des mains\n');

// ── Petit banc : pont piloté à la main, horloge qu'on tourne, écran qu'on ──
// ── fait vivre SOUS une seule installation (comme dans une vraie session) ──
interface Banc {
  pont: PontAppareil;
  installer: () => () => void;
  muterEcran: (idx: number | null) => void;
  appuyer: (peutReculer: boolean) => void;
  avancer: (ms: number) => void;
  compteurQuitter: () => number;
  compteurRecul: () => number;
  toutNettoyer: () => void;
}

function banc(): Banc {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cb: ((peutReculer: boolean) => void) | null = null;
  let quitters = 0;
  let reculs = 0;
  let maintenant = 0;
  let idx: number | null = 0; // position react-router dans la fenêtre

  const pont: PontAppareil = {
    disponible: () => true,
    surRetour(ecouteur) {
      cb = ecouteur;
      return () => { cb = null; };
    },
    quitter() { quitters++; },
  };

  const debranchers: Array<() => void> = [];

  return {
    pont,
    installer() {
      (globalThis as Any).window = {
        history: {
          get state() { return idx === null ? null : { idx }; },
          back() { reculs++; },
        },
      };
      const d = installerRetourAppareil(pont, () => maintenant);
      debranchers.push(d);
      return d;
    },
    muterEcran(nouvelIdx: number | null) { idx = nouvelIdx; },
    appuyer(peutReculer: boolean) { cb?.(peutReculer); },
    avancer(ms: number) { maintenant += ms; },
    compteurQuitter: () => quitters,
    compteurRecul: () => reculs,
    toutNettoyer() {
      debranchers.forEach((d) => d());
      debranchers.length = 0;
      delete (globalThis as Any).window;
    },
  };
}

console.log('[1] SUR LE WEB, LA TOUCHE RETOUR DE L\'APPAREIL N\'EXISTE PAS');
{
  const web: PontAppareil = {
    disponible: () => false,
    surRetour: () => { ok(false, 'l\'écoute ne doit jamais être posée sur le web'); return () => {}; },
    quitter: () => { ok(false, 'on ne ferme jamais une page web'); },
  };
  const debrancher = installerRetourAppareil(web);
  ok(typeof debrancher === 'function', 'l\'installation rend bien une fonction de nettoyage');
  debrancher();
  ok(true, 'installation et retrait sans bruit (non-opération complète)');
}

console.log('\n[2] UN ÉCRAN DERRIÈRE → ON RECULE, RIEN DE PLUS');
{
  const b = banc();
  b.installer();
  b.muterEcran(1);
  b.appuyer(true);
  ok(b.compteurRecul() === 1, 'un appui recule d\'un écran (history.back)');
  ok(b.compteurQuitter() === 0, 'et surtout ne ferme jamais l\'application');
  b.toutNettoyer();
}

console.log('\n[3] À LA RACINE, LE PREMIER APPUI AVERTIT — IL NE FERME PAS');
{
  const b = banc();
  b.installer();
  b.appuyer(false);
  ok(b.compteurQuitter() === 0, 'premier appui : l\'avis s\'affiche, l\'appli reste ouverte');
  b.toutNettoyer();
}

console.log('\n[4] DEUX APPUIS RAPPROCHÉS À LA RACINE → ON FERME, ASSUMÉ');
{
  const b = banc();
  b.installer();
  b.appuyer(false);
  b.avancer(500);
  b.appuyer(false);
  ok(b.compteurQuitter() === 1, `deuxième appui sous ${DELAI_DOUBLE_APPUI_MS} ms : l'appli se ferme une seule fois`);
  b.toutNettoyer();
}

console.log('\n[5] DEUX APPUIS ESPACÉS → RIEN NE SE FERME, L\'INTENTION SE RECONNAÎT QUAND MÊME');
{
  const b = banc();
  b.installer();
  b.appuyer(false);
  b.avancer(DELAI_DOUBLE_APPUI_MS + 600);
  b.appuyer(false);
  ok(b.compteurQuitter() === 0, 'appuis espacés au-delà du délai : jamais de fermeture');
  b.avancer(300);
  b.appuyer(false);
  ok(b.compteurQuitter() === 1, 'mais une vraie intention (2 appuis rapprochés) ferme toujours');
  b.toutNettoyer();
}

console.log('\n[6] LE PIÈGE DU LIEN PROFOND — RECULER DANS UN HISTORIQUE ÉTRANGER, NON');
{
  const b = banc();
  b.installer();
  // WebView dit « je peux reculer » (peutReculer=true), mais react-router
  // est à l'index 0 : cet historique n'est pas le nôtre — reculer sortirait
  // de l'application.
  b.appuyer(true);
  ok(b.compteurRecul() === 0, 'double vote refusé : on ne recule PAS dans l\'historique étranger');
  ok(b.compteurQuitter() === 0, 'et le premier appui reste un simple avertissement');
  b.avancer(200);
  b.appuyer(true);
  ok(b.compteurQuitter() === 1, 'deuxième appui assumé : fermeture propre au lieu d\'une fuite');
  b.toutNettoyer();
}

console.log('\n[7] RECULER REMET LE COMPTEUR DU « QUITTER » À ZÉRO');
{
  const b = banc();
  b.installer();
  b.appuyer(false); // t=0 : premier avertissement à la racine
  b.muterEcran(1);
  b.avancer(600);
  b.appuyer(true); // t=600 : elle recule d'un écran
  ok(b.compteurRecul() === 1, 'le recul fonctionne au milieu d\'une session');
  b.muterEcran(0);
  b.avancer(0);
  b.appuyer(false); // t=600 : retour à la racine, appui isolé
  ok(b.compteurQuitter() === 0,
     'un appui isolé après un recul ne ferme PAS — l\'avertissement de t=0 est oublié');
  b.avancer(400);
  b.appuyer(false); // t=1000 : 400 ms après le précédent
  ok(b.compteurQuitter() === 1, 'seul un double appui consécutif ferme');
  b.toutNettoyer();
}

console.log('\n[8] DÉBRANCHER, C\'EST VRAIMENT DÉBRANCHER');
{
  const b = banc();
  b.installer();
  b.toutNettoyer();
  b.appuyer(false);
  b.avancer(100);
  b.appuyer(false);
  ok(b.compteurQuitter() === 0, 'après retrait, la touche retour ne pilote plus rien');
}

console.log(echecs === 0
  ? '\n✅ La touche retour recule quand il faut, avertit avant de fermer, et ne fuit jamais dans un historique étranger.\n'
  : `\n❌ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
