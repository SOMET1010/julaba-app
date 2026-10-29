# PLAN DE CORRECTION — Audit voice-first & inclusion 2026-10-29

Traçage de la correction de l'audit `AUDIT-VOICE-FIRST-INCLUSION-2026-10-29.md`.
Règle appliquée : **preuve avant croyance** — chaque écart cité a été re-vérifié
contre le code réel (`a96c11b1`, 6 commits après le commit observé `4947b870`).
Statuts : `FAIT (preuve)` / `CONTRÉ (audit infirmé par le code)` / `PLANIFIÉ (lot)` / `TERRAIN (hors code)`.

---

## 1. Contre-vérifications — ce que l'audit avance et que le code dément

| # | Affirmation de l'audit | Réalité du code (preuve) | Statut |
|---|---|---|---|
| C-1 | « /non-enregistre n'a aucun appel vocal » (P1-AUTH-05, logigramme 151-166) | `UnregisteredPhone.tsx:12` importe `speakClipOrText` (audioManager) ; `:58-63` `direNumeroInconnu()` parle accueil + geste avec clips | **CONTRÉ** |
| C-2 | « compte suspendu/rejeté/en attente ramené à mauvais code » (P1-AUTH-05) | `LoginPassword.tsx:1108-1120` : clips DÉDIÉS `compteSuspendu` / `compteAttenteValidation` branchés sur les messages backend — commentaire « LE DÉFAUT FERMÉ ICI » | **CONTRÉ** (fermé avant l'audit) |
| C-3 | « secrets par défaut 0000/123456 à éliminer » (P0-3) | `seed-demo.service.ts:76` : `'123456'` → `return null` (interdit depuis 17/09) ; seeds opt-in (`SEED_DEMO="true"` requis en prod) ; PIN identificateur généré serveur + SMS, jamais affiché (AUTH-RECOVERY, route admin) ; code secret marchande = clavier (B5) | **CONTRÉ en majeure partie** (reste : inventaire ops des comptes hérités pré-17/09 — tâche données, pas code) |
| C-4 | « typecheck/build frontend non exécutables » (P2-1) | Environnement de l'AUDITEUR cassé (tsx/esbuild manquants). Preuve contraire du 29/10 : `tsc -b` → 0 erreur, lint propre, chaîne verify verte (preuves commit `d25b9c8a`) | **CONTRÉ** (aucun fix code requis) |
| C-5 | « récupération manquante » (P0-AUTH-01) | VRAI — mais DÉJÀ CONSIGNÉ au registre : `auth.controller.ts:685-705`, AUTH-RECOVERY-01, arbitrage Patrick 19/09/2026 « ne pas improviser une récupération dans les routes existantes (rouvrirait SEC-05) » | **PLANIFIÉ** (chantier dédié, voir §3) |
| C-6 | « WebAuthn pas usernameless » (P1-AUTH-03) | VRAI : `auth.controller.ts` residentKey/userVerification `preferred`, phone requis en options ; `useWebAuthn.ts:127-152` envoie le phone | **FAIT CE LOT** (§2) |
| C-7 | « montants dynamiques dépendants d'un moteur local disponible » | L'audit n'a pas vu le chemin natif : `SherpaTtsPlugin.kt` (TTS embarqué APK) + `nativeTts.ts` existent — les montants SONT synthétisables hors-ligne sur APK ; reste preuve terrain | **PARTIEL — TERRAIN** |

## 2. Fait dans ce lot (29/10/2026)

### LOT-ACTIVATION — rang 2 clos côté code (29/10, suite)

- **Écran front refait** (`bbfa2c93`) : trois marches, une par écran — le
  code reçu (usage unique, pas un secret), le secret CHOISI PAR ELLE sur
  le pavé (B5 — jamais un champ libre, jamais dicté, jamais 0000/1234,
  glyphes images avec la même préférence que la connexion), puis LE GESTE
  d'elle (« C'est mon compte », toucher long ≥ 800 ms, même mécanique que
  la récupération) avant tout appel serveur. La voix vit au catalogue
  (famille ACTIV_*), filet audio-unlock en plus.
- **Trace serveur** (`985cf4e2`) : ACTIV_CONSENTEMENT horodaté au journal
  d'audit (même journal que le reste — AuditModule dans ActivationModule) ;
  invariant P0.0 étendu (12/12 verts) : chaque activation écrit exactement
  une trace de plus.
- **Restes réels du rang 2** : enregistrement studio des clips ACTIV
  (scripts prêts — CLIPS-VOIX-A-ENREGISTRER.md §5), puis recette terrain
  de bout en bout (elle active, elle se connecte, elle caisse).

### LOT-RECOVERY — clôture du rang 1 (29/10, suite)

- **Écran front FAIT** (`9c44d790`) : trois marches guidées par la voix,
  elle ne tape jamais — la ligne « Restes » ci-dessous était périmée sur
  ce point (l'écran est arrivé APRÈS la rédaction de la ligne, rebasé
  depuis) ; le registre est corrigé ici.
- **Harnais HTTP FAIT** (`e7922b3e` fix + `112db806` harnais) : le reste
  « test d'invariants HTTP harnais, vraie réponse WebAuthn générée » est
  monté ET COURU sur Postgres réel (instance embarquée, base jetable).
  R1→R8 verts : secret jamais révélé (SMS à l'agent seul), un seul code
  actif, refus uniforme, code seul insuffisant (marche 3 murée), options
  découvrables (residentKey/userVerification required, userID = user.id,
  ancienne clé exclue), vraie réponse reconnecte (clés remplacées, code
  consommé, jetons APK), usage unique, échelle d'attente même sur le
  vrai code. La fabrique WebAuthn du harnais est validée par le
  vérificateur de la production (4/4 unitaires).
- **BUG TROUVÉ ET RÉPARÉ PAR LE HARNAIS** (`e7922b3e`) : le code de
  récupération ne pouvait JAMAIS être validé — hash sur la forme
  affichée « XXXX-XXXX », comparaison sur la forme canonique
  « XXXXXXXX ». Marche 1 murée pour tout le monde. Round-trip verrouillé
  au banc unitaire. La preuve que le plan attendait de la recette
  terrain, le harnais l'a rendue avant la première utilisatrice.
- **Restes réels du rang 1** : enregistrement studio des clips (scripts
  prêts — CLIPS-VOIX-A-ENREGISTRER.md §4) puis recette terrain (Patrick).
- Honnêteté : deux suites unitaires échouaient DÉJÀ sur l'arbre propre
  d'origin/dev (unicité des téléphones entre suites invariants
  existantes ; StocksRestController — idempotence). Hors du présent lot,
  à reprendre par un rang dédié.

### LOT-WA-01 — WebAuthn réellement usernameless (P1-AUTH-03)

Cible `docs/SPEC-AUTH-CIBLE.md §2` : connexion quotidienne SANS numéro.

- Backend (`c9080d0f`) : options d'enrôlement → `residentKey: 'required'`, `userVerification: 'required'`, `userID = user.id` (l'assertion sans identifiant rapportera le userHandle = qui se connecte) ; options d'authentification → mode SANS `phone` : `allowCredentials: []` (découvrable) + `userVerification: 'required'`, challenge conservé dans un registre mémoire TTL 3 min (`challenge-usernameless.ts`, usage unique) ; verify → chemin sans `userId` : userHandle → user → credential → challenge du registre. Chemin historique par numéro INTACT en repli (credentials non découvrables des enrôlements anciens).
- Frontend (`9cb02531`) : `authenticateWebAuthn` tente D'ABORD sans numéro (credentials découvrables) puis retombe sur le chemin par numéro — le numéro reste « caché, pas supprimé » (spec §2.2).
- Preuves : build backend OK ; `test:unit challenge-usernameless` 4/4 verts (usage unique, refus du non-challenge, TTL, purge) ; `test:biometrie-session` + `test:convergence-api` verts (régression zéro) ; `tsc -b` 0 ; lint propre.

## 3. Planifié — ordre retenu

| Rang | Écart | Lot à venir | Pré-requis |
|---|---|---|---|
| 1 | P0-AUTH-01 Récupération complète (code identificateur unique+TTL+révocable, double présence, consentement tracé, ré-enrôlement, révocation anciens credentials, guidage Tata) | **LOT-RECOVERY — BACKEND FAIT (29/10)** : fondations c39f7f7a (table codes_recuperation + session à étapes), gestion du code 7855e6ea (généré par SMS à l'agent, jamais affiché, listé sans secret, révocable ; un seul code actif par compte), parcours cbbbc539 (initier/consentement/options/ré-enrôlement — le code seul ne suffit JAMAIS, anciennes clés révoquées, jetons cookies+corps, journaux RECOUV_*) ; tests unitaires 13/13, build OK ; **écran front FAIT 9c44d790 ; harnais HTTP FAIT e7922b3e+112db806 (R1→R8 verts, bug du tiret trouvé et réparé)** | **Restes : clips voix à enregistrer (scripts prêts, CLIPS-VOIX-A-ENREGISTRER.md §4), recette terrain** |
| 2 | P0-AUTH-02 Enrôlement/activation accessible | **LOT-ACTIVATION — FAIT (29/10)** : écran en trois marches bbfa2c93 (pavé B5, secret choisi par elle, geste de consentement ≥ 800 ms), trace serveur horodatée 985cf4e2 (ACTIV_CONSENTEMENT, invariant 12/12) | **Restes : clips ACTIV à enregistrer (scripts prêts, CLIPS-VOIX-A-ENREGISTRER.md §5), recette terrain de bout en bout** |
| 3 | P1-AUTH-04 Sélecteur de comptes (téléphone partagé) | LOT-MULTI-COMPTES | arbitrage terrain (fréquence réelle du partage — spec §4.1 « À VALIDER ») |
| 4 | P1-3 Montants dynamiques — preuve APK du TTS natif | LOT-PROUVE-APPAREIL | recette Maestro/Android réel (P2-3) |
| 5 | P1-4/5/6 Couverture vocale producteur/coopérative/wallet, uniformisation erreurs | lots par rôle (bugs ouverts BUG-008/009/010 déjà tracés dans .ai/BUGS.md) — **29/10 : RANG CLOS — BUG-009 RÉSOLU b89a6df2 (relecture parlée + confirmation + verrou synchrone) ; BUG-008 RÉSOLU 382c31be (file hors-ligne producteur, sémantique caisse empruntée, banc 15/15) ; BUG-010 déjà fermé côté code (0c674e15 + bf5b16ad, registre rattrapé). Registre BUGS VIDE (12/12 résolus)** | — |
| 6 | P2-2 axe-core/Playwright, skip-link, modales unifiées | LOT-A11Y-OUTILS — **29/10 : CLOS CÔTÉ CODE (restes = rangs dédiés)** — skip-link FAIT `138a2630` ; harnais axe-core FAIT (`test:a11y-axe` dans verify, **6 cas** BottomBar ×2/Sidebar ×2/SupportContact/SharedModal ouvert, 0 violation, 13-21 règles passent) ; console du build FAITE (A11Y-007 : esbuild `pure` sous `command === "build"`, preuve par build réel 0 log/info/debug, garde `test:console-prod`) ; garde charte FAITE (A11Y-006 : base 4240 figée, `test:charte-globale`) ; alternatives clavier FAITES (A11Y-005 : 3 retours nommés, tableau `.ai/A11Y_CLAVIER.md`) ; **modales — pas réversible n°1 FAIT** (A11Y-001 : SharedModal = dialog nommé + Fermer + ESC + focus aller/retour, gardé par axe ; l'unification Radix complète reste un rang dédié) | — |
| 7 | P2-4/5 Recette avec utilisatrices réelles, métrique compris/entendu/visible/confirmé/synchronisé | TERRAIN (Patrick) | APK + marches réelles |

## 4. Ce que ce plan refuse de faire

- N'improvise PAS la récupération dans les routes existantes (SEC-05, arbitrage 19/09 — AUTH-RECOVERY-01).
- Ne retire PAS la demande de numéro du chemin de repli (credentials non découvrables existants) — régression interdite.
- Ne déclare PAS « conforme » sur la foi de tests statiques : la promesse voice-first exige la preuve appareil (T1-T3 partiels assumés dans .maestro/README.md).
