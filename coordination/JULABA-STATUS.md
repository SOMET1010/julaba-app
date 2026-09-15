# Statut — JULABA historique

> Tenu par **JULABA historique**, seul écrivain de ce fichier.
> Dit *où on en est à l'instant T*. L'état acquis du projet vit dans
> [`docs/PASSATION.md`](../docs/PASSATION.md) — en cas de contradiction,
> c'est `docs/PASSATION.md` qui gagne.

```
STATUT: EN_COURS
TACHE: LOT A — défauts corrigeables sans téléphone
BESOIN_PATRICK: NON
TYPE_BESOIN: —
ACTION_PATRICK: — (la recette terrain est GROUPÉE : une seule session, quand
  le lot A sera clos — voir docs/RECETTE-TERRAIN-GROUPEE.md)
DERNIER_SHA_MAIN: (voir git log origin/main)
BRANCHE_EN_ATTENTE: claude/clever-allen-dnr8by (32583c2) — trois correctifs
  NON mergés : authentification et caisse sont des modules sacrés, la
  Constitution exige une preuve réelle avant merge (principe 3).
PROCHAINE_ACTION: poursuivre le lot A — finir les cibles tactiles non
  encore identifiées (bouton 32×32 sur Vendre, 15×15 sur Stock,
  « FaceID / Empreinte » 350×34, champs de recherche), puis les deux PR
  restantes (#223, #230). Reste aussi de la file de Patrick : le point 4 (retours arrière / chevauchement
  menu / responsive, le moins cadrable sans appareil), les deux PR
  restantes (#223, #230) et le balayage des accents sur les rôles non
  marchands. Enrichir la recette groupée à chaque correctif.
DERNIER_RESULTAT: point 4 mesuré sur le bundle de production à 390×844 :
  aucun débordement horizontal, aucun chevauchement du menu (le
  « chevauchement » trouvé d'abord était une erreur de méthode — mesure
  sans défiler). Trois cibles tactiles sous 44px corrigées et revérifiées.
  Avant : appellation — c'est la personne qui dit comment on
  l'appelle (champ dans la fiche d'identification) ; par défaut prénom seul,
  jamais un titre déduit du genre. Cinq copies réduites à une. Avant : fond de caisse prouvé en
  base réelle (7 invariants) ; coopératives — 500 systématique corrigé et MERGÉ sur main
  (preuve en base réelle : 157 invariants verts sur 32 suites, 152 avant).
  Avant cela : identité Android unifiée (pilote = APK posé à la main,
  décision Patrick) ; avant cela, défaut ARGENT trouvé et corrigé — le fond de caisse déclaré
  n'atteignait jamais la base (chaîne de 5 défauts, module sacré).
  169 tests backend verts (161 avant), frontend verify/test:ci/build verts,
  cliquet TS à 0.
```

`STATUT` ∈ `EN_ATTENTE` · `EN_COURS` · `BLOQUE` · `TERMINE`
`TYPE_BESOIN` ∈ `ARBITRAGE` · `TEST_PHYSIQUE_ANDROID` · `ACCES_VPS_ODOO`
(voir [`README.md`](README.md) — un arrêt n'est pas un échec d'autonomie,
mais il doit dire quel geste unique Patrick doit poser)

---

## Journal court

Une ligne par reprise. Les rapports détaillés vont dans `docs/`, pas ici.

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
