// ──────────────────────────────────────────────────────────────────────────
// Garde-fou du ROUTAGE AUDIO — la partie DÉCISION, celle qui est prouvable.
//
// CE QUE CE FICHIER PROUVE, ET CE QU'IL NE PROUVE PAS. Il prouve que, pour un
// état donné du matériel, la décision de routage est celle qu'on attend : quel
// micro écoute, où sort la voix de Tantie, et quand on replie sur le téléphone.
// Il ne prouve RIEN de ce qu'Android fait ensuite : aucun test ici n'a vu une
// oreillette. C'est exactement pour ça que la décision a été sortie du code
// natif — pour que la part vérifiable soit la plus grosse possible.
// ──────────────────────────────────────────────────────────────────────────

import {
  COUTS_DES_MODES,
  DELAI_CONFIRMATION_MS,
  ETAT_INITIAL,
  GRACE_APRES_ECOUTE_MS,
  MODES,
  MODE_PAR_DEFAUT,
  PLAFOND_ECHECS,
  attenteAvantCapture,
  decider,
  routageEffectif,
  type EtatRoutage,
  type ModeRoutage,
} from './decisionRoutage.js';

let echecs = 0;
function ok(condition: boolean, libelle: string): void {
  if (condition) console.log(`  ✓ ${libelle}`);
  else { echecs++; console.error(`  ✗ ${libelle}`); }
}

/** Un état complet à partir de quelques champs — le reste au repos. */
const etat = (p: Partial<EtatRoutage>): EtatRoutage => ({ ...ETAT_INITIAL, ...p });

/** Oreillette branchée, sachant faire micro ET média, application sur APK. */
const avecOreillette = (p: Partial<EtatRoutage> = {}): EtatRoutage =>
  etat({ natifDisponible: true, oreilletteConnectee: true, oreilletteSortieMedia: true, ...p });

console.log('\n── Les trois modes existent, et chacun dit ce qu’il coûte ──');

ok(MODES.length === 3, 'trois modes exposés, pas deux');
ok(
  MODES.includes('tout-telephone') &&
    MODES.includes('sortie-oreillette') &&
    MODES.includes('tout-oreillette'),
  'tout téléphone · sortie oreillette + micro téléphone · tout oreillette',
);
ok(
  MODES.every((m) => typeof COUTS_DES_MODES[m] === 'string' && COUTS_DES_MODES[m].length > 40),
  'chaque mode porte, en données, le prix qu’il fait payer (arbitrage de Patrick)',
);
ok(
  MODE_PAR_DEFAUT === 'tout-oreillette',
  'le défaut est celui que Patrick a demandé mot pour mot : micro ET voix dans l’oreillette',
);

console.log('\n── Sans pont natif (le web) : on ne touche à rien ──');

const web = etat({ natifDisponible: false, oreilletteConnectee: true, mode: 'tout-oreillette' });
ok(decider(web).action === 'rien', 'pas de plugin natif : aucune action de routage');
ok(decider(web).routage.entree === 'telephone', 'micro du téléphone');
ok(decider(web).routage.sortie === 'telephone', 'sortie du téléphone');
ok(attenteAvantCapture(web) === 0, 'aucune attente infligée à la marchande sur le web');

console.log('\n── Mode « tout téléphone » : comportement d’aujourd’hui, à la lettre ──');

const toutTel = avecOreillette({ mode: 'tout-telephone', capturesOuvertes: 1 });
ok(decider(toutTel).action === 'rien', 'oreillette branchée mais mode téléphone : on n’ouvre rien');
ok(routageEffectif(toutTel).sortie === 'telephone', 'la voix de Tantie reste au téléphone');
ok(attenteAvantCapture(toutTel) === 0, 'aucune attente : le micro s’ouvre immédiatement');
ok(
  decider(avecOreillette({ mode: 'tout-telephone', canalMicroActif: true })).action ===
    'fermer-canal-micro',
  'un canal qui traînait d’un mode précédent est rendu, pas laissé ouvert',
);

console.log('\n── Mode « sortie oreillette + micro téléphone » (reconnaissance intacte) ──');

const mixte = avecOreillette({ mode: 'sortie-oreillette', capturesOuvertes: 1 });
ok(routageEffectif(mixte).sortie === 'oreillette', 'Tantie parle dans l’oreillette (A2DP)');
ok(routageEffectif(mixte).entree === 'telephone', 'le micro reste celui du téléphone');
ok(
  decider(mixte).action === 'rien' && decider(mixte).raison === 'sortie-a2dp',
  'aucun canal SCO ouvert — c’est ce qui garde le signal de sherpa-onnx intact',
);
ok(
  attenteAvantCapture(mixte) === 0,
  'aucune latence d’activation : le début de phrase ne peut pas être perdu',
);
const mixteMono = avecOreillette({
  mode: 'sortie-oreillette',
  oreilletteSortieMedia: false,
  capturesOuvertes: 1,
});
ok(
  routageEffectif(mixteMono).sortie === 'telephone' &&
    decider(mixteMono).raison === 'oreillette-sans-media',
  'oreillette mono sans A2DP : ce mode ne lui porte RIEN, et la décision le dit',
);

console.log('\n── Mode « tout oreillette » : micro et voix dans l’oreille ──');

const demande = avecOreillette({ mode: 'tout-oreillette', capturesOuvertes: 1 });
ok(decider(demande).action === 'ouvrir-canal-micro', 'capture demandée : on ouvre le canal micro');
ok(
  attenteAvantCapture(demande) === DELAI_CONFIRMATION_MS,
  'on attend la confirmation du canal AVANT d’ouvrir le micro (début de phrase préservé)',
);

const enVol = avecOreillette({
  mode: 'tout-oreillette',
  capturesOuvertes: 1,
  ouvertureEnCours: true,
  msDepuisDemande: 300,
});
ok(decider(enVol).action === 'rien', 'ouverture en vol : on laisse Android répondre');
ok(
  routageEffectif(enVol).entree === 'telephone',
  'tant que ce n’est pas CONFIRMÉ, le journal dit « téléphone » — pas de mensonge au rapport',
);
ok(
  attenteAvantCapture(enVol) === DELAI_CONFIRMATION_MS - 300,
  'le temps déjà attendu est décompté, il ne s’ajoute pas',
);

const actif = avecOreillette({ mode: 'tout-oreillette', capturesOuvertes: 1, canalMicroActif: true });
ok(decider(actif).action === 'rien', 'canal confirmé : plus rien à faire');
ok(routageEffectif(actif).entree === 'oreillette', 'c’est le micro de l’oreillette qui écoute');
ok(routageEffectif(actif).sortie === 'oreillette', 'et la voix de Tantie sort dans l’oreillette');
ok(attenteAvantCapture(actif) === 0, 'canal déjà actif : plus aucune attente');

const monoActif = avecOreillette({
  mode: 'tout-oreillette',
  oreilletteSortieMedia: false,
  capturesOuvertes: 1,
  canalMicroActif: true,
});
ok(
  routageEffectif(monoActif).sortie === 'oreillette',
  'oreillette mono SANS A2DP : le canal téléphonique lui porte quand même la voix de Tantie',
);

console.log('\n── Repli : oreillette absente, perdue, ou qui ne répond pas ──');

const jamais = etat({ natifDisponible: true, mode: 'tout-oreillette', capturesOuvertes: 1 });
ok(decider(jamais).action === 'rien' && decider(jamais).raison === 'pas-d-oreillette',
  'aucune oreillette : on écoute par le téléphone, sans rien tenter');
ok(attenteAvantCapture(jamais) === 0, 'et sans faire patienter la marchande une seule milliseconde');

// LE CAS QUI COMPTE : l'oreillette tombe alors que le micro est OUVERT.
const perdueEnPleineVente = etat({
  natifDisponible: true,
  mode: 'tout-oreillette',
  oreilletteConnectee: false,
  canalMicroActif: true,
  capturesOuvertes: 1,
});
ok(
  decider(perdueEnPleineVente).action === 'replier-sur-telephone',
  'oreillette perdue EN PLEINE VENTE, micro ouvert : repli immédiat sur le téléphone',
);
ok(
  decider(perdueEnPleineVente).raison === 'oreillette-perdue',
  'et la raison est nommée, pour que le rapport de terrain soit lisible',
);
ok(
  decider(perdueEnPleineVente).routage.entree === 'telephone' &&
    decider(perdueEnPleineVente).routage.sortie === 'telephone',
  'les deux voies retombent sur le téléphone : jamais de silence',
);
ok(
  decider({ ...perdueEnPleineVente, mode: 'sortie-oreillette' }).routage.sortie === 'telephone',
  'même repli en mode « sortie oreillette » : Android n’a plus personne au bout',
);

const enRetard = avecOreillette({
  mode: 'tout-oreillette',
  capturesOuvertes: 1,
  ouvertureEnCours: true,
  msDepuisDemande: DELAI_CONFIRMATION_MS,
});
ok(
  decider(enRetard).action === 'replier-sur-telephone' && decider(enRetard).raison === 'delai-depasse',
  'canal toujours pas confirmé au délai : on écoute par le téléphone plutôt que d’attendre',
);
ok(attenteAvantCapture(enRetard) === 0, 'et on n’attend pas une seconde de plus');

const trop = avecOreillette({
  mode: 'tout-oreillette',
  capturesOuvertes: 1,
  echecsConsecutifs: PLAFOND_ECHECS,
});
ok(
  decider(trop).action === 'rien' && decider(trop).raison === 'ouverture-impossible',
  'après deux échecs de suite, on cesse d’insister : plus de son qui clignote à chaque phrase',
);
ok(attenteAvantCapture(trop) === 0, 'et plus aucune attente au démarrage du micro');

console.log('\n── Au repos : la grâce, puis on rend le canal ──');

const graceEnCours = avecOreillette({
  mode: 'tout-oreillette',
  canalMicroActif: true,
  capturesOuvertes: 0,
  msDepuisDerniereCapture: GRACE_APRES_ECOUTE_MS - 1,
});
ok(
  decider(graceEnCours).action === 'rien' && decider(graceEnCours).raison === 'grace-reponse-de-tantie',
  'écoute finie : le canal tient le temps que Tantie réponde dans l’oreillette',
);
ok(routageEffectif(graceEnCours).sortie === 'oreillette', 'la réponse sort bien dans l’oreillette');

const graceFinie = avecOreillette({
  mode: 'tout-oreillette',
  canalMicroActif: true,
  capturesOuvertes: 0,
  msDepuisDerniereCapture: GRACE_APRES_ECOUTE_MS,
});
ok(
  decider(graceFinie).action === 'fermer-canal-micro',
  'grâce écoulée : on rend le canal, la sortie repasse en pleine qualité A2DP',
);
ok(
  decider(graceFinie).routage.sortie === 'oreillette',
  'et la voix de Tantie reste dans l’oreillette, par l’A2DP cette fois',
);

console.log('\n── La décision est totale : elle répond pour TOUT état ──');

let toujoursUneReponse = true;
const bool = [false, true];
for (const mode of MODES as readonly ModeRoutage[]) {
  for (const natif of bool) for (const connectee of bool) for (const media of bool) {
    for (const canal of bool) for (const enCours of bool) for (const captures of [0, 1]) {
      const d = decider(etat({
        mode, natifDisponible: natif, oreilletteConnectee: connectee,
        oreilletteSortieMedia: media, canalMicroActif: canal, ouvertureEnCours: enCours,
        capturesOuvertes: captures, msDepuisDemande: 0, msDepuisDerniereCapture: 0,
      }));
      if (!d || !d.action || !d.routage || !d.raison) toujoursUneReponse = false;
      // Sans oreillette, jamais un routage ne peut désigner l'oreillette :
      // ce serait promettre du son à un appareil absent.
      if (!connectee && (d.routage.entree === 'oreillette' || d.routage.sortie === 'oreillette')) {
        toujoursUneReponse = false;
      }
    }
  }
}
ok(toujoursUneReponse,
  '192 états balayés : toujours une décision, et jamais l’oreillette désignée quand elle est absente');

console.log(
  echecs === 0
    ? '\nRoutage audio — décision validée. Aucun de ces tests n’a vu une oreillette : le comportement réel reste à observer sur un téléphone.'
    : `\n${echecs} échec(s).`,
);
if (echecs > 0) process.exit(1);
