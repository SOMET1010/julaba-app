import { playClip } from './audioManager';
import type { ResultatEntree, ResultatLecture } from './entreeVoixAvantConnexion';
import { TEXTE_SUGGESTION_CLAVIER, TEXTE_SUGGESTION_VOIX } from '../utils/accessMode';

export type EntreeVoiceKey =
  | 'numero'
  | 'numeroVoix'
  | 'numeroAccueil'
  | 'numeroMicroAccueil'
  | 'numeroChiffresAccueil'
  | 'numeroConfirmation'
  | 'dicteeNumeroIncomprise'
  | 'dicteeNumeroClavier'
  | 'codeAccueil'
  | 'codeDiscretionAccueil'
  | 'pinImagesAccueil'
  | 'pinImagesEchec'
  | 'code'
  | 'codeErreur'
  | 'connexionIndisponible'
  | 'reconnaissance'
  // ── LOT A, 26/09/2026 — voir `lotA` plus bas ────────────────────────────
  | 'pinImages'
  | 'pinChiffres'
  | 'effacement'
  // Décision Patrick 20/10 : l'effacement du NUMÉRO nomme le geste (AUTH_41).
  | 'effacementNumero'
  | 'numeroIncomplet'
  | 'reconnaissanceEchouee'
  | 'tropDEssais'
  | 'microIndisponible'
  | 'codeVide'
  | 'serveurLent'
  | 'choixEnregistre'
  | 'choixConserve'
  | 'dicteeIncomprise'
  | 'microProbleme'
  | 'microPret'
  | 'numeroPasDIci'
  // ── AUTH-03 — LE VERROU ET LE DERNIER ESSAI, DITS PAR CLIP ────────────────
  | 'verrouCinqMinutes'
  | 'dernierEssai'
  | 'mauvaisCodeAttention'
  // ── CLIPS 72-77 — LES INDICATIFS SE DISENT, 26/10/2026, DÉCISION PATRICK ──
  // « Retire cet indicatif, ajoute-le plutôt comme clip ; fais pareil pour
  // les autres indicatifs. » Chaque phrase interpolée de l'écran de connexion
  // devient un clip exact (voir le bloc des entrées plus bas).
  | 'avertissementDeuxEssais'
  | 'avertissementUnEssai'
  | 'verrouQuinzeMinutes'
  | 'verrouUneHeure'
  | 'dicteeNumeroVerifie'
  | 'dicteeNumeroManque'
  // ── VOIX SUR CHAQUE VUE — 26/10/2026, DÉCISION PATRICK ────────────────
  // « On a affaire à des personnes qui ne savent pas forcément lire/écrire » :
  // chaque vue et chaque message de l'entrée SE DIT. Ces clés ferment les
  // derniers silences trouvés par l'audit des phrases muettes du 26/10.
  | 'suggestionClavier'
  | 'suggestionVoix'
  | 'verifVoix'
  | 'numeroPasCommence'
  | 'reponseServeur'
  | 'echecGeneral'
  | 'motDePasseTemporaire'
  | 'portailAdmin'
  | 'activationAccueil'
  | 'activationReussie'
  // ── TOUTES LES ÉVENTUALITÉS — 26/10/2026, DÉCISION PATRICK ────────────────
  // « Il y a des voix qui manquent au niveau du système d'authentification.
  // Par exemple, quand il y a une erreur de numéro, on doit avoir également
  // un clip. (…) je veux aussi que tu génères des clips pour toutes les
  // éventualités qu'on a au niveau du système d'authentification. »
  // Le numéro non enregistré se taisait (écran ENTIER sans voix) ; les états
  // du compte (suspendu, rejeté, attente, non activé) tombaient dans le
  // message générique du mauvais code — un faux message ET un faux clip.
  // Les validations d'activation et du changement de code n'avaient que la
  // synthèse (muette en APK). Chaque clé ci-dessous ferme une éventualité.
  | 'numeroNonEnregistre'
  | 'numeroNonEnregistreAide'
  | 'compteSuspendu'
  | 'compteRejete'
  | 'compteAttenteValidation'
  | 'comptePasActif'
  | 'activationCodeVide'
  | 'activationCodeCourt'
  | 'activationCodeSimple'
  | 'activationCodesDifferents'
  | 'activationCodeInvalide'
  | 'codeSecretChange'
  | 'ancienCodeIncorrect'
  | 'codesDifferentsRecommencer'
  | 'connexionInterrompue'
  // ── CLIPS 68-71 — LA REVUE « TOUT ENCORE », 26/10/2026 ────────────────────
  | 'ancienCodeManquant'
  | 'motDePasseAccueil'
  | 'motDePasseTropCourt'
  | 'roleNonReconnu';

export interface EntreeVoiceClip {
  file: string;
  texte: string;
  /** Validé par une oreille ivoirienne. Ne se coche qu'après écoute humaine. */
  atteste: boolean;
  prototype?: boolean;
  /**
   * LOT A — VOIX DE SYNTHÈSE CONTRÔLÉE, PAS ENCORE ÉCOUTÉE.
   *
   * Pourquoi un troisième état plutôt que `atteste: true`. Ces clips ont passé
   * un contrôle MÉCANIQUE complet — nom, texte identique à ce que l'écran dit,
   * fréquence, canaux, niveau, silences (scripts/voix/ingerer-clips.mjs). Mais
   * personne ne les a ÉCOUTÉS. Les cocher `atteste` mettrait deux sens dans un
   * seul champ : « validé par une oreille » et « bon pour la production ». On
   * ne donne pas deux sens à la même donnée, surtout pas à celle qui décide de
   * ce qu'une marchande entend.
   *
   * Ils passent quand même en production : Patrick l'a tranché le 26/09, et
   * une phrase dite dans une voix contrôlée vaut mieux qu'une phrase muette.
   * Le jour où une oreille ivoirienne les valide, `atteste` passe à `true` et
   * ce champ disparaît.
   */
  lotA?: boolean;
}

const BASE = '/voix/fr-CI/prototype';

/**
 * Le drapeau des clips « prototype », lu au moment où on en a besoin plutôt
 * qu'à la racine du module. Même constante de build — Vite remplace
 * l'expression où qu'elle soit écrite — mais le module s'importe alors hors
 * Vite, donc sa règle est prouvable. Une décision qu'on ne peut pas tester
 * est une décision qu'on ne peut pas défendre.
 */
function prototypesVoixActifs(): boolean {
  return import.meta.env.VITE_JULABA_VOICE_PREVIEW === 'true';
}

/**
 * Petit noyau vocal de l'entrée. Tous ces clips utilisent exactement la même voix
 * Callirrhoe et le même prompt de direction que le clip d'accueil v5.
 * Ils restent marqués « prototype » jusqu'à validation humaine ivoirienne.
 */
export const ENTREE_VOICE_CLIPS: Record<EntreeVoiceKey, EntreeVoiceClip> = {
  // Arrivée sur la vue de saisie du numéro : ces deux clips sont joués dans
  // cet ordre par LoginPassword. Ils restent actifs dans tout build livré.
  numeroAccueil: {
    file: '/voix/tata/login-05.mp3',
    texte: 'Mets ton numéro de téléphone ici.',
    atteste: false,
    lotA: true,
  },
  numeroMicroAccueil: {
    file: '/voix/tata/login-06.mp3',
    texte: "Tu peux me dicter aussi, hein. Appuie sur le micro d'abord.",
    atteste: false,
    lotA: true,
  },
  numeroChiffresAccueil: {
    file: '/voix/tata/login-07.mp3',
    texte: 'Dis les chiffres doucement doucement, un à un.',
    atteste: false,
    lotA: true,
  },
  numeroConfirmation: {
    file: '/voix/tata/login-09.mp3',
    texte: "C'est bien ton numéro, non ? Appuie ici pour avancer.",
    atteste: false,
    lotA: true,
  },
  dicteeNumeroIncomprise: {
    file: '/voix/tata/login-13.mp3',
    texte: "Je n'ai pas bien entendu, deh. Redis-moi ça doucement.",
    atteste: false,
    lotA: true,
  },
  dicteeNumeroClavier: {
    file: '/voix/tata/login-14.mp3',
    texte: 'Si tu veux, tape ton numéro directement ici.',
    atteste: false,
    lotA: true,
  },
  codeAccueil: {
    file: '/voix/tata/login-19.mp3',
    texte: 'Bon, mets les quatre chiffres de ton code secret.',
    atteste: false,
    lotA: true,
  },
  codeDiscretionAccueil: {
    file: '/voix/tata/login-23.mp3',
    texte: "Ton code là, c'est pour toi seule. Faut jamais montrer ou dire ça à quelqu'un.",
    atteste: false,
    lotA: true,
  },
  numero: {
    file: `${BASE}/tata-entree-numero.mp3`,
    texte: 'Tape les chiffres de ton numéro, un par un. Les ronds en haut vont se remplir.',
    atteste: false,
    prototype: true,
  },
  numeroVoix: {
    file: `${BASE}/tata-entree-numero-voix.mp3`,
    texte: 'Dis ton numéro, ou tape les chiffres un par un. Les ronds en haut vont se remplir.',
    atteste: false,
    prototype: true,
  },
  code: {
    file: `${BASE}/tata-entree-code.mp3`,
    texte: 'Entre ton code secret à quatre chiffres.',
    atteste: false,
    prototype: true,
  },
  codeErreur: {
    file: `${BASE}/tata-entree-code-erreur.mp3`,
    texte: "Ce n'est pas le bon code. Réessaie doucement.",
    atteste: false,
    prototype: true,
  },
  connexionIndisponible: {
    file: `${BASE}/tata-entree-connexion.mp3`,
    texte: 'La connexion ne passe pas pour le moment. Attends un peu, puis réessaie.',
    atteste: false,
    prototype: true,
  },
  reconnaissance: {
    // Clip RÉGÉNÉRÉ le 26/10 : l'ancien vivait derrière le drapeau prototype
    // (VITE_JULABA_VOICE_PREVIEW) — donc MUET dans tout build livré. L'étape
    // « Tata me connaît » arrivait en silence : une vue d'accueil sans voix,
    // exactement ce que Patrick a fermé (« la voix sur chaque vue ou étape »).
    // Mêmes specs que le lot A : voix neurale fr-FR Denise, 24 kHz mono
    // 96 kbps, normalisé −16 LUFS.
    file: '/voix/tata/login-42.mp3',
    texte: 'Touche le grand bouton. Ton téléphone va te reconnaître.',
    atteste: false,
    lotA: true,
  },
  // ── PASSAGE CHIFFRES ⇄ IMAGES — LOT A, 26/09/2026 ────────────────────────
  //
  // LE DÉFAUT QU'ON FERME. `LoginPassword.basculerPinEnImages` annonce le
  // changement de mode par `parle(...)`, donc par `direEntreeTexte`, qui ne
  // connaît que les clés de ce fichier. La phrase n'y était pas : l'écran
  // annonçait le basculement EN SILENCE. Pas une panne — une clé jamais
  // ajoutée, et rien pour le signaler.
  //
  // ET LE TEXTE DIT MAINTENANT PLUS QU'AVANT. Le code disait « Maintenant,
  // des images à la place des chiffres. » ; le clip ajoute « Ton code n'a pas
  // changé. » C'est la question que se pose une marchande au moment précis où
  // son pavé change sous ses yeux. On ne remplace pas une consigne par une
  // plus pauvre — ici on la remplace par une plus complète.
  pinImages: {
    file: '/voix/tata/login-21.mp3',
    texte: 'Voilà les photos qui sont sorties à la place des chiffres. Ton code n\'a pas changé.',
    atteste: false,
    lotA: true,
  },
  pinImagesAccueil: {
    file: '/voix/tata/login-20.mp3',
    texte: 'Appuie sur tes quatre photos, une à une, comme tu avais choisi là.',
    atteste: false,
    lotA: true,
  },
  pinImagesEchec: {
    file: '/voix/tata/login-27.mp3',
    texte: "Ce n'est pas toi ? Y'a pas problème, appuie ici pour taper ton numéro.",
    atteste: false,
    lotA: true,
  },
  pinChiffres: {
    file: '/voix/tata/login-22.mp3',
    texte: 'Voilà les chiffres maintenant. Mets ton code comme d\'habitude.',
    atteste: false,
    lotA: true,
  },

  // ── EFFACER UN CHIFFRE — AUTH_24, LOT A ──────────────────────────────────
  //
  // `handleKeyDelete` disait déjà `parle('Effacé.')` — mais ce texte n'était
  // dans aucune clé, donc il ne sortait pas. Un mot prononcé par personne.
  //
  // Le commentaire d'origine explique POURQUOI un seul mot : « Effacé » ne
  // révèle aucun chiffre, contrairement au numéro lui-même. Le clip respecte
  // cette règle — « C'est effacé net. » ne dit rien de ce qui a été tapé.
  effacement: {
    file: '/voix/tata/login-24.mp3',
    texte: 'C\'est effacé net.',
    atteste: false,
    lotA: true,
  },

  // ── EFFACER UN CHIFFRE DU NUMÉRO — AUTH_41, DÉCISION PATRICK 20/10 ───────
  //
  // Patrick : « faut qu'il le prononce pour chaque suppression » (20/10),
  // puis : la phrase exacte est « Tu es en train d'effacer le numéro ! »
  // (26/10). À chaque effacement d'un chiffre du numéro, l'écran NOMME le
  // geste. La règle du lot A (« un effacement ne nomme pas le numéro ») est
  // détendue ICI SEULEMENT par cette décision datée — l'effacement du CODE
  // garde `effacement` (AUTH_24), qui ne nomme rien.
  //
  // Clip RÉGÉNÉRÉ le 26/10 : voix neurale fr-FR (Denise), phrase sans
  // interjection, normalisée −16 LUFS, 24 kHz mono 96 kbps — MÊMES specs
  // que les clips sains du lot A. `atteste: false` TOUJOURS : la synthèse
  // n'est pas une oreille ivoirienne ; une locutrice pourra la refaire au
  // studio. Dioula à enregistrer (règle lot B).
  effacementNumero: {
    file: '/voix/tata/login-41.mp3',
    texte: 'Tu es en train d\'effacer le numéro !',
    atteste: false,
    lotA: true,
  },

  // ── IL MANQUE DES CHIFFRES — AUTH_11, LOT A ──────────────────────────────
  //
  // Ce que la dictée disait jusqu'ici quand le numéro était trop court :
  // « Je n'ai pas compris. Tape ton numéro, ou réessaie. » — vrai, mais
  // générique : elle ne sait pas CE QUI manque. L'écran, lui, l'écrivait
  // (« Il manque des chiffres… 👇 ») — donc l'information existait, et seule
  // la marchande qui lit y avait droit.
  //
  // C'est exactement le défaut que le projet poursuit partout : une
  // information qui existe, et que quelqu'un en aval ne transmet pas.
  //
  // Le clip la dit, et garde le geste : « Continue. »
  //
  // AUTH_12 (« Regarde bien, y'a un chiffre qui n'est pas bon dedans. ») N'EST
  // PAS branché, et c'est délibéré : il nomme mieux le défaut mais perd le
  // geste que la phrase actuelle donne (« Tape ton numéro, ou réessaie »).
  // On ne remplace pas une consigne par une plus pauvre. OUVERT.
  numeroIncomplet: {
    file: '/voix/tata/login-11.mp3',
    texte: 'Il manque encore des chiffres dedans. Continue.',
    atteste: false,
    lotA: true,
  },

  // ── TREIZE ERREURS, ZÉRO DITE — AUTH-ERR, 26/09/2026 ─────────────────────
  //
  // CE QU'ON A TROUVÉ. `LoginPassword` fait `parle(error)` sur CHAQUE message
  // d'erreur (l.317). Mais `parle` passe par `direEntreeTexte`, qui ne dit
  // que ce qui a une clé ici — et aucun des treize messages d'erreur de cet
  // écran n'en avait. L'écran vibrait, affichait un texte, et se taisait.
  //
  // À une marchande qui ne sait pas lire, sur l'écran QUI CONNECTE. Si elle
  // n'entre pas, rien d'autre dans l'application ne compte.
  //
  // POURQUOI ON ACCEPTE UN TEXTE LÉGÈREMENT DIFFÉRENT. La règle est « on ne
  // remplace jamais une consigne par une plus pauvre ». Elle tient toujours —
  // mais une consigne qu'on ne dit pas n'est pas une consigne. Ces deux-là
  // gardent le geste (« on passe par ton code », « patiente avant de
  // réessayer ») et perdent une nuance : la cause exacte pour l'une, la durée
  // pour l'autre. De muet à parlé, l'échange est largement gagnant.
  //
  // ONZE AUTRES RESTENT MUETS, faute de clip : « Numéro non reconnu »,
  // « Autorise le micro », « Entre ton mot de passe », « Réponse serveur
  // invalide »… OUVERT, et c'est le plus gros trou de voix du parcours.
  reconnaissanceEchouee: {
    file: '/voix/tata/login-26.mp3',
    texte: 'Ça n\'a pas pris. On passe par ton code directement.',
    atteste: false,
    lotA: true,
  },
  tropDEssais: {
    file: '/voix/tata/login-30.mp3',
    texte: 'Tu as trop forcé. Patiente un peu d\'abord avant de réessayer.',
    atteste: false,
    lotA: true,
  },

  // ── CINQ SILENCES DE PLUS, FERMÉS SANS RIEN ENREGISTRER ──────────────────
  //
  // Repérés en dépouillant les treize erreurs muettes (AUTH-ERR) : chacun de
  // ces moments a DÉJÀ un appel de parole au bon endroit dans l'écran. Il ne
  // manquait que la clé — la phrase partait, et rien ne sortait.
  //
  // Les cinq gardent le problème ET le geste. Aucun ne recule.
  microIndisponible: {
    file: '/voix/tata/login-16.mp3',
    texte: 'Le micro ne prend pas là. Faut taper ton numéro ici.',
    atteste: false,
    lotA: true,
  },
  codeVide: {
    file: '/voix/tata/login-19.mp3',
    texte: 'Bon, mets les quatre chiffres de ton code secret.',
    atteste: false,
    lotA: true,
  },
  serveurLent: {
    file: '/voix/tata/login-33.mp3',
    texte: 'Ça pèse un peu. Patiente, je suis en train de relancer.',
    atteste: false,
    lotA: true,
  },
  choixEnregistre: {
    file: '/voix/tata/login-35.mp3',
    texte: 'D\'accord, c\'est calé comme ça.',
    atteste: false,
    lotA: true,
  },
  choixConserve: {
    file: '/voix/tata/login-36.mp3',
    texte: 'D\'accord, on continue comme d\'habitude.',
    atteste: false,
    lotA: true,
  },

  // ── DEUX CLIPS HUMAINS QUI DORMAIENT SOUS NOS YEUX — CLIP-03, 26/09/2026 ─
  //
  // `LoginPassword` porte depuis longtemps ce commentaire : « ui-058 (« Je
  // n'ai pas compris. Tape ton numéro, ou réessaie. ») et ui-100 existent et
  // disent la bonne chose ». Les phrases de l'écran ont même été CHOISIES
  // pour tomber dessus.
  //
  // Mais `parle()` passe par `direEntreeTexte`, qui ne consulte QUE l'index
  // de ce fichier — jamais `tataUiClips`. Les deux clips étaient donc
  // introuvables par ce chemin, et l'écran se taisait en croyant parler. Le
  // commentaire disait vrai quand il a été écrit ; il ne l'était plus.
  //
  // CE SONT DEUX CLIPS EN VOIX HUMAINE, déjà enregistrés, déjà embarqués,
  // déjà pré-cachés. `atteste: true` — eux, une oreille les a validés.
  //
  // ON NE LES REMPLACE PAS PAR LE LOT A. Les clips login-13 et login-15
  // disent à peu près la même chose en voix de synthèse : les préférer serait
  // troquer la vraie voix contre une machine. « On ne commande jamais en
  // synthèse une phrase que la vraie voix dit déjà » — et à plus forte raison
  // on ne la débranche pas.
  dicteeIncomprise: {
    file: '/voix/tata/ui-058.mp3',
    texte: 'Je n\'ai pas compris. Tape ton numéro, ou réessaie.',
    atteste: true,
  },
  microProbleme: {
    file: '/voix/tata/ui-100.mp3',
    texte: 'Problème avec le micro — réessaie',
    atteste: true,
  },

  // ── LE MICRO EST PRÊT — AUTH_17, LOT A ───────────────────────────────────
  //
  // `parle('Voilà, tu peux parler maintenant. Touche le micro et dis ton
  // numéro.')` n'avait pas de clé : muet. Le clip du lot A dit « C'est bon
  // maintenant. Appuie sur le micro et puis parle. »
  //
  // CE QU'ON PERD, ET POURQUOI ON L'ACCEPTE : l'actuel précise « dis ton
  // NUMÉRO ». Le clip dit seulement « parle ». Sur cet écran, le contexte le
  // donne — et une consigne qu'on ne dit pas n'est pas une consigne.
  // La version complète reste à enregistrer si elle manque au terrain. OUVERT.
  microPret: {
    file: '/voix/tata/login-17.mp3',
    texte: 'C\'est bon maintenant. Appuie sur le micro et puis parle.',
    atteste: false,
    lotA: true,
  },

  // ── LE NUMÉRO N'EST PAS UN NUMÉRO D'ICI — AUTH_12 + AUTH_14 ──────────────
  //
  // Laissé OUVERT deux fois : `login-12` nomme mieux le défaut mais perd le
  // geste. Tranché par Patrick le 26/09 — on enchaîne avec `login-14`, et les
  // deux clips sont fondus en un seul au montage (voir tataUiClips.ts).
  //
  // Le texte porte donc les DEUX phrases : c'est ce qu'on entend, et
  // `direEntreeTexte` retrouve la clé par le texte entier.
  numeroPasDIci: {
    file: '/voix/tata/login-12-14.mp3',
    texte: 'Regarde bien, y\'a un chiffre qui n\'est pas bon dedans. Si tu veux, tape ton numéro directement ici.',
    atteste: false,
    lotA: true,
  },

  // ── LE VERROU DIT SON DÉLAI, PAR CLIP — AUTH-03, 05/10/2026 ───────────────
  //
  // LE DÉFAUT QUE CE LOT FERME. Le verrou du serveur dit « attends N minutes »
  // via une phrase INTERPOLÉE (`Trop d'essais. Attends ${attenteEnClair(ms)}…`)
  // : aucune clé ne la porte, `direEntreeTexte` ne la trouve pas, l'écran se
  // tait. Pour une non-lectrice, le délai d'attente — l'information VITALE du
  // verrou — n'était dit à aucun palier. Le garde `test:verrou-connexion`
  // n'exigeait que la présence de `parle(...)`, pas l'audibilité.
  //
  // LA GRAMMAIRE EST RESTÉE HONNÊTE : on ne fabrique pas « attends / cinq /
  // minutes » en sciant des clips qui n'existent pas (« attends », « minutes »,
  // « quinze » n'ont jamais été enregistrés). On dit ce qui EXISTE, exactement :
  //
  //  · palier 5 minutes → ui-125, en VRAIE voix : « Trop de tentatives
  //    incorrectes. Réessaie dans 5 minutes. » — le délai est dit, pile.
  //  · paliers 15 minutes et au-delà → login-30 : « Tu as trop forcé.
  //    Patiente un peu d'abord avant de réessayer. » — le geste est dit, la
  //    durée reste AFFICHÉE ; on ne fait jamais dire à Tantie une durée
  //    qu'elle n'a pas enregistrée.
  //
  // ── COMPLÉTÉ PAR LA DÉCISION PATRICK, 26/10 (clips 72-77) : chacun des
  // TROIS paliers du serveur (5 min, 15 min, 1 heure — backend/src/auth/
  // verrou-pin.ts) a maintenant SON clip, et l'écran n'écrit plus AUCUNE
  // durée à la main : le texte affiché EST le clip, dit par l'effet
  // `error → parle(error)` (ui-125 pour 5 min, login-74 pour 15 min,
  // login-75 pour 1 heure, login-30 pour une durée inconnue — JAMAIS une
  // durée fausse). Le garde `test:verrou-connexion` vérifie que l'affichage
  // passe par une constante `clipVerrou` assignée depuis CE fichier.
  //
  // Le garde `test:verrou-connexion` est renforcé dans le même lot : il
  // vérifie désormais que ce qui part à `parle()` référence une clé de CE
  // fichier, et que le fichier audio existe dans `public/`.
  verrouCinqMinutes: {
    file: '/voix/tata/ui-125.mp3',
    texte: 'Trop de tentatives incorrectes. Réessaie dans 5 minutes.',
    atteste: true,
  },
  dernierEssai: {
    file: '/voix/tata/login-29.mp3',
    texte: 'Attention, hein ! Il te reste une seule chance. Prends bien ton temps.',
    atteste: false,
    lotA: true,
  },
  // DERNIER ESSAI — login-29 reste au catalogue (le garde verrou l'exige, et
  // sa voix a porté tout le lot AUTH-03), mais à l'écran l'avertissement
  // EXACT l'a remplacé : depuis les clips 72-77, la bannière dit « encore
  // 1 essai, après il faudra attendre » par login-73 — le texte affiché est
  // enfin le texte enregistré (décision Patrick, 26/10).
  // Deux essais restants : le clip du mauvais code GENÉRIQUE (codeErreur) est
  // un clip « prototype » — muet dans tout build livré, le drapeau de préview
  // éteint. Le warning « encore 2 essais » serait donc resté silencieux en
  // production… login-28 (lot A, toujours embarqué) dit le même moment avec
  // la gravité qu'il mérite : code pas bon, ET regarde bien avant de reprendre.
  // DEPUIS LES CLIPS 72-77 (26/10) : le cas « encore 2 essais » a SON clip
  // exact (`avertissementDeuxEssais`, login-72) — login-28 reste le repli
  // quand le serveur n'envoie pas le compte d'essais.
  mauvaisCodeAttention: {
    file: '/voix/tata/login-28.mp3',
    texte: 'Le numéro ou le code n\'est pas bon, deh. Regarde bien avant de reprendre.',
    atteste: false,
    lotA: true,
  },

  // ── CLIPS 72-77 — LES INDICATIFS SE DISENT, 26/10/2026, DÉCISION PATRICK ──
  // Patrick : « Retire cet indicatif "Ce n'est pas le bon code. Attention :
  // encore 2 essais, après il faudra attendre." mais plutôt ajoute-le comme
  // clip, fais pareil pour les autres indicatifs, fais des clips. »
  //
  // LE DÉFAUT : l'écran de connexion écrivait des phrases INTERPOLÉES à la
  // main (le compte d'essais restants, la durée du verrou) et des constats
  // de dictée avec émoji — des mots que Tantie n'avait JAMAIS enregistrés.
  // L'effet `error → parle(error)` les refusait tous (direEntreeTexte ne
  // joue que l'enregistré) : la bannière disait des mots que personne
  // n'entendait jamais, et la voix disait AUTRE CHOSE que ce qui était
  // écrit. Chaque indicatif est maintenant un clip EXACT — le texte affiché
  // EST le texte enregistré, dit par l'effet error (UNE seule chaîne de
  // voix). Mêmes specs que le lot 68-71 : Denise fr-FR, 24 kHz mono
  // 96 kbps, −16 LUFS.
  avertissementDeuxEssais: {
    file: '/voix/tata/login-72.mp3',
    texte: "Ce n'est pas le bon code. Attention : encore 2 essais, après il faudra attendre.",
    atteste: false,
    lotA: true,
  },
  avertissementUnEssai: {
    file: '/voix/tata/login-73.mp3',
    texte: "Ce n'est pas le bon code. Attention : encore 1 essai, après il faudra attendre.",
    atteste: false,
    lotA: true,
  },
  verrouQuinzeMinutes: {
    file: '/voix/tata/login-74.mp3',
    texte: 'Trop de tentatives incorrectes. Réessaie dans 15 minutes.',
    atteste: false,
    lotA: true,
  },
  verrouUneHeure: {
    file: '/voix/tata/login-75.mp3',
    texte: 'Trop de tentatives incorrectes. Réessaie dans 1 heure.',
    atteste: false,
    lotA: true,
  },
  dicteeNumeroVerifie: {
    file: '/voix/tata/login-76.mp3',
    texte: 'Vérifie ton numéro : touche le micro pour redire, ou corrige.',
    atteste: false,
    lotA: true,
  },
  dicteeNumeroManque: {
    file: '/voix/tata/login-77.mp3',
    texte: 'Il manque des chiffres : touche le micro pour redire, ou complète.',
    atteste: false,
    lotA: true,
  },

  // ── VOIX SUR CHAQUE VUE — CLIPS 43-51, 26/10/2026 ─────────────────────
  // Chaque phrase ci-dessous ÉTAIT MUETTE : l'écran l'affichait et la passait
  // à `parle()`, mais `direEntreeTexte` ne trouvait aucune clé — le silence
  // exact que le lot AUTH-ERR documentait (« une phrase partait, et rien ne
  // sortait »). Audit du 26/10 : 9 phrases fixes sans clé, trouvées par
  // script (audit-voix) et fermées ici, MOT POUR MOT — la clé se retrouve
  // par le TEXTE, un mot d'écart = muet (leçon login-41). Mêmes specs lot A
  // (Denise fr-FR, 24 kHz mono 96 kbps, −16 LUFS). `atteste: false` : l'ASR
  // prouve la langue, une locutrice validera au studio (règle lot B).
  suggestionClavier: {
    file: '/voix/tata/login-43.mp3',
    texte: TEXTE_SUGGESTION_CLAVIER,
    atteste: false,
    lotA: true,
  },
  suggestionVoix: {
    file: '/voix/tata/login-44.mp3',
    texte: TEXTE_SUGGESTION_VOIX,
    atteste: false,
    lotA: true,
  },
  verifVoix: {
    file: '/voix/tata/login-45.mp3',
    texte: 'Pour que je puisse t\'écouter, je vérifie ma voix. Touche le bouton, ou tape ton numéro.',
    atteste: false,
    lotA: true,
  },
  numeroPasCommence: {
    file: '/voix/tata/login-46.mp3',
    texte: 'Ce numéro-là ne commence pas comme un numéro d\'ici. Regarde bien le début.',
    atteste: false,
    lotA: true,
  },
  reponseServeur: {
    file: '/voix/tata/login-47.mp3',
    texte: 'Ça n\'a pas bien répondu. Attends un petit moment, puis reprends.',
    atteste: false,
    lotA: true,
  },
  echecGeneral: {
    file: '/voix/tata/login-48.mp3',
    texte: 'Ça n\'a pas marché comme il faut. Reprends depuis le début.',
    atteste: false,
    lotA: true,
  },
  motDePasseTemporaire: {
    file: '/voix/tata/login-49.mp3',
    texte: 'Mot de passe temporaire, redirection en cours...',
    atteste: false,
    lotA: true,
  },
  portailAdmin: {
    file: '/voix/tata/login-50.mp3',
    texte: 'Accès non autorisé. Utilise le portail administrateur sur julaba.online/backoffice/login',
    atteste: false,
    lotA: true,
  },
  activationAccueil: {
    file: '/voix/tata/login-51.mp3',
    texte: 'Tape le code que tu as reçu, puis choisis ton code secret à quatre chiffres. Personne d\'autre ne doit le connaître.',
    atteste: false,
    lotA: true,
  },
  activationReussie: {
    file: '/voix/tata/login-52.mp3',
    texte: 'Compte activé ! Tu peux maintenant te connecter avec ton code.',
    atteste: false,
    lotA: true,
  },

  // ── CLIPS 53-67 — TOUTES LES ÉVENTUALITÉS, 26/10/2026 ────────────────────
  // Mêmes specs lot A (Denise fr-FR, 24 kHz mono 96 kbps, −16 LUFS).
  // RÈGLE DU LOT : le texte AFFICHÉ est le texte DU CLIP, mot pour mot —
  // l'effet `error → parle(error)` de l'écran fait le reste tout seul.
  // Un mot d'écart = muet (leçon login-41) : les écrans citent la CLÉ,
  // jamais une copie retapée.
  numeroNonEnregistre: {
    file: '/voix/tata/login-53.mp3',
    texte: "Ce numéro n'est pas encore enregistré sur Julaba.",
    atteste: false,
    lotA: true,
  },
  numeroNonEnregistreAide: {
    file: '/voix/tata/login-54.mp3',
    texte: 'Pour créer ton compte, contacte un agent identificateur ou un administrateur Julaba.',
    atteste: false,
    lotA: true,
  },
  compteSuspendu: {
    file: '/voix/tata/login-55.mp3',
    texte: 'Ton compte est suspendu. Va voir un administrateur Julaba.',
    atteste: false,
    lotA: true,
  },
  compteRejete: {
    file: '/voix/tata/login-56.mp3',
    texte: 'Ton compte a été rejeté. Va voir un administrateur Julaba.',
    atteste: false,
    lotA: true,
  },
  compteAttenteValidation: {
    file: '/voix/tata/login-57.mp3',
    texte: "Ton compte attend la validation d'un super administrateur. Reviens un peu plus tard.",
    atteste: false,
    lotA: true,
  },
  comptePasActif: {
    file: '/voix/tata/login-58.mp3',
    texte: "Ton compte n'est pas encore activé. Utilise le code d'activation reçu par SMS.",
    atteste: false,
    lotA: true,
  },
  activationCodeVide: {
    file: '/voix/tata/login-59.mp3',
    texte: "Saisis le code d'activation.",
    atteste: false,
    lotA: true,
  },
  activationCodeCourt: {
    file: '/voix/tata/login-60.mp3',
    texte: 'Ton code doit avoir au moins 4 chiffres.',
    atteste: false,
    lotA: true,
  },
  activationCodeSimple: {
    file: '/voix/tata/login-61.mp3',
    texte: 'Ce code est trop simple. Choisis-en un autre.',
    atteste: false,
    lotA: true,
  },
  activationCodesDifferents: {
    file: '/voix/tata/login-62.mp3',
    texte: 'Les deux codes ne sont pas pareils.',
    atteste: false,
    lotA: true,
  },
  activationCodeInvalide: {
    file: '/voix/tata/login-63.mp3',
    texte: "Code d'activation invalide ou expiré.",
    atteste: false,
    lotA: true,
  },
  codeSecretChange: {
    file: '/voix/tata/login-64.mp3',
    texte: "C'est bon, ton code secret est changé.",
    atteste: false,
    lotA: true,
  },
  ancienCodeIncorrect: {
    file: '/voix/tata/login-65.mp3',
    texte: "Ce n'est pas ton ancien code. Regarde bien et recommence.",
    atteste: false,
    lotA: true,
  },
  codesDifferentsRecommencer: {
    file: '/voix/tata/login-66.mp3',
    texte: 'Les deux codes ne sont pas les mêmes. Choisis à nouveau ton code.',
    atteste: false,
    lotA: true,
  },
  connexionInterrompue: {
    file: '/voix/tata/login-67.mp3',
    texte: 'La connexion ne passe pas pour le moment. Attends un peu, puis réessaie.',
    atteste: false,
    lotA: true,
  },

  // ── CLIPS 68-71 — LA REVUE « TOUT ENCORE », 26/10/2026 ───────────────────
  // Le passage en revue complet (audit croisé setError/toast × catalogue) a
  // encore trouvé 4 éventualités muettes : les validations du FORMULAIRE
  // TEXTE du changement de mot de passe (parcours back-office, le lot 53-67
  // n'avait couvert que le pavé à 4 chiffres) et le toast « rôle non
  // reconnu » d'EntryGate. Texte = EXACTEMENT ce que l'écran affiche et
  // passe à la voix — les écrans citent la CLÉ, jamais une copie retapée.
  ancienCodeManquant: {
    file: '/voix/tata/login-68.mp3',
    texte: "Écris ton ancien code secret d'abord.",
    atteste: false,
    lotA: true,
  },
  motDePasseAccueil: {
    file: '/voix/tata/login-69.mp3',
    texte: 'Crée ton mot de passe. Au moins 4 caractères.',
    atteste: false,
    lotA: true,
  },
  motDePasseTropCourt: {
    file: '/voix/tata/login-70.mp3',
    texte: 'Ton mot de passe est trop court. Il faut au moins 4 caractères.',
    atteste: false,
    lotA: true,
  },
  roleNonReconnu: {
    file: '/voix/tata/login-71.mp3',
    texte: 'On ne te reconnaît pas bien, là. Reconnecte-toi pour continuer.',
    atteste: false,
    lotA: true,
  },

};

function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const INDEX_TEXTE = new Map<string, EntreeVoiceKey>(
  Object.entries(ENTREE_VOICE_CLIPS).map(([key, clip]) => [normaliser(clip.texte), key as EntreeVoiceKey]),
);

/** La règle de disponibilité, PURE : elle prend l'état du drapeau en argument,
 *  donc elle s'appelle dans les deux mondes, dans le même processus. */
export function urlClipEntree(key: EntreeVoiceKey, actifs: boolean = prototypesVoixActifs()): string | null {
  const clip = ENTREE_VOICE_CLIPS[key];
  if (!clip) return null;
  return clip.atteste || clip.lotA || (clip.prototype && actifs) ? clip.file : null;
}

export function entreeClipUrl(key: EntreeVoiceKey): string | null {
  return urlClipEntree(key);
}

export interface DepsEntreeVoix {
  readonly clipUrl: (key: EntreeVoiceKey) => Promise<string | null>;
  readonly jouer: (clipUrl: string) => Promise<ResultatLecture>;
}

/**
 * DETTE ACC-05, LA MÊME QU'AUX ÉCRANS 1 ET 4. `audioManager.playClip` rend
 * `Promise<void>` : il connaît le résultat et le jette. On lit donc ce qui est
 * observable — une exception — et rien de plus. Le type porte déjà les trois
 * issues ; le jour où VOICE-01 est desserrée, il y a un mot à changer.
 */
const DEPS_REELLES: DepsEntreeVoix = {
  clipUrl: async (key) => urlClipEntree(key),
  jouer: async (clipUrl) => {
    try { await playClip({ url: clipUrl }); return 'ended'; }
    catch { return 'failed'; }
  },
};

/**
 * Joue le clip local exact, et RAPPORTE ce qu'il en advient — NUM-01.
 *
 * LE DÉFAUT QU'ON FERME. Banc terrain, écran 3 : « MUET » et « 1 impasse /14 ».
 * Cette fonction rendait `Promise<void>` : un clip joué et un clip absent
 * étaient indiscernables. L'écran appelait donc sa consigne au montage et sous
 * le bouton « Écouter Tantie Nanti Lou », et dans tout build livré — drapeau
 * des prototypes éteint — il ne se passait rien. Personne n'en était averti.
 *
 * On ne synthétise toujours RIEN ici : la voix de Tantie est une voix
 * enregistrée. `doitDireLeTexte` porte la décision, prise une seule fois, et
 * c'est l'écran qui dit la clé de catalogue quand il ne reste que ça.
 *
 * Une lecture COUPÉE ne se rattrape pas : quand la marchande tape un chiffre
 * pendant la consigne, ce silence est sa décision.
 */
export async function direEntree(
  key: EntreeVoiceKey,
  deps: DepsEntreeVoix = DEPS_REELLES,
): Promise<ResultatEntree> {
  const url = await deps.clipUrl(key);
  if (!url) return { lu: false, raison: 'aucun-clip', doitDireLeTexte: true };
  const r = await deps.jouer(url);
  if (r === 'failed') return { lu: false, raison: 'clip-echoue', doitDireLeTexte: true };
  if (r === 'cancelled') return { lu: false, raison: 'coupe', doitDireLeTexte: false };
  return { lu: true, par: 'clip', doitDireLeTexte: false };
}

/**
 * Résout une phrase FIXE vers son clip exact ; toute phrase dynamique reste
 * visuelle — et le RESTE, volontairement (NUM-02).
 *
 * Cette porte-là ne gagne AUCUN repli parlé, et ce n'est pas un oubli.
 * `LoginPassword` s'en sert aussi pour relire le numéro composé
 * (`parle(chiffresEpeles(phone))`). Lui donner une voix de secours ferait
 * prononcer le numéro de téléphone de la marchande à voix haute, au marché.
 * Une phrase inconnue ne produit donc rien, et ne demande rien.
 */
export async function direEntreeTexte(
  texte: string,
  deps: DepsEntreeVoix = DEPS_REELLES,
): Promise<ResultatEntree> {
  const key = INDEX_TEXTE.get(normaliser(texte));
  if (!key) return { lu: false, raison: 'coupe', doitDireLeTexte: false };
  return direEntree(key, deps);
}
