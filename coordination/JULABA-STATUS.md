# Statut — JULABA historique

> Tenu par **JULABA historique**, seul écrivain de ce fichier.
> Dit *où on en est à l'instant T*. L'état acquis du projet vit dans
> [`docs/PASSATION.md`](../docs/PASSATION.md) — en cas de contradiction,
> c'est `docs/PASSATION.md` qui gagne.

```
STATUT: EN_COURS
TACHE: correctifs remontés par la recette en cours, sur appareil réel
BESOIN_PATRICK: OUI
TYPE_BESOIN: TEST_PHYSIQUE_ANDROID
ACTION_PATRICK: LE DERNIER BLOQUEUR DU PILOTE EST LA VOIX. Séance du 16/09
  au soir : julaba-apk-7e5779c « ne parle pas ». Une question reste sans
  réponse et elle départage tout : sur l'écran « Ton code secret », Tata
  dit-elle sa phrase ? C'est la SEULE du parcours qui ait un clip enregistré
  (ui-035). Si oui → rien n'a régressé, le silence ailleurs est celui qu'on a
  diagnostiqué (pas de clip + synthèse muette dans la WebView). Si non → c'est
  une régression, à traiter avant tout le reste.
  Ensuite, arbitrage : (a) embarquer OfflineTts de sherpa-onnx avec
  vits-mms-fra — jugé acceptable à l'écoute le 16/09, +103 Mo dans l'APK, seule
  voie qui permette de DIRE UN MONTANT ; ou (b) s'en tenir aux clips
  enregistrés, auquel cas Tata ne dira jamais un chiffre.
DERNIER_SHA_MAIN: 3127f67 (état de main AVANT ce commit de statut —
  ce champ ne peut pas désigner son propre commit)
BRANCHE_EN_ATTENTE: claude/clever-allen-dnr8by (2b43d05) — 28 commits
  d'avance, 16 de retard sur main 5869e97 (le retard n'est que de la doc et
  de l'outillage ; `git rev-list --left-right --count
  origin/main...origin/<branche>` fait foi). NON mergés : authentification et
  caisse sont des modules sacrés, preuve réelle exigée (principe 3).
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
     stade (16/09). Draft PR #240 laissée ouverte comme support, NE PAS
     MERGER.
  3) session Android réelle
  4) corriger uniquement ce que cette session révèle comme BLOQUANT
  5) merge final
  6) pilote
  Tout le reste — emojis, raffinements de voix, illustrations, écrans
  secondaires, optimisations, confort — va au backlog post-pilote.
BACKLOG_POST_PILOTE (à ne PAS mélanger avec la sortie pilote) :
  - EN TÊTE, À RÉSOUDRE AVANT TOUTE SYNCHRONISATION DU BLUEPRINT : le fichier
    render.yaml déclare `plan: free` pour julaba-api, alors que le service en
    ligne tourne en **Starter (7 $/mois, 0,5 CPU / 512 Mo)** — constaté sur le
    tableau de bord le 16/09/2026. Le plan a été changé hors Blueprint. Un
    `sync` voudrait donc potentiellement ramener le backend de PRODUCTION en
    `free`. Ce risque existe indépendamment de tout autre changement ; il est
    dans le fichier depuis ce changement d'interface.
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
ARBITRAGE_EN_ATTENTE: clé de signature stable pour l'APK (chaque runner signe
  différemment → toute mise à jour exige une désinstallation, donc efface les
  données de la marchande). Non bloquant sur un seul téléphone de test ;
  bloquant avant toute distribution.
PROCHAINE_ACTION: attendre le résultat de connexion et le rapport de dictée.
  Ensuite : reconstruire l'APK depuis la branche pour éprouver les correctifs
  du jour, qui ne sont PAS dans l'APK installé.
DERNIER_RESULTAT: DANS L'APK, LA VOIX DE SYNTHÈSE NE PRODUIT AUCUN SON —
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
