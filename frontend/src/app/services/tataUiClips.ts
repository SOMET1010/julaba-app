// ─────────────────────────────────────────────────────────────────────────────
// Voix « Tata Nanti Lou » — messages FIXES de l'appli, dits dans la VRAIE voix.
//
// GÉNÉRÉ à partir des 137 clips post-produits (silences coupés, volume harmonisé
// à -16 LUFS, débit ralenti ~10 %). Chaque entrée relie le TEXTE exact prononcé
// par l'appli au clip audio correspondant, embarqué (hors-ligne, zéro cloud).
//
// Utilisé par useVoiceCore : quand l'appli s'apprête à dire un de ces messages,
// on joue la voix de Tata au lieu de la voix de synthèse. Correspondance EXACTE
// (après normalisation) → aucun risque de jouer le mauvais clip ; si ça ne
// correspond pas, l'appli garde sa voix de secours habituelle.
// ─────────────────────────────────────────────────────────────────────────────

export interface TataUiClip { file: string; text: string; }

export const TATA_UI_CLIPS: TataUiClip[] = [
  { file: "/voix/tata/ui-001.mp3", text: "Alertes basses ignorées" },
  { file: "/voix/tata/ui-002.mp3", text: "Au revoir. Déconnexion du Back-Office." },
  { file: "/voix/tata/ui-003.mp3", text: "Besoin mis à jour" },
  { file: "/voix/tata/ui-004.mp3", text: "Bienvenue sur le terminal de vente. Ajoute tes produits au panier" },
  { file: "/voix/tata/ui-005.mp3", text: "Bonjour ! Tu veux écrire ou parler avec moi ?" },
  { file: "/voix/tata/ui-006.mp3", text: "Bonne réponse !" },
  { file: "/voix/tata/ui-007.mp3", text: "Ce client a droit à sa récompense !" },
  { file: "/voix/tata/ui-008.mp3", text: "Chargement du document en cours" },
  { file: "/voix/tata/ui-009.mp3", text: "Choisissez un nouveau document" },
  { file: "/voix/tata/ui-010.mp3", text: "Combien tu as en caisse ce matin ?" },
  { file: "/voix/tata/ui-011.mp3", text: "Commande annulée" },
  { file: "/voix/tata/ui-012.mp3", text: "Commande marquée comme livrée" },
  { file: "/voix/tata/ui-013.mp3", text: "Commande refusée." },
  { file: "/voix/tata/ui-014.mp3", text: "Commandes livrées" },
  { file: "/voix/tata/ui-015.mp3", text: "Commandes urgentes" },
  { file: "/voix/tata/ui-016.mp3", text: "Connexion refusée. Vérifie tes identifiants." },
  { file: "/voix/tata/ui-017.mp3", text: "Connexion rétablie" },
  { file: "/voix/tata/ui-018.mp3", text: "Contact mis à jour" },
  { file: "/voix/tata/ui-019.mp3", text: "Contre-offre refusée." },
  { file: "/voix/tata/ui-020.mp3", text: "Contre-proposition envoyée" },
  { file: "/voix/tata/ui-021.mp3", text: "Création de plantation agricole" },
  { file: "/voix/tata/ui-022.mp3", text: "Création en cours..." },
  { file: "/voix/tata/ui-023.mp3", text: "Demande acceptée" },
  { file: "/voix/tata/ui-024.mp3", text: "Demande refusée" },
  { file: "/voix/tata/ui-025.mp3", text: "Document chargé avec succès. En attente de vérification" },
  { file: "/voix/tata/ui-026.mp3", text: "Document sauvegardé avec succès" },
  { file: "/voix/tata/ui-027.mp3", text: "Document supprimé" },
  { file: "/voix/tata/ui-028.mp3", text: "Document tourné" },
  { file: "/voix/tata/ui-029.mp3", text: "Début de la formation" },
  { file: "/voix/tata/ui-030.mp3", text: "Déclaration de récolte" },
  { file: "/voix/tata/ui-031.mp3", text: "Déclarer une récolte" },
  { file: "/voix/tata/ui-032.mp3", text: "Déconnexion en cours" },
  { file: "/voix/tata/ui-033.mp3", text: "Dépense de" },
  { file: "/voix/tata/ui-034.mp3", text: "Dépense enregistrée" },
  { file: "/voix/tata/ui-035.mp3", text: "Entre ton code secret à 4 chiffres" },
  { file: "/voix/tata/ui-036.mp3", text: "Entre un montant valide" },
  { file: "/voix/tata/ui-038.mp3", text: "Erreur de synchronisation. Fiche sauvegardée localement." },
  { file: "/voix/tata/ui-039.mp3", text: "Erreur lors de l'enregistrement" },
  { file: "/voix/tata/ui-040.mp3", text: "Erreur lors de l'enregistrement de la vente" },
  { file: "/voix/tata/ui-042.mp3", text: "Erreur lors de la modification" },
  { file: "/voix/tata/ui-043.mp3", text: "Erreur lors de la publication" },
  { file: "/voix/tata/ui-044.mp3", text: "Erreur lors de la publication, réessaie" },
  { file: "/voix/tata/ui-045.mp3", text: "Erreur lors du rechargement" },
  { file: "/voix/tata/ui-046.mp3", text: "Erreur lors du retrait" },
  { file: "/voix/tata/ui-047.mp3", text: "Erreur réseau. Réessaie." },
  { file: "/voix/tata/ui-048.mp3", text: "Erreur, réessaie" },
  { file: "/voix/tata/ui-049.mp3", text: "Export en cours" },
  { file: "/voix/tata/ui-050.mp3", text: "Fiche mise à jour" },
  { file: "/voix/tata/ui-051.mp3", text: "Fiche mise à jour et synchronisée" },
  { file: "/voix/tata/ui-052.mp3", text: "Format de fichier invalide. Utilise une image." },
  { file: "/voix/tata/ui-053.mp3", text: "Identité mise à jour" },
  { file: "/voix/tata/ui-054.mp3", text: "Image trop lourde. Maximum 2 mégaoctets." },
  { file: "/voix/tata/ui-055.mp3", text: "Indique le nom du produit" },
  { file: "/voix/tata/ui-056.mp3", text: "Informations personnelles enregistrées avec succès" },
  { file: "/voix/tata/ui-057.mp3", text: "J'ai compris" },
  { file: "/voix/tata/ui-058.mp3", text: "Je n'ai pas compris. Tape ton numéro, ou réessaie." },
  { file: "/voix/tata/ui-060.mp3", text: "La commande du marchand a été acceptée." },
  { file: "/voix/tata/ui-061.mp3", text: "La quantité doit être supérieure à zéro" },
  { file: "/voix/tata/ui-063.mp3", text: "Le montant doit être un multiple de 100 francs" },
  { file: "/voix/tata/ui-064.mp3", text: "Le montant doit être un multiple de 5 francs" },
  { file: "/voix/tata/ui-065.mp3", text: "Le montant minimum est de 200 FCFA" },
  { file: "/voix/tata/ui-066.mp3", text: "Le montant saisi est invalide" },
  { file: "/voix/tata/ui-067.mp3", text: "Le produit a été retiré de votre marketplace." },
  { file: "/voix/tata/ui-068.mp3", text: "Le stock disponible ne peut pas dépasser la quantité totale de la récolte" },
  { file: "/voix/tata/ui-069.mp3", text: "Livraison déclarée. Le marchand va confirmer la réception." },
  { file: "/voix/tata/ui-070.mp3", text: "Ma Plantation" },
  { file: "/voix/tata/ui-071.mp3", text: "Mes revenus" },
  { file: "/voix/tata/ui-072.mp3", text: "Mes récoltes" },
  { file: "/voix/tata/ui-073.mp3", text: "Mode hors ligne" },
  { file: "/voix/tata/ui-074.mp3", text: "Mode édition activé" },
  { file: "/voix/tata/ui-075.mp3", text: "Modification en cours..." },
  { file: "/voix/tata/ui-076.mp3", text: "Modifications annulées" },
  { file: "/voix/tata/ui-077.mp3", text: "Modifier la récolte" },
  { file: "/voix/tata/ui-078.mp3", text: "Mon Historique de ventes" },
  { file: "/voix/tata/ui-079.mp3", text: "Mon Marché" },
  { file: "/voix/tata/ui-080.mp3", text: "Montant invalide" },
  { file: "/voix/tata/ui-081.mp3", text: "Montant total invalide" },
  { file: "/voix/tata/ui-082.mp3", text: "Numéro Mobile Money invalide. Dix chiffres requis" },
  { file: "/voix/tata/ui-083.mp3", text: "Numéro de téléphone invalide. Format attendu : 07XXXXXXXX" },
  { file: "/voix/tata/ui-084.mp3", text: "Ouverture de ton Wallet Jùlaba" },
  { file: "/voix/tata/ui-087.mp3", text: "Ouverture des détails de la certification JULABA" },
  { file: "/voix/tata/ui-088.mp3", text: "Ouverture du Wallet Jùlaba" },
  { file: "/voix/tata/ui-089.mp3", text: "Ouvre le formulaire de rechargement Mobile Money" },
  { file: "/voix/tata/ui-090.mp3", text: "Ouvre le formulaire de retrait Mobile Money" },
  { file: "/voix/tata/ui-091.mp3", text: "Ouvre ta journée pour activer ta caisse" },
  { file: "/voix/tata/ui-092.mp3", text: "Paiement confirmé ! Ton Keiwa est rechargé." },
  { file: "/voix/tata/ui-093.mp3", text: "Paiement en cours — confirme sur ton téléphone" },
  { file: "/voix/tata/ui-094.mp3", text: "Paiement récupéré ! L'argent est dans ton Keiwa." },
  { file: "/voix/tata/ui-095.mp3", text: "Paramètres sauvegardés" },
  { file: "/voix/tata/ui-097.mp3", text: "Photo modifiée" },
  { file: "/voix/tata/ui-098.mp3", text: "Plantation créée avec succès !" },
  { file: "/voix/tata/ui-099.mp3", text: "Prix invalide" },
  { file: "/voix/tata/ui-100.mp3", text: "Problème avec le micro — réessaie" },
  { file: "/voix/tata/ui-101.mp3", text: "Publication en cours..." },
  { file: "/voix/tata/ui-102.mp3", text: "Publication modifiée avec succès !" },
  { file: "/voix/tata/ui-103.mp3", text: "Publication sur le marché en cours" },
  { file: "/voix/tata/ui-104.mp3", text: "Quantité invalide" },
  { file: "/voix/tata/ui-106.mp3", text: "Recharger votre keiwa" },
  { file: "/voix/tata/ui-107.mp3", text: "Remplis tous les champs obligatoires" },
  { file: "/voix/tata/ui-109.mp3", text: "Retour au choix du montant" },
  { file: "/voix/tata/ui-110.mp3", text: "Retour au choix du service" },
  { file: "/voix/tata/ui-111.mp3", text: "Retrait confirmé ! Ton solde a été mis à jour." },
  { file: "/voix/tata/ui-112.mp3", text: "Réception confirmée. Passons au paiement." },
  { file: "/voix/tata/ui-113.mp3", text: "Récolte publiée avec succès !" },
  { file: "/voix/tata/ui-114.mp3", text: "Saisir un autre montant" },
  { file: "/voix/tata/ui-115.mp3", text: "Saisis le nom du produit" },
  { file: "/voix/tata/ui-116.mp3", text: "Saisis une quantité valide" },
  { file: "/voix/tata/ui-117.mp3", text: "Signalement de problème" },
  { file: "/voix/tata/ui-118.mp3", text: "Solde insuffisant" },
  { file: "/voix/tata/ui-119.mp3", text: "Suivre une nouvelle plantation" },
  { file: "/voix/tata/ui-120.mp3", text: "Ta demande a été envoyée" },
  { file: "/voix/tata/ui-121.mp3", text: "Ton streak a été réinitialisé" },
  { file: "/voix/tata/ui-122.mp3", text: "Ton streak est sauvé grâce au bouclier !" },
  { file: "/voix/tata/ui-123.mp3", text: "Toute ta production est au-dessus du seuil. Tout va bien !" },
  { file: "/voix/tata/ui-124.mp3", text: "Toutes les commandes" },
  { file: "/voix/tata/ui-125.mp3", text: "Trop de tentatives incorrectes. Réessaie dans 5 minutes." },
  { file: "/voix/tata/ui-126.mp3", text: "Tu vas être redirigé vers Wave pour confirmer le paiement" },
  { file: "/voix/tata/ui-127.mp3", text: "Téléchargement de la carte" },
  { file: "/voix/tata/ui-128.mp3", text: "Vente confirmée" },
  { file: "/voix/tata/ui-129.mp3", text: "Vente refusée" },
  { file: "/voix/tata/ui-130.mp3", text: "Verso de la carte" },
  { file: "/voix/tata/ui-131.mp3", text: "Voici tes céréales en production" },
  { file: "/voix/tata/ui-132.mp3", text: "Voici tes fruits en production" },
  { file: "/voix/tata/ui-133.mp3", text: "Voici tes légumes en production" },
  { file: "/voix/tata/ui-134.mp3", text: "Voici tes tubercules en production" },
  { file: "/voix/tata/ui-135.mp3", text: "Voici tous tes produits en production" },
  { file: "/voix/tata/ui-136.mp3", text: "Votre besoin a été soumis à la coopérative" },
  { file: "/voix/tata/ui-137.mp3", text: "À bientôt sur Jùlaba" },

  // ── UN ORPHELIN RENDU À SON EMPLOI — CLIP-02, 26/09/2026 ─────────────────
  //
  // `ui-086.mp3` dormait depuis la livraison d'origine : embarqué dans l'APK,
  // pré-caché par le service worker, déclaré nulle part. Fait transcrire, il
  // dit « Ouverture des détails de la carte d'identité » — mot pour mot ce que
  // `DocumentsCertificationsModalUniversal.tsx:133` fait dire à l'application,
  // aujourd'hui par la synthèse. Son voisin `ui-087` est déjà branché sur la
  // phrase jumelle (« …de la certification JULABA ») : la famille se tient.
  //
  // C'est une phrase rendue à la VRAIE voix sans rien enregistrer ni générer.
  //
  // LES HUIT AUTRES ORPHELINS RESTENT DORMANTS, et c'est mesuré, pas supposé :
  // sept (ui-037, 041, 059, 062, 096, 105, 108) disent des phrases que
  // l'application ne prononce ni n'affiche nulle part — envoyer, recevoir,
  // retirer de l'argent, montant de transaction : le parcours portefeuille,
  // hors pilote. Et `ui-085`, transcrit « Ouverture des détails de
  // l'opération », ne correspond à AUCUNE des trois phrases de ce fichier —
  // la troisième dit « …de l'attestation d'activité ». Whisper a peut-être
  // mal entendu ; on n'aligne pas un texte sur une hypothèse. À ÉCOUTER.
  { file: "/voix/tata/ui-086.mp3", text: "Ouverture des détails de la carte d'identité" },

  // ── LOT A — 82 clips de la voix de synthèse, 26/09/2026 ──────────────────
  //
  // CE QUE C'EST. Les 128 entrées ci-dessus sont la VOIX HUMAINE de Tantie
  // Nanti Lou. Celles-ci ne le sont pas : ce sont 82 phrases générées par une
  // voix de synthèse ivoirienne DISTINCTE, décision de Patrick du 25/09 —
  // « Julaba ne génère pas une imitation de Tata ». Aucune ne se présente :
  // `login-01` (« Moi, c'est Tantie Nanti Lou ») est volontairement absente,
  // et une voix qui ne se présente pas n'usurpe aucune identité.
  //
  // ELLES NE REMPLACENT AUCUN CLIP HUMAIN. Huit phrases du lot d'origine
  // avaient déjà leur clip enregistré ; elles ont été retirées avant
  // production (docs/voix/LOT-DEJA-EN-VRAIE-VOIX.csv). On ne commande jamais
  // en synthèse ce que la vraie voix dit déjà.
  //
  // LE TEXTE FAIT FOI, PAS LE NOM. `login-02.mp3`, `chiffre-0.mp3` : ces noms
  // viennent de `pages/StudioVoix.tsx` (`nomFichierScript`) et ne sont lus par
  // aucun code. Ce qui relie un clip à une phrase, c'est la chaîne `text`
  // ci-dessous, comparée normalisée à ce que l'application s'apprête à dire.
  //
  // CONTRÔLÉES À L'ARRIVÉE (scripts/voix/ingerer-clips.mjs) : 82/82 présentes,
  // 82/82 textes identiques à ce que l'application dit, format et niveau
  // mesurés fichier par fichier, silences coupés, -16 LUFS. Les dix chiffres,
  // faits pour s'enchaîner, sortent à moins de 2 dB d'écart entre eux.
  { file: "/voix/tata/chiffre-0.mp3", text: "Zéro" },
  { file: "/voix/tata/chiffre-1.mp3", text: "Un" },
  { file: "/voix/tata/chiffre-2.mp3", text: "Deux" },
  { file: "/voix/tata/chiffre-3.mp3", text: "Trois" },
  { file: "/voix/tata/chiffre-4.mp3", text: "Quatre" },
  { file: "/voix/tata/chiffre-5.mp3", text: "Cinq" },
  { file: "/voix/tata/chiffre-6.mp3", text: "Six" },
  { file: "/voix/tata/chiffre-7.mp3", text: "Sept" },
  { file: "/voix/tata/chiffre-8.mp3", text: "Huit" },
  { file: "/voix/tata/chiffre-9.mp3", text: "Neuf" },
  { file: "/voix/tata/core-ack-01.mp3", text: "C'est fait net !" },
  { file: "/voix/tata/core-ack-02.mp3", text: "C'est bien reçu !" },
  { file: "/voix/tata/core-ack-03.mp3", text: "J'ai calé ça !" },
  { file: "/voix/tata/core-ack-04.mp3", text: "C'est noté deh !" },
  { file: "/voix/tata/core-ack-05.mp3", text: "C'est bien enregistré !" },
  { file: "/voix/tata/core-ack-06.mp3", text: "C'est calé, ta vente est bien entrée dans la machine." },
  { file: "/voix/tata/core-ack-07.mp3", text: "D'accord, j'annule ça. Y'a pas de souci." },
  { file: "/voix/tata/core-err-01.mp3", text: "Je n'ai pas bien capté. Faut me redire ça autrement, s'il te plaît." },
  { file: "/voix/tata/core-err-02.mp3", text: "Je n'ai rien entendu, deh. Réessaie en haussant un peu la voix." },
  { file: "/voix/tata/core-err-03.mp3", text: "Dis oui pour confirmer, ou bien dis non pour laisser tomber." },
  { file: "/voix/tata/core-err-04.mp3", text: "Appuie sur Oui ou sur Non sur l'écran." },
  { file: "/voix/tata/core-sys-01.mp3", text: "Je chauffe ma voix un coup, patiente deux minutes." },
  { file: "/voix/tata/core-sys-02.mp3", text: "La voix n'est pas sortie. Regarde ton réseau et puis réessaie." },
  { file: "/voix/tata/core-wait-01.mp3", text: "Je regarde ça un coup..." },
  { file: "/voix/tata/core-wait-02.mp3", text: "Attends deux minutes..." },
  { file: "/voix/tata/core-wait-03.mp3", text: "Je vérifie ça tout de suite..." },
  { file: "/voix/tata/core-wait-04.mp3", text: "Je gère ça pour toi..." },
  { file: "/voix/tata/core-wait-05.mp3", text: "Je fais le point..." },
  { file: "/voix/tata/core-wait-06.mp3", text: "J'enregistre ta vente là tout de suite..." },
  { file: "/voix/tata/core-wait-07.mp3", text: "Laisse-moi relancer encore..." },
  { file: "/voix/tata/crd-02.mp3", text: "L'avance qu'elle t'a donnée dépasse ou bien c'est égal au prix total. Enregistre ça comme vente cash directement." },
  { file: "/voix/tata/crd-04.mp3", text: "Donne-moi d'abord le nom de la cliente." },
  { file: "/voix/tata/dep-02.mp3", text: "Attention, l'argent-là est beaucoup, deh ! Vérifie bien si tu ne t'es pas trompée." },
  { file: "/voix/tata/login-02.mp3", text: "Eh, ma fille ! Te voilà. On continue, non ?" },
  { file: "/voix/tata/login-03.mp3", text: "Chaque vente, tu mets ça ici. Comme ça là, tu n'oublies rien et tout ton point est là." },
  { file: "/voix/tata/login-04.mp3", text: "Bon, pour commencer là, appuie ici." },
  { file: "/voix/tata/login-05.mp3", text: "Mets ton numéro de téléphone ici." },
  { file: "/voix/tata/login-06.mp3", text: "Tu peux me dicter aussi, hein. Appuie sur le micro d'abord." },
  { file: "/voix/tata/login-07.mp3", text: "Dis les chiffres doucement doucement, un à un." },
  { file: "/voix/tata/login-08.mp3", text: "Tu veux réécouter ça ? Appuie ici." },
  { file: "/voix/tata/login-09.mp3", text: "C'est bien ton numéro, non ? Appuie ici pour avancer." },
  { file: "/voix/tata/login-10.mp3", text: "Tu t'es trompée ? Y'a pas problème, c'est rien. Appuie ici pour effacer." },
  { file: "/voix/tata/login-11.mp3", text: "Il manque encore des chiffres dedans. Continue." },
  { file: "/voix/tata/login-12.mp3", text: "Regarde bien, y'a un chiffre qui n'est pas bon dedans." },

  // ── UN CLIP COMPOSÉ, POUR RENDRE UN GESTE — AUTH-12+14, 26/09/2026 ───────
  //
  // `login-12` nomme mieux le défaut que la phrase d'origine (« Numéro non
  // reconnu, réessaie ou tape-le »), mais il PERD le geste : il dit ce qui ne
  // va pas, jamais quoi faire. On l'avait donc laissé de côté deux fois —
  // « on ne remplace jamais une consigne par une plus pauvre ».
  //
  // Arbitrage de Patrick, 26/09 : enchaîner avec `login-14`, qui porte
  // justement le geste (« tape ton numéro directement ici »).
  //
  // POURQUOI UN SEUL FICHIER ET PAS DEUX LECTURES. `parle(error)` ne dit
  // qu'une phrase, et `audioManager` ne sert qu'un créneau : deux demandes de
  // suite et la seconde annule la première. Les fondre au montage donne une
  // clé, un texte, un fichier — et une respiration de 280 ms entre les deux,
  // qu'aucun enchaînement à l'exécution n'aurait su placer.
  //
  // 6,7 s : c'est long pour une erreur. C'est le prix du geste, et il vaut
  // mieux que six secondes de silence.
  { file: "/voix/tata/login-12-14.mp3", text: "Regarde bien, y'a un chiffre qui n'est pas bon dedans. Si tu veux, tape ton numéro directement ici." },
  { file: "/voix/tata/login-13.mp3", text: "Je n'ai pas bien entendu, deh. Redis-moi ça doucement." },
  { file: "/voix/tata/login-14.mp3", text: "Si tu veux, tape ton numéro directement ici." },
  { file: "/voix/tata/login-15.mp3", text: "Pour que je puisse bien t'entendre, appuie sur \"Autoriser\"." },
  { file: "/voix/tata/login-16.mp3", text: "Le micro ne prend pas là. Faut taper ton numéro ici." },
  { file: "/voix/tata/login-17.mp3", text: "C'est bon maintenant. Appuie sur le micro et puis parle." },
  { file: "/voix/tata/login-18.mp3", text: "Attends un peu, je vérifie ça pour toi." },
  { file: "/voix/tata/login-19.mp3", text: "Bon, mets les quatre chiffres de ton code secret." },
  { file: "/voix/tata/login-20.mp3", text: "Appuie sur tes quatre photos, une à une, comme tu avais choisi là." },
  { file: "/voix/tata/login-21.mp3", text: "Voilà les photos qui sont sorties à la place des chiffres. Ton code n'a pas changé." },
  { file: "/voix/tata/login-22.mp3", text: "Voilà les chiffres maintenant. Mets ton code comme d'habitude." },
  { file: "/voix/tata/login-23.mp3", text: "Ton code là, c'est pour toi seule. Faut jamais montrer ou dire ça à quelqu'un." },
  { file: "/voix/tata/login-24.mp3", text: "C'est effacé net." },
  { file: "/voix/tata/login-25.mp3", text: "Appuie ici. Ton propre téléphone va te guider." },
  { file: "/voix/tata/login-26.mp3", text: "Ça n'a pas pris. On passe par ton code directement." },
  { file: "/voix/tata/login-27.mp3", text: "Ce n'est pas toi ? Y'a pas problème, appuie ici pour taper ton numéro." },
  { file: "/voix/tata/login-28.mp3", text: "Le numéro ou le code n'est pas bon, deh. Regarde bien avant de reprendre." },
  { file: "/voix/tata/login-29.mp3", text: "Attention, hein ! Il te reste une seule chance. Prends bien ton temps." },
  { file: "/voix/tata/login-30.mp3", text: "Tu as trop forcé. Patiente un peu d'abord avant de réessayer." },
  { file: "/voix/tata/login-31.mp3", text: "Ma fille, là c'est bloqué net. Faut aller voir ton agent pour te débloquer." },
  { file: "/voix/tata/login-32.mp3", text: "Eh, le réseau ne passe pas là ! Réessaie dans un petit moment." },
  { file: "/voix/tata/login-33.mp3", text: "Ça pèse un peu. Patiente, je suis en train de relancer." },
  { file: "/voix/tata/login-34.mp3", text: "Maintenant là, choisis ton propre code secret. C'est pour toi seule, hein." },
  { file: "/voix/tata/login-35.mp3", text: "D'accord, c'est calé comme ça." },
  { file: "/voix/tata/login-36.mp3", text: "D'accord, on continue comme d'habitude." },
  { file: "/voix/tata/login-37.mp3", text: "Voilà, ma fille. Allons-y !" },
  { file: "/voix/tata/stk-02.mp3", text: "Quel produit vivrier tu veux faire entrer dans le stock ?" },
  { file: "/voix/tata/stk-06.mp3", text: "Tout ton stock est bien chargé, y'a pas de manque." },
  { file: "/voix/tata/stk-08.mp3", text: "Tu n'as pas mis à combien tu as payé ça au gros. On ne pourra pas calculer ton vrai bénéfice." },
  { file: "/voix/tata/vente-01.mp3", text: "Appuie sur moi et puis dis-moi ce que tu as vendu au marché." },
  { file: "/voix/tata/vente-02.mp3", text: "Je n'ai pas bien capté. Rapproche le téléphone de ta bouche et puis parle doucement." },
  { file: "/voix/tata/vente-03.mp3", text: "C'est rentré dans le panier. Tu ajoutes encore ou bien on encaisse l'argent ?" },
  { file: "/voix/tata/vente-04.mp3", text: "D'accord, on laisse tomber ça. Ton panier n'a pas bougé." },
  { file: "/voix/tata/vente-05.mp3", text: "Ma voix ne sort pas là. Tape ta vente sur le clavier, je suis avec toi." },
  { file: "/voix/tata/vente-06.mp3", text: "Et puis c'est à combien ?" },
  { file: "/voix/tata/vente-14.mp3", text: "Tu n'as pas encore fait de vente aujourd'hui. Y'a pas problème, le marché va s'ouvrir !" },
  { file: "/voix/tata/vente-18.mp3", text: "L'argent est tombé pile, y'a pas de monnaie." },
  { file: "/voix/tata/wlt-01.mp3", text: "Ton argent est caché" },
  { file: "/voix/tata/wlt-08.mp3", text: "Ton argent est affiché" },
];

// Normalisation pour comparer le texte prononcé au texte enregistré :
// minuscules, sans accents, sans ponctuation, espaces compactés.
export function normalizeForClip(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const INDEX = new Map<string, string>();
for (const c of TATA_UI_CLIPS) {
  const k = normalizeForClip(c.text);
  if (k.length >= 3 && !INDEX.has(k)) INDEX.set(k, c.file);
}

/** URL du clip Tata pour un texte donné (correspondance exacte normalisée), sinon null. */
export function tataUiClipForText(text: string): string | null {
  return INDEX.get(normalizeForClip(text)) ?? null;
}
