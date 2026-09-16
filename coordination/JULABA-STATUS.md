# Statut — JULABA historique

> Tenu par **JULABA historique**, seul écrivain de ce fichier.
> Dit *où on en est à l'instant T*. L'état acquis du projet vit dans
> [`docs/PASSATION.md`](../docs/PASSATION.md) — en cas de contradiction,
> c'est `docs/PASSATION.md` qui gagne.

```
STATUT: EN_ATTENTE
TACHE: LOT A CLOS — attente de la session terrain unique (lot C)
BESOIN_PATRICK: OUI
TYPE_BESOIN: TEST_PHYSIQUE_ANDROID
ACTION_PATRICK: l'APK n'est plus un obstacle — onglet Actions du dépôt,
  workflow « APK pilote », Run workflow, artefact julaba-apk-<sha> (~3 min,
  rien à installer). Puis dérouler docs/RECETTE-TERRAIN-GROUPEE.md sur un
  téléphone
  Android réel (6 scénarios, ~40 min, dans l'ordre écrit — la voix se teste
  avant tout geste, sinon le scénario 1 est faussé). Noter les montants
  exacts et le résultat de chaque scénario ; en cas d'échec, capture + heure.
DERNIER_SHA_MAIN: f6a6f4f (état de main AVANT ce commit de statut —
  ce champ ne peut pas désigner son propre commit)
BRANCHE_EN_ATTENTE: claude/clever-allen-dnr8by (5d48614) — 26 commits
  d'avance et 0 de retard sur main 6d24259 (compte donné avec son SHA de
  référence : il change dès qu'un commit tombe d'un côté ou de l'autre,
  `git rev-list --left-right --count origin/main...origin/<branche>` fait
  foi). NON mergés : authentification et caisse sont des modules sacrés,
  la Constitution exige une preuve réelle avant merge (principe 3).
VERDICT_PATRICK: LOT A techniquement clos · GO TEST TERRAIN · PAS de GO
  MERGE global. Après la session : corriger uniquement les écarts
  réellement observés, revue finale, puis merge unique. Branche gelée sur
  5d48614 : pas de report de main avant le merge final (décision Patrick,
  16/09/2026), pour ne pas fabriquer de commits de synchronisation.
ARBITRAGE_EN_ATTENTE: clé de signature stable pour l'APK. Chaque runner
  GitHub signe avec une clé de debug différente, donc deux APK successifs ne
  peuvent pas se remplacer sans désinstallation — donc sans effacer les
  données de la marchande. Deux options soumises : clé de debug fixe
  versionnée, ou clé de release en secret GitHub. Non bloquant tant qu'un
  seul téléphone de test est en jeu ; bloquant avant toute distribution.
PROCHAINE_ACTION: rien à coder côté JULABA historique tant que la session
  terrain n'a pas eu lieu. Point bloquant principal de la recette : vente
  hors ligne puis reconnexion = une seule vente comptée. Au retour de
  Patrick : corriger les seuls écarts observés, revue finale, merge unique.
DERNIER_RESULTAT: recette terrain groupée finalisée. Elle ne contient plus
  que ce qu'une base de données et un navigateur ne peuvent pas prouver :
  la voix sur l'écran du code avant tout geste, les voix françaises
  réellement installées sur l'appareil, le nom d'adresse de bout en bout,
  l'argent avec de vrais doigts, la dictée avec un vrai micro, et le réseau
  faible puis coupé — dont la vérification la plus importante : une vente
  hors ligne est-elle comptée exactement une fois. Tout le reste est listé
  en fin de feuille comme déjà prouvé, avec son moyen de preuve.
```

`STATUT` ∈ `EN_ATTENTE` · `EN_COURS` · `BLOQUE` · `TERMINE`
`TYPE_BESOIN` ∈ `ARBITRAGE` · `TEST_PHYSIQUE_ANDROID` · `ACCES_VPS_ODOO`
(voir [`README.md`](README.md) — un arrêt n'est pas un échec d'autonomie,
mais il doit dire quel geste unique Patrick doit poser)

---

## Journal court

Une ligne par reprise. Les rapports détaillés vont dans `docs/`, pas ici.

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
