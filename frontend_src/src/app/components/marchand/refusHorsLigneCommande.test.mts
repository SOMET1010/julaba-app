/**
 * B4 — UNE ACTION DE COMMANDE SANS RÉSEAU SE REFUSE, ELLE NE S'ÉCHOUE PAS.
 * Lancer : npm run test:refus-hors-ligne-commande   (tsx, sans DOM)
 *
 * LE DÉFAUT, TEL QU'IL SE VIT AU MARCHÉ. Sans réseau, `fetch` lève
 * « TypeError: Failed to fetch » et les gestionnaires de `MesCommandes.tsx`
 * faisaient `speak(e.message)` : la marchande entendait « Failed to fetch ».
 * Elle ne pouvait ni comprendre, ni savoir que son geste n'était pas parti,
 * ni savoir qu'il faudrait recommencer. Elle rappuyait.
 *
 * CE QUE CE TEST PROUVE, ET COMMENT. Il n'inspecte pas le source : il EXTRAIT
 * chaque gestionnaire du VRAI `MesCommandes.tsx`, le détype par le compilateur
 * TypeScript et l'EXÉCUTE, hors ligne puis en ligne, avec des appels d'API
 * espionnés. On regarde trois choses, dans cet ordre d'importance :
 *
 *   1. RIEN N'EST PERDU NI COMPTÉ DEUX FOIS. Hors ligne, l'API n'est PAS
 *      appelée du tout, et aucun état local n'est modifié. Une commande
 *      refusée reste exactement ce qu'elle était. Rien n'est mis en file :
 *      une action de commande se négocie à deux, la rejouer en silence plus
 *      tard serait pire que de dire non maintenant.
 *   2. CE QUI EST DIT EST COMPRÉHENSIBLE. Plus aucun message technique.
 *   3. LE CAS TRAÎTRE EST COUVERT. `navigator.onLine` peut dire « en ligne »
 *      alors que l'envoi tombe : ce cas-là doit être dit aussi clairement.
 *      Et un vrai refus MÉTIER du serveur (4xx) garde son propre message —
 *      c'est lui qui porte l'information utile.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { causeEchec, reseauIndisponible } from '../../services/actionReseauRequis.js';
import { entreeTts } from '../../i18n/voice/catalog.js';

/** Le texte RÉEL de la clé, lu au catalogue — jamais recopié ici. */
const texteCatalogue = (cle: string) => entreeTts(cle)?.frActuel ?? `CLÉ INCONNUE:${cle}`;

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log('  ✅', label);
  else { console.log('  ❌', label); failures++; }
}

const ICI = dirname(fileURLToPath(import.meta.url));
const F_ECRAN = join(ICI, 'MesCommandes.tsx');
const F_CONTEXTE = join(ICI, '..', '..', 'contexts', 'CommandeContext.tsx');
const src = readFileSync(F_ECRAN, 'utf8');

// ── Extraction du VRAI code ─────────────────────────────────────────────────

/** Avance d'un caractère de code : saute chaînes, gabarits et commentaires. */
function sauter(s: string, i: number): number {
  const c = s[i];
  if (c === '/' && s[i + 1] === '/') { const j = s.indexOf('\n', i); return j === -1 ? s.length : j + 1; }
  if (c === '/' && s[i + 1] === '*') { const j = s.indexOf('*/', i + 2); return j === -1 ? s.length : j + 2; }
  if (c === '"' || c === "'" || c === '`') {
    let j = i + 1;
    while (j < s.length && s[j] !== c) { if (s[j] === '\\') j++; j++; }
    return j + 1;
  }
  return i + 1;
}

/** Le bloc qui commence à `ancre` et se ferme à l'accolade correspondante. */
function blocDepuis(s: string, ancre: string): string {
  const debut = s.indexOf(ancre);
  if (debut === -1) throw new Error(`ancre introuvable : ${ancre}`);
  let i = debut, prof = 0, entre = false;
  while (i < s.length) {
    const j = sauter(s, i);
    if (j === i + 1) {
      if (s[i] === '{') { prof++; entre = true; }
      else if (s[i] === '}') { prof--; if (entre && prof === 0) return s.slice(debut, i + 1); }
    }
    i = j;
  }
  throw new Error(`bloc non refermé : ${ancre}`);
}

type Dits = string[];
type Espion = { appels: string[]; etats: string[] };

/** Charge un gestionnaire RÉEL et lui donne des dépendances espionnées.
 *  Le porte-parole `direEchecReseau` est extrait du MÊME source : ce sont donc
 *  les vraies phrases de l'écran qu'on entend, pas un doublon de test. */
function chargerGestionnaire(nom: string) {
  const porteParole = blocDepuis(src, 'const direEchecReseau = (');
  const bloc = blocDepuis(src, `const ${nom} = async (`);
  const js = ts.transpileModule(porteParole + ';\n' + bloc, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
  }).outputText;
  return (deps: Record<string, unknown>) => {
    const fabrique = new Function('deps', `
      const { ${Object.keys(deps).join(', ')} } = deps;
      ${js}
      return ${nom};
    `);
    return fabrique(deps) as (...a: unknown[]) => Promise<void>;
  };
}

/** Environnement complet d'un gestionnaire, avec tous les espions. */
function environnement(erreurApi: (() => never) | null) {
  const dits: Dits = [];
  const espion: Espion = { appels: [], etats: [] };
  const api = (nom: string) => async (...a: unknown[]) => {
    espion.appels.push(nom);
    if (erreurApi) erreurApi();
    return (nom === 'fetchNegociations' ? { negociations: [] } : undefined) as never;
  };
  return {
    dits, espion,
    deps: {
      speak: (t: unknown) => { dits.push(String(t)); },
      t: (cle: string) => texteCatalogue(cle),
      annulerCommande: api('annulerCommande'),
      updateCommande: api('updateCommande'),
      marchandRepondreNegociation: api('marchandRepondreNegociation'),
      fetchNegociations: api('fetchNegociations'),
      mapNegociation: (x: unknown) => x,
      setNegociations: () => { espion.etats.push('setNegociations'); },
      setSubmittingNeg: () => { /* simple verrou d'UI, pas un état de donnée */ },
      causeEchec, reseauIndisponible,
    },
  };
}

function poserReseau(enLigne: boolean) {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: enLigne } });
}

class ErreurHttp extends Error { status: number; constructor(m: string, s: number) { super(m); this.status = s; } }

const GESTIONNAIRES = [
  { nom: 'handleAnnuler', arg: 'cmd-1' },
  { nom: 'handleConfirmerVente', arg: 'cmd-2' },
  { nom: 'handleRefuserVente', arg: 'cmd-3' },
  { nom: 'handleMarquerLivree', arg: 'cmd-4' },
  { nom: 'handleAccepterContreOffre', arg: { id: 'neg-1', prixContreOffre: 500, unite: 'kg' } },
  { nom: 'handleRefuserContreOffre', arg: { id: 'neg-2', prixContreOffre: 500, unite: 'kg' } },
];

/** Un message est-il utilisable par une marchande ? (pas de jargon technique) */
const JARGON = [/failed to fetch/i, /networkerror/i, /typeerror/i, /fetch/i, /undefined/i, /\[object/i, /NOT_AUTHENTICATED/];
const parleHumain = (m: string) => m.length > 0 && !JARGON.some((re) => re.test(m));

console.log('\n[1] HORS LIGNE — rien ne part, rien ne bouge, et c’est DIT');
for (const g of GESTIONNAIRES) {
  poserReseau(false);
  const env = environnement(() => { throw new TypeError('Failed to fetch'); });
  const fn = chargerGestionnaire(g.nom)(env.deps);
  await fn(g.arg);

  ok(env.espion.appels.length === 0,
    `B4-1 ${g.nom} : hors ligne, AUCUN appel serveur (${env.espion.appels.join(', ') || 'aucun'}) — rien ne peut être perdu ni compté deux fois`);
  ok(env.espion.etats.length === 0,
    `B4-1 ${g.nom} : hors ligne, aucun état local modifié (${env.espion.etats.join(', ') || 'aucun'})`);
  ok(env.dits.length > 0 && env.dits.every(parleHumain),
    `B4-1 ${g.nom} : ce qui est dit est compréhensible (${JSON.stringify(env.dits)})`);
}

console.log('\n[2] LE CAS TRAÎTRE — le téléphone se croit en ligne, l’envoi tombe');
for (const g of GESTIONNAIRES) {
  poserReseau(true);
  const env = environnement(() => { throw new TypeError('Failed to fetch'); });
  const fn = chargerGestionnaire(g.nom)(env.deps);
  await fn(g.arg);

  ok(env.espion.appels.length > 0, `B4-2 ${g.nom} : en ligne, l’action tente bien sa chance`);
  ok(env.dits.length > 0 && env.dits.every(parleHumain),
    `B4-2 ${g.nom} : l’échec de transport est dit sans jargon (${JSON.stringify(env.dits)})`);
  ok(env.espion.etats.length === 0, `B4-2 ${g.nom} : un envoi tombé ne modifie aucun état local`);
}

console.log('\n[3] UN REFUS MÉTIER DU SERVEUR GARDE SON MESSAGE');
{
  const METIER = 'Le paiement ne peut être encaissé qu’après livraison confirmée';
  for (const g of GESTIONNAIRES) {
    poserReseau(true);
    const env = environnement(() => { throw new ErreurHttp(METIER, 409); });
    const fn = chargerGestionnaire(g.nom)(env.deps);
    await fn(g.arg);
    ok(env.dits.some((d) => d.includes(METIER)),
      `B4-3 ${g.nom} : le message du serveur est redit tel quel (${JSON.stringify(env.dits)})`);
  }
}

console.log('\n[4] LE CLASSEMENT SE FAIT SUR LE STATUT, PAS SUR LE TEXTE');
{
  poserReseau(true);
  ok(causeEchec(new TypeError('Failed to fetch')) === 'envoi_tombe', 'B4-4 une erreur sans statut HTTP est du transport');
  ok(causeEchec(new ErreurHttp('Erreur HTTP 503', 503)) === 'envoi_tombe', 'B4-4 un 5xx est du transport');
  ok(causeEchec(new ErreurHttp('Commande introuvable', 404)) === null, 'B4-4 un 4xx est métier : son message reste');
  ok(causeEchec(new ErreurHttp('Conflit', 409)) === null, 'B4-4 un 409 est métier');
  poserReseau(false);
  ok(causeEchec(new ErreurHttp('Erreur HTTP 404', 404)) === 'hors_ligne',
    'B4-4 hors ligne, même un statut n’est pas une réponse du serveur : c’est le réseau');
  poserReseau(true);
  ok(reseauIndisponible() === false, 'B4-4 en ligne, on laisse tenter (fail open)');
}

console.log('\n[5] NON-RÉGRESSION — aucune écriture optimiste dans le contexte');
{
  // Ce qui garantit qu'une commande n'est jamais « confirmée » à l'écran sans
  // que le serveur l'ait acceptée : l'état local ne bouge qu'APRÈS l'attente.
  const ctx = readFileSync(F_CONTEXTE, 'utf8');
  const maj = blocDepuis(ctx, 'const updateCommande = async (');
  const ann = blocDepuis(ctx, 'const annulerCommande = async (');
  const apresAttente = (bloc: string, mutation: string) => {
    const iAwait = bloc.indexOf('await ');
    const iMut = bloc.indexOf(mutation);
    return iAwait !== -1 && iMut !== -1 && iAwait < iMut;
  };
  ok(apresAttente(maj, 'loadCommandes'), 'B4-5 updateCommande ne recharge qu’APRÈS la réponse du serveur');
  ok(apresAttente(ann, 'setCommandes'), 'B4-5 annulerCommande ne retire la ligne qu’APRÈS la réponse du serveur');
  ok(!/setCommandes\(prev[\s\S]{0,80}\)\s*;[\s\S]{0,40}await commandesApi/.test(ctx),
    'B4-5 aucune mutation locale n’est posée avant son appel serveur');
}

console.log(
  failures === 0
    ? '\nSans réseau, une action de commande est refusée clairement — et rien ne bouge ✅'
    : `\n${failures} test(s) en échec ❌`,
);
process.exit(failures ? 1 : 0);
