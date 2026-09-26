// ──────────────────────────────────────────────────────────────────────────
// Script de voix « Tantie Nanti Lou » — écran de connexion + chiffres + noyau du
// pipeline vocal (phrases d'attente/accusés les plus fréquentes en caisse).
//
// Distinct des 137 clips déjà enregistrés (tataVoice.ts / tataUiClips.ts) :
// ce sont des phrases NEUF, pas encore dites par la vraie voix, écrites dans
// le registre retenu (aînée du marché, phrases courtes, cf. discussion produit).
//
// NOM : « Tantie Nanti Lou » — nom validé par Patrick le 20/09/2026 et repris
// du lot A1 de la récupération du design (docs/manus/RECUPERATION-MANUS.md).
// Il remplace « Tata Nanti Lou », qui ne doit plus apparaître à l'écran ni
// dans une phrase dite. L'accord de la personne qui prête sa voix reste requis
// pour tout nouvel enregistrement (docs/PLAN_PACKS_TATA_LANGUES.md).
//
// `texteDyu` est une traduction dioula de travail (non validée par une
// locuthrice native) — gardée pour préparer un futur enregistrement dioula,
// PAS utilisée pour la prise française actuelle.
// ──────────────────────────────────────────────────────────────────────────

export type CategorieScript = 'CONNEXION' | 'CHIFFRES' | 'PIPELINE_CORE';

export interface PhraseScript {
  id: string;
  categorie: CategorieScript;
  moment: string;
  texteFr: string;
  texteDyu?: string;
}

export const SCRIPT_TATA: PhraseScript[] = [
  // ── CONNEXION (01 à 37) ──────────────────────────────────────────────────
  { id: 'AUTH_01', categorie: 'CONNEXION', moment: 'Premier accueil', texteFr: "Bonjour ma fille. Moi, c'est Tantie Nanti Lou. Viens, je vais te montrer.", texteDyu: "I ni sɔgɔma n'denmuso. N'tɔgɔ ye Tantie Nanti Lou. Na yan, n'b'a yira i la." },
  { id: 'AUTH_02', categorie: 'CONNEXION', moment: 'Retour', texteFr: "Eh, ma fille ! Te voilà. On continue ?", texteDyu: "Eh, n'denmuso ! I nana wa ? An b'a to yen ?" },
  { id: 'AUTH_03', categorie: 'CONNEXION', moment: 'Présenter son aide', texteFr: "Chaque vente, tu la mets ici. Comme ça, tu n'oublies rien, et tes comptes sont là.", texteDyu: "Feere o feere, i b'a bila yan. O la, i tɛ fɔyi ɲinɛ, i ka konte bɛɛ bɛ yan." },
  { id: 'AUTH_04', categorie: 'CONNEXION', moment: 'Commencer', texteFr: "Bon, pour commencer, appuie ici.", texteDyu: "Bon, walasa an ka daminɛ, a digi yan." },
  { id: 'AUTH_05', categorie: 'CONNEXION', moment: 'Demander le numéro', texteFr: "Mets ton numéro de téléphone ici.", texteDyu: "I ka telefɔni nimɔrɔ, a bila yan." },
  { id: 'AUTH_06', categorie: 'CONNEXION', moment: 'Proposer la voix', texteFr: "Tu peux aussi me le dire. Appuie sur le micro d'abord.", texteDyu: "I bise fana ka fɔ n'ye. A digi mikoro kan fɔlɔ." },
  { id: 'AUTH_07', categorie: 'CONNEXION', moment: 'Expliquer la dictée', texteFr: "Dis les chiffres doucement doucement, un par un.", texteDyu: "Nimɔrɔw fɔ dɔɔnin dɔɔnin, kelen kelen." },
  { id: 'AUTH_08', categorie: 'CONNEXION', moment: 'Écouter le numéro saisi', texteFr: "Tu veux réécouter ? Appuie ici.", texteDyu: "I b'a fɛ k'a mɛn tugun wa ? A digi yan." },
  { id: 'AUTH_09', categorie: 'CONNEXION', moment: 'Confirmer', texteFr: "C'est bien ton numéro ? Appuie ici pour continuer.", texteDyu: "I ka nimɔrɔ yɛrɛ le do wa ? A digi yan walasa k'a to yen." },
  { id: 'AUTH_10', categorie: 'CONNEXION', moment: 'Corriger', texteFr: "Tu t'es trompée ? C'est rien, y'a pas problème. Appuie ici pour effacer.", texteDyu: "I filila wa ? Gɛlɛya t'a la. A digi yan k'a josi." },
  { id: 'AUTH_11', categorie: 'CONNEXION', moment: 'Numéro incomplet', texteFr: "Il manque encore des chiffres dedans. Continue.", texteDyu: "Dɔ b'a la fɔlɔ. Fɔ ka t'a la." },
  { id: 'AUTH_12', categorie: 'CONNEXION', moment: 'Numéro invalide', texteFr: "Regarde bien, il y a un chiffre qui ne va pas.", texteDyu: "A filɛ ka ɲa, nimɔrɔ dɔ ma sɔrɔ ka ɲa." },
  { id: 'AUTH_13', categorie: 'CONNEXION', moment: 'Dictée mal comprise', texteFr: "Je n'ai pas bien entendu. Redis-le, doucement.", texteDyu: "N'ma mɛn ka ɲa. A fɔ tugun, dɔɔnin dɔɔnin." },
  { id: 'AUTH_14', categorie: 'CONNEXION', moment: 'Proposer le clavier', texteFr: "Si tu veux, tape ton numéro ici.", texteDyu: "Ni a ka di i ye, i ka nimɔrɔ sɛbɛn yan." },
  { id: 'AUTH_15', categorie: 'CONNEXION', moment: 'Autorisation du micro', texteFr: "Pour que je t'entende, appuie sur Autoriser.", texteDyu: "Walasa n'ka i kan mɛn, a digi Autoriser kan." },
  { id: 'AUTH_16', categorie: 'CONNEXION', moment: 'Micro indisponible', texteFr: "Le micro ne prend pas là. Faut taper ton numéro ici.", texteDyu: "Mikoro tɛ baara kɛra sisan. I ka nimɔrɔ sɛbɛn yan." },
  { id: 'AUTH_17', categorie: 'CONNEXION', moment: 'Micro disponible', texteFr: "C'est bon maintenant. Appuie sur le micro et puis parle.", texteDyu: "A bɛna. A digi mikoro kan, k'i kuma." },
  { id: 'AUTH_18', categorie: 'CONNEXION', moment: 'Vérification', texteFr: "Attends un peu, je regarde.", texteDyu: "Mɔgɔni kɔn dɔɔnin, n'b'a filɛ." },
  { id: 'AUTH_19', categorie: 'CONNEXION', moment: 'Code en chiffres', texteFr: "Bon, mets les quatre chiffres de ton code secret.", texteDyu: "Bon, i ka kɔdi nimɔrɔ naani bila yan." },
  { id: 'AUTH_20', categorie: 'CONNEXION', moment: 'Code en images', texteFr: "Appuie sur tes quatre images, une par une, dans l'ordre.", texteDyu: "I ka ja naani digi, kelen kelen, cogo min na u bɛ ɲɔgɔn kɔ." },
  { id: 'AUTH_21', categorie: 'CONNEXION', moment: 'Passage aux images', texteFr: "Voilà les photos qui sont sorties à la place des chiffres. Ton code n'a pas changé.", texteDyu: "Ja le bɛ yan sisan nimɔrɔw nɔrɔ la. I ka kɔdi ma yɛlɛma." },
  { id: 'AUTH_22', categorie: 'CONNEXION', moment: 'Retour aux chiffres', texteFr: "Voilà les chiffres maintenant. Mets ton code comme d'habitude.", texteDyu: "Nimɔrɔw nana tugun. I ka kɔdi bila i n'a fɔ kɔrɔlen." },
  { id: 'AUTH_23', categorie: 'CONNEXION', moment: 'Discrétion', texteFr: "Ton code, c'est pour toi seule. Faut pas le dire à quelqu'un.", texteDyu: "I ka kɔdi, i kelenpe ta le. Kana fɔ mɔgɔ si ye." },
  { id: 'AUTH_24', categorie: 'CONNEXION', moment: 'Effacement', texteFr: "C'est effacé net.", texteDyu: "A josila." },
  { id: 'AUTH_25', categorie: 'CONNEXION', moment: 'Entrer avec le téléphone', texteFr: "Appuie ici. Ton téléphone va te dire quoi faire.", texteDyu: "A digi yan. I ka telefɔni bɛna a fɔ i ye k'i ka min kɛ." },
  { id: 'AUTH_26', categorie: 'CONNEXION', moment: 'Reconnaissance échouée', texteFr: "Ça n'a pas pris. On passe par ton code directement.", texteDyu: "A ma taga. An b'a kɛ n'i ka kɔdi ye." },
  { id: 'AUTH_27', categorie: 'CONNEXION', moment: 'Autre personne sur le téléphone', texteFr: "Ce n'est pas toi ? Y'a pas problème, appuie ici pour mettre ton numéro.", texteDyu: "E tɛ wa ? Gɛlɛya t'a la, a digi yan k'i ka nimɔrɔ bila." },
  { id: 'AUTH_28', categorie: 'CONNEXION', moment: 'Numéro ou code incorrect', texteFr: "Le numéro ou le code n'est pas bon. Regarde bien pour reprendre.", texteDyu: "Nimɔrɔ walima kɔdi man ɲi. A filɛ ka ɲa ka kɔsegi a la." },
  { id: 'AUTH_29', categorie: 'CONNEXION', moment: 'Dernier essai', texteFr: "Attention, il te reste un seul essai. Prends ton temps.", texteDyu: "Kɔlɔsi, kelenpe dɔrɔn le tora i bolo. I kanto i yɛrɛ la." },
  { id: 'AUTH_30', categorie: 'CONNEXION', moment: 'Trop de tentatives', texteFr: "Tu as trop forcé. Patiente un peu d'abord avant de réessayer.", texteDyu: "I y'a ɲini siɲɛ caaman kojugu. Makɔnni dɔɔnin sanni k'a daminɛ tugun." },
  { id: 'AUTH_31', categorie: 'CONNEXION', moment: 'Accès bloqué', texteFr: "Ma fille, là c'est bloqué. Faut voir ton agent pour t'aider.", texteDyu: "N'denmuso, sira datugura sisan. Taga i ka azan filɛ, a bɛna i dɛmɛ." },
  { id: 'AUTH_32', categorie: 'CONNEXION', moment: 'Connexion impossible', texteFr: "Eh, ça ne passe pas là. Réessaie dans un petit moment.", texteDyu: "Eh, a tɛ tagara dɛ. Kɔsegi a la dɔɔnin kɔfɛ." },
  { id: 'AUTH_33', categorie: 'CONNEXION', moment: 'Nouvelle tentative automatique', texteFr: "Ça pèse un peu. Patiente, je suis en train de relancer.", texteDyu: "A bɛ waati dɔɔnin ta. Sabali dɔɔnin, n'bɛ kɔsegi a la." },
  { id: 'AUTH_34', categorie: 'CONNEXION', moment: 'Changement de code', texteFr: "Maintenant, choisis ton propre code. C'est pour toi seule.", texteDyu: "Sisan, i yɛrɛ ka kɔdi sugandi. I kelenpe ta le." },
  { id: 'AUTH_35', categorie: 'CONNEXION', moment: 'Choix enregistré', texteFr: "D'accord, c'est calé comme ça.", texteDyu: "Ayiwa, an b'a kɛ ten." },
  { id: 'AUTH_36', categorie: 'CONNEXION', moment: 'Choix conservé', texteFr: "D'accord, on continue comme d'habitude.", texteDyu: "Ayiwa, an b'a to ten i n'a fɔ kɔrɔlen." },
  { id: 'AUTH_37', categorie: 'CONNEXION', moment: "Fin de l'accueil", texteFr: "Voilà, ma fille. On y va !", texteDyu: "A banna, n'denmuso. An ka taga !" },

  // ── LOT B — TROIS ERREURS QUE PERSONNE NE SAVAIT DIRE, 26/09/2026 ────────
  //
  // Ces trois-là n'ont PAS de clip : elles sont à enregistrer
  // (docs/voix/LOT-B-A-ENREGISTRER.csv). Le texte, lui, est déjà posé à
  // l'écran — parce qu'il y gagne même sans voix.
  //
  // CE QU'ELLES REMPLACENT. « Réponse inattendue », « Réponse serveur
  // invalide », « Préfixe invalide ». Trois messages de technicien, sur
  // l'écran qui connecte, devant une marchande qui ne lit pas. Ils ne
  // disaient rien à personne — pas même à qui sait lire.
  //
  // CHACUNE DIT LE PROBLÈME PUIS LE GESTE, et les deux premières ont un geste
  // DIFFÉRENT : on retente pour l'une, on recommence pour l'autre. Une seule
  // phrase pour les deux enverrait la moitié des marchandes attendre en vain.
  //
  // `texteDyu` reste vide : une traduction de travail non validée vaudrait
  // moins que rien sur un écran d'entrée. Elle viendra avec une locutrice.
  { id: 'AUTH_38', categorie: 'CONNEXION', moment: "Réponse illisible", texteFr: "Ça n'a pas bien répondu. Attends un petit moment, puis reprends." },
  { id: 'AUTH_39', categorie: 'CONNEXION', moment: "Compte introuvable", texteFr: "Ça n'a pas marché comme il faut. Reprends depuis le début." },
  { id: 'AUTH_40', categorie: 'CONNEXION', moment: "Numéro d'ailleurs", texteFr: "Ce numéro-là ne commence pas comme un numéro d'ici. Regarde bien le début." },

  // ── CHIFFRES (0 à 9), lecture neutre ─────────────────────────────────────
  { id: 'NUM_0', categorie: 'CHIFFRES', moment: 'Chiffre 0', texteFr: 'Zéro', texteDyu: 'Foyi' },
  { id: 'NUM_1', categorie: 'CHIFFRES', moment: 'Chiffre 1', texteFr: 'Un', texteDyu: 'Kelen' },
  { id: 'NUM_2', categorie: 'CHIFFRES', moment: 'Chiffre 2', texteFr: 'Deux', texteDyu: 'Fila' },
  { id: 'NUM_3', categorie: 'CHIFFRES', moment: 'Chiffre 3', texteFr: 'Trois', texteDyu: 'Saba' },
  { id: 'NUM_4', categorie: 'CHIFFRES', moment: 'Chiffre 4', texteFr: 'Quatre', texteDyu: 'Naani' },
  { id: 'NUM_5', categorie: 'CHIFFRES', moment: 'Chiffre 5', texteFr: 'Cinq', texteDyu: 'Duuru' },
  { id: 'NUM_6', categorie: 'CHIFFRES', moment: 'Chiffre 6', texteFr: 'Six', texteDyu: 'Wɔɔrɔ' },
  { id: 'NUM_7', categorie: 'CHIFFRES', moment: 'Chiffre 7', texteFr: 'Sept', texteDyu: 'Wolonwula' },
  { id: 'NUM_8', categorie: 'CHIFFRES', moment: 'Chiffre 8', texteFr: 'Huit', texteDyu: 'Seegi' },
  { id: 'NUM_9', categorie: 'CHIFFRES', moment: 'Chiffre 9', texteFr: 'Neuf', texteDyu: 'Kɔnɔntɔn' },

  // ── PIPELINE VOCAL CORE — phrases d'attente/accusés les plus fréquentes ──
  { id: 'CORE_WAIT_01', categorie: 'PIPELINE_CORE', moment: "Phrase d'attente", texteFr: 'Je réfléchis...', texteDyu: "N'b'a kɔlɔsi dɔɔnin..." },
  { id: 'CORE_WAIT_02', categorie: 'PIPELINE_CORE', moment: "Phrase d'attente", texteFr: 'Un instant...', texteDyu: 'Sabali dɔɔnin...' },
  { id: 'CORE_WAIT_03', categorie: 'PIPELINE_CORE', moment: "Phrase d'attente", texteFr: 'Je vois ça...', texteDyu: "N'b'a lajɛra..." },
  { id: 'CORE_WAIT_04', categorie: 'PIPELINE_CORE', moment: "Phrase d'attente", texteFr: "Je m'en occupe...", texteDyu: "N'bɛ baara kɛ a la..." },
  { id: 'CORE_WAIT_05', categorie: 'PIPELINE_CORE', moment: "Phrase d'attente calcul", texteFr: 'Je calcule ça...', texteDyu: "N'b'a jatebɔ la..." },
  { id: 'CORE_WAIT_06', categorie: 'PIPELINE_CORE', moment: "Phrase d'attente vente", texteFr: 'Je note ta vente...', texteDyu: "N'bɛ i ka feere sɛbɛn..." },
  { id: 'CORE_WAIT_07', categorie: 'PIPELINE_CORE', moment: "Phrase d'attente réessai", texteFr: 'Laisse-moi réessayer...', texteDyu: "A to n'ka kɔsegi a la..." },
  { id: 'CORE_ACK_01', categorie: 'PIPELINE_CORE', moment: 'Accusé réception', texteFr: "C'est fait !", texteDyu: 'A banna !' },
  { id: 'CORE_ACK_02', categorie: 'PIPELINE_CORE', moment: 'Accusé réception', texteFr: 'Bien reçu !', texteDyu: 'A mɛnna ka ɲa !' },
  { id: 'CORE_ACK_03', categorie: 'PIPELINE_CORE', moment: 'Accusé réception', texteFr: 'Je note ça !', texteDyu: "N'b'a sɛbɛn !" },
  { id: 'CORE_ACK_04', categorie: 'PIPELINE_CORE', moment: 'Accusé réception', texteFr: "C'est noté !", texteDyu: 'A sɛbɛnna !' },
  { id: 'CORE_ACK_05', categorie: 'PIPELINE_CORE', moment: 'Accusé réception', texteFr: "C'est enregistré !", texteDyu: 'A bilala ka ɲa !' },
  { id: 'CORE_ACK_06', categorie: 'PIPELINE_CORE', moment: 'Validation vente finale', texteFr: "C'est noté, ta vente est bien enregistrée.", texteDyu: 'A banna, i ka feere bilala ka ɲa.' },
  { id: 'CORE_ACK_07', categorie: 'PIPELINE_CORE', moment: 'Annulation vente', texteFr: "D'accord, j'annule. Pas de souci.", texteDyu: "Ayiwa, n'b'a to yen. Gɛlɛya t'a la." },
  { id: 'CORE_ERR_01', categorie: 'PIPELINE_CORE', moment: 'Non compris', texteFr: "Je n'ai pas bien compris. Redis-moi ça autrement, s'il te plaît.", texteDyu: "N'ma a faamu ka ɲa. A fɔ n'ye kokura, sabali." },
  { id: 'CORE_ERR_02', categorie: 'PIPELINE_CORE', moment: 'Rien entendu', texteFr: "Je n'ai rien entendu. Réessaie, parle un peu plus fort.", texteDyu: "N'ma foyi mɛn. Kɔsegi a la, i kan kɔrɔta dɔɔnin." },
  { id: 'CORE_ERR_03', categorie: 'PIPELINE_CORE', moment: 'Choix confirmation ambigu', texteFr: 'Dis oui pour valider, ou non pour annuler.', texteDyu: "A fɔ 'Awo' walasa k'a sɔn, walima 'Ayi' walasa k'a dabila." },
  { id: 'CORE_ERR_04', categorie: 'PIPELINE_CORE', moment: 'Rappel écran', texteFr: "Touche Oui ou Non à l'écran, s'il te plaît.", texteDyu: "A digi 'Awo' walima 'Ayi' kan ekran na, sabali." },
  { id: 'CORE_SYS_01', categorie: 'PIPELINE_CORE', moment: 'Préparation moteur', texteFr: 'Je prépare ta voix, un petit instant.', texteDyu: "N'bɛ kan labɛnna, makɔnni dɔɔnin." },
  { id: 'CORE_SYS_02', categorie: 'PIPELINE_CORE', moment: 'Erreur réseau moteur', texteFr: "Je n'ai pas réussi à préparer ta voix. Vérifie le réseau et réessaie.", texteDyu: "N'ma se ka kan labɛn. Reso lajɛ ka kɔsegi a la." },
];

export const LABEL_CATEGORIE: Record<CategorieScript, string> = {
  CONNEXION: 'Connexion (accueil, numéro, code)',
  CHIFFRES: 'Chiffres isolés (0 à 9)',
  PIPELINE_CORE: 'Pipeline vocal — attentes et accusés fréquents',
};
