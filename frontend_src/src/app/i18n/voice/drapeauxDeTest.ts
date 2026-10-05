/**
 * LES DEUX DRAPEAUX DE CONSTRUCTION DU DIOULA — et la frontière exacte entre
 * « tester une solution » et « la distribuer ».
 *
 * CE QUE PATRICK A DIT, ET QUI TRANCHE. « Je suis en train de tester une
 * solution, je ne suis pas en train de la distribuer. Au moment de la
 * distribution, je vais enregistrer des voix. » Tout ce fichier découle de là.
 * La licence CC-BY-NC-4.0 de facebook/mms-tts-dyu interdit une DISTRIBUTION
 * commerciale ; elle n'interdit pas un build d'essai entre les mains de celui
 * qui l'a construit. Et à la distribution, ce modèle disparaîtra de toute
 * façon derrière de vrais enregistrements.
 *
 * ── POURQUOI DES DRAPEAUX DE CONSTRUCTION, ET PAS DES VARIABLES DE RUNTIME ──
 *
 * C'est le point qui fait tenir tout le reste, et il faut le lire avant de
 * toucher une ligne ici.
 *
 * Le lot B7 a posé un garde (hooks/langueNonPrete.test.mts) : une langue non
 * prête ne doit pas arriver jusqu'au moteur, `dyu-ci` doit rester un squelette
 * vide, et `LANGUE_PRETE.dioula` doit valoir `false`. Ce garde est juste et on
 * ne le défait pas. Mais il faut dire précisément CE QU'IL INTERDIT :
 *
 *      il interdit de LIVRER une demi-langue — pas de la TESTER.
 *
 * La configuration LIVRÉE, c'est celle où aucune constante de build n'est
 * définie : c'est exactement celle dans laquelle tournent `npm run verify`,
 * `npm run test:ci` et tous les tsx du dépôt. Ces deux drapeaux sont des
 * `define` du bundler (vite.config.ts) : ils n'existent PAS dans un processus
 * Node, `typeof` y répond `undefined`, et les deux constantes ci-dessous
 * valent `false`. Le garde B7 voit donc, et continuera de voir, la langue
 * telle qu'elle est livrée. Il reste vrai, entier, sans une ligne modifiée.
 *
 * Un `process.env` aurait fait l'inverse : il aurait rendu le garde faux dans
 * le processus qui l'évalue, c'est-à-dire qu'il l'aurait DÉSARMÉ. On ne
 * désarme pas un garde pour faire passer un essai.
 *
 * Corollaire assumé, et il faut le dire plutôt que de le laisser croire :
 * lancer `verify` avec ces variables d'environnement positionnées ne change
 * rien au résultat, par construction. Ce n'est pas un contournement, c'est la
 * preuve même — le train de tests mesure toujours le build livrable. Ce que
 * les drapeaux commandent est prouvé autrement : `drapeauxDyu.test.mts`
 * appelle les mêmes fonctions en leur passant l'état des drapeaux en
 * argument, et vérifie les trois états côte à côte dans un seul processus.
 *
 * ── LES DEUX DRAPEAUX ──────────────────────────────────────────────────────
 *
 *   JULABA_VOIX_DYU=1    → `VOIX_DYU_EMBARQUEE`
 *     La voix MMS dioula est posée dans les assets (android/scripts/
 *     installer-voix.sh lit la MÊME variable), « Dioula » devient
 *     sélectionnable dans les Réglages, et `dyu-ci` est peuplée du décor de
 *     travail qui existe déjà dans le dépôt. L'ARGENT RESTE EN FRANÇAIS.
 *
 *   JULABA_DYU_ARGENT=1  → `DYU_ARGENT_DE_TEST`
 *     EN PLUS, et seulement si le premier est allumé : les clés
 *     `critiqueArgent` qui ont une traduction dioula sont servies en dioula,
 *     et dites par la voix dioula.
 *
 * Les deux éteints par défaut. Un build ordinaire ne change pas d'un octet.
 *
 * ── CE QUE LE SECOND DRAPEAU OUVRE, ET QU'ON SAIT FAUX ─────────────────────
 *
 * À écrire en toutes lettres parce que personne ne doit le redécouvrir :
 *
 *   CE DRAPEAU SERT À JUGER LE SON, JAMAIS LE COMPTE.
 *   IL NE DOIT JAMAIS ÊTRE ALLUMÉ DANS UN BUILD REMIS À UNE MARCHANDE.
 *
 * Les nombres dioula du corpus sont en DRAFT, non validés par une locutrice,
 * et un nombre mandingue nu est ambigu entre francs et dɔrɔmɛ : « mugan »
 * peut valoir 20 F ou 100 F. Une Tantie qui annonce un montant en dioula peut
 * donc dire un chiffre juste à l'oreille et faux au compte, avec autorité, à
 * une femme qui ne peut pas le relire. On allume ce drapeau pour écouter une
 * VOIX, pour savoir si elle est intelligible et si le débit tient — pas pour
 * juger si le montant annoncé est le bon.
 *
 * C'est pourquoi ce drapeau est BRUYANT : il s'annonce à la console au
 * démarrage, et chaque montant réellement dit en dioula passe une trace
 * `VOIX_ARGENT_EN_DIOULA_DE_TEST` au journal de voix (renduVoixLocale.ts). On
 * veut pouvoir constater APRÈS COUP, sur le rapport de test d'un téléphone,
 * qu'un build l'avait allumé.
 */

// Les deux constantes sont posées par `define` (vite.config.ts) et déclarées
// dans src/vite-env.d.ts. Elles sont ABSENTES de tout processus Node : `typeof`
// y répond « undefined », et les drapeaux ci-dessous valent `false`.

// LA FORME DE CES TROIS EXPRESSIONS EST VOULUE, ET ELLE EST FRAGILE.
// Chacune doit rester une expression que le bundler sait RÉDUIRE À UNE
// CONSTANTE : `define` remplace l'identifiant par `false`, puis
// `typeof false !== "undefined" && false === true` se replie sur `false`, et
// Rollup peut alors effacer toutes les branches qui en dépendent — y compris
// l'import du script de travail (56 phrases, ~12 Ko) dans `dyu-ci`. Enrober
// ça dans un `try`, une fonction ou un `??` rendrait l'expression opaque : le
// code mort resterait dans le bundle ordinaire, et « un build ordinaire ne
// change pas d'un octet » cesserait d'être vrai. Vérifié en mesurant le
// bundle, pas en le supposant. `typeof` sur un identifiant non déclaré ne jette
// pas : dans un processus Node, ces expressions valent `false`, sans filet.

/**
 * La voix dioula est-elle embarquée dans CE build ? Commande les trois verrous
 * ensemble — assets, langue sélectionnable, locale peuplée. Les lever
 * séparément ne sert à rien : une voix sans phrases est muette, des phrases
 * sans voix sont illisibles, et une langue non sélectionnable n'est ni l'un ni
 * l'autre.
 */
export const VOIX_DYU_EMBARQUEE =
  typeof __JULABA_VOIX_DYU__ !== 'undefined' && __JULABA_VOIX_DYU__ === true;

/**
 * Ce build a-t-il le droit de dire un MONTANT en dioula ? Dérogation d'essai,
 * qui EXIGE `VOIX_DYU_EMBARQUEE` — seule, la variable n'a aucun effet : sans
 * décor ni voix il n'y aurait rien à entendre, et un demi-drapeau qui semble
 * agir est pire qu'un drapeau qui n'agit pas.
 */
export const DYU_ARGENT_DE_TEST =
  typeof __JULABA_VOIX_DYU__ !== 'undefined' && __JULABA_VOIX_DYU__ === true &&
  typeof __JULABA_DYU_ARGENT__ !== 'undefined' && __JULABA_DYU_ARGENT__ === true;

/**
 * LA SEULE LANGUE à qui ce build accorde la dérogation d'argent, ou `null`.
 *
 * Exprimée comme une donnée, et pas comme un booléen, pour que `runtime.ts` —
 * qui est générique et le reste — n'apprenne jamais le mot « dioula ». Il
 * compare un code à celui-ci, rien de plus. Et la dérogation ne peut pas
 * fuir vers une autre langue par distraction : elle en nomme UNE.
 */
export const LOCALE_ARGENT_DE_TEST: string | null = DYU_ARGENT_DE_TEST ? 'dyu-ci' : null;

/**
 * Le build s'annonce, une fois, à voix haute. Un build d'essai qui se tairait
 * ressemblerait trait pour trait à un build livrable — et c'est précisément la
 * confusion qui coûterait de l'argent à une marchande.
 */
if (VOIX_DYU_EMBARQUEE) {
  console.warn('[JÙLABA] BUILD D\'ESSAI : voix dioula MMS embarquée (CC-BY-NC-4.0, non commerciale). Ne pas distribuer.');
}
if (DYU_ARGENT_DE_TEST) {
  console.warn('[JÙLABA] BUILD D\'ESSAI : les MONTANTS peuvent être dits en DIOULA (nombres non validés, francs/dɔrɔmɛ ambigus). Pour juger le SON, jamais le COMPTE. Ne JAMAIS remettre ce build à une marchande.');
}
