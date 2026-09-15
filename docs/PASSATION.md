# Passation — JULABA historique

Maintenu par l'instance **JULABA historique** (celle-ci), seule autorisée à
concevoir les changements, ouvrir des branches, committer et merger sur ce
dépôt (décision Patrick, 15/09/2026).

## Organisation

- **JULABA historique** (cette instance) : conçoit, code, teste, commit,
  merge. Seule source de vérité pour l'état de `main`.
- **Instance de preuve locale** : environnement sandbox (Postgres 16, Node,
  Chromium) — exécute builds, tests E2E et recettes (PILOTE-2, PILOTE-3)
  contre des services locaux/jetables. N'a **aucun accès réseau au VPS ni à
  Odoo réel**. N'écrit plus dans Git de sa propre initiative : reçoit des
  commandes précises de JULABA historique, exécute, retourne la sortie
  brute complète. Une anomalie découverte est **signalée**, jamais corrigée
  dans le dépôt de sa propre initiative.
- **VPS / Odoo réel** : environnement externe, manipulé **par Patrick
  lui-même**, à partir de commandes exactes préparées par JULABA historique
  (aucune instance IA n'y a d'accès direct).
- **`main` est la seule source de vérité.** Toute nouvelle tâche commence
  par un `git fetch origin main` + resynchronisation.
- Décisions irréversibles (appId Android, changements de doctrine produit)
  restent soumises à Patrick.

Objectif explicite : plus de branche concurrente sur le même sujet, plus de
double correctif, plus de réconciliation manuelle entre instances.

## État courant

- `main` à **`1958d6a`** (15/09/2026).
- Backend : 161/161 tests unitaires verts, `tsc --noEmit` propre.
- Frontend : `npm run verify` et `npm run test:ci` verts, `npm run build`
  réel réussi.

## Lots clos

| Lot | Contenu | Repère |
|---|---|---|
| PILOTE-1 | Odoo 19 réel + contrat JSON-2 + `OdooRealClient`, filtre catalogue sur `is_storable` (mesuré, pas supposé — `sale_ok` s'est révélé ne pas discriminer) | `865afde`, `24605d7` |
| #239 | Validation du backend JULABA contre Odoo réel (fermé vert) | — |
| #75 / #76 | Recette espèces bout-en-bout + checklist GO pilote (déclaré GO) | PR #75, #76 |
| P0-1 / P1-1 | Cloisonnement par utilisateur : `offlineCaisse` (déjà correct) et `useOfflineVoiceQueue.clearQueue()` (bug réel, corrigé) | `85b7b4b` |
| PILOTE-2 | Caisse espèces/offline, 8 invariants (dont « le serveur encaisse mais la réponse se perd ») | `a355d1d` |
| Référentiel maître | 198 produits vivriers injectés et vérifiés sur le vrai Odoo (198/198, idempotent, prix nuls par construction) | `b2c8035` (kit), import réel exécuté sur le VPS/Odoo réel |
| PILOTE-3 lots 1-2 | Miroir Postgres `catalogue_maitre` + synchro idempotente + `GET /catalogue-maitre` | `0c5e4c0` |
| PILOTE-3 lot 3 | Adoption backend (`produits.default_code`, prix > 0 obligatoire côté marchande, unicité par marchande) + écran d'adoption depuis « Autre article » | `183ed90`, `39b6a0b` |
| PILOTE-3 lot 4 | Recette e2e, 7 invariants, Odoo injoignable | `008b4c2` |
| PILOTE-3 durcissement | Course concurrente sur l'adoption (23505 non capturé → 500 brut), migration formelle manquante (ADR-0002), contrainte nommée explicitement dans le `catch` | `375f8c6`, `b79206f`, `e21a98a` |
| Porte Android — URL API | APK sans `VITE_API_URL` ne joignait aucun backend (repli relatif résolu contre l'origine interne du WebView). Deux correctifs indépendants réconciliés — doctrine retenue : panne bruyante (URL `.invalid` RFC 2606 + `console.error`), jamais de repli deviné | `1958d6a` (fusion de `7a0cb7c` et `3a0b90a`) |

**Doctrine centrale de PILOTE-3, à ne pas rouvrir** : Odoo ne porte que le
référentiel (nom, catégorie, référence) — **jamais de prix**. Le prix
appartient à chaque marchande, posé à l'adoption, jamais partagé. Ce n'est
pas un garde-fou applicatif, c'est une absence de colonne
(`catalogue_maitre` n'a pas de champ prix).

## Lot actif

**Voix absente sur mobile v5** — diagnostic fait, **aucun correctif encore
appliqué** (consigne explicite : diagnostic d'abord).

Piste principale (code lu, pas encore confirmée sur appareil réel) :
`useAudioUnlockFallback` (`LoginPassword.tsx`) est branché pour les étapes
`reconnaissance` (L278) et `phone` (L609), **pas** pour `password`. Une
marchande connue sur l'appareil mais sans biométrie atterrit directement sur
l'écran PIN (`step: 'password'` dès le premier rendu) ; sa consigne vocale
part avant tout geste dans la session et se fait couper par la politique
autoplay du navigateur — en silence.

Deux protocoles de confirmation terrain restent à faire (décrits dans la
conversation) avant tout correctif : reconnexion sur appareil connu sans
biométrie (repro piste #1), et rapport de diagnostic intégré (`🐞 Rapport de
test`, mode dev) pour vérifier `speechSynthesis`/voix disponibles (piste #2,
alternative).

## File d'attente (retours « Bernard »), dans l'ordre décidé par Patrick

1. ~~Stock vendable sans couverture~~ — **clos**, aucun patch. Décision
   produit confirmée : le stock ne bloque jamais une vente, clamp à 0 +
   journalisation du manquant (`stock_mouvements.manquant`), doctrine déjà
   implémentée et volontaire.
2. Voix absente sur mobile v5 — **en cours** (voir ci-dessus).
3. « Ouvre ta journée » — vérifier le câblage exact du bouton/carte
   (`RoleDashboard.tsx` ~L286-393) — pas encore commencé.
4. Retours arrière / chevauchement menu / responsive — pas commencé.
5. Genre « Maman »/« Papa » — pas commencé.
6. Libellés + message de bienvenue — pas commencé.
7. ~~Crédit à la vente~~ — **hors pilote, ne pas rouvrir** (`CAISSE_CREDIT_ACTIF = false`, doctrine déjà actée : stock/idempotence non prêts pour le crédit).

## Invariants gelés (ne pas rouvrir sans décision explicite)

- **CI gelée** : `.github/workflows/ci.yml` n'appelle que `npm run test:ci
  -w frontend_src` (+ `test:unit -w backend`). Aucun ajout à `test:ci` tant
  que la recette terrain n'est pas faite — nouveaux tests dans `verify`
  uniquement (frontend) ou dans la suite `test:unit` déjà existante
  (backend, non gelée).
- **`ODOO_REAL_WRITE_ENABLED` reste `false`** — aucune écriture JULABA →
  Odoo tant qu'un journal de synchronisation persistant (pas en mémoire)
  n'existe pas.
- **Doctrine stock** : jamais de blocage de vente pour rupture — voir point
  1 de la file d'attente.
- **Crédit à la vente** : hors périmètre pilote — voir point 7.
- **Prix Odoo** : structurellement absent du référentiel maître — voir
  doctrine PILOTE-3 ci-dessus.

## Arbitrages ouverts (décision Patrick requise)

- **appId Android** : `capacitor.config.ts` dit `ci.julaba.app`,
  `android/app/build.gradle` dit `com.julaba.app`. Irréversible après
  publication Play Store. **En attente.**
- **Homonymie catalogue** : une marchande peut se retrouver avec deux
  produits au même nom (un « libre », un adopté via une référence Odoo) —
  ex. « Tomate | 200 F/kg | (libre) » et « Tomate | 500 F/tas | TOM-001 ».
  Connu, documenté dans `39b6a0b`, pas corrigé — décision produit (fusionner
  visuellement ? proposer de relier au produit existant ?), pas technique.
- **Version Android figée** : `versionCode 1`, `versionName "1.0"`, jamais
  incrémentés — pas bloquant tant qu'aucune publication réelle n'a eu lieu.
- **Cleartext traffic** : aucun `usesCleartextTraffic` ni
  `networkSecurityConfig` dans le manifest Android. Sans effet tant que le
  backend cible reste en HTTPS (`https://julaba-api.onrender.com`) — à
  traiter seulement si un jour l'APK doit parler à un backend en HTTP clair
  (ex. VPS local sans certificat).
