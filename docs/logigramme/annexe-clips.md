# Annexe — Les 235 clips audio embarqués et leur atteignabilité

Généré par lecture de `frontend_src/public/voix/` (disque), de l'index `frontend_src/src/app/services/tataUiClips.ts` et des appels vocaux du code (voir `07-voix-transverse.md` §1-2). « Atteignable » = au moins un chemin du code peut jouer ce fichier : référence directe (hors `TATA_CLIPS` non demandées), clé `TATA_CLIPS` réellement demandée, ou phrase au texte identique dite par une porte qui consulte les clips (P3/P5). Les clips `fr-CI/prototype` ne jouent qu'avec `VITE_JULABA_VOICE_PREVIEW=true`.

Bilan : **235 fichiers, 37 atteignables (dont 15 prototypes sous drapeau), 198 jamais joués.** Huit fichiers `ui-*` ne sont même pas indexés (`ui-037, 041, 059, 062, 085, 096, 105, 108`, cf. `frontend_src/public/voix/registre-tata-fr-ci.json`, `fichiers_orphelins`). Le clip `chiffre-1.mp3` (« Un ») ne peut pas être trouvé par texte : l'index ignore les textes normalisés de moins de 3 caractères (`tataUiClips.ts:307-310`).

| Fichier | Texte exact du clip (tataUiClips.ts) | Atteignable par le code ? |
|---|---|---|
| `/voix/tata/chiffre-0.mp3` | « Zéro » | **NON** — aucun chemin ne le joue |
| `/voix/tata/chiffre-1.mp3` | « Un » | **NON** — aucun chemin ne le joue |
| `/voix/tata/chiffre-2.mp3` | « Deux » | **NON** — aucun chemin ne le joue |
| `/voix/tata/chiffre-3.mp3` | « Trois » | **NON** — aucun chemin ne le joue |
| `/voix/tata/chiffre-4.mp3` | « Quatre » | **NON** — aucun chemin ne le joue |
| `/voix/tata/chiffre-5.mp3` | « Cinq » | **NON** — aucun chemin ne le joue |
| `/voix/tata/chiffre-6.mp3` | « Six » | **NON** — aucun chemin ne le joue |
| `/voix/tata/chiffre-7.mp3` | « Sept » | **NON** — aucun chemin ne le joue |
| `/voix/tata/chiffre-8.mp3` | « Huit » | **NON** — aucun chemin ne le joue |
| `/voix/tata/chiffre-9.mp3` | « Neuf » | **NON** — aucun chemin ne le joue |
| `/voix/tata/core-ack-01.mp3` | « C'est fait net ! » | **NON** — aucun chemin ne le joue |
| `/voix/tata/core-ack-02.mp3` | « C'est bien reçu ! » | **NON** — aucun chemin ne le joue |
| `/voix/tata/core-ack-03.mp3` | « J'ai calé ça ! » | **NON** — aucun chemin ne le joue |
| `/voix/tata/core-ack-04.mp3` | « C'est noté deh ! » | **NON** — aucun chemin ne le joue |
| `/voix/tata/core-ack-05.mp3` | « C'est bien enregistré ! » | **NON** — aucun chemin ne le joue |
| `/voix/tata/core-ack-06.mp3` | « C'est calé, ta vente est bien entrée dans la machine. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/core-ack-07.mp3` | « D'accord, j'annule ça. Y'a pas de souci. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/core-err-01.mp3` | « Je n'ai pas bien capté. Faut me redire ça autrement, s'il te plaît. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/core-err-02.mp3` | « Je n'ai rien entendu, deh. Réessaie en haussant un peu la voix. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/core-err-03.mp3` | « Dis oui pour confirmer, ou bien dis non pour laisser tomber. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/core-err-04.mp3` | « Appuie sur Oui ou sur Non sur l'écran. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/core-sys-01.mp3` | « Je chauffe ma voix un coup, patiente deux minutes. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/core-sys-02.mp3` | « La voix n'est pas sortie. Regarde ton réseau et puis réessaie. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/core-wait-01.mp3` | « Je regarde ça un coup... » | **NON** — aucun chemin ne le joue |
| `/voix/tata/core-wait-02.mp3` | « Attends deux minutes... » | **NON** — aucun chemin ne le joue |
| `/voix/tata/core-wait-03.mp3` | « Je vérifie ça tout de suite... » | **NON** — aucun chemin ne le joue |
| `/voix/tata/core-wait-04.mp3` | « Je gère ça pour toi... » | **NON** — aucun chemin ne le joue |
| `/voix/tata/core-wait-05.mp3` | « Je fais le point... » | **NON** — aucun chemin ne le joue |
| `/voix/tata/core-wait-06.mp3` | « J'enregistre ta vente là tout de suite... » | **NON** — aucun chemin ne le joue |
| `/voix/tata/core-wait-07.mp3` | « Laisse-moi relancer encore... » | **NON** — aucun chemin ne le joue |
| `/voix/tata/crd-02.mp3` | « L'avance qu'elle t'a donnée dépasse ou bien c'est égal au prix total. Enregistre ça comme vente cash directement. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/crd-04.mp3` | « Donne-moi d'abord le nom de la cliente. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/dep-02.mp3` | « Attention, l'argent-là est beaucoup, deh ! Vérifie bien si tu ne t'es pas trompée. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/login-02.mp3` | « Eh, ma fille ! Te voilà. On continue, non ? » | **NON** — aucun chemin ne le joue |
| `/voix/tata/login-03.mp3` | « Chaque vente, tu mets ça ici. Comme ça là, tu n'oublies rien et tout ton point est là. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/login-04.mp3` | « Bon, pour commencer là, appuie ici. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/login-05.mp3` | « Mets ton numéro de téléphone ici. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/login-06.mp3` | « Tu peux me dicter aussi, hein. Appuie sur le micro d'abord. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/login-07.mp3` | « Dis les chiffres doucement doucement, un à un. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/login-08.mp3` | « Tu veux réécouter ça ? Appuie ici. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/login-09.mp3` | « C'est bien ton numéro, non ? Appuie ici pour avancer. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/login-10.mp3` | « Tu t'es trompée ? Y'a pas problème, c'est rien. Appuie ici pour effacer. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/login-11.mp3` | « Il manque encore des chiffres dedans. Continue. » | référencé : services/entreeVoix.ts |
| `/voix/tata/login-12-14.mp3` | « Regarde bien, y'a un chiffre qui n'est pas bon dedans. Si tu veux, tape ton numéro directement ici. » | référencé : services/entreeVoix.ts |
| `/voix/tata/login-12.mp3` | « Regarde bien, y'a un chiffre qui n'est pas bon dedans. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/login-13.mp3` | « Je n'ai pas bien entendu, deh. Redis-moi ça doucement. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/login-14.mp3` | « Si tu veux, tape ton numéro directement ici. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/login-15.mp3` | « Pour que je puisse bien t'entendre, appuie sur "Autoriser". » | **NON** — aucun chemin ne le joue |
| `/voix/tata/login-16.mp3` | « Le micro ne prend pas là. Faut taper ton numéro ici. » | référencé : services/entreeVoix.ts |
| `/voix/tata/login-17.mp3` | « C'est bon maintenant. Appuie sur le micro et puis parle. » | référencé : services/entreeVoix.ts |
| `/voix/tata/login-18.mp3` | « Attends un peu, je vérifie ça pour toi. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/login-19.mp3` | « Bon, mets les quatre chiffres de ton code secret. » | référencé : services/entreeVoix.ts |
| `/voix/tata/login-20.mp3` | « Appuie sur tes quatre photos, une à une, comme tu avais choisi là. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/login-21.mp3` | « Voilà les photos qui sont sorties à la place des chiffres. Ton code n'a pas changé. » | référencé : services/entreeVoix.ts |
| `/voix/tata/login-22.mp3` | « Voilà les chiffres maintenant. Mets ton code comme d'habitude. » | référencé : services/entreeVoix.ts |
| `/voix/tata/login-23.mp3` | « Ton code là, c'est pour toi seule. Faut jamais montrer ou dire ça à quelqu'un. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/login-24.mp3` | « C'est effacé net. » | référencé : services/entreeVoix.ts |
| `/voix/tata/login-25.mp3` | « Appuie ici. Ton propre téléphone va te guider. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/login-26.mp3` | « Ça n'a pas pris. On passe par ton code directement. » | référencé : services/entreeVoix.ts |
| `/voix/tata/login-27.mp3` | « Ce n'est pas toi ? Y'a pas problème, appuie ici pour taper ton numéro. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/login-28.mp3` | « Le numéro ou le code n'est pas bon, deh. Regarde bien avant de reprendre. » | référencé : services/entreeVoix.ts |
| `/voix/tata/login-29.mp3` | « Attention, hein ! Il te reste une seule chance. Prends bien ton temps. » | référencé : services/entreeVoix.ts |
| `/voix/tata/login-30.mp3` | « Tu as trop forcé. Patiente un peu d'abord avant de réessayer. » | référencé : services/entreeVoix.ts |
| `/voix/tata/login-31.mp3` | « Ma fille, là c'est bloqué net. Faut aller voir ton agent pour te débloquer. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/login-32.mp3` | « Eh, le réseau ne passe pas là ! Réessaie dans un petit moment. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/login-33.mp3` | « Ça pèse un peu. Patiente, je suis en train de relancer. » | référencé : services/entreeVoix.ts |
| `/voix/tata/login-34.mp3` | « Maintenant là, choisis ton propre code secret. C'est pour toi seule, hein. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/login-35.mp3` | « D'accord, c'est calé comme ça. » | référencé : services/entreeVoix.ts |
| `/voix/tata/login-36.mp3` | « D'accord, on continue comme d'habitude. » | référencé : services/entreeVoix.ts |
| `/voix/tata/login-37.mp3` | « Voilà, ma fille. Allons-y ! » | **NON** — aucun chemin ne le joue |
| `/voix/tata/stk-02.mp3` | « Quel produit vivrier tu veux faire entrer dans le stock ? » | **NON** — aucun chemin ne le joue |
| `/voix/tata/stk-06.mp3` | « Tout ton stock est bien chargé, y'a pas de manque. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/stk-08.mp3` | « Tu n'as pas mis à combien tu as payé ça au gros. On ne pourra pas calculer ton vrai bénéfice. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-001.mp3` | « Alertes basses ignorées » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-002.mp3` | « Au revoir. Déconnexion du Back-Office. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-003.mp3` | « Besoin mis à jour » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-004.mp3` | « Bienvenue sur le terminal de vente. Ajoute tes produits au panier » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-005.mp3` | « Bonjour ! Tu veux écrire ou parler avec moi ? » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-006.mp3` | « Bonne réponse ! » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-007.mp3` | « Ce client a droit à sa récompense ! » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-008.mp3` | « Chargement du document en cours » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-009.mp3` | « Choisissez un nouveau document » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-010.mp3` | « Combien tu as en caisse ce matin ? » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-011.mp3` | « Commande annulée » | hooks/useVoiceCore.ts:799 (clé annule) |
| `/voix/tata/ui-012.mp3` | « Commande marquée comme livrée » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-013.mp3` | « Commande refusée. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-014.mp3` | « Commandes livrées » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-015.mp3` | « Commandes urgentes » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-016.mp3` | « Connexion refusée. Vérifie tes identifiants. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-017.mp3` | « Connexion rétablie » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-018.mp3` | « Contact mis à jour » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-019.mp3` | « Contre-offre refusée. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-020.mp3` | « Contre-proposition envoyée » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-021.mp3` | « Création de plantation agricole » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-022.mp3` | « Création en cours... » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-023.mp3` | « Demande acceptée » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-024.mp3` | « Demande refusée » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-025.mp3` | « Document chargé avec succès. En attente de vérification » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-026.mp3` | « Document sauvegardé avec succès » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-027.mp3` | « Document supprimé » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-028.mp3` | « Document tourné » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-029.mp3` | « Début de la formation » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-030.mp3` | « Déclaration de récolte » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-031.mp3` | « Déclarer une récolte » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-032.mp3` | « Déconnexion en cours » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-033.mp3` | « Dépense de » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-034.mp3` | « Dépense enregistrée » | **NON** — déclaré dans `TATA_CLIPS` (services/tataVoice.ts) mais aucune clé demandée par le code |
| `/voix/tata/ui-035.mp3` | « Entre ton code secret à 4 chiffres » | texte identique dit par un canal à clip : components/auth/ChangePasswordScreen.tsx:215 |
| `/voix/tata/ui-036.mp3` | « Entre un montant valide » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-037.mp3` | *(non indexé dans tataUiClips.ts)* | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-038.mp3` | « Erreur de synchronisation. Fiche sauvegardée localement. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-039.mp3` | « Erreur lors de l'enregistrement » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-040.mp3` | « Erreur lors de l'enregistrement de la vente » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-041.mp3` | *(non indexé dans tataUiClips.ts)* | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-042.mp3` | « Erreur lors de la modification » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-043.mp3` | « Erreur lors de la publication » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-044.mp3` | « Erreur lors de la publication, réessaie » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-045.mp3` | « Erreur lors du rechargement » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-046.mp3` | « Erreur lors du retrait » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-047.mp3` | « Erreur réseau. Réessaie. » | **NON** — déclaré dans `TATA_CLIPS` (services/tataVoice.ts) mais aucune clé demandée par le code |
| `/voix/tata/ui-048.mp3` | « Erreur, réessaie » | texte identique dit par un canal à clip : components/auth/ChangePasswordScreen.tsx:222 |
| `/voix/tata/ui-049.mp3` | « Export en cours » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-050.mp3` | « Fiche mise à jour » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-051.mp3` | « Fiche mise à jour et synchronisée » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-052.mp3` | « Format de fichier invalide. Utilise une image. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-053.mp3` | « Identité mise à jour » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-054.mp3` | « Image trop lourde. Maximum 2 mégaoctets. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-055.mp3` | « Indique le nom du produit » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-056.mp3` | « Informations personnelles enregistrées avec succès » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-057.mp3` | « J'ai compris » | texte identique dit par un canal à clip : hooks/useVoiceCore.ts:788 |
| `/voix/tata/ui-058.mp3` | « Je n'ai pas compris. Tape ton numéro, ou réessaie. » | référencé : services/entreeVoix.ts |
| `/voix/tata/ui-059.mp3` | *(non indexé dans tataUiClips.ts)* | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-060.mp3` | « La commande du marchand a été acceptée. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-061.mp3` | « La quantité doit être supérieure à zéro » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-062.mp3` | *(non indexé dans tataUiClips.ts)* | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-063.mp3` | « Le montant doit être un multiple de 100 francs » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-064.mp3` | « Le montant doit être un multiple de 5 francs » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-065.mp3` | « Le montant minimum est de 200 FCFA » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-066.mp3` | « Le montant saisi est invalide » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-067.mp3` | « Le produit a été retiré de votre marketplace. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-068.mp3` | « Le stock disponible ne peut pas dépasser la quantité totale de la récolte » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-069.mp3` | « Livraison déclarée. Le marchand va confirmer la réception. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-070.mp3` | « Ma Plantation » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-071.mp3` | « Mes revenus » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-072.mp3` | « Mes récoltes » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-073.mp3` | « Mode hors ligne » | **NON** — déclaré dans `TATA_CLIPS` (services/tataVoice.ts) mais aucune clé demandée par le code |
| `/voix/tata/ui-074.mp3` | « Mode édition activé » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-075.mp3` | « Modification en cours... » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-076.mp3` | « Modifications annulées » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-077.mp3` | « Modifier la récolte » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-078.mp3` | « Mon Historique de ventes » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-079.mp3` | « Mon Marché » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-080.mp3` | « Montant invalide » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-081.mp3` | « Montant total invalide » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-082.mp3` | « Numéro Mobile Money invalide. Dix chiffres requis » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-083.mp3` | « Numéro de téléphone invalide. Format attendu : 07XXXXXXXX » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-084.mp3` | « Ouverture de ton Wallet Jùlaba » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-085.mp3` | *(non indexé dans tataUiClips.ts)* | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-086.mp3` | « Ouverture des détails de la carte d'identité » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-087.mp3` | « Ouverture des détails de la certification JULABA » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-088.mp3` | « Ouverture du Wallet Jùlaba » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-089.mp3` | « Ouvre le formulaire de rechargement Mobile Money » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-090.mp3` | « Ouvre le formulaire de retrait Mobile Money » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-091.mp3` | « Ouvre ta journée pour activer ta caisse » | **NON** — déclaré dans `TATA_CLIPS` (services/tataVoice.ts) mais aucune clé demandée par le code |
| `/voix/tata/ui-092.mp3` | « Paiement confirmé ! Ton Keiwa est rechargé. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-093.mp3` | « Paiement en cours — confirme sur ton téléphone » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-094.mp3` | « Paiement récupéré ! L'argent est dans ton Keiwa. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-095.mp3` | « Paramètres sauvegardés » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-096.mp3` | *(non indexé dans tataUiClips.ts)* | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-097.mp3` | « Photo modifiée » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-098.mp3` | « Plantation créée avec succès ! » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-099.mp3` | « Prix invalide » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-100.mp3` | « Problème avec le micro — réessaie » | référencé : services/entreeVoix.ts |
| `/voix/tata/ui-101.mp3` | « Publication en cours... » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-102.mp3` | « Publication modifiée avec succès ! » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-103.mp3` | « Publication sur le marché en cours » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-104.mp3` | « Quantité invalide » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-105.mp3` | *(non indexé dans tataUiClips.ts)* | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-106.mp3` | « Recharger votre keiwa » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-107.mp3` | « Remplis tous les champs obligatoires » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-108.mp3` | *(non indexé dans tataUiClips.ts)* | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-109.mp3` | « Retour au choix du montant » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-110.mp3` | « Retour au choix du service » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-111.mp3` | « Retrait confirmé ! Ton solde a été mis à jour. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-112.mp3` | « Réception confirmée. Passons au paiement. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-113.mp3` | « Récolte publiée avec succès ! » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-114.mp3` | « Saisir un autre montant » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-115.mp3` | « Saisis le nom du produit » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-116.mp3` | « Saisis une quantité valide » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-117.mp3` | « Signalement de problème » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-118.mp3` | « Solde insuffisant » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-119.mp3` | « Suivre une nouvelle plantation » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-120.mp3` | « Ta demande a été envoyée » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-121.mp3` | « Ton streak a été réinitialisé » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-122.mp3` | « Ton streak est sauvé grâce au bouclier ! » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-123.mp3` | « Toute ta production est au-dessus du seuil. Tout va bien ! » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-124.mp3` | « Toutes les commandes » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-125.mp3` | « Trop de tentatives incorrectes. Réessaie dans 5 minutes. » | référencé : services/entreeVoix.ts |
| `/voix/tata/ui-126.mp3` | « Tu vas être redirigé vers Wave pour confirmer le paiement » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-127.mp3` | « Téléchargement de la carte » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-128.mp3` | « Vente confirmée » | **NON** — déclaré dans `TATA_CLIPS` (services/tataVoice.ts) mais aucune clé demandée par le code |
| `/voix/tata/ui-129.mp3` | « Vente refusée » | **NON** — déclaré dans `TATA_CLIPS` (services/tataVoice.ts) mais aucune clé demandée par le code |
| `/voix/tata/ui-130.mp3` | « Verso de la carte » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-131.mp3` | « Voici tes céréales en production » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-132.mp3` | « Voici tes fruits en production » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-133.mp3` | « Voici tes légumes en production » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-134.mp3` | « Voici tes tubercules en production » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-135.mp3` | « Voici tous tes produits en production » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-136.mp3` | « Votre besoin a été soumis à la coopérative » | **NON** — aucun chemin ne le joue |
| `/voix/tata/ui-137.mp3` | « À bientôt sur Jùlaba » | **NON** — aucun chemin ne le joue |
| `/voix/tata/vente-01.mp3` | « Appuie sur moi et puis dis-moi ce que tu as vendu au marché. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/vente-02.mp3` | « Je n'ai pas bien capté. Rapproche le téléphone de ta bouche et puis parle doucement. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/vente-03.mp3` | « C'est rentré dans le panier. Tu ajoutes encore ou bien on encaisse l'argent ? » | **NON** — aucun chemin ne le joue |
| `/voix/tata/vente-04.mp3` | « D'accord, on laisse tomber ça. Ton panier n'a pas bougé. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/vente-05.mp3` | « Ma voix ne sort pas là. Tape ta vente sur le clavier, je suis avec toi. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/vente-06.mp3` | « Et puis c'est à combien ? » | **NON** — aucun chemin ne le joue |
| `/voix/tata/vente-14.mp3` | « Tu n'as pas encore fait de vente aujourd'hui. Y'a pas problème, le marché va s'ouvrir ! » | **NON** — aucun chemin ne le joue |
| `/voix/tata/vente-18.mp3` | « L'argent est tombé pile, y'a pas de monnaie. » | **NON** — aucun chemin ne le joue |
| `/voix/tata/wlt-01.mp3` | « Ton argent est caché » | **NON** — aucun chemin ne le joue |
| `/voix/tata/wlt-08.mp3` | « Ton argent est affiché » | **NON** — aucun chemin ne le joue |
| `/voix/fr-CI/prototype/tata-accueil-caisse.mp3` | *(non indexé dans tataUiClips.ts)* | référencé : services/accueilMarchandVoix.ts |
| `/voix/fr-CI/prototype/tata-accueil-comptoir.mp3` | *(non indexé dans tataUiClips.ts)* | référencé : services/accueilMarchandVoix.ts |
| `/voix/fr-CI/prototype/tata-accueil-preview.mp3` | *(non indexé dans tataUiClips.ts)* | référencé : services/onboardingVoix.ts |
| `/voix/fr-CI/prototype/tata-entree-code-erreur.mp3` | *(non indexé dans tataUiClips.ts)* | référencé : services/entreeVoix.ts |
| `/voix/fr-CI/prototype/tata-entree-code.mp3` | *(non indexé dans tataUiClips.ts)* | référencé : services/entreeVoix.ts |
| `/voix/fr-CI/prototype/tata-entree-connexion.mp3` | *(non indexé dans tataUiClips.ts)* | référencé : services/entreeVoix.ts |
| `/voix/fr-CI/prototype/tata-entree-numero-voix.mp3` | *(non indexé dans tataUiClips.ts)* | référencé : services/entreeVoix.ts |
| `/voix/fr-CI/prototype/tata-entree-numero.mp3` | *(non indexé dans tataUiClips.ts)* | référencé : services/entreeVoix.ts |
| `/voix/fr-CI/prototype/tata-entree-presentation.mp3` | *(non indexé dans tataUiClips.ts)* | référencé : services/onboardingVoix.ts |
| `/voix/fr-CI/prototype/tata-entree-reconnaissance.mp3` | *(non indexé dans tataUiClips.ts)* | référencé : services/entreeVoix.ts |
| `/voix/fr-CI/prototype/tata-reconnaissance-erreur.mp3` | *(non indexé dans tataUiClips.ts)* | référencé : services/accueilMarchandVoix.ts |
| `/voix/fr-CI/prototype/tata-reconnaissance-proposition.mp3` | *(non indexé dans tataUiClips.ts)* | référencé : services/accueilMarchandVoix.ts |
| `/voix/fr-CI/prototype/tata-reconnaissance-refus.mp3` | *(non indexé dans tataUiClips.ts)* | référencé : services/accueilMarchandVoix.ts |
| `/voix/fr-CI/prototype/tata-reconnaissance-reussie.mp3` | *(non indexé dans tataUiClips.ts)* | référencé : services/accueilMarchandVoix.ts |
| `/voix/fr-CI/prototype/tata-reconnaissance-session.mp3` | *(non indexé dans tataUiClips.ts)* | référencé : services/accueilMarchandVoix.ts |
