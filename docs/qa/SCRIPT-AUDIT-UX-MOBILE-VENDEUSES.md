# Script d’audit UX/UI mobile — vendeuses peu alphabétisées

**Produit :** Jùlaba  
**Plateforme prioritaire :** application Android (APK)  
**Comparaison obligatoire :** PWA avec le même manifeste de release  
**Durée par participante :** 45 à 60 minutes  
**Auteur :** Manus AI  
**Version :** 1.0 — 20 septembre 2026

## 1. Décision recherchée

Cet audit doit déterminer si une vendeuse peu alphabétisée peut accomplir seule les gestes essentiels de sa journée, comprendre ce que Jùlaba a réellement fait et récupérer après une erreur. Il ne cherche pas à savoir si l’interface est « jolie ».

La règle de référence est la loi Jùlaba : **chaque action importante se voit, s’entend et se touche**. Un parcours échoue si la participante doit lire un libellé pour avancer, si elle comprend mal un montant, si elle croit qu’une opération en attente est confirmée, ou si l’APK et la PWA donnent deux résultats différents.[1]

> **Règle de modération :** nous testons l’application, jamais la participante. Une hésitation ou une erreur indique un problème de conception, pas un manque de compétence de la vendeuse.

## 2. Périmètre de l’audit

Le test couvre l’entrée dans l’application, l’ouverture de journée, la vente tactile, la vente vocale, la dépense, l’argent reçu et la monnaie à rendre, le fonctionnement hors ligne, la reprise après coupure, la lecture du résumé, l’annulation d’une erreur, la confidentialité et le mode soleil. Ces parcours correspondent au fil réel d’une journée marchande documenté dans Jùlaba.[2]

Le test vocal complet doit être exécuté sur l’APK. Sur le web, l’absence de dictée hors ligne ne doit pas être comptée comme un défaut si le clavier reste utilisable et si l’interface ne promet pas le contraire. Le runtime marchand ne doit effectuer aucun appel distant de reconnaissance ou de synthèse pendant une vente hors ligne.[3]

Les fonctions encore hors pilote, notamment le crédit ou un paiement mobile non réellement raccordé, ne doivent pas être montrées comme disponibles. Si elles apparaissent, leur simple présence est une anomalie de promesse produit.

## 3. Participants

### 3.1 Échantillon conseillé

Effectuer d’abord un pilote avec **deux vendeuses**, corriger le protocole, puis conduire la session principale avec **huit à douze participantes**. Le groupe doit inclure des détaillantes, au moins une demi-grossiste ou grossiste, des utilisatrices âgées et des personnes peu habituées aux smartphones.

Ne pas administrer de « test de lecture ». Demander simplement comment la participante utilise habituellement son téléphone et si elle préfère écouter, reconnaître des images ou lire. Cette formulation évite de la mettre en difficulté.

### 3.2 Critères à équilibrer

| Dimension | Couverture minimale recherchée |
|---|---|
| Lecture | Au moins la moitié déclare lire difficilement ou pas du tout |
| Téléphone | Faible et moyenne aisance avec Android |
| Âge | Inclure au moins deux participantes de 55 ans ou plus |
| Expérience Jùlaba | Mélanger nouvelles utilisatrices et utilisatrices déjà exposées |
| Commerce | Détaillante majoritaire, avec au moins un profil de négoce |
| Langue | Français ivoirien ; sessions Dioula séparées avec modératrice ou interprète locale |

## 4. Éthique et protection des participantes

Utiliser uniquement des comptes, produits, clients, ventes et numéros de téléphone fictifs. Ne pas enregistrer de vraie vente et ne pas manipuler d’argent réel. Employer des billets factices ou des cartes imprimées représentant les coupures FCFA.

Obtenir un consentement oral dans une langue comprise. Préciser que la participante peut arrêter à tout moment, qu’aucune note ne lui est attribuée et que son identité ne figurera pas dans le rapport. Demander une autorisation séparée pour filmer les mains, l’écran ou enregistrer la voix. Ne jamais filmer son visage par défaut.

## 5. Équipe et matériel

Prévoir un modérateur, un observateur et, si possible, une personne chargée de la technique. Une même personne ne doit pas simultanément aider la participante et consigner tous les détails.

Le matériel comprend :

- un téléphone Android d’entrée de gamme avec l’APK candidat ;
- un second téléphone ou navigateur avec la PWA du même build ;
- un accès permettant d’activer et couper le réseau ;
- des cartes représentant les billets et pièces FCFA ;
- une batterie externe ;
- la grille d’observation fournie avec ce protocole ;
- un chronomètre silencieux ;
- un espace calme, puis une courte phase en bruit de marché ou en extérieur ;
- un dispositif de capture d’écran uniquement si la participante l’autorise.

## 6. Préparation technique

### 6.1 Manifeste de session

Avant chaque série, consigner :

| Élément | Valeur à renseigner |
|---|---|
| Commit Git | |
| Version APK | |
| Version PWA | |
| SHA du frontend | |
| SHA de l’API | |
| Manifeste vocal | |
| Modèle du téléphone | |
| Version Android | |
| Taille et résolution d’écran | |
| Luminosité | |
| Réseau de départ | |
| Mode d’accès initial | Auto |
| Langue initiale | Français |

Interrompre l’audit comparatif si l’APK et la PWA ne correspondent pas à la même release. Les résultats ne permettraient pas d’identifier la cause d’une divergence.

### 6.2 Données de test

Créer un compte marchand par participante ou réinitialiser entièrement le compte entre les sessions. La journée doit être fermée, le panier vide et la file hors ligne sans opération antérieure.

Préparer ce catalogue :

| Produit | Prix de vente | Unité | Stock initial |
|---|---:|---|---:|
| Tomate | 500 F | tas | 20 |
| Banane | 300 F | tas | 20 |
| Riz | 1 000 F | sac | 10 |

Préparer également une vente de démonstration annulable dans l’historique, sans utiliser les opérations produites par une participante précédente.

## 7. Consignes au modérateur

### 7.1 Introduction à lire mot pour mot

> Bonjour. Aujourd’hui, nous allons essayer Jùlaba ensemble. C’est l’application que nous testons, pas toi. Il n’y a pas de mauvaise réponse. Si quelque chose est difficile, c’est important que nous le voyions. Fais comme tu ferais normalement au marché. Tu peux parler, toucher ou utiliser le clavier. Je ne vais pas toujours t’aider tout de suite, parce que je veux voir si l’application explique bien. Tu peux arrêter quand tu veux. Est-ce que tu es d’accord pour commencer ?

Si un enregistrement est prévu, demander ensuite :

> Est-ce que tu acceptes que nous enregistrions seulement l’écran et tes mains pour revoir les difficultés ? Tu peux dire non, cela ne change rien au test.

### 7.2 Comportement pendant les tâches

Ne pas prononcer le nom d’un bouton, ne pas montrer une zone de l’écran et ne pas reformuler la mission avec les mots exacts de l’interface. Laisser au moins vingt secondes d’exploration avant de proposer une aide, sauf si la participante demande explicitement de l’aide ou manifeste de l’inconfort.

Après chaque action financière, demander **« Montre-moi ou explique-moi ce qui vient de se passer »**. Ne pas demander « C’est enregistré ? », car cette formulation suggère la réponse.

### 7.3 Échelle d’aide

| Niveau | Intervention du modérateur | Effet sur le score |
|---:|---|---|
| 0 | Aucune aide | Réussite autonome |
| 1 | Répéter exactement la mission | Réussite avec rappel |
| 2 | Question neutre : « Qu’est-ce que tu essaierais maintenant ? » | Hésitation significative |
| 3 | Indiquer une région générale de l’écran sans nommer le bouton | Blocage UX |
| 4 | Montrer le geste ou donner la solution | Échec autonome |

Une aide de niveau 3 ou 4 sur une action essentielle signifie que le parcours n’est pas prêt pour une vendeuse peu alphabétisée.

## 8. Script des scénarios

### S00 — Prise en main et première compréhension

**Précondition :** application réinitialisée, première ouverture.

**Mission à dire :**

> Imagine que c’est ton nouveau téléphone de travail. Commence et prépare Jùlaba comme tu préfères.

**Observer :** la première zone touchée, la compréhension de Tata, la capacité à choisir un mode sans devoir lire, l’usage spontané du bouton audio et le nombre d’écrans traversés.

**Réussite attendue :** la participante démarre, comprend qu’elle peut écouter ou toucher et choisit un mode cohérent avec sa préférence sans démonstration.

**Échec critique :** elle quitte l’application, pense qu’elle doit savoir lire, ou choisit au hasard parce que les différences entre les modes ne sont pas perceptibles.

### S01 — Retour et connexion

**Précondition :** compte de test disponible ; fournir le numéro et le code sous forme orale ou sur une carte de chiffres.

**Mission à dire :**

> Entre dans ta boutique avec ce numéro et ce code.

**Observer :** reconnaissance du pavé numérique, correction d’un chiffre, visibilité du code, compréhension de l’empreinte ou du retour au code, messages d’erreur et comportement sur téléphone partagé.

**Réussite attendue :** connexion autonome, sans jargon et sans exposition inutile du code.

**Échec critique :** compte d’une autre personne ouvert, code impossible à corriger, message incompréhensible, ou blocage qui exige de lire une phrase.

### S02 — Ouvrir la journée

**Précondition :** journée fermée.

**Mission à dire :**

> Ce matin, tu as cinq mille francs dans ta caisse. Prépare ta journée pour commencer à vendre.

**Observer :** découverte de l’ouverture, compréhension de la somme, possibilité d’écouter le montant, distinction entre argent de départ et ventes.

**Réussite attendue :** journée ouverte avec **5 000 F** et confirmation comprise.

**Échec critique :** mauvais montant non détecté, journée laissée fermée sans que la participante le comprenne, ou Tata demande encore d’ouvrir une journée déjà ouverte.

### S03 — Vente tactile avec monnaie à rendre

**Mission à dire :**

> Une cliente prend deux tas de tomates. Un tas coûte cinq cents francs. Elle te donne deux mille francs. Enregistre la vente et dis-moi combien tu lui rends.

**Observer :** recherche du produit, quantité, panier, total, sélection des billets, compréhension de la monnaie et prévention du double appui.

**Résultat exact :** total **1 000 F**, reçu **2 000 F**, monnaie **1 000 F**, une seule vente créée.

**Question de compréhension :**

> Qu’est-ce que Jùlaba vient de faire ? Combien dois-tu rendre ?

**Échec critique :** montant faux, vente doublée, monnaie fausse, panier vidé sans opération récupérable, ou confirmation de succès alors que le serveur n’a pas confirmé.

### S04 — Vente à la voix, mains occupées

**Plateforme :** APK uniquement.

**Mission à dire :**

> Tes mains sont occupées. Sans chercher le produit avec le clavier, note : trois tas de bananes pour neuf cents francs. Ensuite, fais payer la cliente en espèces, compte juste.

**Observer :** découverte du micro, indication d’écoute, possibilité d’arrêter, restitution de ce qui a été compris, correction avant paiement et passage obligatoire par le panier.

**Résultat exact :** une ligne Banane, quantité **3**, total exact **900 F**, source vocale conservée, une seule vente après paiement.

**Échec critique :** l’application encaisse directement sans panier, produit ou montant mal compris sans confirmation visible, silence après une incompréhension, ou recours à un service vocal distant en mode hors ligne.

> **Validation audio :** le modérateur peut noter la présence et le texte. Seule une écoute humaine ivoirienne peut valider le naturel, l’accent et la compréhension de la voix.

### S05 — Noter une dépense

**Mission à dire :**

> Tu viens de payer cinq cents francs pour le transport. Note cette dépense.

**Observer :** reconnaissance des catégories par l’image, saisie du montant, avertissement sur les montants élevés, confirmation visuelle, vocale et haptique.

**Résultat exact :** une dépense Transport de **500 F**.

**Question de compréhension :**

> Est-ce que l’argent a été ajouté ou retiré de ta caisse ?

**Échec critique :** la participante croit avoir enregistré une vente, montant erroné, opération doublée, ou message « enregistrée » alors que la dépense est seulement gardée localement.

### S06 — Vente sans réseau et honnêteté de l’état

**Précondition :** activer le mode avion devant la participante, sans expliquer le fonctionnement de la file hors ligne.

**Mission à dire :**

> Le réseau est parti. Une cliente prend un sac de riz à mille francs et te donne compte juste. Note la vente comme tu fais d’habitude.

**Observer :** continuité du parcours, distinction visuelle entre succès et attente, formulation de Tata, réaction de la participante et conservation du panier.

**Question de compréhension :**

> Montre-moi ou explique-moi où est la vente maintenant. Est-ce que Jùlaba l’a déjà envoyée ?

**Réussite attendue :** la participante comprend que la vente est **gardée sur le téléphone, mais pas encore envoyée**, et sait que Jùlaba réessaiera lorsque le réseau reviendra.

**Échec P0 :** elle croit que le serveur a confirmé, voit « Vente réussie », reçoit la même vibration qu’un succès définitif, ou peut envoyer un reçu présenté comme définitif.

### S07 — Fermer, rouvrir et récupérer après la coupure

**Précondition :** vente S06 encore en attente ; réseau toujours coupé.

**Mission à dire :**

> Le téléphone s’est fermé pendant le marché. Rouvre Jùlaba et vérifie si ton travail est toujours là.

Laisser la participante rouvrir l’application. Ensuite, rétablir le réseau.

**Observer :** persistance de la vente, maintien du bon compte utilisateur, message pendant le retour du réseau et absence de double enregistrement.

**Réussite attendue :** la vente reste dans la file du bon compte, puis apparaît exactement une fois après reconnexion.

**Échec P0 :** perte, doublon, opération rejouée sous un autre compte, ou absence totale d’information sur un rejet définitif.

### S08 — Comprendre la journée sans calculer

**Mission à dire :**

> Sans refaire les calculs toi-même, montre combien tu as vendu aujourd’hui, combien tu as dépensé et ce qu’il te reste. Fais parler les montants si tu préfères.

**Observer :** découverte du résumé, cohérence des écrans, différence entre ventes et dépenses, possibilité d’entendre chaque montant et compréhension des libellés.

**Réussite attendue :** les totaux correspondent aux opérations réellement confirmées. Les opérations encore en attente ne sont pas présentées comme définitivement centrales sans distinction.

**Échec critique :** deux écrans donnent des totaux contradictoires, un montant essentiel ne peut pas être entendu, ou la participante inverse vente et dépense.

### S09 — Corriger une vente faite par erreur

**Précondition :** une vente du jour annulable dans l’historique.

**Mission à dire :**

> Cette vente a été notée par erreur. Retrouve-la et enlève-la de l’argent du jour sans effacer les autres ventes.

**Observer :** repérage de la bonne vente, confirmation avant annulation, distinction entre annuler et supprimer, restitution du stock et mise à jour du résumé.

**Réussite attendue :** seule la vente désignée est annulée, reste visible comme trace et sort du chiffre du jour.

**Échec P0 :** mauvaise vente annulée, plusieurs opérations supprimées, absence de confirmation ou total inchangé.

### S10 — Confidentialité au marché

**Mission à dire :**

> Une personne vient près de ton étal. Tu ne veux pas qu’elle voie combien tu as dans ta caisse. Protège le montant.

**Observer :** découverte du masque, portée du masquage sur les autres écrans, retour contrôlé du montant et éventuelle lecture vocale trop forte.

**Réussite attendue :** le solde est masqué partout où il est exposé. Aucun montant privé n’est prononcé automatiquement.

**Échec critique :** le montant reste visible sur un autre écran, est lu automatiquement malgré le masquage, ou demande un parcours de réglages difficile.

### S11 — Plein soleil, texte et cibles tactiles

**Précondition :** déplacer la session en extérieur ou simuler une forte luminosité. Ne pas modifier d’abord les paramètres du téléphone.

**Mission à dire :**

> Le soleil est fort et tu vois mal. Rends Jùlaba plus facile à voir.

**Observer :** découverte du mode soleil, contraste, taille des informations essentielles, reflet, usage à une main, doubles frappes et petites cibles.

**Réussite attendue :** le mode est découvert sans passer par un menu complexe. Aucune information essentielle n’est sous 14 px et aucune cible principale n’est inférieure à 44 × 44 px.[1]

**Échec critique :** montant illisible, bouton principal confondu avec un élément décoratif, action financière déclenchée par erreur ou navigation impossible avec une main.

### S12 — Utilisation sans son

**Précondition :** couper le son du téléphone après avoir expliqué qu’il s’agit d’un test de l’application, pas de l’audition de la participante.

**Mission à dire :**

> Fais une petite vente de tomate, compte juste, comme si tu n’entendais pas Tata.

**Observer :** équivalents visuels et haptiques, dépendance aux textes, compréhension de l’icône de succès ou d’attente et visibilité des erreurs.

**Réussite attendue :** la participante distingue succès, attente et erreur sans audio. Une vendeuse qui ne lit pas doit pouvoir s’appuyer sur la couleur, l’icône, l’animation et la vibration.[1]

**Échec critique :** l’audio est le seul canal qui indique le résultat ou la couleur seule porte le sens sans icône distincte.

### S13 — Reprise après erreur volontaire

Exécuter deux mini-cas, sans nécessairement les faire à toutes les participantes :

1. tenter de payer avec un panier vide ;
2. saisir un montant reçu inférieur au total.

Demander ensuite :

> Qu’est-ce que Jùlaba te demande de corriger ? Montre-moi comment tu continues.

**Réussite attendue :** l’erreur est dite avec des mots simples, reste visible, ne détruit pas le panier et propose un chemin de correction évident.

**Échec critique :** écran bloqué, données perdues, jargon technique ou erreur silencieuse.

## 9. Débriefing à lire

Poser les questions dans cet ordre, sans suggérer une réponse :

1. **Qu’est-ce qui t’a semblé le plus facile ? Pourquoi ?**
2. **À quel moment tu ne savais plus quoi faire ?**
3. **Montre-moi le signe qui te dit qu’une vente est finie.**
4. **Montre-moi le signe qui te dit qu’une vente attend encore le réseau.**
5. **Quelle voix t’aide le mieux ? Qu’est-ce qui est difficile à comprendre ?**
6. **Y a-t-il un écran où tu avais peur de perdre ton argent ou de te tromper ?**
7. **Si une seule chose devait être changée avant que tu utilises Jùlaba au marché, laquelle ?**
8. **Est-ce que tu ferais confiance à cette version pour compter ta journée ? Pourquoi ?**

Ne pas demander seulement si elle « aime » l’application. Une réponse positive par politesse ne prouve ni la compréhension ni l’autonomie.

## 10. Mesures à consigner

Pour chaque scénario, noter :

| Mesure | Valeur |
|---|---|
| Résultat | Réussi / Partiel / Échec / Non testé |
| Niveau d’aide maximal | 0 à 4 |
| Première action correcte | Oui / Non |
| Temps | Secondes, à titre indicatif |
| Retour arrière | Nombre |
| Mauvais appuis | Nombre |
| Lecture indispensable | Oui / Non |
| Audio compris au premier passage | Oui / Non / Non applicable |
| Résultat visuel compris | Oui / Non |
| Vibration perçue | Oui / Non / Non applicable |
| Montant final exact | Oui / Non / Non applicable |
| État réel compris | Confirmé / En attente / Refusé / Non compris |
| Verbatim | Phrase exacte de la participante |
| Incident | Identifiant du bug ou vide |

Le temps ne doit jamais être utilisé seul pour conclure. Une vendeuse lente mais exacte et autonome réussit mieux qu’une vendeuse rapide qui comprend mal l’état de son argent.

## 11. Score de chaque scénario

| Score | Définition |
|---:|---|
| 4 | Terminé sans aide, montant juste et résultat correctement expliqué |
| 3 | Terminé après répétition de la mission ou une hésitation mineure |
| 2 | Terminé avec question neutre répétée ou erreur récupérée sans risque financier |
| 1 | Terminé seulement après indication de zone ou démonstration |
| 0 | Abandon, résultat faux, état mal compris ou risque financier |

Un score moyen ne doit jamais masquer un échec financier. Un seul P0 maintient le gate de production fermé.

## 12. Classification des problèmes

| Niveau | Définition | Exemples |
|---|---|---|
| P0 — Bloquant production | Argent, identité ou donnée potentiellement faux, perdu, dupliqué ou attribué au mauvais compte | double vente, mauvais total, attente annoncée comme succès, opération de A rejouée chez B |
| P1 — Bloquant parcours | Une vendeuse cible ne peut pas finir une tâche essentielle sans aide de niveau 3 ou 4 | impossible d’ouvrir la journée, bouton incompris, erreur sans issue |
| P2 — Friction forte | Tâche réussie mais hésitation répétée, effort de lecture ou incohérence sensorielle | icône ambiguë, montant non écoutable, mode soleil difficile à trouver |
| P3 — Cosmétique | Défaut visible sans impact sur compréhension ou résultat | alignement, animation secondaire, espace irrégulier |

Chaque anomalie doit inclure la plateforme, le commit, le téléphone, le scénario, la précondition, les étapes, le résultat réel, le résultat attendu, la fréquence, le niveau d’aide, un verbatim et une preuve visuelle si autorisée.

## 13. Gates de préparation à la production

La version est **refusée** si au moins une des conditions suivantes est vraie :

- un P0 reste ouvert ;
- une opération en attente est prise pour un succès par une participante ;
- une vente ou dépense peut être créée deux fois par double appui ;
- le montant final est faux ou contradictoire entre deux écrans ;
- une tâche cœur requiert une aide de niveau 3 ou 4 pour plus d’une participante ;
- un résultat financier important n’a pas de retour visuel, vocal et haptique ;
- l’APK et la PWA diffèrent sur le résultat d’un parcours cœur ;
- une langue locale est annoncée comme complète alors que des textes actifs n’ont pas d’audio humain validé en base.

La version peut être proposée pour un **pilote encadré** lorsque :

- tous les P0 sont fermés et re-testés ;
- au moins 85 % des tâches cœur obtiennent un score 3 ou 4 ;
- 100 % des participantes distinguent succès, attente et refus sur les opérations d’argent ;
- chaque phrase financière critique est comprise au premier passage ou après une seule réécoute ;
- les parcours restent utilisables sans son ;
- les cibles principales respectent 44 × 44 px et les informations essentielles 14 px ;
- les écarts APK/PWA sont nuls ou explicitement justifiés par la capacité native.

Ces seuils sont des critères de décision Jùlaba. Ils doivent être accompagnés des verbatims et des erreurs observées, pas présentés comme une preuve statistique générale.

## 14. Synthèse de fin de journée d’audit

À la fin de chaque journée, l’équipe produit rédige une page maximum :

1. les trois moments où les participantes ont le mieux réussi ;
2. les trois blocages les plus fréquents ;
3. les incompréhensions liées à l’argent ;
4. les écarts entre ce que Tata dit et ce que l’écran montre ;
5. les différences APK/PWA ;
6. la liste P0/P1 avec propriétaire et date de re-test ;
7. la décision : **continuer le pilote**, **corriger avant nouveau test** ou **gate production fermé**.

## 15. Contrôle expert complémentaire

Le test terrain ne remplace pas les mesures techniques. Avant la session, puis après chaque correctif, contrôler automatiquement ou manuellement :

- cibles tactiles d’au moins 44 × 44 px ;
- textes essentiels d’au moins 14 px ;
- contraste en mode normal et soleil ;
- ordre du focus et libellés accessibles ;
- absence de jargon interdit ;
- une seule action financière par double appui ;
- fonctionnement avec réseau coupé avant, pendant et après l’action ;
- persistance après fermeture de l’application ;
- présence des clips référencés dans le bundle APK ;
- correspondance du manifeste vocal entre web et APK ;
- absence d’appel STT/TTS distant pendant le parcours marchand offline.

L’audit expert peut constater qu’un fichier existe. Il ne peut pas déclarer qu’une voix ivoirienne ou Dioula est naturelle et comprise sans validation humaine.

## Références

[1]: https://github.com/SOMET1010/julaba-app/blob/manus/stabilisation-production/docs/INCLUSION.md "Inclusion — référence du projet Jùlaba"

[2]: https://github.com/SOMET1010/julaba-app/blob/manus/stabilisation-production/docs/PARCOURS.md "Cartographie des parcours — écrans, textes, voix"

[3]: https://github.com/SOMET1010/julaba-app/blob/manus/stabilisation-production/docs/RUNTIME_VOCAL_HORS_LIGNE.md "Runtime vocal Jùlaba — politique hors ligne"
