/**
 * DICTÉE WEB — LE MOTEUR DU NAVIGATEUR, ET RIEN D'AUTRE QUI BOUGE.
 *
 * Décision du 19/10/2026 (docs/DECISIONS.md, arbitrage Patrick) : sur le WEB,
 * la dictée passe par la reconnaissance vocale native du navigateur, parce que
 * sherpa-onnx est un plugin Capacitor Android (SherpaSttPlugin.kt) qui n'existe
 * pas dans un navigateur — jusqu'ici, le web affichait « La dictée n'est
 * disponible que dans l'application. Ici, touche les produits. »
 *
 * CE QUE CE MAILLON GARDE (le contrat de voice-offline/webReco.ts) :
 *  1. Hors navigateur équipé, RIEN ne change : le filet reste le pavé.
 *  2. Sur l'APK (Capacitor android/ios), le navigateur n'a jamais la main —
 *     sherpa garde son chemin, même si le WebView exposait un SpeechRecognition.
 *  3. conclure() livre le texte UNE fois ; annuler() (reset, démontage) ne livre
 *     JAMAIS rien — une commande ne part pas après un reset.
 *  4. Une erreur (micro refusé, réseau) tranche : plus aucun texte livré après.
 *  5. Les trois écrans sont bien branchés (preuve par la source) : la vente
 *     (useVoiceCore), la dictée du numéro (useDicteeLive) et le signal du micro
 *     de connexion (LoginPassword).
 *
 * Lancer : npm run test:web-reco
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recoWebDispo, demarrerRecoWeb } from './webReco.js';

const ICI = dirname(fileURLToPath(import.meta.url));
const lire = (rel: string) => readFileSync(join(ICI, rel), 'utf8');

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};

/** Stub du SpeechRecognition du navigateur : événements pilotés par le test. */
class RecoStub {
  static derniere: RecoStub | null = null;
  lang = '';
  continuous = false;
  interimResults = false;
  onresult: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  demarre = false;
  stoppe = false;
  annule = false;
  constructor() { RecoStub.derniere = this; }
  start() { this.demarre = true; }
  stop() { this.stoppe = true; queueMicrotask(() => this.onend?.()); }
  abort() { this.annule = true; queueMicrotask(() => this.onend?.()); }
}

const g = globalThis as unknown as { window?: unknown };
const poser = (w: unknown) => { g.window = w; };

console.log('\n[1] HORS NAVIGATEUR — RIEN NE BOUGE, LE PAVÉ RESTE LE FILET');
{
  delete g.window;
  ok(recoWebDispo() === false, 'sans window (SSR/node) : dictée web indisponible');
  ok(demarrerRecoWeb({ conclure: () => {} }) === null, 'et aucun démarrage silencieux');

  poser({}); // navigateur sans SpeechRecognition (Firefox)
  ok(recoWebDispo() === false, 'navigateur sans SpeechRecognition : indisponible');
  ok(demarrerRecoWeb({ conclure: () => {} }) === null, '→ l\'appelant garde son filet (siPasPrete / message)');
}

console.log('\n[2] APK EXCLUE — SHERPA GARDE LA MAIN, MÊME SI LE WEBVIEW SAIT RECONNAÎTRE');
{
  poser({ SpeechRecognition: RecoStub, Capacitor: { getPlatform: () => 'android' } });
  ok(recoWebDispo() === false, 'Capacitor android : la reconnaissance navigateur est exclue');
  ok(demarrerRecoWeb({ conclure: () => {} }) === null, '→ jamais de double moteur sur l\'APK');
  poser({ SpeechRecognition: RecoStub, Capacitor: { getPlatform: () => 'ios' } });
  ok(recoWebDispo() === false, 'Capacitor ios : exclue aussi');
}

console.log('\n[3] ÉCOUTE WEB — LE TEXTE EST LIVRÉ UNE FOIS, INTERPRETÉ ENSUITE LOCALEMENT');
{
  poser({ SpeechRecognition: RecoStub });
  ok(recoWebDispo() === true, 'navigateur équipé : dictée dispo');

  const interims: string[] = [];
  const livres: string[] = [];
  const eco = demarrerRecoWeb({
    interim: (t) => interims.push(t),
    conclure: (t) => livres.push(t),
  });
  ok(eco !== null, 'l\'écoute démarre');
  const r = RecoStub.derniere!;
  ok(r.demarre === true && r.lang === 'fr-FR' && r.continuous === true,
     'fr-FR, écoute continue (la marchande parle avec des pauses)');

  r.onresult?.({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: 'zéro six' } }] });
  ok(interims[interims.length - 1] === 'zéro six', 'partiel affiché en direct (remplit l\'écran)');

  r.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'zéro six huit' } }] });
  // Chrome renvoie le tableau CUMULATIF : index 0 (déjà vu) puis index 1.
  r.onresult?.({
    resultIndex: 1,
    results: [
      { isFinal: true, 0: { transcript: 'zéro six huit' } },
      { isFinal: true, 0: { transcript: 'trois cinq' } },
    ],
  });

  await eco!.conclure();
  ok(r.stoppe === true, 'conclure() arrête réellement l\'écoute');
  ok(livres.length === 1, 'le texte final est livré EXACTEMENT une fois');
  ok(livres[0] === 'zéro six huit trois cinq',
     'tout ce qui a été entendu est livré (pas seulement le dernier fragment)');
}

console.log('\n[4] ANNULATION — UN RESET N\'ENVOIE JAMAIS UNE COMMANDE EN ATTENTE');
{
  poser({ SpeechRecognition: RecoStub });
  const livres: string[] = [];
  const eco = demarrerRecoWeb({ conclure: (t) => livres.push(t) });
  const r = RecoStub.derniere!;
  r.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'vend dix tomates' } }] });
  eco!.annuler();
  await new Promise<void>((resolve) => queueMicrotask(() => resolve()));
  ok(r.annule === true, 'annuler() aborte l\'écoute du navigateur');
  ok(livres.length === 0, 'aucun texte livré après une annulation (reset/démontage)');
}

console.log('\n[5] ERREUR — LA CAUSE DITE EST LA VRAIE, ET ELLE TRANCHE');
{
  poser({ SpeechRecognition: RecoStub });
  const livres: string[] = [];
  const erreurs: string[] = [];
  const eco = demarrerRecoWeb({
    conclure: (t) => livres.push(t),
    erreur: (code) => erreurs.push(code),
  });
  const r = RecoStub.derniere!;
  r.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'moitié d\'une phrase' } }] });
  r.onerror?.({ error: 'not-allowed' });
  r.onend?.(); // le navigateur finit son cycle APRÈS l'erreur
  ok(erreurs.join() === 'micro', 'micro refusé → code "micro" (le pavé prend la main)');
  ok(livres.length === 0, 'l\'erreur tranche : aucun texte livré après elle');

  poser({ SpeechRecognition: RecoStub });
  const erreurs2: string[] = [];
  const eco2 = demarrerRecoWeb({ conclure: () => { echecs++; }, erreur: (c) => erreurs2.push(c) });
  void eco2;
  RecoStub.derniere!.onerror?.({ error: 'network' });
  ok(erreurs2.join() === 'reseau', 'réseau du navigateur en panne → code "reseau" (jamais masqué)');
}

console.log('\n[6] LA PREUVE TRAVERSE — LES TROIS ÉCRANS SONT BRANCHÉS AU MOTEUR WEB');
{
  const coeur = lire('../hooks/useVoiceCore.ts');
  const dictee = lire('../hooks/useDicteeLive.ts');
  const connexion = lire('../components/auth/LoginPassword.tsx');

  ok(coeur.includes('demarrerRecoWeb('), 'vente (useVoiceCore) : dictée web branchée');
  ok(coeur.includes('.annuler()'), 'vente : le reset annule sans livrer (brouillon corrigé)');
  ok(dictee.includes('demarrerRecoWeb('), 'dictée du numéro (useDicteeLive) : branche web branchée');
  ok(dictee.includes('surPasseSTT('), 'dictée du numéro : UNE pipeline de chiffres pour les deux moteurs');
  ok(connexion.includes('recoWebDispo()'), 'connexion (LoginPassword) : le micro s\'affiche si le web sait écouter');
  // Le filet ne doit pas disparaître : hors navigateur équipé, la dictée reste refusée.
  ok(dictee.includes('siPasPrete()'), 'hors navigateur équipé : le filet siPasPrete() reste en place');
}

console.log(echecs === 0
  ? '\n✅ Le web dictée avec le navigateur, l\'APK garde sherpa, le pavé reste le filet.\n'
  : `\n❌ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
