# Statut — JULABA historique

> Tenu par **JULABA historique**, seul écrivain de ce fichier.
> Dit *où on en est à l'instant T*. L'état acquis du projet vit dans
> [`docs/PASSATION.md`](../docs/PASSATION.md) — en cas de contradiction,
> c'est `docs/PASSATION.md` qui gagne.

```
STATUT: EN_COURS
TACHE: LOT A — fin du lot, préparation de la recette groupée
BESOIN_PATRICK: NON
TYPE_BESOIN: —
ACTION_PATRICK: — (une seule session terrain quand le lot A sera clos,
  voir docs/RECETTE-TERRAIN-GROUPEE.md)
DERNIER_SHA_MAIN: d87066d
BRANCHE_EN_ATTENTE: claude/clever-allen-dnr8by (e10db78) — correctifs NON
  mergés : authentification et caisse sont des modules sacrés, la
  Constitution exige une preuve réelle avant merge (principe 3).
PROCHAINE_ACTION: le parcours argent est déroulé en entier. Finaliser la
  recette terrain groupée : y inscrire les scénarios argent désormais
  prouvés ici, ne laisser au téléphone que ce qu'une base ne peut pas dire.
DERNIER_RESULTAT: parcours argent complet déroulé (vendre → encaisser →
  fermer). La fermeture de caisse n'enregistrait NI le montant compté (zéro
  écrit à chaque fois, noms de champs décalés) NI l'écart (aucune colonne) —
  or c'est la mesure même du pilote. Corrigé, écart calculé côté serveur.
  Avant : deux défauts ARGENT trouvés dans le navigateur — déclarer son fond avant la première vente était perdu
  (404 sur le seul chemin qu'une marchande a), et les billets défilaient sous
  le doigt (pause branchée sur un événement de souris). Avant : les trois
  rôles mesurés (six écrans marchande, tableaux de
  bord producteur et coopérative) : 0 débordement, 0 élément inatteignable,
  0 cible sous 44px. Les deux dernières PR ouvertes reprises sur main et
  fermées.
```

`STATUT` ∈ `EN_ATTENTE` · `EN_COURS` · `BLOQUE` · `TERMINE`
`TYPE_BESOIN` ∈ `ARBITRAGE` · `TEST_PHYSIQUE_ANDROID` · `ACCES_VPS_ODOO`
(voir [`README.md`](README.md) — un arrêt n'est pas un échec d'autonomie,
mais il doit dire quel geste unique Patrick doit poser)

---

## Journal court

Une ligne par reprise. Les rapports détaillés vont dans `docs/`, pas ici.

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
