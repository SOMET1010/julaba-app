# Annexe — Catalogue vocal complet (542 phrases TTS)

Extraction mécanique de `frontend_src/src/app/i18n/voice/catalog.ts` (`MESSAGES_TTS`). La locale `fr-ci` sert `frActuel` tel quel (`i18n/voice/locales/fr-ci/messages.ts:27-31`, `SURCHARGES` vide) : **le texte ci-dessous est donc exactement ce que la synthèse reçoit** quand la clé est appelée, variables substituées (`{devise}` = « francs », `{symboleDevise}` = « F »).

Colonnes : **Statut** = `migre` (le code appelle la clé), `a_migrer` (texte encore en dur dans le fichier `source`), `reference` (clip ou script existant, joué par son propre chemin). **€** = `critiqueArgent` (jamais tue par le niveau « essentiel »). **Usages** = nombre de références à la clé hors catalogue. ⚠ = texte `a_migrer` introuvable dans le code actuel (catalogue périmé).


## Domaine `auth` — 83 phrase(s)

| Clé | catalog.ts | Statut | € | Texte fr-ci (dit) | Source déclarée | Usages |
|---|---|---|---|---|---|---|
| `AKWABA_ACCUEIL` | `:172` | migre |  | « Akwaba. Pour vendre, touche un produit, ou parle à Tantie Nanti Lou. On est ensemble. » | `components/auth/Welcome.tsx` | 1 |
| `AKWABA_RETOUR` | `:173` | migre |  | « Re-bonjour ! On y va. » | `components/auth/Welcome.tsx` | 1 |
| `ENTREE_NUMERO` | `:199` | migre |  | « Tape les chiffres de ton numéro, un par un. Les ronds en haut vont se remplir. » | `components/auth/LoginPassword.tsx` | 3 |
| `ENTREE_NUMERO_VOIX` | `:200` | migre |  | « Dis ton numéro, ou tape les chiffres un par un. Les ronds en haut vont se remplir. » | `components/auth/LoginPassword.tsx` | 1 |
| `ENTREE_CODE` | `:201` | migre |  | « Entre ton code secret à quatre chiffres. » | `components/auth/LoginPassword.tsx` | 1 |
| `ENTREE_CODE_ERREUR` | `:202` | migre |  | « Ce n'est pas le bon code. Réessaie doucement. » | `components/auth/LoginPassword.tsx` | 1 |
| `ENTREE_CONNEXION` | `:203` | migre |  | « La connexion ne passe pas pour le moment. Attends un peu, puis réessaie. » | `components/auth/LoginPassword.tsx` | 1 |
| `ENTREE_RECONNAISSANCE` | `:204` | migre |  | « Touche le grand bouton. Ton téléphone va te reconnaître. » | `components/auth/LoginPassword.tsx` | 1 |
| `TANTIE_PRESENTATION` | `:209` | migre |  | « Je serai avec toi chaque jour dans ton commerce. Tu peux toucher l'écran. Tu peux aussi écouter. On est ensemble. » | `components/auth/OnboardingSlides.tsx` | 3 |
| `TANTIE_BRAVO` | `:210` | migre |  | « Bravo ! Nous sommes prêtes. Ouvrons ta boutique. » | `components/auth/OnboardingSlides.tsx` | 2 |
| `AUTH_001` | `:233` | a_migrer |  | « Tape le code que tu as reçu, puis choisis ton code secret à quatre chiffres. Personne d'autre ne doit le connaître. » | `components/auth/ActivationScreen.tsx:51` | 0 |
| `AUTH_002` | `:234` | a_migrer |  | « Compte activé ! Tu peux maintenant te connecter avec ton code. » | `components/auth/ActivationScreen.tsx:71` | 0 |
| `AUTH_003` | `:235` | a_migrer |  | « Effacé. » | `components/auth/LoginPassword.tsx:1029` | 0 |
| `AUTH_004` | `:236` | a_migrer |  | « Voilà, tu peux parler maintenant. Touche le micro et dis ton numéro. » | `components/auth/LoginPassword.tsx:1334` | 0 |
| `AUTH_005` | `:237` | a_migrer |  | « Maintenant, des images à la place des chiffres. » | `components/auth/LoginPassword.tsx:141` | 0 |
| `AUTH_006` | `:238` | a_migrer |  | « Retour aux chiffres. » | `components/auth/LoginPassword.tsx:141` | 0 |
| `AUTH_007` ⚠ | `:239` | a_migrer |  | « C'est fait. Je m'adapte à toi. » | `components/auth/LoginPassword.tsx:358` | 0 |
| `AUTH_008` | `:240` | a_migrer |  | « Pour que je puisse t'écouter, je vérifie ma voix. Touche le bouton, ou tape ton numéro. » | `components/auth/LoginPassword.tsx:660` | 0 |
| `AUTH_009` ⚠ | `:241` | a_migrer |  | « {prenom}, veux-tu que Tantie Nanti Lou te reconnaisse la prochaine fois ? Ce sera plus rapide. » | `components/auth/PropositionReconnaissance.tsx:45` | 0 |
| `AUTH_010` | `:242` | a_migrer |  | « C'est fait ! La prochaine fois, ton téléphone te reconnaîtra. » | `components/auth/PropositionReconnaissance.tsx:60` | 0 |
| `AUTH_011` ⚠ | `:243` | a_migrer |  | « Ta session a expiré. Reconnecte-toi, puis on réessaiera. » | `components/auth/PropositionReconnaissance.tsx:66` | 0 |
| `AUTH_012` | `:244` | a_migrer |  | « Ça n'a pas marché ici. Tu pourras réessayer plus tard dans les réglages. » | `components/auth/PropositionReconnaissance.tsx:71 ; components/auth/PropositionReconnaissance.tsx:75` | 0 |
| `AUTH_013` | `:245` | a_migrer |  | « retour » | `components/auth/Welcome.tsx:25` | 0 |
| `AUTH_014` | `:246` | a_migrer |  | « accueil » | `components/auth/Welcome.tsx:25` | 0 |
| `AUTH_015` | `:337` | a_migrer |  | « Code correct. Action confirmée » | `components/marchand/PinConfirmModal.tsx:73` | 0 |
| `AUTH_016` | `:338` | a_migrer |  | « Code incorrect. {attempts} tentative(s) restante(s) » | `components/marchand/PinConfirmModal.tsx:83` | 0 |
| `AUTH_017` | `:339` | a_migrer |  | « Version {version}, {build} » | `components/auth/LoginPassword.tsx:1575` | 0 |
| `AUTH_01` | `:482` | reference |  | « Bonjour ma fille. Moi, c'est Tantie Nanti Lou. Viens, je vais te montrer. » | `services/loginVoiceScript.ts (AUTH_01)` | 2 |
| `AUTH_02` | `:483` | reference |  | « Eh, ma fille ! Te voilà. On continue ? » | `services/loginVoiceScript.ts (AUTH_02)` | 1 |
| `AUTH_03` | `:484` | reference |  | « Chaque vente, tu la mets ici. Comme ça, tu n'oublies rien, et tes comptes sont là. » | `services/loginVoiceScript.ts (AUTH_03)` | 1 |
| `AUTH_04` | `:485` | reference |  | « Bon, pour commencer, appuie ici. » | `services/loginVoiceScript.ts (AUTH_04)` | 1 |
| `AUTH_05` | `:486` | reference |  | « Mets ton numéro de téléphone ici. » | `services/loginVoiceScript.ts (AUTH_05)` | 1 |
| `AUTH_06` | `:487` | reference |  | « Tu peux aussi me le dire. Appuie sur le micro d'abord. » | `services/loginVoiceScript.ts (AUTH_06)` | 1 |
| `AUTH_07` | `:488` | reference |  | « Dis les chiffres doucement doucement, un par un. » | `services/loginVoiceScript.ts (AUTH_07)` | 1 |
| `AUTH_08` | `:489` | reference |  | « Tu veux réécouter ? Appuie ici. » | `services/loginVoiceScript.ts (AUTH_08)` | 1 |
| `AUTH_09` | `:490` | reference |  | « C'est bien ton numéro ? Appuie ici pour continuer. » | `services/loginVoiceScript.ts (AUTH_09)` | 1 |
| `AUTH_10` | `:491` | reference |  | « Tu t'es trompée ? C'est rien, y'a pas problème. Appuie ici pour effacer. » | `services/loginVoiceScript.ts (AUTH_10)` | 1 |
| `AUTH_11` | `:492` | reference |  | « Il manque encore des chiffres dedans. Continue. » | `services/loginVoiceScript.ts (AUTH_11)` | 2 |
| `AUTH_12` | `:493` | reference |  | « Regarde bien, y'a un chiffre qui n'est pas bon dedans. Si tu veux, tape ton numéro directement ici. » | `services/loginVoiceScript.ts (AUTH_12)` | 2 |
| `AUTH_13` | `:494` | reference |  | « Je n'ai pas bien entendu. Redis-le, doucement. » | `services/loginVoiceScript.ts (AUTH_13)` | 1 |
| `AUTH_14` | `:495` | reference |  | « Si tu veux, tape ton numéro ici. » | `services/loginVoiceScript.ts (AUTH_14)` | 1 |
| `AUTH_15` | `:496` | reference |  | « Pour que je t'entende, appuie sur Autoriser. » | `services/loginVoiceScript.ts (AUTH_15)` | 1 |
| `AUTH_16` | `:497` | reference |  | « Le micro ne prend pas là. Faut taper ton numéro ici. » | `services/loginVoiceScript.ts (AUTH_16)` | 2 |
| `AUTH_17` | `:498` | reference |  | « C'est bon maintenant. Appuie sur le micro et puis parle. » | `services/loginVoiceScript.ts (AUTH_17)` | 2 |
| `AUTH_18` | `:499` | reference |  | « Attends un peu, je regarde. » | `services/loginVoiceScript.ts (AUTH_18)` | 1 |
| `AUTH_19` | `:500` | reference |  | « Bon, mets les quatre chiffres de ton code secret. » | `services/loginVoiceScript.ts (AUTH_19)` | 2 |
| `AUTH_20` | `:501` | reference |  | « Appuie sur tes quatre images, une par une, dans l'ordre. » | `services/loginVoiceScript.ts (AUTH_20)` | 1 |
| `AUTH_21` | `:502` | reference |  | « Voilà les photos qui sont sorties à la place des chiffres. Ton code n'a pas changé. » | `services/loginVoiceScript.ts (AUTH_21)` | 2 |
| `AUTH_22` | `:503` | reference |  | « Voilà les chiffres maintenant. Mets ton code comme d'habitude. » | `services/loginVoiceScript.ts (AUTH_22)` | 2 |
| `AUTH_23` | `:504` | reference |  | « Ton code, c'est pour toi seule. Faut pas le dire à quelqu'un. » | `services/loginVoiceScript.ts (AUTH_23)` | 1 |
| `AUTH_24` | `:505` | reference |  | « C'est effacé net. » | `services/loginVoiceScript.ts (AUTH_24)` | 2 |
| `AUTH_25` | `:506` | reference |  | « Appuie ici. Ton téléphone va te dire quoi faire. » | `services/loginVoiceScript.ts (AUTH_25)` | 1 |
| `AUTH_26` | `:507` | reference |  | « Ça n'a pas pris. On passe par ton code directement. » | `services/loginVoiceScript.ts (AUTH_26)` | 2 |
| `AUTH_27` | `:508` | reference |  | « Ce n'est pas toi ? Y'a pas problème, appuie ici pour mettre ton numéro. » | `services/loginVoiceScript.ts (AUTH_27)` | 1 |
| `AUTH_28` | `:509` | reference |  | « Le numéro ou le code n'est pas bon. Regarde bien pour reprendre. » | `services/loginVoiceScript.ts (AUTH_28)` | 2 |
| `AUTH_29` | `:510` | reference |  | « Attention, il te reste un seul essai. Prends ton temps. » | `services/loginVoiceScript.ts (AUTH_29)` | 2 |
| `AUTH_30` | `:511` | reference |  | « Tu as trop forcé. Patiente un peu d'abord avant de réessayer. » | `services/loginVoiceScript.ts (AUTH_30)` | 3 |
| `AUTH_31` | `:512` | reference |  | « Ma fille, là c'est bloqué. Faut voir ton agent pour t'aider. » | `services/loginVoiceScript.ts (AUTH_31)` | 1 |
| `AUTH_32` | `:513` | reference |  | « Eh, ça ne passe pas là. Réessaie dans un petit moment. » | `services/loginVoiceScript.ts (AUTH_32)` | 1 |
| `AUTH_33` | `:514` | reference |  | « Ça pèse un peu. Patiente, je suis en train de relancer. » | `services/loginVoiceScript.ts (AUTH_33)` | 2 |
| `AUTH_34` | `:515` | reference |  | « Maintenant, choisis ton propre code. C'est pour toi seule. » | `services/loginVoiceScript.ts (AUTH_34)` | 1 |
| `AUTH_35` | `:516` | reference |  | « D'accord, c'est calé comme ça. » | `services/loginVoiceScript.ts (AUTH_35)` | 2 |
| `AUTH_36` | `:517` | reference |  | « D'accord, on continue comme d'habitude. » | `services/loginVoiceScript.ts (AUTH_36)` | 2 |
| `AUTH_37` | `:518` | reference |  | « Voilà, ma fille. On y va ! » | `services/loginVoiceScript.ts (AUTH_37)` | 1 |
| `NUM_0` | `:539` | reference |  | « Zéro » | `services/loginVoiceScript.ts (NUM_0)` | 1 |
| `NUM_1` | `:540` | reference |  | « Un » | `services/loginVoiceScript.ts (NUM_1)` | 1 |
| `NUM_2` | `:541` | reference |  | « Deux » | `services/loginVoiceScript.ts (NUM_2)` | 1 |
| `NUM_3` | `:542` | reference |  | « Trois » | `services/loginVoiceScript.ts (NUM_3)` | 2 |
| `NUM_4` | `:543` | reference |  | « Quatre » | `services/loginVoiceScript.ts (NUM_4)` | 1 |
| `NUM_5` | `:544` | reference |  | « Cinq » | `services/loginVoiceScript.ts (NUM_5)` | 1 |
| `NUM_6` | `:545` | reference |  | « Six » | `services/loginVoiceScript.ts (NUM_6)` | 1 |
| `NUM_7` | `:546` | reference |  | « Sept » | `services/loginVoiceScript.ts (NUM_7)` | 1 |
| `NUM_8` | `:547` | reference |  | « Huit » | `services/loginVoiceScript.ts (NUM_8)` | 1 |
| `NUM_9` | `:548` | reference |  | « Neuf » | `services/loginVoiceScript.ts (NUM_9)` | 1 |
| `INTRO_ACCUEIL` | `:549` | reference |  | « Bonjour ! Moi, c'est Tantie Nanti Lou. Je serai avec toi pour vendre, compter ton argent et faire grandir ton commerce. Beaucoup de commerçantes travaillent déjà avec moi. Maintenant, c'est ton tour. On commence ? » | `services/onboardingVoix.ts (clé accueil)` | 0 |
| `INTRO_BRAVO` | `:550` | reference |  | « Bravo ! Nous sommes prêtes. Ouvrons ta boutique. » | `services/onboardingVoix.ts (clé bravo)` | 0 |
| `INTRO_HISTOIRE1` | `:551` | reference |  | « Je serai avec toi chaque jour dans ton commerce. On est ensemble. » | `services/onboardingVoix.ts (clé histoire1)` | 0 |
| `INTRO_HISTOIRE2` | `:552` | reference |  | « Tu vends. J'enregistre. Je compte. Tu sais toujours combien tu gagnes. » | `services/onboardingVoix.ts (clé histoire2)` | 0 |
| `INTRO_HISTOIRE3` | `:553` | reference |  | « Tu peux me parler, ou utiliser le clavier. C'est toi qui décides. » | `services/onboardingVoix.ts (clé histoire3)` | 0 |
| `INTRO_HISTOIRE4` | `:554` | reference |  | « Tout est prêt. Ouvrons ta boutique. » | `services/onboardingVoix.ts (clé histoire4)` | 0 |
| `INTRO_MODE` | `:555` | reference |  | « Comment préfères-tu travailler avec moi ? Le plus simple : laisse-moi choisir, je m'adapte à toi. Sinon : je sais lire et écrire, ou je lis un peu, ou je préfère parler. Il n'y a pas de mauvais choix. » | `services/onboardingVoix.ts (clé mode)` | 0 |
| `INTRO_RETOUR` | `:556` | reference |  | « Re-bonjour ! On y va. » | `services/onboardingVoix.ts (clé retour)` | 0 |
| `INTRO_VOIXINSTALL` | `:557` | reference |  | « Pour que je puisse t'écouter et te parler partout, même sans réseau : ta voix est déjà dans l'application, je la vérifie, c'est tout. Rien à télécharger. » | `services/onboardingVoix.ts (clé voixInstall)` | 0 |

## Domaine `backoffice` — 2 phrase(s)

| Clé | catalog.ts | Statut | € | Texte fr-ci (dit) | Source déclarée | Usages |
|---|---|---|---|---|---|---|
| `BO_001` | `:247` | a_migrer |  | « Bonjour {prenom}. Vous êtes connecté en tant que {role}. Il y a {nouveauxCount} ticket{s} en attente. Comment puis-je vous aider ? » | `components/backoffice/BOLayout.tsx:1058` | 0 |
| `BO_002` ⚠ | `:248` | a_migrer |  | « Vous avez {unreadCount} notifications non lues. {édiate} » | `components/backoffice/BONotifications.tsx:251` | 0 |

## Domaine `caisse` — 65 phrase(s)

| Clé | catalog.ts | Statut | € | Texte fr-ci (dit) | Source déclarée | Usages |
|---|---|---|---|---|---|---|
| `TATA_RELECTURE_MONNAIE` | `:47` | migre | € | « Elle doit {total} {devise}. Elle t'a donné {recu}. Tu rends {monnaie}. Je valide ? » | `services/machineEncaissement.ts:112` | 1 |
| `TATA_RELECTURE_COMPTE_JUSTE` | `:48` | migre | € | « Elle doit {total} {devise}. Elle t'a donné {recu}. Compte juste. Je valide ? » | `services/machineEncaissement.ts:110` | 1 |
| `TATA_PANIER_VIDE_DIS_VENTE` | `:49` | migre | € | « Ton panier est vide. Dis-moi d'abord ce que tu vends. » | `services/machineEncaissement.ts:115` | 1 |
| `TATA_TOUCHE_LES_BILLETS` | `:50` | migre | € | « Elle doit {total} {devise}. Touche les billets qu'elle te donne. » | `services/machineEncaissement.ts:117` | 1 |
| `TATA_NE_VALIDE_PAS` | `:51` | migre | € | « D'accord, je ne valide pas. » | `services/machineEncaissement.ts:187` | 1 |
| `TATA_PANIER_VIDE` | `:52` | migre | € | « Ton panier est vide. » | `services/machineEncaissement.ts:193` | 1 |
| `TATA_DOIT_DONNE_RENDS` | `:53` | migre | € | « Elle doit {total} {devise}. Elle t'a donné {recu}. Tu rends {monnaie}. » | `services/machineEncaissement.ts:195` | 1 |
| `TATA_DOIT` | `:54` | migre | € | « Elle doit {total} {devise}. » | `services/machineEncaissement.ts:196` | 1 |
| `TATA_COMPTE_A_CHANGE` | `:55` | migre | € | « Le compte a changé. {suite} » | `services/machineEncaissement.ts:226` | 2 |
| `TATA_MANQUE` | `:56` | migre | € | « Il manque {montant} {devise}. » | `services/relectureSpontanee.ts:80` | 4 |
| `TATA_COMPTE_JUSTE` | `:57` | migre | € | « Compte juste. » | `services/relectureSpontanee.ts:81` | 1 |
| `TATA_DONNE_RENDS` | `:58` | migre | € | « Elle t'a donné {recu} {devise}. Tu rends {monnaie} {devise}. » | `services/relectureSpontanee.ts:82` | 1 |
| `TATA_LIGNE_AJOUTEE` | `:59` | migre | € | « {quantite}, {montantLigne} {devise}. Total : {totalPanier} {devise}. » | `services/relectureSpontanee.ts:122` | 1 |
| `TATA_MONTANT_DEVISE` | `:103` | migre | € | « {montant} {devise} » | `utils/fcfa.ts:93 ; components/marchand/SaisieGuidee.tsx:44 ; components/marchand/ConfirmationLigne.tsx:40` | 4 |
| `CAISSE_ETAL_GARDE` | `:110` | migre |  | « Derniers produits gardés sur ce téléphone. » | `components/marchand/POSCaisse.tsx` | 1 |
| `TATA_QUEL_PRIX` | `:124` | migre | € | « {produit}. Quel est ton prix ? » | `components/marchand/POSCaisse.tsx:149` | 1 |
| `TATA_INDIQUE_PRIX` | `:125` | migre | € | « Il faut indiquer ton prix » | `components/marchand/POSCaisse.tsx:168` | 1 |
| `TATA_ARTICLE_IMPOSSIBLE` | `:126` | migre | € | « Impossible d'ajouter cet article » | `components/marchand/POSCaisse.tsx:180` | 1 |
| `TATA_ARTICLE_AJOUTE_CATALOGUE` | `:127` | migre | € | « {produit} ajouté à ton catalogue et au panier » | `components/marchand/POSCaisse.tsx:191` | 1 |
| `TATA_MONTANT_TOTAL_INVALIDE` | `:128` | migre | € | « Montant total invalide » | `components/marchand/POSCaisse.tsx:256` | 1 |
| `TATA_MONTANT_RECU_INSUFFISANT` | `:129` | migre | € | « Montant reçu insuffisant » | `components/marchand/POSCaisse.tsx:260` | 1 |
| `TATA_CHOISIS_OPERATEUR` | `:130` | migre | € | « Choisis l'opérateur » | `components/marchand/POSCaisse.tsx:261` | 1 |
| `TATA_VENTE_ENREGISTREE` | `:131` | migre | € | « Vente enregistrée. {total} {devise} » | `components/marchand/POSCaisse.tsx:320` | 1 |
| `TATA_VENTE_ENREGISTREE_RUPTURE` | `:132` | migre | € | « Vente enregistrée. {total} {devise}. {avertissement} » | `components/marchand/POSCaisse.tsx:320` | 1 |
| `TATA_VENTE_GARDEE_TELEPHONE` | `:136` | migre | € | « Vente gardée sur le téléphone. {total} {devise}. Elle n'est pas encore envoyée. Je l'envoie dès que le réseau revient. » | `components/marchand/POSCaisse.tsx:370` | 1 |
| `TATA_VENTE_GARDEE_TELEPHONE_RUPTURE` | `:137` | migre | € | « Vente gardée sur le téléphone. {total} {devise}. Elle n'est pas encore envoyée. Je l'envoie dès que le réseau revient. {avertissement} » | `components/marchand/POSCaisse.tsx:369` | 1 |
| `TATA_VENTE_PARTIE` | `:147` | migre | € | « Ta vente gardée sur le téléphone est partie. Le serveur l'a reçue. » | `services/annonceVentesParties.ts` | 2 |
| `TATA_VENTES_PARTIES` | `:148` | migre | € | « {nombre} ventes gardées sur le téléphone sont parties. Le serveur les a reçues. » | `services/annonceVentesParties.ts` | 2 |
| `TATA_VENTE_PARTIE_RESTE` | `:149` | migre | € | « Ta vente gardée sur le téléphone est partie. Il en reste {reste} à envoyer. » | `services/annonceVentesParties.ts` | 2 |
| `TATA_VENTES_PARTIES_RESTE` | `:150` | migre | € | « {nombre} ventes gardées sur le téléphone sont parties. Il en reste {reste} à envoyer. » | `services/annonceVentesParties.ts` | 2 |
| `TATA_VENTE_ECHEC` | `:151` | migre | € | « La vente n'a pas pu être enregistrée. Réessaie. » | `components/marchand/POSCaisse.tsx:324` | 2 |
| `TATA_VENTES_PAS_LUES` | `:158` | migre | € | « Je n'ai pas pu lire tes ventes. Ce n'est pas zéro : je n'ai pas pu demander au serveur. Ton argent est là, réessaie. » | `services/etatVentesPassees.ts` | 3 |
| `TATA_VENTES_LECTURE_EN_COURS` | `:159` | migre | € | « Je vais chercher tes ventes… » | `services/etatVentesPassees.ts` | 2 |
| `TATA_VENTES_AUCUNE` | `:160` | migre | € | « Le serveur a répondu : tu n'as encore rien vendu. » | `services/etatVentesPassees.ts` | 2 |
| `TATA_VENTES_REESSAYER` | `:161` | migre | € | « Réessayer de lire mes ventes » | `components/marchand/VentesPassees.tsx` | 2 |
| `RESUME_BILAN_GAGNE` | `:184` | migre | € | « {periode}, tu as gagné {ventes} {devise}. Tu as dépensé {depenses} {devise}. » | `components/marchand/ResumeCaisse.tsx` | 1 |
| `RESUME_BILAN_SANS_DEPENSE` | `:185` | migre | € | « {periode}, tu as gagné {ventes} {devise}. Tu n'as rien dépensé. Bravo ! » | `components/marchand/ResumeCaisse.tsx` | 1 |
| `RESUME_BILAN_PERTE` | `:186` | migre | € | « Attention ! {periode}, tu as plus dépensé que gagné. Fais attention à tes dépenses. » | `components/marchand/ResumeCaisse.tsx` | 1 |
| `RESUME_DETAIL` | `:187` | migre | € | « Résumé {complement}. Ventes : {ventes} {devise}. Dépenses : {depenses} {devise}. Solde actuel : {solde} {devise}. Heure de pointe : {heure}. » | `components/marchand/ResumeCaisse.tsx` | 1 |
| `RESUME_DETAIL_PERTE` | `:188` | migre | € | « Attention. Tu as plus dépensé que gagné {complement}. Ventes : {ventes} {devise}. Dépenses : {depenses} {devise}. Solde actuel : {solde} {devise}. » | `components/marchand/ResumeCaisse.tsx` | 1 |
| `ACCUEIL_JOURNEE_ROUVERTE` | `:216` | migre |  | « Ta journée est rouverte. Tu peux vendre. » | `components/marchand/MarchandAccueilVoice.tsx` | 1 |
| `ACCUEIL_CAISSE_CONNUE` | `:218` | migre | € | « Ta caisse aujourd'hui : {caisse}. » | `services/etatCaisseAccueil.ts` | 1 |
| `ACCUEIL_CAISSE_PARTIELLE` | `:219` | migre | € | « Ta caisse aujourd'hui : au moins {caisse}. Ce n'est pas tout : des ventes attendent encore sur ton téléphone. » | `services/etatCaisseAccueil.ts` | 1 |
| `ACCUEIL_CAISSE_ILLISIBLE` | `:220` | migre | € | « Je n'ai pas pu lire ta caisse. Ce n'est pas zéro : je n'ai pas pu demander. Ton argent est là. » | `services/etatCaisseAccueil.ts` | 1 |
| `TATA_VENTE_EN_ATTENTE_ENVOI` | `:221` | migre | € | « Tu as une vente gardée sur le téléphone. Elle n'est pas encore envoyée, elle n'est pas perdue. » | `services/etatVentesPassees.ts` | 1 |
| `TATA_VENTES_EN_ATTENTE_ENVOI` | `:222` | migre | € | « Tu as {nombre} ventes gardées sur le téléphone. Elles ne sont pas encore envoyées, elles ne sont pas perdues. » | `services/etatVentesPassees.ts` | 1 |
| `TATA_TOTAL_VENTE` | `:223` | migre | € | « Tu as vendu {total} {devise}, sur une vente. » | `services/etatVentesPassees.ts` | 1 |
| `TATA_TOTAL_VENTES` | `:224` | migre | € | « Tu as vendu {total} {devise}, sur {nombre} ventes. » | `services/etatVentesPassees.ts` | 1 |
| `TATA_QUANTITE_LIGNE` | `:226` | migre | € | « {produit} : {quantite} » | `components/marchand/POSCaisse.tsx:543` | 1 |
| `TATA_PRIX_UNITE_LIGNE` | `:227` | migre | € | « {produit} : {prix} {devise} l'unité » | `components/marchand/POSCaisse.tsx:576` | 1 |
| `TATA_TOTAL` | `:228` | migre | € | « Total : {total} {devise} » | `components/marchand/POSCaisse.tsx:609` | 1 |
| `TATA_MONNAIE_A_RENDRE` | `:229` | migre | € | « Monnaie à rendre : {monnaie} {devise} » | `components/marchand/POSCaisse.tsx:758` | 1 |
| `TATA_AJOUTE_PRODUITS_D_ABORD` | `:230` | migre | € | « Ajoute d'abord des produits au panier. » | `components/marchand/POSCaisse.tsx:846` | 1 |
| `STOCK_046` | `:687` | a_migrer |  | « Je n'ai pas entendu de produit. Dis-moi ce que tu vends. » | `components/marchand/BoutonDireProduit.tsx` | 0 |
| `STOCK_047` | `:700` | migre |  | « Quel produit tu veux ajouter ? » | `components/marchand/AjoutProduitGuide.tsx` | 1 |
| `STOCK_048` | `:701` | migre |  | « {nom}, tu le vends comment ? » | `components/marchand/AjoutProduitGuide.tsx` | 1 |
| `STOCK_054` | `:702` | migre |  | « Tu en as combien ? Si tu ne sais pas, passe. » | `components/marchand/AjoutProduitGuide.tsx` | 1 |
| `STOCK_049` | `:703` | migre | € | « Le {unite}, à combien ? » | `components/marchand/AjoutProduitGuide.tsx` | 1 |
| `STOCK_050` | `:715` | migre |  | « Je n'ai pas son nom. Dis-le, ou tape-le. » | `services/premierProduit.ts` | 1 |
| `STOCK_051` | `:716` | migre |  | « C'est trop court pour un nom. Mets au moins deux lettres. » | `services/premierProduit.ts` | 1 |
| `STOCK_052` | `:717` | migre |  | « Choisis d'abord comment tu le vends. » | `services/premierProduit.ts` | 1 |
| `STOCK_053` | `:718` | migre | € | « Il manque le prix. Tape-le. » | `services/premierProduit.ts` | 1 |
| `OBJECTIF_FIXE` | `:730` | migre | € | « Super ! Ton objectif du jour est fixé à {montant} {devise}. Bonne chance ma chère ! » | `contexts/ObjectifContext.tsx` | 1 |
| `OBJECTIF_80` | `:731` | migre | € | « Bravo ! Tu es à 80% de ton objectif. Plus que {montant} {devise}, allez courage ! » | `contexts/ObjectifContext.tsx` | 1 |
| `DEPENSE_DU_JOUR` | `:732` | migre | € | « Aujourd'hui tu as dépensé {montant} {devise}. » | `components/marchand/MarchandDepenses.tsx` | 1 |

## Domaine `contexte` — 1 phrase(s)

| Clé | catalog.ts | Statut | € | Texte fr-ci (dit) | Source déclarée | Usages |
|---|---|---|---|---|---|---|
| `CONTEXTE_001` | `:409` | a_migrer | € | « Ta journée est déjà ouverte avec {fondRetenu} francs. Pour changer ce montant, touche Modifier le fond. » | `contexts/AppContext.tsx:892 ; contexts/AppContext.tsx:893` | 0 |

## Domaine `cooperative` — 14 phrase(s)

| Clé | catalog.ts | Statut | € | Texte fr-ci (dit) | Source déclarée | Usages |
|---|---|---|---|---|---|---|
| `COOP_001` | `:249` | a_migrer | € | « C'est fait ! La commande est clôturée et payée. » | `components/cooperative/Commandes.tsx:1364` | 0 |
| `COOP_002` | `:250` | a_migrer |  | « La distribution n'a pas marché. Réessaie, s'il te plaît. » | `components/cooperative/Commandes.tsx:296 ; components/cooperative/Stock.tsx:229` | 0 |
| `COOP_003` | `:251` | a_migrer |  | « Besoin mis à jour. » | `components/cooperative/Commandes.tsx:300` | 0 |
| `COOP_004` | `:252` | a_migrer |  | « Commande groupée pour {newProduit} créée. » | `components/cooperative/Commandes.tsx:358` | 0 |
| `COOP_005` | `:253` | a_migrer |  | « Statut mis à jour : {label} » | `components/cooperative/Commandes.tsx:383` | 0 |
| `COOP_006` | `:254` | a_migrer | € | « Trésorerie actuelle : {soldeActuel} francs. » | `components/cooperative/FinancesCooperative.tsx:249` | 0 |
| `COOP_007` | `:255` | a_migrer |  | « {produit} est maintenant visible par tous les marchands. » | `components/cooperative/MarcheHub.tsx:1634 ; components/cooperative/MarcheHub.tsx:1692` | 0 |
| `COOP_008` | `:256` | a_migrer |  | « Commande de {produit} envoyée. » | `components/cooperative/MarcheHub.tsx:936` | 0 |
| `COOP_009` | `:257` | a_migrer |  | « {prenom} {nom} a été suspendu. Une notification a été envoyée. » | `components/cooperative/Membres.tsx:418` | 0 |
| `COOP_010` | `:258` | a_migrer |  | « {prenom} {nom} a été réactivé » | `components/cooperative/Membres.tsx:449` | 0 |
| `COOP_011` | `:259` | a_migrer |  | « {prenom} a été exclu définitivement de la coopérative » | `components/cooperative/Membres.tsx:484` | 0 |
| `COOP_012` | `:260` | a_migrer |  | « {prenom} {nom} a rejoint la coopérative » | `components/cooperative/Membres.tsx:523` | 0 |
| `COOP_013` | `:261` | a_migrer |  | « La demande de {prenom} {nom} a été refusée » | `components/cooperative/Membres.tsx:537` | 0 |
| `COOP_014` | `:264` | a_migrer | € | « Transaction {sortie} de {montant} francs CFA enregistrée » | `components/cooperative/TresorerieCooperative.tsx:125` | 0 |

## Domaine `credit` — 6 phrase(s)

| Clé | catalog.ts | Statut | € | Texte fr-ci (dit) | Source déclarée | Usages |
|---|---|---|---|---|---|---|
| `TATA_VENTE_CREDIT_ENREGISTREE` | `:225` | migre | € | « Vente à crédit enregistrée. {total} {devise} » | `components/marchand/POSCaisse.tsx:470` | 1 |
| `CREDIT_001` | `:265` | a_migrer | € | « Le montant de l'acompte est invalide » | `components/marchand/CreditModal.tsx:180` | 0 |
| `CREDIT_002` | `:266` | a_migrer | € | « L'acompte ne peut pas être égal ou supérieur au total. Enregistre plutôt une vente. » | `components/marchand/CreditModal.tsx:184` | 0 |
| `CREDIT_003` | `:267` | a_migrer | € | « Crédit de {total} francs noté pour {clientNom}. Elle rembourse le {echeanceLong} » | `components/marchand/CreditModal.tsx:202` | 0 |
| `CREDIT_004` | `:268` | a_migrer |  | « Dis-moi d'abord le nom du client. » | `components/marchand/CreditModal.tsx:336` | 0 |
| `CREDIT_005` | `:269` | a_migrer | € | « L'acompte ne peut pas dépasser le total. Enregistre plutôt une vente. » | `components/marchand/CreditModal.tsx:442` | 0 |

## Domaine `depense` — 5 phrase(s)

| Clé | catalog.ts | Statut | € | Texte fr-ci (dit) | Source déclarée | Usages |
|---|---|---|---|---|---|---|
| `TATA_CONFIRME_DEPENSE` | `:86` | migre | € | « Dépense de {montant} {devise}{produit}, c'est bien ça ? » | `voice-offline/localIntent.ts:140` | 1 |
| `TATA_PART_POUR_PRODUIT` | `:87` | migre |  | «  pour {produit} » | `voice-offline/localIntent.ts:140` | 1 |
| `TATA_DEPENSE_MONTANT_INCOMPRIS` | `:118` | migre | € | « Je n'ai pas compris combien tu as dépensé. Redis-moi le montant. » | `components/marchand/MicroVenteCaisse.tsx:259,272` | 2 |
| `DEPENSE_001` | `:270` | a_migrer | € | « Attention, le montant est élevé. Vérifie bien. » | `components/marchand/DepenseForm.tsx:116` | 0 |
| `DEPENSE_003` | `:320` | a_migrer |  | « Tu n'as pas encore de dépense aujourd'hui. » | `components/marchand/MarchandDepenses.tsx:206 ; components/marchand/MarchandDepenses.tsx:211` | 0 |

## Domaine `guidage` — 2 phrase(s)

| Clé | catalog.ts | Statut | € | Texte fr-ci (dit) | Source déclarée | Usages |
|---|---|---|---|---|---|---|
| `GUIDAGE_001` | `:685` | a_migrer |  | « J'ai remarqué que tu préfères me parler. Veux-tu que Julaba s'adapte ? » | `utils/accessMode.ts:100` | 0 |
| `GUIDAGE_002` | `:686` | a_migrer |  | « J'ai remarqué que tu préfères le clavier. Veux-tu que Julaba s'adapte ? » | `utils/accessMode.ts:97` | 0 |

## Domaine `marchand_autre` — 42 phrase(s)

| Clé | catalog.ts | Statut | € | Texte fr-ci (dit) | Source déclarée | Usages |
|---|---|---|---|---|---|---|
| `ACCUEIL_COMPTOIR` | `:217` | migre |  | « Ton comptoir est prêt. On vend ensemble aujourd'hui. » | `components/marchand/MarchandAccueilVoice.tsx` | 1 |
| `MARCHAND_001` | `:271` | a_migrer | € | « {pointsGagnes} points ajoutés. Total {points} points. » | `components/marchand/Fidelite.tsx:62` | 0 |
| `MARCHAND_002` | `:272` | a_migrer | € | « Récompense appliquée : {remise} francs de remise. » | `components/marchand/Fidelite.tsx:74` | 0 |
| `MARCHAND_003` ⚠ | `:299` | a_migrer |  | « Mode soleil : tout est plus grand. » | `components/marchand/MarchandAccueilVoice.tsx:42` | 0 |
| `MARCHAND_004` | `:300` | a_migrer |  | « Mode normal. » | `components/marchand/MarchandAccueilVoice.tsx:42` | 0 |
| `MARCHAND_005` | `:301` | a_migrer | € | « Ta caisse : {FR} francs » | `components/marchand/MarchandAccueilVoice.tsx:65` | 0 |
| `ACCUEIL_01` | `:314` | reference |  | « Ton comptoir est prêt. On vend ensemble aujourd'hui. » | `services/accueilMarchandVoix.ts (comptoir)` | 0 |
| `ACCUEIL_02` | `:315` | reference |  | « Le montant de ta caisse est affiché ici. Touche l'œil pour le cacher. » | `services/accueilMarchandVoix.ts (caisse)` | 0 |
| `ACCUEIL_03` | `:316` | reference |  | « Te voilà chez toi. Le grand bouton vert, c'est pour vendre. » | `components/marchand/MarchandAccueilVoice.tsx (arrivée)` | 0 |
| `ACCUEIL_04` | `:317` | reference |  | « Mode soleil : tout est plus grand. » | `components/marchand/MarchandAccueilVoice.tsx (bouton soleil)` | 0 |
| `ACCUEIL_05` | `:318` | reference |  | « Mode normal. » | `components/marchand/MarchandAccueilVoice.tsx (bouton soleil)` | 0 |
| `ACCUEIL_06` | `:319` | reference |  | « Tes montants sont cachés. Touche l'œil pour les revoir. » | `components/marchand/MarchandAccueilVoice.tsx (haut-parleur, montants masqués)` | 0 |
| `MARCHAND_006` | `:321` | a_migrer | € | « {montant} Francs CFA ajoutés. Total : {newValue} Francs CFA » | `components/marchand/MarchandModals.tsx:330 ; components/marchand/MarchandModals.tsx:338 ; components/marchand/MarchandModals.tsx:457 ; +1` | 0 |
| `MARCHAND_007` | `:322` | a_migrer | € | « Ta journée est ouverte avec {montant} Francs CFA » | `components/marchand/MarchandModals.tsx:369` | 0 |
| `MARCHAND_008` | `:323` | a_migrer | € | « Ton fond de caisse est maintenant de {montant} Francs CFA » | `components/marchand/MarchandModals.tsx:474` | 0 |
| `MARCHAND_009` | `:324` | a_migrer | € | « Compte l'argent de ta boîte, puis entre le montant que tu as trouvé. » | `components/marchand/MarchandModals.tsx:567` | 0 |
| `MARCHAND_010` | `:325` | a_migrer | € | « Contre-offre acceptée : {prixContreOffre} FCFA/{unite} » | `components/marchand/MesCommandes.tsx:214` | 0 |
| `MARCHAND_029` | `:326` | a_migrer |  | « Contre-offre acceptée. » | `components/marchand/MesCommandes.tsx:254` | 0 |
| `MARCHAND_HORS_LIGNE_ACTION` | `:334` | migre | € | « Tu n'as pas de réseau. Je n'ai rien envoyé. Recommence quand le réseau revient. » | `components/marchand/MesCommandes.tsx` | 1 |
| `MARCHAND_ENVOI_TOMBE_ACTION` | `:335` | migre | € | « Ça n'est pas parti, le réseau a coupé. Rien n'a changé. Recommence dans un moment. » | `components/marchand/MesCommandes.tsx` | 1 |
| `MARCHAND_011` | `:336` | a_migrer |  | « Erreur : {message} » | `components/marchand/MesCommandes.tsx:219 ; components/marchand/MesCommandes.tsx:233 ; components/producteur/CommandesProducteurPage.tsx:318 ; +9` | 0 |
| `MARCHAND_012` | `:340` | a_migrer |  | « Tu as reçu le pot de la tontine » | `components/marchand/TontineDetail.tsx:80` | 0 |
| `MARCHAND_013` | `:341` | a_migrer |  | « Cotisation enregistrée, le pot a été distribué » | `components/marchand/TontineDetail.tsx:80` | 0 |
| `MARCHAND_014` | `:342` | a_migrer |  | « Cotisation enregistrée » | `components/marchand/TontineDetail.tsx:83` | 0 |
| `MARCHAND_015` | `:343` | a_migrer |  | « Tontine créée. Chaque membre peut maintenant cotiser. » | `components/marchand/Tontines.tsx:135` | 0 |
| `MARCHAND_016` | `:344` | a_migrer |  | « Je n'ai pas pu annuler cette vente. » | `components/marchand/VentesPassees.tsx:100` | 0 |
| `MARCHAND_017` | `:345` | a_migrer | € | « {productName} : {montant} francs{texteMarge}, le {quand}. » | `components/marchand/VentesPassees.tsx:121` | 0 |
| `MARCHAND_018` ⚠ | `:346` | a_migrer | € | « Tu as vendu {totalVentes} francs en tout, sur {totalCount} vente{s}. » | `components/marchand/VentesPassees.tsx:372` | 0 |
| `MARCHAND_019` ⚠ | `:347` | a_migrer |  | « Tu n'as pas encore de vente. » | `components/marchand/VentesPassees.tsx:372 ; components/marchand/VentesPassees.tsx:378` | 0 |
| `MARCHAND_020` | `:348` | a_migrer | € | « Tu as vendu {totalVentes} francs, sur {totalCount} vente{s}. » | `components/marchand/VentesPassees.tsx:378` | 0 |
| `MARCHAND_021` | `:349` | a_migrer | € | « C'est bien payé ? Touche encore pour confirmer. » | `components/marchand/VentesPassees.tsx:683` | 0 |
| `MARCHAND_022` | `:350` | a_migrer |  | « Veux-tu vraiment annuler cette vente ? Le stock sera rendu. » | `components/marchand/VentesPassees.tsx:80` | 0 |
| `MARCHAND_023` | `:351` | a_migrer |  | « Vente annulée. Le stock a été rendu. » | `components/marchand/VentesPassees.tsx:97` | 0 |
| `MARCHAND_024` | `:410` | a_migrer |  | « Félicitations ! Tu as atteint 50% de ton objectif. Continue ma chère, tu es sur la bonne voie ! » | `contexts/ObjectifContext.tsx:73 ; contexts/ObjectifContext.tsx:73` | 0 |
| `MARCHAND_025` ⚠ | `:411` | a_migrer | € | « Bravo ! Tu es à 80% de ton objectif. Plus que {FR} FCFA, allez courage ! » | `contexts/ObjectifContext.tsx:77 ; contexts/ObjectifContext.tsx:77` | 0 |
| `MARCHAND_028` | `:412` | a_migrer |  | « Tes montants sont cachés. » | `components/marchand/MarchandDepenses.tsx:216` | 0 |
| `MARCHAND_026` | `:413` | a_migrer |  | « Incroyable ! Tu as atteint ton objectif du jour ! Tu es trop forte ma chère ! » | `contexts/ObjectifContext.tsx:81 ; contexts/ObjectifContext.tsx:81` | 0 |
| `MARCHAND_027` ⚠ | `:414` | a_migrer | € | « Super ! Ton objectif du jour est fixé à {montant} FCFA. Bonne chance ma chère ! » | `contexts/ObjectifContext.tsx:97 ; contexts/ObjectifContext.tsx:97` | 0 |
| `MARCHAND_030` | `:415` | a_migrer |  | « Ton compte a été anonymisé. Ton argent a été conservé. » | `pages/marchand/MesDonnees.tsx:192` | 0 |
| `MARCHAND_031` | `:416` | a_migrer |  | « Demande d'accès enregistrée. Tu recevras un récapitulatif de tes données par message. » | `pages/marchand/MesDonnees.tsx:438` | 0 |
| `MARCHAND_032` | `:417` | a_migrer |  | « Pour corriger une donnée, je t'emmène à ton profil. » | `pages/marchand/MesDonnees.tsx:441` | 0 |
| `MARCHAND_033` | `:418` | a_migrer |  | « Demande d'opposition enregistrée. Une personne du support te contactera. » | `pages/marchand/MesDonnees.tsx:446` | 0 |

## Domaine `marketplace` — 1 phrase(s)

| Clé | catalog.ts | Statut | € | Texte fr-ci (dit) | Source déclarée | Usages |
|---|---|---|---|---|---|---|
| `MARCHE_001` | `:352` | a_migrer | € | « {productName}, {quantity} kilogrammes à {price} francs CFA le kilo. Vendeur: {sellerName}, score {sellerScore} sur 100 » | `components/marketplace/Marketplace.tsx:71` | 0 |

## Domaine `moteur_vocal` — 177 phrase(s)

| Clé | catalog.ts | Statut | € | Texte fr-ci (dit) | Source déclarée | Usages |
|---|---|---|---|---|---|---|
| `REGLAGE_VOIX_ESSENTIEL` | `:332` | migre |  | « D'accord. Je dirai seulement l'argent et les comptes. » | `components/shared/UniversalParametres.tsx` | 1 |
| `REGLAGE_VOIX_COMPLET` | `:333` | migre |  | « D'accord. Je te dis tout. » | `components/shared/UniversalParametres.tsx` | 1 |
| `CORE_001` | `:419` | a_migrer |  | « Laisse-moi voir... » | `hooks/useVoiceCore.ts:147` | 0 |
| `CORE_002` | `:420` | a_migrer |  | « Je traite ça... » | `hooks/useVoiceCore.ts:148` | 0 |
| `CORE_003` | `:421` | a_migrer |  | « Attends un moment... » | `hooks/useVoiceCore.ts:149` | 0 |
| `CORE_004` | `:422` | a_migrer |  | « Un instant, j'enregistre... » | `hooks/useVoiceCore.ts:155` | 0 |
| `CORE_005` | `:423` | a_migrer |  | « Excuse-moi, je recommence... » | `hooks/useVoiceCore.ts:160` | 0 |
| `CORE_006` | `:424` | a_migrer |  | « Un instant, je réessaie... » | `hooks/useVoiceCore.ts:161` | 0 |
| `CORE_007` | `:425` | a_migrer |  | « Je réfléchis encore... » | `hooks/useVoiceCore.ts:162` | 0 |
| `CORE_008` | `:426` | a_migrer |  | « D'accord ! » | `hooks/useVoiceCore.ts:169` | 0 |
| `CORE_009` | `:427` | a_migrer |  | « Voilà ! » | `hooks/useVoiceCore.ts:172` | 0 |
| `CORE_010` | `:428` | a_migrer |  | « Ça marche ! » | `hooks/useVoiceCore.ts:173` | 0 |
| `CORE_011` | `:429` | a_migrer |  | « Top ! » | `hooks/useVoiceCore.ts:174` | 0 |
| `CORE_012` | `:430` | a_migrer |  | « Bravo, continue comme ça ! » | `hooks/useVoiceCore.ts:179` | 0 |
| `CORE_013` | `:431` | a_migrer |  | « Super, tu travailles bien ! » | `hooks/useVoiceCore.ts:180` | 0 |
| `CORE_014` | `:432` | a_migrer |  | « Excellent ! » | `hooks/useVoiceCore.ts:181` | 0 |
| `CORE_015` | `:433` | a_migrer |  | « Tu gères bien ! » | `hooks/useVoiceCore.ts:182` | 0 |
| `CORE_016` | `:434` | a_migrer |  | « C'est du bon travail ! » | `hooks/useVoiceCore.ts:183` | 0 |
| `CORE_017` ⚠ | `:435` | a_migrer |  | « Cette réponse est affichée. Son clip Tantie Nanti Lou n’est pas encore enregistré. » | `hooks/useVoiceCore.ts:349` | 0 |
| `CORE_018` | `:436` | a_migrer |  | « Le pack vocal {lang} n’est pas encore installé. Le texte reste disponible, sans utiliser Internet. » | `hooks/useVoiceCore.ts:350` | 0 |
| `CORE_019` | `:437` | a_migrer |  | « Analyse en cours... » | `hooks/useVoiceCore.ts:479` | 0 |
| `CORE_020` | `:438` | a_migrer |  | « Enregistrement impossible. » | `hooks/useVoiceCore.ts:644` | 0 |
| `CORE_021` | `:439` | a_migrer |  | « J'écoute... » | `hooks/useVoiceCore.ts:776` | 0 |
| `CORE_022` | `:440` | a_migrer |  | « Je prépare ta voix… » | `hooks/useVoiceCore.ts:813` | 0 |
| `CORE_023` | `:441` | a_migrer |  | « Je n'ai pas réussi à t'écouter, réessaie. » | `hooks/useVoiceCore.ts:864` | 0 |
| `CORE_024` | `:442` | a_migrer |  | « Je n'ai pas réussi, réessaie. » | `hooks/useVoiceCore.ts:901 ; hooks/useVoiceCore.ts:901` | 0 |
| `CORE_025` | `:443` | a_migrer |  | « Micro non accessible dans cette application. Ouvre Jùlaba dans Safari ou Chrome pour utiliser la voix. » | `hooks/useVoiceCore.ts:928` | 0 |
| `CORE_026` | `:444` | a_migrer |  | « Microphone inaccessible. Vérifie les permissions. » | `hooks/useVoiceCore.ts:962` | 0 |
| `CORE_027` | `:445` | a_migrer |  | « Accès au micro refusé. Autorise le micro pour Jùlaba dans les réglages de ton téléphone. » | `hooks/useVoiceCore.ts:965` | 0 |
| `CORE_028` | `:446` | a_migrer |  | « Micro introuvable ou déjà utilisé par une autre application. Vérifie ton micro et réessaie. » | `hooks/useVoiceCore.ts:967` | 0 |
| `CORE_ACK_01` | `:519` | a_migrer |  | « C'est fait ! » | `services/loginVoiceScript.ts (CORE_ACK_01) ; hooks/useVoiceCore.ts:167` | 1 |
| `CORE_ACK_02` | `:520` | a_migrer |  | « Bien reçu ! » | `services/loginVoiceScript.ts (CORE_ACK_02) ; hooks/useVoiceCore.ts:168` | 1 |
| `CORE_ACK_03` | `:521` | a_migrer |  | « Je note ça ! » | `services/loginVoiceScript.ts (CORE_ACK_03) ; hooks/useVoiceCore.ts:170` | 1 |
| `CORE_ACK_04` | `:522` | a_migrer |  | « C'est noté ! » | `services/loginVoiceScript.ts (CORE_ACK_04) ; hooks/useVoiceCore.ts:171` | 1 |
| `CORE_ACK_05` | `:523` | a_migrer |  | « C'est enregistré ! » | `services/loginVoiceScript.ts (CORE_ACK_05) ; hooks/useVoiceCore.ts:175` | 1 |
| `CORE_ACK_06` | `:524` | reference |  | « C'est noté, ta vente est bien enregistrée. » | `services/loginVoiceScript.ts (CORE_ACK_06)` | 1 |
| `CORE_ACK_07` | `:525` | a_migrer |  | « D'accord, j'annule. Pas de souci. » | `services/loginVoiceScript.ts (CORE_ACK_07) ; hooks/useVoiceCore.ts:732 ; hooks/useVoiceCore.ts:732` | 1 |
| `CORE_ERR_01` | `:526` | a_migrer |  | « Je n'ai pas bien compris. Redis-moi ça autrement, s'il te plaît. » | `services/loginVoiceScript.ts (CORE_ERR_01) ; hooks/useVoiceCore.ts:851 ; hooks/useVoiceCore.ts:897 ; +2` | 1 |
| `CORE_ERR_02` | `:527` | a_migrer |  | « Je n'ai rien entendu. Réessaie, parle un peu plus fort. » | `services/loginVoiceScript.ts (CORE_ERR_02) ; hooks/useVoiceCore.ts:852 ; hooks/useVoiceCore.ts:852` | 1 |
| `CORE_ERR_03` | `:528` | a_migrer | € | « Dis oui pour valider, ou non pour annuler. » | `services/loginVoiceScript.ts (CORE_ERR_03) ; hooks/useVoiceCore.ts:833 ; hooks/useVoiceCore.ts:833` | 1 |
| `CORE_ERR_04` | `:529` | a_migrer |  | « Touche Oui ou Non à l'écran, s'il te plaît. » | `services/loginVoiceScript.ts (CORE_ERR_04) ; hooks/useVoiceCore.ts:836 ; hooks/useVoiceCore.ts:836` | 1 |
| `CORE_SYS_01` | `:530` | a_migrer |  | « Je prépare ta voix, un petit instant. » | `services/loginVoiceScript.ts (CORE_SYS_01) ; hooks/useVoiceCore.ts:814 ; hooks/useVoiceCore.ts:814` | 1 |
| `CORE_SYS_02` | `:531` | a_migrer |  | « Je n'ai pas réussi à préparer ta voix. Vérifie le réseau et réessaie. » | `services/loginVoiceScript.ts (CORE_SYS_02) ; hooks/useVoiceCore.ts:863` | 1 |
| `CORE_WAIT_01` | `:532` | a_migrer |  | « Je réfléchis... » | `services/loginVoiceScript.ts (CORE_WAIT_01) ; hooks/useVoiceCore.ts:143` | 1 |
| `CORE_WAIT_02` | `:533` | a_migrer |  | « Un instant... » | `services/loginVoiceScript.ts (CORE_WAIT_02) ; hooks/useVoiceCore.ts:144` | 1 |
| `CORE_WAIT_03` | `:534` | a_migrer |  | « Je vois ça... » | `services/loginVoiceScript.ts (CORE_WAIT_03) ; hooks/useVoiceCore.ts:145` | 1 |
| `CORE_WAIT_04` | `:535` | a_migrer |  | « Je m'en occupe... » | `services/loginVoiceScript.ts (CORE_WAIT_04) ; hooks/useVoiceCore.ts:146 ; hooks/useVoiceCore.ts:156` | 1 |
| `CORE_WAIT_05` | `:536` | a_migrer |  | « Je calcule ça... » | `services/loginVoiceScript.ts (CORE_WAIT_05) ; hooks/useVoiceCore.ts:153` | 1 |
| `CORE_WAIT_06` | `:537` | a_migrer |  | « Je note ta vente... » | `services/loginVoiceScript.ts (CORE_WAIT_06) ; hooks/useVoiceCore.ts:154` | 1 |
| `CORE_WAIT_07` | `:538` | a_migrer |  | « Laisse-moi réessayer... » | `services/loginVoiceScript.ts (CORE_WAIT_07) ; hooks/useVoiceCore.ts:163` | 1 |
| `CLIP_UI_001` | `:558` | a_migrer |  | « Alertes basses ignorées » | `services/tataUiClips.ts (ui-001.mp3) ; components/producteur/ProducteurAlertes.tsx:466` | 0 |
| `CLIP_UI_002` | `:559` | a_migrer |  | « Au revoir. Déconnexion du Back-Office. » | `services/tataUiClips.ts (ui-002.mp3) ; components/backoffice/BOLayout.tsx:850` | 0 |
| `CLIP_UI_003` | `:560` | reference |  | « Besoin mis à jour » | `services/tataUiClips.ts (ui-003.mp3)` | 0 |
| `CLIP_UI_004` | `:561` | a_migrer |  | « Bienvenue sur le terminal de vente. Ajoute tes produits au panier » | `services/tataUiClips.ts (ui-004.mp3) ; components/shared/RoleDashboard.tsx:475` | 0 |
| `CLIP_UI_005` | `:562` | reference |  | « Bonjour ! Tu veux écrire ou parler avec moi ? » | `services/tataUiClips.ts (ui-005.mp3)` | 0 |
| `CLIP_UI_006` | `:563` | reference |  | « Bonne réponse ! » | `services/tataUiClips.ts (ui-006.mp3)` | 0 |
| `CLIP_UI_007` | `:564` | a_migrer |  | « Ce client a droit à sa récompense ! » | `services/tataUiClips.ts (ui-007.mp3) ; components/marchand/Fidelite.tsx:63` | 0 |
| `CLIP_UI_008` | `:565` | reference |  | « Chargement du document en cours » | `services/tataUiClips.ts (ui-008.mp3)` | 0 |
| `CLIP_UI_009` | `:566` | reference |  | « Choisissez un nouveau document » | `services/tataUiClips.ts (ui-009.mp3)` | 0 |
| `CLIP_UI_010` | `:567` | a_migrer |  | « Combien tu as en caisse ce matin ? » | `services/tataUiClips.ts (ui-010.mp3) ; components/shared/RoleDashboard.tsx:421` | 0 |
| `CLIP_UI_011` | `:568` | a_migrer |  | « Commande annulée » | `services/tataUiClips.ts (ui-011.mp3) ; services/tataVoice.ts (clé annule) ; components/marchand/MesCommandes.tsx:168 ; +2` | 0 |
| `CLIP_UI_012` | `:569` | a_migrer |  | « Commande marquée comme livrée » | `services/tataUiClips.ts (ui-012.mp3) ; components/marchand/MesCommandes.tsx:198 ; components/producteur/CommandesProducteurPage.tsx:1546` | 0 |
| `CLIP_UI_013` | `:570` | a_migrer |  | « Commande refusée. » | `services/tataUiClips.ts (ui-013.mp3) ; components/producteur/CommandesProducteurPage.tsx:328` | 0 |
| `CLIP_UI_014` | `:571` | a_migrer |  | « Commandes livrées » | `services/tataUiClips.ts (ui-014.mp3) ; components/producteur/CommandesProducteurPage.tsx:677` | 0 |
| `CLIP_UI_015` | `:572` | a_migrer |  | « Commandes urgentes » | `services/tataUiClips.ts (ui-015.mp3) ; components/producteur/CommandesProducteurPage.tsx:659` | 0 |
| `CLIP_UI_016` | `:573` | a_migrer |  | « Connexion refusée. Vérifie tes identifiants. » | `services/tataUiClips.ts (ui-016.mp3) ; components/backoffice/BOLogin.tsx:275` | 0 |
| `CLIP_UI_017` | `:574` | reference |  | « Connexion rétablie » | `services/tataUiClips.ts (ui-017.mp3)` | 0 |
| `CLIP_UI_018` | `:575` | a_migrer |  | « Contact mis à jour » | `services/tataUiClips.ts (ui-018.mp3) ; components/shared/ProfilUnifieModal.tsx:289` | 0 |
| `CLIP_UI_019` | `:576` | a_migrer |  | « Contre-offre refusée. » | `services/tataUiClips.ts (ui-019.mp3) ; components/marchand/MesCommandes.tsx:230` | 0 |
| `CLIP_UI_020` | `:577` | a_migrer |  | « Contre-proposition envoyée » | `services/tataUiClips.ts (ui-020.mp3) ; components/shared/InboxNegociations.tsx:126` | 0 |
| `CLIP_UI_021` | `:578` | a_migrer |  | « Création de plantation agricole » | `services/tataUiClips.ts (ui-021.mp3) ; components/producteur/ProducteurModals.tsx:385` | 0 |
| `CLIP_UI_022` | `:579` | reference |  | « Création en cours... » | `services/tataUiClips.ts (ui-022.mp3)` | 0 |
| `CLIP_UI_023` | `:580` | a_migrer |  | « Demande acceptée » | `services/tataUiClips.ts (ui-023.mp3) ; components/shared/InboxNegociations.tsx:107` | 0 |
| `CLIP_UI_024` | `:581` | a_migrer |  | « Demande refusée » | `services/tataUiClips.ts (ui-024.mp3) ; components/shared/InboxNegociations.tsx:141` | 0 |
| `CLIP_UI_025` | `:582` | reference |  | « Document chargé avec succès. En attente de vérification » | `services/tataUiClips.ts (ui-025.mp3)` | 0 |
| `CLIP_UI_026` | `:583` | reference |  | « Document sauvegardé avec succès » | `services/tataUiClips.ts (ui-026.mp3)` | 0 |
| `CLIP_UI_027` | `:584` | reference |  | « Document supprimé » | `services/tataUiClips.ts (ui-027.mp3)` | 0 |
| `CLIP_UI_028` | `:585` | reference |  | « Document tourné » | `services/tataUiClips.ts (ui-028.mp3)` | 0 |
| `CLIP_UI_029` | `:586` | reference |  | « Début de la formation » | `services/tataUiClips.ts (ui-029.mp3)` | 0 |
| `CLIP_UI_030` | `:587` | a_migrer |  | « Déclaration de récolte » | `services/tataUiClips.ts (ui-030.mp3) ; components/producteur/ProducteurModals.tsx:447` | 0 |
| `CLIP_UI_031` | `:588` | a_migrer |  | « Déclarer une récolte » | `services/tataUiClips.ts (ui-031.mp3) ; components/producteur/ProducteurProduction.tsx:695` | 0 |
| `CLIP_UI_032` | `:589` | a_migrer |  | « Déconnexion en cours » | `services/tataUiClips.ts (ui-032.mp3) ; components/backoffice/BOProfil.tsx:313 ; components/shared/UniversalParametres.tsx:998` | 0 |
| `CLIP_UI_033` | `:590` | reference |  | « Dépense de » | `services/tataUiClips.ts (ui-033.mp3)` | 0 |
| `CLIP_UI_034` | `:591` | a_migrer |  | « Dépense enregistrée » | `services/tataUiClips.ts (ui-034.mp3) ; services/tataVoice.ts (clé depense_enregistree) ; components/marchand/DepenseForm.tsx:65` | 0 |
| `CLIP_UI_035` | `:592` | a_migrer |  | « Entre ton code secret à 4 chiffres » | `services/tataUiClips.ts (ui-035.mp3) ; components/auth/LoginPassword.tsx:308 ; components/auth/LoginPassword.tsx:1453` | 0 |
| `CLIP_UI_036` | `:593` | a_migrer | € | « Entre un montant valide » | `services/tataUiClips.ts (ui-036.mp3) ; components/cooperative/TresorerieCooperative.tsx:102` | 0 |
| `CLIP_UI_038` | `:594` | reference |  | « Erreur de synchronisation. Fiche sauvegardée localement. » | `services/tataUiClips.ts (ui-038.mp3)` | 0 |
| `CLIP_UI_039` | `:595` | a_migrer |  | « Erreur lors de l'enregistrement » | `services/tataUiClips.ts (ui-039.mp3) ; components/marchand/CreditModal.tsx:208 ; components/marchand/DepenseForm.tsx:105` | 0 |
| `CLIP_UI_040` | `:596` | reference |  | « Erreur lors de l'enregistrement de la vente » | `services/tataUiClips.ts (ui-040.mp3)` | 0 |
| `CLIP_UI_042` | `:597` | a_migrer |  | « Erreur lors de la modification » | `services/tataUiClips.ts (ui-042.mp3) ; components/producteur/ModifierPublicationModal.tsx:84` | 0 |
| `CLIP_UI_043` | `:598` | a_migrer |  | « Erreur lors de la publication » | `services/tataUiClips.ts (ui-043.mp3) ; components/producteur/PublierRecolteModal.tsx:63` | 0 |
| `CLIP_UI_044` | `:599` | a_migrer |  | « Erreur lors de la publication, réessaie » | `services/tataUiClips.ts (ui-044.mp3) ; components/producteur/PublierRecolte.tsx:134` | 0 |
| `CLIP_UI_045` | `:600` | a_migrer |  | « Erreur lors du rechargement » | `services/tataUiClips.ts (ui-045.mp3) ; components/wallet/RechargeWalletModal.tsx:156` | 0 |
| `CLIP_UI_046` | `:601` | a_migrer |  | « Erreur lors du retrait » | `services/tataUiClips.ts (ui-046.mp3) ; components/wallet/WithdrawWalletModal.tsx:162` | 0 |
| `CLIP_UI_047` | `:602` | a_migrer |  | « Erreur réseau. Réessaie. » | `services/tataUiClips.ts (ui-047.mp3) ; services/tataVoice.ts (clé souci_reseau) ; components/marchand/PinConfirmModal.tsx:61 ; +2` | 0 |
| `CLIP_UI_048` | `:603` | a_migrer |  | « Erreur, réessaie » | `services/tataUiClips.ts (ui-048.mp3) ; components/marchand/DepenseForm.tsx:70` | 0 |
| `CLIP_UI_049` | `:604` | a_migrer |  | « Export en cours » | `services/tataUiClips.ts (ui-049.mp3) ; components/shared/UniversalParametres.tsx:901` | 0 |
| `CLIP_UI_050` | `:605` | reference |  | « Fiche mise à jour » | `services/tataUiClips.ts (ui-050.mp3)` | 0 |
| `CLIP_UI_051` | `:606` | reference |  | « Fiche mise à jour et synchronisée » | `services/tataUiClips.ts (ui-051.mp3)` | 0 |
| `CLIP_UI_052` | `:607` | a_migrer |  | « Format de fichier invalide. Utilise une image. » | `services/tataUiClips.ts (ui-052.mp3) ; components/shared/ProfilUnifieModal.tsx:305` | 0 |
| `CLIP_UI_053` | `:608` | a_migrer |  | « Identité mise à jour » | `services/tataUiClips.ts (ui-053.mp3) ; components/shared/ProfilUnifieModal.tsx:266` | 0 |
| `CLIP_UI_054` | `:609` | a_migrer |  | « Image trop lourde. Maximum 2 mégaoctets. » | `services/tataUiClips.ts (ui-054.mp3) ; components/shared/ProfilUnifieModal.tsx:309` | 0 |
| `CLIP_UI_055` | `:610` | a_migrer |  | « Indique le nom du produit » | `services/tataUiClips.ts (ui-055.mp3) ; components/producteur/PublierRecolte.tsx:83` | 0 |
| `CLIP_UI_056` | `:611` | reference |  | « Informations personnelles enregistrées avec succès » | `services/tataUiClips.ts (ui-056.mp3)` | 0 |
| `CLIP_UI_057` | `:612` | a_migrer |  | « J'ai compris » | `services/tataUiClips.ts (ui-057.mp3) ; services/tataVoice.ts (clé bien_recu) ; hooks/useVoiceCore.ts:721 ; +1` | 0 |
| `CLIP_UI_058` | `:613` | reference |  | « Je n'ai pas compris. Tape ton numéro, ou réessaie. » | `services/tataUiClips.ts (ui-058.mp3)` | 0 |
| `CLIP_UI_060` | `:614` | a_migrer |  | « La commande du marchand a été acceptée. » | `services/tataUiClips.ts (ui-060.mp3) ; components/cooperative/MarcheHub.tsx:968` | 0 |
| `CLIP_UI_061` | `:615` | a_migrer |  | « La quantité doit être supérieure à zéro » | `services/tataUiClips.ts (ui-061.mp3) ; components/producteur/PublierRecolteModal.tsx:29` | 0 |
| `CLIP_UI_063` | `:616` | a_migrer | € | « Le montant doit être un multiple de 100 francs » | `services/tataUiClips.ts (ui-063.mp3) ; components/wallet/RechargeWalletModal.tsx:105 ; components/wallet/WithdrawWalletModal.tsx:108` | 0 |
| `CLIP_UI_064` | `:617` | a_migrer | € | « Le montant doit être un multiple de 5 francs » | `services/tataUiClips.ts (ui-064.mp3) ; components/marchand/MarchandModals.tsx:361` | 0 |
| `CLIP_UI_065` | `:618` | a_migrer | € | « Le montant minimum est de 200 FCFA » | `services/tataUiClips.ts (ui-065.mp3) ; components/wallet/RechargeWalletModal.tsx:99` | 0 |
| `CLIP_UI_066` | `:619` | a_migrer | € | « Le montant saisi est invalide » | `services/tataUiClips.ts (ui-066.mp3) ; components/marchand/MarchandModals.tsx:355 ; components/marchand/MarchandModals.tsx:470` | 0 |
| `CLIP_UI_067` | `:620` | a_migrer |  | « Le produit a été retiré de votre marketplace. » | `services/tataUiClips.ts (ui-067.mp3) ; components/cooperative/MarcheHub.tsx:954` | 0 |
| `CLIP_UI_068` | `:621` | a_migrer |  | « Le stock disponible ne peut pas dépasser la quantité totale de la récolte » | `services/tataUiClips.ts (ui-068.mp3) ; components/producteur/PublierRecolte.tsx:78` | 0 |
| `CLIP_UI_069` | `:622` | a_migrer |  | « Livraison déclarée. Le marchand va confirmer la réception. » | `services/tataUiClips.ts (ui-069.mp3) ; components/producteur/CommandesProducteurPage.tsx:360` | 0 |
| `CLIP_UI_070` | `:623` | a_migrer |  | « Ma Plantation » | `services/tataUiClips.ts (ui-070.mp3) ; components/producteur/ProducteurProduction.tsx:298` | 0 |
| `CLIP_UI_071` | `:624` | a_migrer |  | « Mes revenus » | `services/tataUiClips.ts (ui-071.mp3) ; components/producteur/CommandesProducteurPage.tsx:668` | 0 |
| `CLIP_UI_072` | `:625` | a_migrer |  | « Mes récoltes » | `services/tataUiClips.ts (ui-072.mp3) ; components/producteur/ProducteurProduction.tsx:325` | 0 |
| `CLIP_UI_073` | `:626` | reference |  | « Mode hors ligne » | `services/tataUiClips.ts (ui-073.mp3) ; services/tataVoice.ts (clé hors_ligne)` | 0 |
| `CLIP_UI_074` | `:627` | reference |  | « Mode édition activé » | `services/tataUiClips.ts (ui-074.mp3)` | 0 |
| `CLIP_UI_075` | `:628` | a_migrer |  | « Modification en cours... » | `services/tataUiClips.ts (ui-075.mp3) ; components/producteur/ModifierPublicationModal.tsx:61` | 0 |
| `CLIP_UI_076` | `:629` | reference |  | « Modifications annulées » | `services/tataUiClips.ts (ui-076.mp3)` | 0 |
| `CLIP_UI_077` | `:630` | a_migrer |  | « Modifier la récolte » | `services/tataUiClips.ts (ui-077.mp3) ; components/producteur/RecolteDetailModal.tsx:322` | 0 |
| `CLIP_UI_078` | `:631` | a_migrer |  | « Mon Historique de ventes » | `services/tataUiClips.ts (ui-078.mp3) ; components/producteur/ProducteurProduction.tsx:379` | 0 |
| `CLIP_UI_079` | `:632` | a_migrer |  | « Mon Marché » | `services/tataUiClips.ts (ui-079.mp3) ; components/producteur/ProducteurProduction.tsx:352` | 0 |
| `CLIP_UI_080` | `:633` | a_migrer | € | « Montant invalide » | `services/tataUiClips.ts (ui-080.mp3) ; components/wallet/WithdrawWalletModal.tsx:102` | 0 |
| `CLIP_UI_082` | `:634` | a_migrer |  | « Numéro Mobile Money invalide. Dix chiffres requis » | `services/tataUiClips.ts (ui-082.mp3) ; components/wallet/RechargeWalletModal.tsx:127 ; components/wallet/WithdrawWalletModal.tsx:136` | 0 |
| `CLIP_UI_083` | `:635` | a_migrer |  | « Numéro de téléphone invalide. Format attendu : 07XXXXXXXX » | `services/tataUiClips.ts (ui-083.mp3) ; components/marchand/CreditModal.tsx:165` | 0 |
| `CLIP_UI_084` | `:636` | a_migrer |  | « Ouverture de ton Wallet Jùlaba » | `services/tataUiClips.ts (ui-084.mp3) ; components/shared/RoleDashboard.tsx:547` | 0 |
| `CLIP_UI_087` | `:637` | a_migrer |  | « Ouverture des détails de la certification JULABA » | `services/tataUiClips.ts (ui-087.mp3) ; components/shared/DocumentsCertificationsModalUniversal.tsx:155` | 0 |
| `CLIP_UI_088` | `:638` | a_migrer |  | « Ouverture du Wallet Jùlaba » | `services/tataUiClips.ts (ui-088.mp3) ; components/wallet/WalletCard.tsx:45` | 0 |
| `CLIP_UI_089` | `:639` | a_migrer |  | « Ouvre le formulaire de rechargement Mobile Money » | `services/tataUiClips.ts (ui-089.mp3) ; components/wallet/WalletCard.tsx:55` | 0 |
| `CLIP_UI_090` | `:640` | a_migrer |  | « Ouvre le formulaire de retrait Mobile Money » | `services/tataUiClips.ts (ui-090.mp3) ; components/wallet/WalletCard.tsx:60` | 0 |
| `CLIP_UI_091` | `:641` | reference |  | « Ouvre ta journée pour activer ta caisse » | `services/tataUiClips.ts (ui-091.mp3) ; services/tataVoice.ts (clé ouvre_journee)` | 0 |
| `CLIP_UI_092` | `:642` | a_migrer |  | « Paiement confirmé ! Ton Keiwa est rechargé. » | `services/tataUiClips.ts (ui-092.mp3) ; components/wallet/RechargeWalletModal.tsx:197` | 0 |
| `CLIP_UI_093` | `:643` | a_migrer |  | « Paiement en cours — confirme sur ton téléphone » | `services/tataUiClips.ts (ui-093.mp3) ; components/wallet/RechargeWalletModal.tsx:151 ; components/wallet/WithdrawWalletModal.tsx:153` | 0 |
| `CLIP_UI_094` | `:644` | a_migrer |  | « Paiement récupéré ! L'argent est dans ton Keiwa. » | `services/tataUiClips.ts (ui-094.mp3) ; components/producteur/CommandesProducteurPage.tsx:374` | 0 |
| `CLIP_UI_095` | `:645` | a_migrer |  | « Paramètres sauvegardés » | `services/tataUiClips.ts (ui-095.mp3) ; components/shared/UniversalParametres.tsx:615` | 0 |
| `CLIP_UI_097` | `:646` | a_migrer |  | « Photo modifiée » | `services/tataUiClips.ts (ui-097.mp3) ; components/shared/ProfilUnifieModal.tsx:315` | 0 |
| `CLIP_UI_098` | `:647` | reference |  | « Plantation créée avec succès ! » | `services/tataUiClips.ts (ui-098.mp3)` | 0 |
| `CLIP_UI_099` | `:648` | a_migrer | € | « Prix invalide » | `services/tataUiClips.ts (ui-099.mp3) ; components/producteur/ModifierPublicationModal.tsx:57 ; components/producteur/PublierRecolteModal.tsx:38` | 0 |
| `CLIP_UI_100` | `:649` | a_migrer |  | « Problème avec le micro — réessaie » | `services/tataUiClips.ts (ui-100.mp3) ; components/marchand/DepenseForm.tsx:80` | 0 |
| `CLIP_UI_101` | `:650` | a_migrer |  | « Publication en cours... » | `services/tataUiClips.ts (ui-101.mp3) ; components/producteur/PublierRecolteModal.tsx:43` | 0 |
| `CLIP_UI_102` | `:651` | a_migrer |  | « Publication modifiée avec succès ! » | `services/tataUiClips.ts (ui-102.mp3) ; components/producteur/ModifierPublicationModal.tsx:78` | 0 |
| `CLIP_UI_103` | `:652` | a_migrer |  | « Publication sur le marché en cours » | `services/tataUiClips.ts (ui-103.mp3) ; components/producteur/RecolteDetailModal.tsx:336` | 0 |
| `CLIP_UI_104` | `:653` | a_migrer |  | « Quantité invalide » | `services/tataUiClips.ts (ui-104.mp3) ; components/producteur/ModifierPublicationModal.tsx:58` | 0 |
| `CLIP_UI_106` | `:654` | reference |  | « Recharger votre keiwa » | `services/tataUiClips.ts (ui-106.mp3)` | 0 |
| `CLIP_UI_107` | `:655` | a_migrer |  | « Remplis tous les champs obligatoires » | `services/tataUiClips.ts (ui-107.mp3) ; components/cooperative/TresorerieCooperative.tsx:96 ; components/producteur/PublierRecolte.tsx:74` | 0 |
| `CLIP_UI_109` | `:656` | a_migrer | € | « Retour au choix du montant » | `services/tataUiClips.ts (ui-109.mp3) ; components/wallet/RechargeWalletModal.tsx:175 ; components/wallet/WithdrawWalletModal.tsx:181` | 0 |
| `CLIP_UI_110` | `:657` | a_migrer |  | « Retour au choix du service » | `services/tataUiClips.ts (ui-110.mp3) ; components/wallet/RechargeWalletModal.tsx:170 ; components/wallet/WithdrawWalletModal.tsx:176` | 0 |
| `CLIP_UI_111` | `:658` | a_migrer | € | « Retrait confirmé ! Ton solde a été mis à jour. » | `services/tataUiClips.ts (ui-111.mp3) ; components/wallet/WithdrawWalletModal.tsx:199` | 0 |
| `CLIP_UI_112` | `:659` | a_migrer |  | « Réception confirmée. Passons au paiement. » | `services/tataUiClips.ts (ui-112.mp3) ; components/shared/ReceptionPaiementModal.tsx:100` | 0 |
| `CLIP_UI_113` | `:660` | a_migrer |  | « Récolte publiée avec succès ! » | `services/tataUiClips.ts (ui-113.mp3) ; components/producteur/PublierRecolteModal.tsx:59` | 0 |
| `CLIP_UI_114` | `:661` | a_migrer | € | « Saisir un autre montant » | `services/tataUiClips.ts (ui-114.mp3) ; components/wallet/RechargeWalletModal.tsx:91 ; components/wallet/WithdrawWalletModal.tsx:94` | 0 |
| `CLIP_UI_115` | `:662` | a_migrer |  | « Saisis le nom du produit » | `services/tataUiClips.ts (ui-115.mp3) ; components/marchand/GestionStock.tsx:466` | 0 |
| `CLIP_UI_116` | `:663` | a_migrer | € | « Saisis une quantité valide » | `services/tataUiClips.ts (ui-116.mp3) ; components/marchand/GestionStock.tsx:510` | 0 |
| `CLIP_UI_117` | `:664` | a_migrer |  | « Signalement de problème » | `services/tataUiClips.ts (ui-117.mp3) ; components/shared/ReceptionPaiementModal.tsx:312` | 0 |
| `CLIP_UI_118` | `:665` | a_migrer | € | « Solde insuffisant » | `services/tataUiClips.ts (ui-118.mp3) ; components/wallet/WithdrawWalletModal.tsx:79 ; components/wallet/WithdrawWalletModal.tsx:114` | 0 |
| `CLIP_UI_119` | `:666` | a_migrer |  | « Suivre une nouvelle plantation » | `services/tataUiClips.ts (ui-119.mp3) ; components/producteur/ProducteurProduction.tsx:481` | 0 |
| `CLIP_UI_120` | `:667` | a_migrer |  | « Ta demande a été envoyée » | `services/tataUiClips.ts (ui-120.mp3) ; components/marchand/MaCooperative.tsx:64` | 0 |
| `CLIP_UI_121` | `:668` | reference |  | « Ton streak a été réinitialisé » | `services/tataUiClips.ts (ui-121.mp3)` | 0 |
| `CLIP_UI_122` | `:669` | reference |  | « Ton streak est sauvé grâce au bouclier ! » | `services/tataUiClips.ts (ui-122.mp3)` | 0 |
| `CLIP_UI_123` | `:670` | a_migrer |  | « Toute ta production est au-dessus du seuil. Tout va bien ! » | `services/tataUiClips.ts (ui-123.mp3) ; components/producteur/Stocks.tsx:293` | 0 |
| `CLIP_UI_124` | `:671` | a_migrer |  | « Toutes les commandes » | `services/tataUiClips.ts (ui-124.mp3) ; components/producteur/CommandesProducteurPage.tsx:650` | 0 |
| `CLIP_UI_125` | `:672` | a_migrer |  | « Trop de tentatives incorrectes. Réessaie dans 5 minutes. » | `services/tataUiClips.ts (ui-125.mp3) ; components/marchand/PinConfirmModal.tsx:79` | 0 |
| `CLIP_UI_126` | `:673` | a_migrer |  | « Tu vas être redirigé vers Wave pour confirmer le paiement » | `services/tataUiClips.ts (ui-126.mp3) ; components/wallet/RechargeWalletModal.tsx:143` | 0 |
| `CLIP_UI_127` | `:674` | a_migrer |  | « Téléchargement de la carte » | `services/tataUiClips.ts (ui-127.mp3) ; components/shared/ProfilUnifieModal.tsx:588` | 0 |
| `CLIP_UI_128` | `:675` | a_migrer |  | « Vente confirmée » | `services/tataUiClips.ts (ui-128.mp3) ; services/tataVoice.ts (clé vente_enregistree) ; components/marchand/MesCommandes.tsx:178` | 0 |
| `CLIP_UI_129` | `:676` | a_migrer |  | « Vente refusée » | `services/tataUiClips.ts (ui-129.mp3) ; services/tataVoice.ts (clé vente_refusee) ; components/marchand/MesCommandes.tsx:188` | 0 |
| `CLIP_UI_130` | `:677` | a_migrer |  | « Verso de la carte » | `services/tataUiClips.ts (ui-130.mp3) ; components/shared/ProfilUnifieModal.tsx:587` | 0 |
| `CLIP_UI_131` | `:678` | a_migrer |  | « Voici tes céréales en production » | `services/tataUiClips.ts (ui-131.mp3) ; components/producteur/Stocks.tsx:334` | 0 |
| `CLIP_UI_132` | `:679` | a_migrer |  | « Voici tes fruits en production » | `services/tataUiClips.ts (ui-132.mp3) ; components/producteur/Stocks.tsx:330` | 0 |
| `CLIP_UI_133` | `:680` | a_migrer |  | « Voici tes légumes en production » | `services/tataUiClips.ts (ui-133.mp3) ; components/producteur/Stocks.tsx:326` | 0 |
| `CLIP_UI_134` | `:681` | a_migrer |  | « Voici tes tubercules en production » | `services/tataUiClips.ts (ui-134.mp3) ; components/producteur/Stocks.tsx:338` | 0 |
| `CLIP_UI_135` | `:682` | a_migrer |  | « Voici tous tes produits en production » | `services/tataUiClips.ts (ui-135.mp3) ; components/producteur/Stocks.tsx:342` | 0 |
| `CLIP_UI_136` | `:683` | a_migrer |  | « Votre besoin a été soumis à la coopérative » | `services/tataUiClips.ts (ui-136.mp3) ; components/marchand/BesoinMarchand.tsx:55` | 0 |
| `CLIP_UI_137` | `:684` | a_migrer |  | « À bientôt sur Jùlaba » | `services/tataUiClips.ts (ui-137.mp3) ; components/layout/Sidebar.tsx:64` | 0 |

## Domaine `pages` — 1 phrase(s)

| Clé | catalog.ts | Statut | € | Texte fr-ci (dit) | Source déclarée | Usages |
|---|---|---|---|---|---|---|
| `PAGE_001` | `:447` | a_migrer |  | « Merci ! » | `pages/CollecteVoix.tsx:128` | 0 |

## Domaine `partage` — 9 phrase(s)

| Clé | catalog.ts | Statut | € | Texte fr-ci (dit) | Source déclarée | Usages |
|---|---|---|---|---|---|---|
| `TATA_LISTE_VIRGULE` | `:106` | migre |  | « ,  » | `services/ruptureStock.ts:45` | 1 |
| `TATA_LISTE_ET` | `:107` | migre |  | «  et  » | `services/ruptureStock.ts:45` | 1 |
| `PARTAGE_001` | `:394` | a_migrer |  | « Ouverture des détails de la carte d'identité » | `components/shared/DocumentsCertificationsModalUniversal.tsx:133` | 0 |
| `PARTAGE_002` | `:395` | a_migrer |  | « Ouverture des détails de l'attestation d'activité » | `components/shared/DocumentsCertificationsModalUniversal.tsx:177` | 0 |
| `PARTAGE_003` | `:396` | a_migrer |  | « Fiche de {prenoms} {nom}, {label} » | `components/shared/FicheActeurDetailModal.tsx:155` | 0 |
| `PARTAGE_004` | `:397` | a_migrer |  | « Paiement de {montantFormate} validé par {modePaiement}. » | `components/shared/ReceptionPaiementModal.tsx:120` | 0 |
| `PARTAGE_005` | `:398` | a_migrer |  | « Journée réduite » | `components/shared/RoleDashboard.tsx:307` | 0 |
| `PARTAGE_006` | `:399` | a_migrer |  | « Détails de la journée » | `components/shared/RoleDashboard.tsx:307` | 0 |
| `PARTAGE_007` | `:400` | a_migrer |  | « {label}. {description}. Cela te rapportera {points} points » | `components/shared/ScoreResumeCard.tsx:351` | 0 |

## Domaine `producteur` — 24 phrase(s)

| Clé | catalog.ts | Statut | € | Texte fr-ci (dit) | Source déclarée | Usages |
|---|---|---|---|---|---|---|
| `PROD_001` | `:353` | a_migrer |  | « Impossible de marquer comme livrée » | `components/producteur/CommandesProducteurPage.tsx:1550` | 0 |
| `PROD_002` | `:354` | a_migrer | € | « Paiement encaissé ! L'argent est dans ton Keiwa. » | `components/producteur/CommandesProducteurPage.tsx:2428` | 0 |
| `PROD_003` | `:355` | a_migrer | € | « Commande de {acheteurId} acceptée. Le marchand va maintenant payer. » | `components/producteur/CommandesProducteurPage.tsx:314` | 0 |
| `PROD_004` | `:356` | a_migrer | € | « Contre-proposition de {nouveauPrix} FCFA envoyée au marchand. » | `components/producteur/CommandesProducteurPage.tsx:344` | 0 |
| `PROD_005` | `:357` | a_migrer |  | « Commande mise à jour : {statut} » | `components/producteur/CommandesProducteurPage.tsx:512` | 0 |
| `PROD_006` | `:358` | a_migrer |  | « Impossible de mettre à jour la commande » | `components/producteur/CommandesProducteurPage.tsx:516` | 0 |
| `PROD_007` | `:359` | a_migrer |  | « Commande de {produit} ajoutée » | `components/producteur/CommandesProducteurPage.tsx:602` | 0 |
| `PROD_008` | `:360` | a_migrer |  | « Impossible d'ajouter la commande » | `components/producteur/CommandesProducteurPage.tsx:609` | 0 |
| `PROD_009` | `:361` | a_migrer |  | « Demande de {acheteurId} pour {produit} » | `components/producteur/CommandesProducteurPage.tsx:775` | 0 |
| `PROD_010` | `:362` | a_migrer |  | « {mois} mois » | `components/producteur/CreerPlantationModal.tsx:248` | 0 |
| `PROD_011` | `:363` | a_migrer |  | « Choisis d'abord une culture. » | `components/producteur/CreerPlantationModal.tsx:57` | 0 |
| `PROD_012` | `:364` | a_migrer |  | « Dis-moi le nom de la culture. » | `components/producteur/CreerPlantationModal.tsx:62` | 0 |
| `PROD_013` | `:365` | a_migrer |  | « C'est fait ! Ta plantation est créée. » | `components/producteur/CreerPlantationModal.tsx:78` | 0 |
| `PROD_014` | `:366` | a_migrer |  | « Tu dois être connectée. Vérifie ton réseau et réessaie. » | `components/producteur/CreerPlantationModal.tsx:90` | 0 |
| `PROD_015` | `:367` | a_migrer |  | « {produit}, {toLocaleString} kg » | `components/producteur/MesRecoltesPage.tsx:259` | 0 |
| `PROD_016` | `:368` | a_migrer |  | « Détails de ta plantation de {culture}. Progression {progressPercent} pourcent. » | `components/producteur/PlantationDetailModal.tsx:55` | 0 |
| `PROD_017` | `:369` | a_migrer |  | « Détails de ta plantation de {culture} » | `components/producteur/ProducteurProduction.tsx:522` | 0 |
| `PROD_018` | `:370` | a_migrer |  | « Détails de {culture} » | `components/producteur/ProducteurProduction.tsx:683` | 0 |
| `PROD_019` | `:371` | a_migrer |  | « Récolte de {produitName} publiée avec succès sur le marché virtuel » | `components/producteur/PublierRecolte.tsx:122` | 0 |
| `PROD_020` | `:372` | a_migrer |  | « La quantité ne peut pas dépasser le stock disponible de {stockMax} » | `components/producteur/PublierRecolteModal.tsx:33` | 0 |
| `PROD_021` | `:373` | a_migrer |  | « Dis-moi la quantité que tu as récoltée. » | `components/producteur/RecolteForm.tsx:263` | 0 |
| `PROD_022` | `:374` | a_migrer |  | « C'est enregistré ! {quantiteEnKg} kilos de {cultureName}. » | `components/producteur/RecolteForm.tsx:294` | 0 |
| `PROD_023` | `:375` | a_migrer | € | « Tu as gagné {revenuTotal} francs en tout. » | `components/producteur/Revenus.tsx:105` | 0 |
| `PROD_024` | `:376` | a_migrer |  | « Tu n'as pas encore de revenu. » | `components/producteur/Revenus.tsx:105` | 0 |

## Domaine `questions_caisse` — 14 phrase(s)

| Clé | catalog.ts | Statut | € | Texte fr-ci (dit) | Source déclarée | Usages |
|---|---|---|---|---|---|---|
| `QUEST_VENTES_AUCUNE` | `:89` | migre | € | « Tu n'as pas encore de vente aujourd'hui. Ça va venir ! » | `services/intentionsCaisse.ts:94` | 1 |
| `QUEST_VENTES_JOUR_PLURIEL` | `:90` | migre | € | « Aujourd'hui, tu as vendu pour {ventes} {devise}, en {nombre} ventes. » | `services/intentionsCaisse.ts:97` | 1 |
| `QUEST_VENTES_JOUR` | `:91` | migre | € | « Aujourd'hui, tu as vendu pour {ventes} {devise}. » | `services/intentionsCaisse.ts:98` | 1 |
| `QUEST_DEPENSES_AUCUNE` | `:92` | migre | € | « Aucune dépense notée aujourd'hui. » | `services/intentionsCaisse.ts:102` | 1 |
| `QUEST_DEPENSES_JOUR` | `:93` | migre | € | « Aujourd'hui, tu as dépensé {depenses} {devise}. » | `services/intentionsCaisse.ts:103` | 1 |
| `QUEST_SOLDE_CAISSE` | `:94` | migre | € | « Dans ta caisse, il y a {caisse} {devise}. » | `services/intentionsCaisse.ts:106` | 1 |
| `QUEST_SOLDE_CALCULE` | `:95` | migre | € | « Ventes moins dépenses, il te reste {solde} {devise} aujourd'hui. » | `services/intentionsCaisse.ts:110` | 1 |
| `QUEST_SOLDE_NEGATIF` | `:96` | migre | € | « Aujourd'hui, tes dépenses dépassent tes ventes de {solde} {devise}. » | `services/intentionsCaisse.ts:111` | 1 |
| `QUEST_BENEFICE_VIDE` | `:97` | migre | € | « Pas encore de ventes ni de dépenses aujourd'hui. » | `services/intentionsCaisse.ts:115` | 1 |
| `QUEST_BENEFICE_POSITIF` | `:98` | migre | € | « Aujourd'hui : {ventes} {devise} de ventes, {depenses} de dépenses. Il te reste {resultat} {devise}. » | `services/intentionsCaisse.ts:117` | 1 |
| `QUEST_BENEFICE_NEGATIF` | `:99` | migre | € | « Aujourd'hui : {ventes} {devise} de ventes, {depenses} de dépenses. Tu as dépensé {resultat} {devise} de plus que tes ventes. » | `services/intentionsCaisse.ts:118` | 1 |
| `QUEST_MEILLEURE_VENTE_INCONNUE` | `:100` | migre |  | « Je n'ai pas encore assez de ventes pour te dire ça aujourd'hui. » | `services/intentionsCaisse.ts:122` | 1 |
| `QUEST_MEILLEURE_VENTE_QUANTITE` | `:101` | migre |  | « Ce qui marche le mieux aujourd'hui : {produit}, {quantite} vendus. » | `services/intentionsCaisse.ts:124` | 1 |
| `QUEST_MEILLEURE_VENTE` | `:102` | migre |  | « Ce qui marche le mieux aujourd'hui : {produit}. » | `services/intentionsCaisse.ts:125` | 1 |

## Domaine `stock` — 47 phrase(s)

| Clé | catalog.ts | Statut | € | Texte fr-ci (dit) | Source déclarée | Usages |
|---|---|---|---|---|---|---|
| `TATA_RUPTURE` | `:104` | migre |  | « Attention, il manquait {liste}. Pense à réapprovisionner. » | `services/ruptureStock.ts:46` | 1 |
| `TATA_RUPTURE_LIGNE` | `:105` | migre |  | « {manquant} {produit} » | `services/ruptureStock.ts:41` | 1 |
| `STOCK_001` | `:262` | a_migrer |  | « {produit} ajouté au stock commun. » | `components/cooperative/Stock.tsx:188` | 0 |
| `STOCK_002` | `:263` | a_migrer |  | « Distribution enregistrée avec succès. » | `components/cooperative/Stock.tsx:233` | 0 |
| `STOCK_003` | `:273` | a_migrer |  | « Je n'ai pas entendu le nom. Réessaie, s'il te plaît. » | `components/marchand/GestionStock.tsx:355` | 0 |
| `STOCK_004` ⚠ | `:274` | a_migrer |  | « Quel produit veux-tu ajouter ? » | `components/marchand/GestionStock.tsx:370` | 0 |
| `STOCK_045` | `:275` | a_migrer |  | « Tes montants sont cachés. Appuie sur l'œil pour les afficher. » | `components/marchand/GestionStock.tsx:390` | 0 |
| `STOCK_005` | `:276` | a_migrer |  | « Combien de {nom} veux-tu ajouter ? » | `components/marchand/GestionStock.tsx:371` | 0 |
| `STOCK_006` ⚠ | `:277` | a_migrer |  | « {qte} {unit} de {name} ajoutés. Tu as maintenant {newQty} {unit}. » | `components/marchand/GestionStock.tsx:381` | 0 |
| `STOCK_007` | `:278` | a_migrer |  | « Ça n'a pas marché. Réessaie, s'il te plaît. » | `components/marchand/GestionStock.tsx:382 ; components/marchand/GestionStock.tsx:398 ; components/marchand/GestionStock.tsx:486 ; +3` | 0 |
| `STOCK_008` | `:279` | a_migrer | € | « C'est fait ! {qte} {unite} de {nom} à {prixVente} francs, ajoutés au stock. » | `components/marchand/GestionStock.tsx:395` | 0 |
| `STOCK_009` ⚠ | `:280` | a_migrer | € | « {nom} ajouté au stock. Dis-moi son prix quand tu veux. » | `components/marchand/GestionStock.tsx:395` | 0 |
| `STOCK_010` | `:281` | a_migrer |  | « Tous tes stocks sont bons » | `components/marchand/GestionStock.tsx:404` | 0 |
| `STOCK_011` | `:282` | a_migrer |  | « {low} produits en stock bas : {join} » | `components/marchand/GestionStock.tsx:404` | 0 |
| `STOCK_012` | `:283` | a_migrer | € | « La valeur totale est {val} francs » | `components/marchand/GestionStock.tsx:407` | 0 |
| `STOCK_013` ⚠ | `:284` | a_migrer | € | « Le prix de vente n'est pas bon. Redis le prix. » | `components/marchand/GestionStock.tsx:467` | 0 |
| `STOCK_014` ⚠ | `:285` | a_migrer |  | « La quantité n'est pas bonne. » | `components/marchand/GestionStock.tsx:468` | 0 |
| `STOCK_015` ⚠ | `:286` | a_migrer | € | « Tu n'as pas mis le prix d'achat. On ne pourra pas calculer ton bénéfice. » | `components/marchand/GestionStock.tsx:474` | 0 |
| `STOCK_016` | `:287` | a_migrer |  | « {quantity} {unit} de {name} ajouté au stock » | `components/marchand/GestionStock.tsx:480` | 0 |
| `STOCK_017` | `:288` | a_migrer |  | « C'est mis à jour. » | `components/marchand/GestionStock.tsx:495` | 0 |
| `STOCK_018` | `:289` | a_migrer |  | « {reappNum} {unit} de {name} ajoutés. Stock à {newQty} {unit} » | `components/marchand/GestionStock.tsx:515` | 0 |
| `STOCK_019` | `:290` | a_migrer |  | « {name} supprimé » | `components/marchand/GestionStock.tsx:544` | 0 |
| `STOCK_020` | `:291` | a_migrer |  | « Ça n'a pas marché. Le produit n'est pas supprimé. » | `components/marchand/GestionStock.tsx:552` | 0 |
| `STOCK_021` | `:292` | a_migrer |  | « {name} mis à jour » | `components/marchand/GestionStock.tsx:598` | 0 |
| `STOCK_022` | `:293` | a_migrer |  | « Ça n'a pas été enregistré. Réessaie, s'il te plaît. » | `components/marchand/GestionStock.tsx:602` | 0 |
| `STOCK_023` | `:294` | a_migrer |  | « Nom du produit » | `components/marchand/GestionStock.tsx:860` | 0 |
| `STOCK_024` | `:295` | a_migrer | € | « Prix de vente » | `components/marchand/GestionStock.tsx:897` | 0 |
| `STOCK_025` | `:296` | a_migrer |  | « Plus de détails » | `components/marchand/GestionStock.tsx:904` | 0 |
| `STOCK_026` ⚠ | `:297` | a_migrer |  | « Moins de détails » | `components/marchand/GestionStock.tsx:904` | 0 |
| `STOCK_027` ⚠ | `:298` | a_migrer | € | « Prix d'achat, facultatif » | `components/marchand/GestionStock.tsx:912` | 0 |
| `STOCK_028` | `:377` | a_migrer |  | « Bienvenue {prenoms} dans ta gestion de production. Je peux t'aider à gérer tes récoltes. Que veux-tu faire ? » | `components/producteur/Stocks.tsx:162` | 0 |
| `STOCK_029` | `:378` | a_migrer |  | « D'accord ! Dis-moi ce que tu veux faire : ajouter une récolte, modifier une quantité, ou consulter ta production » | `components/producteur/Stocks.tsx:217` | 0 |
| `STOCK_030` | `:379` | a_migrer |  | « D'accord ! Je reste là si tu as besoin » | `components/producteur/Stocks.tsx:221` | 0 |
| `STOCK_031` | `:380` | a_migrer |  | « Parfait ! {quantity} kg de {name} ajouté à ta production » | `components/producteur/Stocks.tsx:245` | 0 |
| `STOCK_032` | `:381` | a_migrer |  | « Production mise à jour ! {name} : {quantity} {unit} » | `components/producteur/Stocks.tsx:250` | 0 |
| `STOCK_033` | `:382` | a_migrer |  | « D'accord, action annulée » | `components/producteur/Stocks.tsx:257` | 0 |
| `STOCK_034` | `:383` | a_migrer |  | « Tu as {quantity} {unit} de {name} en stock » | `components/producteur/Stocks.tsx:268` | 0 |
| `STOCK_035` | `:384` | a_migrer |  | « Je n'ai pas trouvé ce produit dans ta production » | `components/producteur/Stocks.tsx:271` | 0 |
| `STOCK_036` | `:385` | a_migrer | € | « La valeur totale de ta production est de {totalValue} francs CFA » | `components/producteur/Stocks.tsx:279` | 0 |
| `STOCK_037` | `:386` | a_migrer |  | « Tu as {stocks} produits différents en production » | `components/producteur/Stocks.tsx:285` | 0 |
| `STOCK_038` | `:387` | a_migrer |  | « Tu as {lowStocks} produits en stock bas : {join} » | `components/producteur/Stocks.tsx:295` | 0 |
| `STOCK_039` | `:388` | a_migrer |  | « Tu veux ajouter {quantity} {unit} de {name} à ta production actuelle de {quantity} {unit}. Je confirme ? » | `components/producteur/Stocks.tsx:307` | 0 |
| `STOCK_040` | `:389` | a_migrer |  | « Tu veux ajouter {quantity} kg de {productName} à ta production. Je confirme ? » | `components/producteur/Stocks.tsx:315` | 0 |
| `STOCK_041` | `:390` | a_migrer |  | « Voici {name} » | `components/producteur/Stocks.tsx:351` | 0 |
| `STOCK_042` | `:391` | a_migrer |  | « Je n'ai pas compris. Demande-moi d'ajouter une récolte, de consulter ta production, ou de filtrer par catégorie » | `components/producteur/Stocks.tsx:355` | 0 |
| `STOCK_043` | `:392` | a_migrer |  | « {name} ajouté avec succès » | `components/producteur/Stocks.tsx:457` | 0 |
| `STOCK_044` | `:393` | a_migrer |  | « {name} supprimé de la production » | `components/producteur/Stocks.tsx:486` | 0 |

## Domaine `vente` — 41 phrase(s)

| Clé | catalog.ts | Statut | € | Texte fr-ci (dit) | Source déclarée | Usages |
|---|---|---|---|---|---|---|
| `TATA_MESURE_DE_PRODUIT` | `:60` | migre |  | « {mesure} de {produit} » | `services/relectureSpontanee.ts:120 ; services/dialoguesTata.ts:103` | 2 |
| `TATA_QUANTITE_PRODUIT` | `:61` | migre |  | « {quantite} {produit} » | `services/relectureSpontanee.ts:121 ; services/dialoguesTata.ts:46,104` | 3 |
| `TATA_QUANTITE_UNITE_PRODUIT` | `:62` | migre |  | « {quantite} {unite} de {produit} » | `services/dialoguesTata.ts:43` | 2 |
| `TATA_RESUME_PRIX_UNITAIRE` | `:63` | migre | € | « {resume} à {prix} {symboleDevise} » | `services/dialoguesTata.ts:53` | 1 |
| `TATA_RESUME_PRIX_TOTAL` | `:64` | migre | € | « {resume} pour {total} {symboleDevise} » | `services/dialoguesTata.ts:56` | 1 |
| `TATA_INVITE` | `:65` | migre |  | « Touche-moi et dis ce que tu as vendu. » | `services/dialoguesTata.ts:60` | 1 |
| `TATA_RIEN_COMPRIS` | `:66` | migre |  | « Je n'ai pas bien entendu. Rapproche le téléphone et redis lentement. » | `services/dialoguesTata.ts:61` | 1 |
| `TATA_AJOUT_PANIER` | `:67` | migre | € | « C'est dans le panier. Tu ajoutes autre chose, ou tu encaisses ? » | `services/dialoguesTata.ts:62` | 2 |
| `TATA_ANNULATION_ETAPE` | `:68` | migre |  | « D'accord, on oublie ça. Le panier n'a pas bougé. » | `services/dialoguesTata.ts:63` | 1 |
| `TATA_COMPRIS` | `:69` | migre | € | « J'ai compris : {quantite} pour {montant} {devise}. {suite} » | `services/dialoguesTata.ts:105` | 1 |
| `TATA_ERREUR_MOTEUR` | `:70` | migre |  | « Ma voix ne marche pas ici. Tape ta vente, je t'accompagne. » | `services/dialoguesTata.ts:114` | 1 |
| `TATA_PRIX_MANQUANT` | `:71` | migre | € | « Et c'est à combien ? » | `services/dialoguesTata.ts:117` | 1 |
| `TATA_QUANTITE_MANQUANTE` | `:72` | migre |  | « Combien de {produit} ? » | `services/dialoguesTata.ts:121` | 1 |
| `TATA_CE_PRODUIT` | `:73` | migre |  | « ce produit » | `services/dialoguesTata.ts:121` | 3 |
| `TATA_AMBIGUITE` | `:74` | migre | € | « {montant} {devise}, c'est le prix d'un seul, ou de tous les {quantite} ? » | `services/dialoguesTata.ts:126` | 5 |
| `TATA_AMBIGUITE_DOROME` | `:75` | reference | € | « {montant} {devise}, ou {montant} dɔrɔmɛ — c'est-à-dire {montantDorome} {devise} ? » | `voice-offline/nombresMandingue.ts:CLE_CLARIFICATION_UNITE` | 1 |
| `TATA_CONFIRMATION_UNITAIRE` | `:76` | migre | € | « J'ai compris : {quantite} à {prixUnitaire} {devise}. Total : {total} {devise}. C'est bon ? » | `services/dialoguesTata.ts:138` | 3 |
| `TATA_CONFIRMATION_TOTAL` | `:77` | migre | € | « J'ai compris : {quantite} pour {total} {devise}. C'est bon ? » | `services/dialoguesTata.ts:141` | 3 |
| `TATA_CORRECTION_RECUE` | `:78` | migre | € | « D'accord : {resume}. C'est bon ? » | `services/dialoguesTata.ts:148` | 1 |
| `TATA_UNITE_INCOMPATIBLE` | `:79` | migre | € | « Tu dis {uniteParlee}, mais {produit} est au prix du {uniteCatalogue}. Dis-moi combien tu l'as vendu. » | `services/vendreVocalUnifie.ts:147` | 2 |
| `TATA_PRIX_INCONNU_PRODUIT` | `:80` | migre | € | « Je n'ai pas le prix de {produit}. Redis-moi combien tu l'as vendu. » | `services/vendreVocalUnifie.ts:152` | 2 |
| `TATA_PRIX_INCOMPRIS` | `:81` | migre | € | « Je n'ai pas compris le prix. Redis-moi combien tu as vendu. » | `services/vendreVocalUnifie.ts:153` | 2 |
| `TATA_PRODUIT_INCONNU_AJOUTER` | `:82` | migre |  | « Je ne connais pas {produit} dans ta boutique. Je l'ajoute ? » | `services/vendreVocalUnifie.ts:225` | 1 |
| `TATA_CONFIRME_VENTE` | `:83` | migre | € | « Vente de {quantite}{produit}{montant}, c'est bien ça ? » | `voice-offline/localIntent.ts:139` | 1 |
| `TATA_PART_QUANTITE` | `:84` | migre |  | « {quantite}  » | `voice-offline/localIntent.ts:139` | 1 |
| `TATA_PART_POUR_MONTANT` | `:85` | migre | € | «  pour {montant} {devise} » | `voice-offline/localIntent.ts:136` | 1 |
| `TATA_PRODUIT_GENERIQUE` | `:88` | migre |  | « produit » | `voice-offline/localIntent.ts:133` | 1 |
| `TATA_PRODUIT_POSE` | `:108` | migre | € | « {produit}, {montant} {devise} le {unite}. C'est sur ton étal. » | `components/marchand/AjoutProduitGuide.tsx` | 1 |
| `TATA_UNITE_CHOISIE` | `:109` | migre |  | « Le {unite}. » | `components/marchand/AjoutProduitGuide.tsx` | 1 |
| `TATA_ETAL_VIDE` | `:111` | migre |  | « Qu'est-ce que tu vends aujourd'hui ? Touche pour ajouter ton premier produit. » | `components/marchand/SaisieGuidee.tsx` | 3 |
| `TATA_REPLI_TOUCHE_PHOTO` | `:112` | migre |  | « Touche la photo de ce que tu as vendu. » | `components/marchand/SaisieGuidee.tsx:41` | 1 |
| `TATA_REPLI_PRIX_CONNU` | `:113` | migre | € | « Le prix est de {montant} {devise}. » | `components/marchand/SaisieGuidee.tsx:102` | 1 |
| `TATA_PRIX_EFFACE` | `:114` | migre | € | « Prix effacé. » | `components/marchand/SaisieGuidee.tsx:127 ; components/marchand/ConfirmationLigne.tsx:119` | 2 |
| `TATA_PRIX_D_UN_SEUL` | `:115` | migre | € | « Prix d'un seul. » | `components/marchand/SaisieGuidee.tsx:269 ; components/marchand/ConfirmationLigne.tsx:178` | 2 |
| `TATA_PRIX_DU_TOUT` | `:116` | migre | € | « Prix du tout. » | `components/marchand/SaisieGuidee.tsx:269 ; components/marchand/ConfirmationLigne.tsx:178` | 2 |
| `TATA_QUESTION_CORRECTION` | `:117` | migre | € | « Qu'est-ce qui est faux ? Change la quantité, ou le prix. » | `components/marchand/ConfirmationLigne.tsx:43` | 1 |
| `TATA_MICRO_INTRO_PRESELECTION` | `:119` | migre |  | « Appuie sur le micro, et dis ce que tu as vendu de {produit}. » | `components/marchand/MicroVenteCaisse.tsx:294` | 1 |
| `TATA_QUE_VENDRE` | `:120` | migre |  | « Que veux-tu vendre ? » | `components/marchand/MicroVenteCaisse.tsx:295` | 2 |
| `TATA_PRODUIT_AJOUTE_BOUTIQUE` | `:121` | migre |  | « C'est fait. {produit} est dans ta boutique. » | `components/marchand/MicroVenteCaisse.tsx:312` | 1 |
| `TATA_AJOUT_BOUTIQUE_ECHEC` | `:122` | migre |  | « Ça n'a pas marché. Tu pourras l'ajouter depuis Mon stock. » | `components/marchand/MicroVenteCaisse.tsx:314` | 1 |
| `TATA_ON_NE_CHANGE_RIEN` | `:123` | migre |  | « D'accord, on ne change rien. » | `components/marchand/MicroVenteCaisse.tsx:323` | 1 |

## Domaine `wallet` — 8 phrase(s)

| Clé | catalog.ts | Statut | € | Texte fr-ci (dit) | Source déclarée | Usages |
|---|---|---|---|---|---|---|
| `WALLET_001` | `:401` | a_migrer |  | « Demande envoyée. Confirme sur ton téléphone {name} » | `components/wallet/RechargeWalletModal.tsx:145` | 0 |
| `WALLET_002` | `:402` | a_migrer |  | « {name} sélectionné » | `components/wallet/RechargeWalletModal.tsx:77 ; components/wallet/WithdrawWalletModal.tsx:71` | 0 |
| `WALLET_003` | `:403` | a_migrer | € | « {selectedMontant} francs CFA » | `components/wallet/RechargeWalletModal.tsx:84 ; components/wallet/RechargeWalletModal.tsx:110 ; components/wallet/WithdrawWalletModal.tsx:86 ; +1` | 0 |
| `WALLET_004` | `:404` | a_migrer | € | « Solde masqué » | `components/wallet/WalletCard.tsx:40` | 0 |
| `WALLET_005` | `:405` | a_migrer | € | « Solde affiché » | `components/wallet/WalletCard.tsx:40` | 0 |
| `WALLET_006` | `:406` | a_migrer |  | « Mon argent fermé » | `components/wallet/WalletCard.tsx:50` | 0 |
| `WALLET_007` | `:407` | a_migrer |  | « Mon argent ouvert » | `components/wallet/WalletCard.tsx:50` | 0 |
| `WALLET_008` | `:408` | a_migrer | € | « Retrait de {montant} francs CFA en cours. Confirme sur ton téléphone. » | `components/wallet/WithdrawWalletModal.tsx:157` | 0 |
