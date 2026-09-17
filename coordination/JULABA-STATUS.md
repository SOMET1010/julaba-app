# Statut — JULABA historique

> Tenu par **JULABA historique**, seul écrivain de ce fichier.
> Dit *où on en est à l'instant T*. L'état acquis du projet vit dans
> [`docs/PASSATION.md`](../docs/PASSATION.md) — en cas de contradiction,
> c'est `docs/PASSATION.md` qui gagne.

```
STATUT: EN_COURS
TACHE: LOT PILOTE MERGÉ SUR MAIN (e796547, 17/09). La recette terrain
  n'est plus un verrou de fusion : Patrick l'a jugée trop lente pour rester
  le seul obstacle. Elle garde toute sa valeur comme CONSTAT D'USAGE, à
  faire sur l'app déployée. Scénario 1 déjà VERT (l'écran du code parle).
  Le sujet TTS/Sherpa reste hors lot, à arbitrer.
BESOIN_PATRICK: OUI
TYPE_BESOIN: ARBITRAGE
  (le test physique Android n'est plus un verrou de fusion depuis e796547 ;
  le verrou actuel est une DÉCISION MÉTIER sur la licence du modèle de voix)
ACTION_PATRICK: LE DERNIER BLOQUEUR DU PILOTE EST LA VOIX. La question qui
  départageait tout est TRANCHÉE : le 17/09, sur julaba-apk-a4222c3, Patrick
  a testé — « la voix du code passe ». Le clip ui-035 se joue depuis l'APK,
  donc AUCUNE RÉGRESSION. Le silence sur les autres écrans est bien celui
  qu'on avait diagnostiqué : pas de clip enregistré + synthèse muette dans la
  WebView. Rien à corriger en urgence de ce côté.
  DEUX SÉRIES DE FAITS ATTENDUES, relevées sans interprétation pendant le
  test (consigne Patrick du 17/09) :
  (1) DÉMARRAGE — chronométrer du lancement jusqu'au premier écran
      exploitable, et noter la couleur pendant l'attente. Attendu : IVOIRE
      (#F6F0E4, le fond posé par le correctif). Du NOIR, même bref, veut
      dire que le correctif n'a pas pris : arrêt, heure + capture.
  (2) SCÉNARIO 4 ARGENT — au doigt, relever ce que l'écran affiche :
      vente 1 500 → fond 5 000 → caisse 6 500 → comptage 6 000 → écart −500
      → après fermeture, caisse toujours 6 500. Vérifié : la feuille de
      recette sur la branche porte exactement cette séquence.
  Rappel de mise en place : le scénario 4 part d'une journée NON ouverte. La
  désinstallation a effacé le téléphone, PAS le serveur — une journée ouverte
  d'une session précédente peut subsister, à fermer d'abord.
  RÈGLE : au premier écart réel, la recette s'arrête. On documente l'état
  exact qui l'a produit, on ne contourne pas.
  SÉCURITÉ RÉGLÉE LE 17/09 — le mot de passe des comptes d'ADMINISTRATION de
  démo était écrit EN DUR ('123456') et piloté par aucune variable, dans un
  dépôt PUBLIC. Activer SEED_DEMO sur le serveur réel y ouvrait donc un accès
  d'administration publié sur GitHub — et remettre le drapeau à "false"
  n'efface RIEN (vérifié : aucune suppression nulle part), les comptes
  seraient restés indéfiniment. Règle posée : pas de SEED_DEMO_BO_PASSWORD →
  pas de compte back-office ; les comptes acteurs, eux, sont seedés
  normalement. L'ancienne valeur est refusée même fournie explicitement.
  Deux garde-fous textuels, dont un mis en défaut exprès pour vérifier qu'il
  passe au rouge. SEED_DEMO redevient donc activable — mais APRÈS déploiement
  de ce correctif, pas avant.

  ⚠️ BLOCAGE DE LICENCE TROUVÉ LE 17/09, APRÈS le GO de Patrick pour (a).
  Vérifié à la source sur Hugging Face : vits-mms-fra est une conversion
  directe de facebook/mms-tts (français), dont la licence est
  **cc-by-nc-4.0 — NON COMMERCIALE**. Le dépôt de conversion
  (csukuangfj/vits-mms-fra) ne déclare aucune licence propre et renvoie à
  celui de Facebook. JULABA étant un produit commercial, l'embarquer dans
  l'APK distribué serait une violation. À NE PAS FAIRE sans avis juridique.
  La note de docs/voice-roadmap.md qui parlait d'une licence Apache 2.0
  concernait `omnilingual-asr` (de la RECONNAISSANCE vocale), pas MMS TTS —
  la confusion était dans nos propres documents.
  ALTERNATIVES VÉRIFIÉES (licence lue dans le MODEL_CARD de chaque dépôt) :
    fr_FR-siwis-medium  CC-BY 4.0      63,2 Mo   1 locutrice   ← recommandé
    fr_FR-siwis-low     CC-BY 4.0      28,1 Mo   1 locutrice
    fr_FR-mls-medium    CC-BY 4.0      —         125 locuteurs mélangés
    fr_FR-upmc-medium   CC-BY-SA 4.0   —         clause virale
    fr_FR-tom-medium    AGPLv3         —         très contraignant
  siwis-medium bat vits-mms-fra sur trois axes : licence commerciale propre,
  45 Mo de moins, et une seule locutrice (cohérent avec Tata). SEUL POINT
  FAIBLE : Patrick a écouté MMS, pas siwis — une écoute est nécessaire avant
  de s'engager (le workflow spike-tts.yml existe déjà pour ça).
  Arbitrage initial, pour mémoire : (a) embarquer OfflineTts de sherpa-onnx
  avec vits-mms-fra — jugé acceptable à l'écoute le 16/09, +103 Mo dans l'APK, seule
  voie qui permette de DIRE UN MONTANT ; ou (b) s'en tenir aux clips
  enregistrés, auquel cas Tata ne dira jamais un chiffre.
  CE QUE PÈSE L'OPTION (b), vérifié sur disque le 17/09 : 137 clips ui-*.mp3
  sont bien présents, mais les 8 clips d'introduction (intro-accueil,
  intro-1..4, intro-mode, intro-retour, intro-bravo) sont TOUS ABSENTS, et
  les dix chiffres (chiffre-0.mp3 … chiffre-9.mp3) AUSSI. Choisir (b) ne
  veut donc pas dire « ne rien faire » : cela veut dire enregistrer au moins
  ces 18 fichiers, sinon les deux premiers écrans restent muets et aucun
  montant ne peut être épelé. La liste exacte et les textes à dire sont dans
  docs/CLIPS-VOIX-A-ENREGISTRER.md.
DERNIER_SHA_MAIN: e796547 — LE LOT PILOTE EST MERGÉ SUR MAIN (17/09).
  PR #240 fusionnée sur demande de Patrick : la session terrain complète
  prenait trop de temps pour rester le seul verrou. La Constitution
  (principe 3) demandait une preuve réelle avant de merger les modules
  sacrés ; la preuve obtenue est celle qu'on pouvait obtenir sans doigt :
  166 invariants sur 33 suites contre un vrai Postgres (dont
  caisse-fond-declare et argent-gele-b2), 176 tests unitaires backend,
  verify, test:ci, cliquet à 0, parcours argent au navigateur vérifié en
  base, et sur appareil réel l'écran du code qui parle.
  ASSUMÉ, NON PROUVÉ : le parcours argent avec de vrais doigts et le temps
  de démarrage. Ce sont des constats d'usage, à faire sur l'app déployée.
BRANCHE_EN_ATTENTE: AUCUNE. claude/clever-allen-dnr8by est entièrement
  contenue dans main depuis e796547. Plus aucune PR ouverte.
  NON mergés : authentification et caisse sont des modules sacrés, preuve
  réelle exigée (principe 3).
ODOO — DÉCISION PATRICK DU 17/09/2026 : **EN LECTURE SEULE POUR LE PILOTE.**
  Odoo sert de référentiel produits, JULABA en lit le catalogue, et RIEN ne
  remonte. Les deux verrous restent fermés : ODOO_POC_ENABLED (routes
  /odoo-poc/* en 404 sans lui) et ODOO_REAL_WRITE_ENABLED=false.
  À savoir, pour ne pas reposer la question : le POC Odoo EST complet et
  prouvé (client réel, allowlist, garde-fou XOF, journal de synchronisation).
  Mais la CAISSE n'a jamais écrit vers Odoo — vérifié le 17/09, zéro
  occurrence d'Odoo dans backend/src/caisse-rest/. Prouver que le tuyau tient
  n'est pas faire couler l'eau.
  Brancher l'écriture n'est PAS un interrupteur : il faut décider quel objet
  Odoo reçoit une vente, dans quel journal, avec quelle pièce comptable, quoi
  faire d'une vente hors-ligne rejouée, et comment garantir qu'elle n'est pas
  comptée deux fois chez nous ET chez eux. Décision métier irréversible :
  arrêt obligatoire. On la rouvre quand une vraie marchande aura vendu une
  vraie journée sans perdre un franc.

LIGNE_D_ARRIVEE (décision Patrick, 16/09/2026) : on arrête toute
  amélioration qui n'est pas nécessaire au pilote. On ne traite QUE ce qui
  empêche une marchande de vendre, compter, comprendre, ou récupérer après une
  coupure. Vocabulaire imposé : on ne parle plus de « ce qu'il reste à
  améliorer » mais de « ce qui bloque encore le pilote ».
  1) corriger les 3 défauts graves identifiés — FAIT (branche 5e1f17c)
  2) recette complète SUR LA BRANCHE — FAITE au navigateur par JULABA
     historique (fond de caisse prouvé serveur + base + après reconnexion,
     comptage vide, sortie « Mon argent », appellation). La recette par un
     agent web est ABANDONNÉE : elle exigeait une preview Render, donc de
     toucher au Blueprint, donc un chantier infra que Patrick refuse à ce
     stade (16/09). La draft PR #240, ouverte comme simple support de
     recette, a été FERMÉE sur demande de Patrick le 17/09 — plus aucune PR
     ouverte sur le dépôt. Fermer une PR ne touche ni la branche ni les
     commits : `claude/clever-allen-dnr8by` reste intacte, et une PR de
     fusion se rouvre quand la recette aura validé.
  3) session Android réelle
  4) corriger uniquement ce que cette session révèle comme BLOQUANT
  5) merge final
  6) pilote
  Tout le reste — emojis, raffinements de voix, illustrations, écrans
  secondaires, optimisations, confort — va au backlog post-pilote.
BACKLOG_POST_PILOTE (à ne PAS mélanger avec la sortie pilote) :
  - [RÉGLÉ le 17/09] DÉRIVE DE BLUEPRINT — les plans de render.yaml sont
    désormais ALIGNÉS sur la réalité (julaba-db: basic_256mb, julaba-api:
    starter), sur identifiants confirmés par Patrick au tableau de bord. Une
    synchronisation ne peut donc plus ramener la production en `free`. C'était
    le risque le plus grave du backlog : un service se redéploie, une base
    perd des données. L'entrée d'origine est conservée ci-dessous pour la
    mémoire du raisonnement.
  - [HISTORIQUE, RÉGLÉ] À RÉSOUDRE AVANT TOUTE SYNCHRONISATION DU BLUEPRINT : le fichier
    render.yaml déclare `plan: free` pour julaba-api, alors que le service en
    ligne tourne en **Starter (7 $/mois, 0,5 CPU / 512 Mo)** — constaté sur le
    tableau de bord le 16/09/2026. Le plan a été changé hors Blueprint. Un
    `sync` voudrait donc potentiellement ramener le backend de PRODUCTION en
    `free`. Ce risque existe indépendamment de tout autre changement ; il est
    dans le fichier depuis ce changement d'interface.
    AGGRAVÉ LE 17/09 : la dérive touche AUSSI LA BASE. render.yaml déclare
    `plan: free` pour julaba-db, alors que le tableau de bord montre
    **Basic-256mb** (capture Patrick, 17/09 20h49). Un service se redéploie ;
    une base, non — des DONNÉES peuvent se perdre. Et le commentaire du
    fichier dit lui-même pourquoi on en est sorti : « la base gratuite Render
    expire ~90 j ». Le fichier ne sait pas qu'on a corrigé cela.
    À FAIRE, quand Patrick le décidera : aligner render.yaml sur l'existant
    (deux lignes). Il faut pour cela le nom EXACT du plan de julaba-api tel
    que le tableau de bord l'affiche. En attendant : modifier une variable au
    tableau de bord est sans risque, mais NE JAMAIS lancer de resynchronisation
    du Blueprint.
  - BrowserStack, ponctuellement AVANT une diffusion : passer le même APK sur
    trois ou quatre Android réels représentatifs, sans acheter les appareils.
    Arbitrage de Patrick (16/09) ; j'avais écarté cet outil trop vite, et sans
    l'avoir vérifié — son site est bloqué depuis la session des instances.
  - previews de PR ciblées sur le seul site statique (backend explicitement
    exclu : une preview du backend payant serait une dépense réelle). Reporté
    ici parce que c'est le même fichier et le même risque que le nettoyage
    ci-dessous — et parce que la syntaxe exacte n'a pas pu être vérifiée :
    render.com est bloqué depuis la session des instances.
  - nettoyer render.yaml : le montage Piper y subsiste alors que la doctrine
    est sherpa-onnx (setup-piper.sh n'existe même pas, PIPER_BIN/PIPER_VOICE
    ne peuvent pas être satisfaites).
  - clé de signature stable pour l'APK : chaque construction signe
    différemment, donc toute mise à jour exige une désinstallation et efface
    les données de la marchande. BLOQUANT avant distribution, pas avant test.
  - la base Render est en `plan: free` : elle expire vers 90 jours. À trancher
    avant que des données de marchandes y vivent pour de bon.
VERDICT_PATRICK: LOT A techniquement clos · GO TEST TERRAIN · PAS de GO
  MERGE global. Branche gelée sur 5d48614 au 16/09 ; seuls des correctifs
  remontés par la recette s'y ajoutent depuis.
ARBITRAGE_EN_ATTENTE (2) — POLICES ET ICÔNES DISTANTES, contraire à
  l'offline-first. Relevé par Patrick le 17/09, vérifié dans le code :
  - `Inter`, appliquée à `*` donc à TOUTE l'application, vient d'un
    `@import` Google dans styles/fonts.css → hors ligne, repli sur la police
    système : lisible, mais autre rendu et autres métriques.
  - `Calisga`, utilisée à 4 endroits, vient du même `@import`. Elle n'est
    vraisemblablement PAS au catalogue Google — auquel cas elle ne s'affiche
    déjà pas aujourd'hui, même en ligne. Non vérifiable depuis la session
    (Google Fonts bloqué).
  - Icônes **Tabler** : 11 occurrences dans 3 fichiers (MarcheSelect et les
    deux fiches d'identification), chargées depuis un CDN jsDelivr en
    `@latest` — version NON figée, qui peut changer sans qu'on touche au code.
    Le paquet n'est pas installé : le CDN est la seule source.
  Impact réel, mesuré : le parcours quotidien d'une marchande (vendre,
  encaisser, fermer) utilise lucide-react, COMPILÉ dans le bundle — aucune
  requête. Ce sont les écrans d'identification et de back-office qui perdent
  leurs icônes hors ligne.
  Proposé : auto-héberger Inter (~100 Ko), remplacer les 11 icônes Tabler par
  leurs équivalents lucide-react (0 Ko, une dépendance distante en moins), et
  trancher Calisga (fichier + droit d'embarquer, ou on retire la référence).
  EN ATTENTE DE PATRICK : maintenant, ou backlog post-pilote ?
ARBITRAGE_EN_ATTENTE: clé de signature stable pour l'APK (chaque runner signe
  différemment → toute mise à jour exige une désinstallation, donc efface les
  données de la marchande). Non bloquant sur un seul téléphone de test ;
  bloquant avant toute distribution.
PROCHAINE_ACTION: APK COMPLET À ÉPROUVER — `julaba-apk-1f30905` (run #16,
  17/09 au soir) : https://github.com/SOMET1010/julaba-app/actions/runs/35270192772
  Il contient TOUT : voix qui parle, relecture de ce qui a été compris,
  billets dessinés, attribution CC BY, vocal serveur nettoyé.
  TROIS RELEVÉS ATTENDUS, et seul un téléphone peut les donner :
   (1) durée du TOUT PREMIER montant (19 Mo de phonétisation se recopient une
       fois ; au-delà de 5 s, l'élagage au français seul la ramène à 708 Ko) ;
   (2) après une vente vocale : ce que Tata DIT **et** ce qui est ÉCRIT dans
       « TU AS DIT ». Les deux ensemble tranchent le défaut ouvert ci-dessous ;
   (3) les billets ressemblent-ils à de l'argent.
  DÉFAUT OUVERT — « l'oignon » : « trois tomates » a produit `1 × oignon — 2 F`.
  Écartés avec preuve : Whisper (retiré du schéma), l'appariement produit
  (strict, « tomate » ne peut pas devenir « oignon »), un mot en dur dans le
  parcours vocal. Il manque la transcription brute pour trancher entre un
  défaut d'OREILLE (modèle) et un défaut de COMPRÉHENSION (extraction).
  À SAVOIR pour le prochain essai : le catalogue de test ne contient qu'un
  oignon à 0 restants — tout écart se rabat dessus, ce qui masque la cause.

  (précédent, atteint) LA VOIX PASSE — confirmé par Patrick sur appareil réel le
  17/09 au soir, sur julaba-apk-fb6a842. La synthèse hors-ligne sort
  vraiment du haut-parleur : Tata peut DIRE UN MONTANT. C'était le dernier
  verrou du pilote.
  Ce qui l'a débloqué : `dataDir` pointait vers les assets de l'APK, où
  espeak-ng ne peut pas lire (ce ne sont pas de vrais fichiers). Le moteur
  échouait en silence. Les données sont désormais recopiées une fois dans le
  stockage interne.
  RESTE À CONSTATER, sur ce même APK : (1) le temps du TOUT PREMIER montant
  (19 Mo de phonétisation se recopient une fois — si l'attente dépasse 5 s,
  l'élagage au français seul la ramène à 708 Ko) ; (2) la relecture après une
  vente vocale — « J'ai compris : 5 tomates pour 1 500 francs ».
  (ancienne consigne, atteinte) ENTENDRE TATA DIRE UN MONTANT. La synthèse vocale
  hors-ligne est écrite, testée et EMBARQUÉE : artefact `julaba-apk-df128fa`
  (run #13, 17/09), 255,4 Mo contre 190,3 Mo sans elle.
  Geste attendu : désinstaller l'ancien JULABA, installer celui-ci, faire une
  vente, et écouter. Tata annonce-t-elle le montant ? C'est la seule chose
  qu'aucune machine ne peut dire à notre place.
  SHA-256 de l'APK :
  e879bb891c84f2bd4f110285c058cba127e1389299bbd3660d33f85eb9ae17b0
  Si elle reste muette, le repli est en place (voix du navigateur, puis
  silence) : l'application ne casse pas, mais le chantier n'est pas fini.
  DETTE OUVERTE, à solder avant toute distribution : la licence CC-BY 4.0 du
  jeu de données SIWIS EXIGE une attribution. Elle n'est écrite nulle part
  dans l'application. Emplacement = arbitrage Patrick.
  Aussi : vérifier que le déploiement automatique de main est passé
  (julaba-web et julaba-api), les trois migrations étant additives et
  idempotentes. L'APK précédent, SANS synthèse, reste `julaba-apk-a4222c3`,
  run #12
  vert le 17/09 (https://github.com/SOMET1010/julaba-app/actions/runs/35223777812).
  APK de debug, 190 Mo, com.julaba.app, targetSdk 36, archive vérifiée
  intègre, signature v2 valide.
  SHA-256 de l'APK : 3874aa5fa2ea5f7b95af2b0273b314d058294b80cb8afdc1f627a2428287e71b
  Empreinte du certificat : 12350f0cc1d840fabb831a8006c3318b08819eafe811b7b88a5e44d40ef9f097
  Geste de Patrick : télécharger l'artefact (onglet Actions), DÉSINSTALLER
  l'ancien JULABA — la clé de debug diffère à chaque construction, donc une
  mise à jour par-dessus est refusée — puis installer et dérouler
  docs/RECETTE-TERRAIN-GROUPEE.md dans l'ordre écrit (étape 0 → 6 ; la voix
  se teste AVANT tout geste, sinon le scénario 1 est faussé).
  Rien d'autre à coder ici tant que la session n'a pas eu lieu.
DERNIER_RESULTAT: l'application ne sort PLUS du téléphone pour son
  habillage. Inter auto-hébergée (5 graisses latines, 120 Ko), import Google
  de Calisga retiré sur décision de Patrick, preconnect Google retirés,
  julaba-full.css supprimé (214 Ko de CSS mort), et icônes Tabler
  auto-hébergées : le CDN jsdelivr en @latest est remplacé par un
  sous-ensemble des 19 icônes utilisées (3,7 Ko intégrés en base64 dans le
  CSS, contre 462 Ko de police + 211 Ko de CSS tirés du réseau). Mesuré sur
  le bundle reconstruit : index.html n'appelle PLUS AUCUNE ressource
  distante, et les 19 icônes sont rendues au navigateur HTTP coupé, aucune
  case vide. Un garde-fou dans `npm run verify` échoue si une icône est
  utilisée sans être embarquée, ou si un appel distant revient dans
  index.html ; il a été mis en défaut exprès avant d'être retenu.
  package-lock.json est resté strictement intact (l'outil de génération
  traîne 125 paquets, il n'est donc PAS déclaré).
  Avant cela : DANS L'APK, LA VOIX DE SYNTHÈSE NE PRODUIT AUCUN SON —
  seuls les clips enregistrés s'entendent. Établi par trois recoupements sur
  appareil réel : accueil muet (clip absent), onboarding muet (clip absent),
  écran du numéro muet (phrase sans clip), écran du code qui PARLE (ui-035
  existe). Or tout le code suppose l'inverse et compte sur un repli vers la
  synthèse — ce filet n'existe pas. Les 8 clips d'introduction n'ont jamais
  été enregistrés. Avant : défaut CORS trouvé et corrigé —
  l'APK ne pouvait poster AUCUNE requête au backend. Les origines de la
  WebView Capacitor (https://localhost, capacitor://localhost) n'étaient pas
  autorisées côté CORS : connexion, vente, fermeture de caisse, tout était
  bloqué. Le symptôme mentait — l'écran affichait « Réveil du serveur » pour
  n'importe quelle TypeError. Prouvé avant/après par requête OPTIONS, déployé
  sur main (seul ce commit), vérifié en production.
```

`STATUT` ∈ `EN_ATTENTE` · `EN_COURS` · `BLOQUE` · `TERMINE`
`TYPE_BESOIN` ∈ `ARBITRAGE` · `TEST_PHYSIQUE_ANDROID` · `ACCES_VPS_ODOO`
(voir [`README.md`](README.md) — un arrêt n'est pas un échec d'autonomie,
mais il doit dire quel geste unique Patrick doit poser)

---

## Journal court

Une ligne par reprise. Les rapports détaillés vont dans `docs/`, pas ici.

- **17/09/2026, soir** — LOT PILOTE MERGÉ SUR MAIN (e796547, PR #240).
  Décision de Patrick : la session terrain complète prenait trop de temps
  pour rester le seul verrou. Avant de poser la fusion, j'ai mesuré au lieu
  d'argumenter — le chemin argent hors-ligne n'est PAS touché par le lot
  (donc aucun risque argent ajouté), les trois migrations sont purement
  additives et idempotentes, et `main` avait déjà reçu 27 commits dans la
  journée sans que julaba-api quitte le plan Starter (la dérive de Blueprint
  ne mord pas sur un déploiement ordinaire). Puis 166 invariants sur 33
  suites contre un vrai Postgres, tous verts. Restent assumés et non
  prouvés : le parcours argent avec de vrais doigts, le temps de démarrage,
  et une voix qui ne dit aucun montant.

- **17/09/2026** — L'application ne sort plus du téléphone pour son
  habillage : Inter et les icônes Tabler sont embarquées, l'appel Google de
  Calisga et le CDN jsdelivr sont retirés, `index.html` n'a plus aucune
  ressource distante. Les 19 icônes sont prouvées rendues au navigateur
  réseau coupé, et un garde-fou dans `verify` échoue si une icône manque ou
  si un appel distant revient. Découvert en route : la feuille de recette
  SUR LA BRANCHE était périmée (ni JDK 21, ni artefact CI, ni
  installer-voix.sh) — `main` a donc été rapatrié dans la branche, qui n'a
  plus aucun retard. Un APK neuf est en construction : celui que Patrick
  avait n'éprouvait aucun des correctifs du jour.

- **16/09/2026, soir** — Correctif de l'écran noir livré : deux causes, pas
  une. La fenêtre elle-même n'avait aucun fond déclaré sous un parent DayNight
  — Android la peignait donc en NOIR pendant tout le chargement de la WebView,
  et c'était la cause principale, ratée le matin. L'écran de démarrage Android
  12+ n'était pas configuré non plus. Les deux réparés, couleur reprise à
  l'identique du papier de l'app. Une construction a échoué au passage sur un
  commentaire XML de ma main contenant deux tirets — corrigé.
  Cinq sentinelles Maestro écrites (jamais exécutées, c'est écrit dans leur
  README) : elles ne cherchent pas des défauts, elles répondent à « est-ce
  bien la bonne version ? », question qui a coûté trois erreurs dans la
  journée. Vérifié ce soir et écarté : les 137 clips sont bien embarqués dans
  l'APK (137 dans le build, 137 dans les assets Android). Le silence ne vient
  donc pas de l'emballage.

- **16/09/2026** — Patrick refuse de toucher au Blueprint Render pour obtenir
  une preview de la branche : ce serait rouvrir un chantier infra alors que la
  règle du jour est de n'en ouvrir aucun. La recette agent sur la branche est
  donc abandonnée, et on passe à la session Android — seule capable de
  trancher la vente vocale et la fermeture, que le navigateur laisse NON
  TESTÉES (non testé n'est pas échoué). Correction au passage : j'avais dit le
  backend sur un plan payant pour justifier un risque de coût ; il est en
  `plan: free`. L'argument ne tenait pas, la décision reste juste pour la
  raison qu'il donne.

- **16/09/2026** — Parcours argent éprouvé AU NAVIGATEUR SUR LA BRANCHE, avec
  la base sous les yeux. Le fond déclaré à 5 000 F part bien au serveur
  (`200 PATCH /caisse/session/fond`), se retrouve en base
  (`fond_initial=5000`, `fond_declare_at` posé), est journalisé comme
  « declaration » — règle de Patrick respectée — et **survit à un rechargement
  complet avec reconnexion**. C'est le défaut que l'agent classait le plus
  grave sur `main` : prouvé corrigé ici. Vérifiés aussi à l'écran : le champ de
  comptage part vide sans écart affiché, la sortie de « Mon argent » mesure
  44×44, et l'accueil dit « Bonjour Recette » — prénom seul.
  NON vérifié : la vente et l'écart de fermeture — « Vendre » ouvre le panneau
  vocal, impossible à piloter sans voix depuis un navigateur.
  Piège rencontré, à retenir : un `backend/dist` périmé renvoyait 404 sur la
  route du fond et imitait EXACTEMENT le défaut corrigé. Toujours reconstruire
  le backend avant de conclure quoi que ce soit en local.

- **16/09/2026** — Recette navigateur par un agent, sur `main` (confirmé par un
  test discriminant : le haut-parleur du numéro n'apparaît qu'au 10e chiffre,
  et « Bonjour Maman Patrick » y subsiste). Son rapport décrit donc
  l'application d'AVANT les 30 commits : six de ses « défauts graves » sont
  déjà corrigés sur la branche. Mais il en a trouvé trois que personne n'avait
  vus, corrigés dans la foulée et vérifiés au navigateur — le comptage de
  fermeture pré-rempli avec la caisse théorique (un faux zéro d'écart, la
  fermeture ne pouvait plus rien révéler), le bouton d'encaissement passé sous
  le bord de l'écran (la vente ne pouvait pas se conclure), et « Mon argent »
  sans aucune sortie. Verdict TTS : vits-mms-fra jugé acceptable à l'écoute.
  Ligne d'arrivée fixée par Patrick : plus rien qui ne bloque le pilote.

- **16/09/2026** — Découverte qui dépasse l'écran : **la voix de synthèse est
  muette dans l'APK**. Tata ne s'entend que là où un clip a été enregistré.
  Les deux premiers écrans qu'une marchande voit — accueil et onboarding —
  sont silencieux parce que leurs huit clips n'ont jamais été produits, alors
  que le code les nomme et les attend. Le repli vers la synthèse, sur lequel
  tout le code s'appuie, n'existe pas sur Android. Feuille d'enregistrement
  écrite (docs/CLIPS-VOIX-A-ENREGISTRER.md) : 21 fichiers, textes exacts
  extraits du code. Reste à trancher POURQUOI la synthèse est muette — voix
  française absente de l'appareil (réparable) ou WebView sans synthèse
  utilisable (alors chaque phrase devient un livrable studio). Confirmé par
  ailleurs : le code secret ne se dicte pas, c'est une décision d'audit UX
  du 11/08 — un marché est un lieu public.

- **16/09/2026** — Journée de recette sur appareil réel. Le défaut majeur :
  **l'APK n'avait jamais pu parler au backend**. Origines Capacitor absentes de
  la liste CORS → tout POST bloqué. Personne ne l'avait vu parce que l'écran
  de connexion affiche « Réveil du serveur » pour *n'importe quelle* erreur
  réseau : une panne de configuration se déguisait en hébergement lent.
  Prouvé par requête OPTIONS avant/après, corrigé, déployé, vérifié.
  Quatre autres défauts remontés par l'usage, sur le seul écran de connexion :
  dictée sans relecture (aucun moyen pour qui ne lit pas de constater une
  erreur) ; toutes les issues d'erreur renvoyant au clavier ; phrases sans
  clip donc muettes dans l'APK ; et l'apprentissage du mode d'accès qui
  comptait « clavier » un repli imposé, faisant taire Tata pour celle qui ne
  sait pas lire. Corrigés sur la branche, NON prouvés sur appareil.
  Restent ouverts, non traités : aucune récupération de code oublié (9 échecs
  = blocage définitif, déblocage non implémenté) ; écran de démarrage non
  adapté à Android 12+ ; qualité d'écoute jugée dégradée, à mesurer par le
  rapport de diagnostic plutôt qu'à l'impression.

- **16/09/2026** — APK installé et lancé sur l'appareil réel de Patrick : il
  fonctionne. Un écran noir au tout premier démarrage, non reproduit ensuite
  (déploiement de l'APK + mise en cache). J'avais avancé une explication par
  le thème de démarrage : **écartée**, l'observation sur l'appareil la
  contredit. Écrit dans la recette comme information à donner à la marchande,
  pas comme défaut. Conséquence de la désinstallation à ne pas oublier : plus
  aucun compte mémorisé, donc une connexion préalable est requise avant le
  scénario 1, sinon il est ininterprétable.

- **16/09/2026** — Défaut trouvé avant qu'il ne coûte cher : l'APK refusait de
  s'installer, message Samsung sans information. L'APK n'était pas en cause
  (taille à l'octet, archive intègre, `apksigner` : Verifies). La cause est
  qu'une JULABA signée d'une autre clé était déjà installée. En creusant :
  **chaque runner GitHub génère sa propre clé de debug** — deux runs du même
  code, deux certificats (`77d8a3a8…` puis `a36159b1…`). Donc chaque mise à
  jour d'APK exigerait une désinstallation, et effacerait les ventes hors
  ligne d'une marchande. Arbitrage soumis à Patrick, non tranché.

- **16/09/2026** — L'APK ne dépend plus du poste de Patrick : workflow
  `apk.yml` (déclenchement manuel seul, le filet d'intégration n'est pas
  touché) qui construit depuis la branche et publie l'APK en artefact.
  Éprouvé, pas asserté : trois runs, deux défauts trouvés et corrigés — le
  prérequis JDK était faux (capacitor-android 8 exige **21**, pas 17, run
  35082675776), et l'artefact portait le SHA de `main` alors qu'il contient
  le code de la branche. Résultat : `julaba-apk-5d48614`, 123 Mo, 3 minutes.
  Garde-fou intégré : la construction s'arrête si l'URL de l'API manque du
  bundle. Trouvé au passage : l'étape 0 oubliait `installer-voix.sh`, sans
  quoi le build s'arrête — ça aurait bloqué la séance à froid.

- **16/09/2026** — Chaîne de build APK éprouvée jusqu'où c'est possible sans
  SDK Android : `npm run build` puis `npx cap sync android` joués sur la
  branche, le bundle copié dans le projet Android est **exactement** celui du
  build (même empreinte), l'URL de l'API y est incluse, le paquet est
  `com.julaba.app`. Seul `assembleDebug` reste à la charge de Patrick : ses
  prérequis exacts (SDK 36, JDK 17+, ANDROID_HOME) sont désormais écrits dans
  l'étape 0, pour qu'ils ne soient pas découverts pendant la séance. Confirmé
  au passage : `google-services.json` absent ne casse rien.

- **16/09/2026** — Correction factuelle du bus : la branche est à **26**
  commits d'avance sur `main`, pas 25. Le chiffre écrit la veille valait pour
  `fd6133b` ; le report de `main` dans la branche a ajouté le commit de merge.
  Le compte est désormais donné avec son SHA de référence, sinon il repérime
  à chaque commit. Verdict enregistré : lot A techniquement clos, GO test
  terrain, **pas** de GO merge global.

- **16/09/2026** — Lot A clos. La recette terrain groupée est finalisée :
  six scénarios ordonnés, minutés, réduits à ce qu'aucune machine ne peut
  dire à notre place. Les scénarios argent désormais prouvés au navigateur
  et contre un vrai Postgres sont sortis de la feuille et listés à part avec
  leur moyen de preuve. Plus rien à coder ici tant que Patrick n'a pas
  déroulé la session sur un téléphone : c'est le seul obstacle entre la
  branche (25 commits) et `main`.

- **16/09/2026** — Parcours argent complet au navigateur : vente libre →
  encaissement espèces → fermeture. Le défaut le plus grave de la session :
  la fermeture écrivait **zéro** comme montant compté (l'app envoie
  `comptage_reel`, le serveur lisait `fond_final`) et l'écart n'était stocké
  nulle part. La caisse théorique est désormais calculée par le serveur, pas
  reprise du téléphone. Trois fausses pistes écartées par la mesure.

- **15/09/2026** — Parcours argent déroulé au navigateur. Deux défauts que la
  lecture de code n'aurait pas donnés : l'accueil d'une marchande n'a pas de
  bouton « Ouvrir ma journée » (il vit dans un composant que seuls les autres
  rôles affichent), donc déclarer son fond passait par « Modifier le fond »
  — qui répondait 404 sans journée, et perdait le montant. Et les billets
  défilaient en boucle sans jamais s'arrêter sur téléphone (59 px/s, un
  billet en fait 85). Un arbitrage reste à trancher : faut-il un défilement
  automatique du tout sur une saisie d'argent ?

- **15/09/2026** — PR #223 (skill /identifier) et #230 (langues ivoiriennes +
  statut licence MMS) reprises sur `main` et fermées — plus aucune PR
  ouverte. Cibles tactiles corrigées aussi sur producteur et coopérative
  (points de pagination à 8px, pastille d'aide à 16px) : on agrandit la
  zone tapable, pas le dessin. À signaler à Patrick : la note voix affirme
  la licence MMS levée en lui attribuant la confirmation — à corriger si
  l'attribution est inexacte.

- **15/09/2026** — Point 4 clos. Toutes les cibles tactiles à 44px (vérifié
  par mesure). Découvert en faisant tourner l'app : les photos de produits
  étaient distantes — sans réseau, une marchande qui ne lit pas voyait des
  cases vides là où elle reconnaît ses produits. Règle de Patrick : photo
  si elle arrive, vignette dessinée sinon. Prouvé hébergeur bloqué.
  Un composant de repli existait déjà : enrichi, pas doublé.
- **15/09/2026** — Point 4 attaqué avec un vrai navigateur : Chromium est
  disponible ici, l'application tourne en local (Postgres jetable + backend
  + bundle de production) et s'observe à 390×844. Ce qui semblait
  impossible sans téléphone est désormais mesurable.
  scripts/mesure-ecrans.cjs outille la méthode du dépôt.
- **15/09/2026** — Points 5 et 6 de la file clos. Le nom d'adresse vient
  désormais de la personne elle-même (nouveau champ dans la fiche
  d'identification) ; par défaut son prénom seul, jamais un titre déduit de
  `users.genre`. Cinq copies réduites à une. Risque testé : les comptes
  déjà mémorisés ne sont pas invalidés. Cinq fautes d'accent corrigées —
  et l'audit .audit_ui_SAFE_CORRECTIONS.md est périmé et dangereux à
  appliquer tel quel (4 de ses 5 entrées restantes casseraient le code).
- **15/09/2026** — Fond de caisse : moitié serveur prouvée contre un vrai
  Postgres (7 invariants). La recette terrain passe de 5 à 2 minutes sur ce
  point. scripts/pg-test-local.sh rend les invariants exécutables.
- **15/09/2026** — Coopératives : « Rejoindre une coopérative » était mort
  depuis le 23 août (500 sur des colonnes inexistantes, menu vide, bouton
  inerte). Corrigé et mergé sur main — module non sacré et preuve obtenue
  contre un vrai Postgres, donc pas d'attente de recette terrain. Un
  Postgres jetable est désormais montable dans l'environnement : les
  invariants tournent pour de vrai.
- **15/09/2026** — appId Android : la ligne orpheline de capacitor.config.ts
  est alignée sur `com.julaba.app` (sept autres emplacements le portaient
  déjà). Une regénération du projet Android aurait installé une seconde
  app sur le téléphone d'une marchande. Arbitrage clos, sorti de PASSATION.
- **15/09/2026** — Lot A ouvert. Fond de caisse : cinq défauts enchaînés
  faisaient qu'un fond déclaré après une première vente n'était jamais
  enregistré (écran 5 000, base 0), que « Modifier le fond » ne persistait
  rien, et qu'une journée fermée s'affichait « ouverte » sans possibilité de
  réouverture. Règle de Patrick appliquée (fond non déclaré / déclaration /
  correction journalisée). Recette terrain groupée ouverte.

- **15/09/2026** — VOIX-V5 : diagnostic confirmé (LoginPassword.tsx:114
  + :255 — 'password' était la seule des trois étapes sans filet de
  rattrapage audio). Correctif, six tests sur useAudioUnlockFallback,
  journal de diagnostic ouvert dès l'arrivée sur l'écran, relèvement des
  voix tardives, recette terrain écrite. Arrêt sur test physique.
- **15/09/2026** — Bus de coordination `coordination/` créé (gouvernance
  uniquement, zéro duplication de PASSATION / décisions / ADR), un seul
  écrivain par fichier. Mergé directement sur `main` sur décision de
  Patrick. Reprise de VOIX-V5.

---

## Pourquoi rien n'est mergé sur `main`

Authentification et caisse sont des **modules sacrés**. La Constitution
(principe 3) exige une preuve sur données réelles avant de les merger —
pas une suite de tests verte. Les correctifs s'accumulent donc sur la
branche et partiront ensemble après la recette terrain groupée.

Aucune instance n'a de téléphone : ce blocage ne disparaîtra pas. Il est
**groupé en une seule session** plutôt que subi à chaque correctif.
