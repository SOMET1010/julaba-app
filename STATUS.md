# STATUS — JULABA

**Source de vérité de la passation.** Mise à jour à chaque étape franchie et
avant toute fin de session.

| | |
|---|---|
| relevé | **05/10/2026** |
| branche par défaut | `main` |
| branche du livrable | **`release/rc1`** |
| dernier commit | `dbb77a3` — versionCode croissant, preuve en base, protocole de recette |
| `npm run check` | ✅ **6 verts / 0 rouge, exit 0** (seul `garde-argent` reste 🟠 informatif) |
| CI `RC1 — intégration et Postgres` | ✅ **verte sur `b740a89`**, les deux jobs : garde-fous **et** invariants sur PostgreSQL réel |
| dépôt | `SOMET1010/julaba-app` |

---

## ⚠️ LE FAIT QUI CHANGE LE CADRE : IL N'Y A AUCUNE PREVIEW

Établi par l'enquête du 05/10, trois preuves convergentes :

- `render.yaml` ne déclare **ni `previews:`, ni `previewsEnabled`, ni
  `pullRequestPreviewsEnabled`** (vérifié : 0 occurrence) ;
- `coordination/JULABA-STATUS.md` : « la recette par un agent web est
  **ABANDONNÉE** : elle exigeait une **preview Render**, donc de toucher au
  Blueprint, donc un chantier infra que **Patrick refuse à ce stade** (16/09) » ;
- `docs/etape4/RUNBOOK-BASCULE-MIGRATIONS.md` §3.1 : « ☐ Créer un **preview
  environment** sur Render » — **case non cochée**.

**Conséquences, et elles portent sur la méthode de travail :**

| | |
|---|---|
| pousser sur une branche ≠ `main` | **ne produit AUCUNE URL consultable** |
| pousser sur `main` | **déploie la PRODUCTION** — `autoDeploy: true`, et les deux URLs `onrender.com` *sont* la prod |
| il n'y a **pas d'étage intermédiaire** | ni preview, ni staging |

Donc, en l'état, **l'agent recette ne peut vérifier aucune DoD « sur la
preview déployée »** : il n'y a que trois façons de voir tourner du code —
fusionner dans `main` (c'est-à-dire en production), construire un **APK**
(`apk.yml`, déclenchable à la main), ou activer les previews de PR sur
`julaba-web` au tableau de bord Render (geste infra, jamais fait, et le
backlog le limite explicitement **au site statique** : une preview du backend
payant serait une dépense réelle).

**C'est l'accès manquant n° 1.** Tant qu'il n'est pas levé, la DoD d'un
livrable d'interface doit s'appuyer sur un **APK** ou sur des **captures de
l'aperçu local**, pas sur une URL de preview.

---

## Livrable en cours — RC1 : UN APK STABLE DE BOUT EN BOUT

Branche **`release/rc1`**. Tout le code livré y est porté sur le `main` actuel,
**Odoo exclu délibérément** (voie suspendue, et hors périmètre RC1).

### DoD — 6 critères

| | critère | état | preuve |
|---|---|---|---|
| 1 | tout le code livré rassemblé sur une branche, sans conflit | ✅ | `release/rc1`, 20 commits au-dessus de `main` |
| 2 | `npm run check` vert | ✅ | **6 verts / 0 rouge, exit 0** — typecheck ×2, lint 0 alerte, knip, duplication, 325 tests unitaires. Le hook `pre-push` l'a exigé lui-même, **sans contournement**, et la **CI le rejoue** (job « Garde-fous RC1 » vert) |
| 3 | les invariants joués sur un **vrai** Postgres | ✅ | **validé deux fois : en CI** (job « Invariants RC1 sur PostgreSQL réel », conteneur, vert sur `b740a89`) **et en local** sur PostgreSQL **16.13**, 298 invariants, 297 verts. Index `ux_caisse_tx_user_idempotency_key` **UNIQUE (user_id, idempotency_key)** relevé en base ; même clé acceptée pour deux marchandes, refusée pour la même ; `23505` provoqué puis rattrapé |
| 4 | APK signé avec une **clé stable**, mise à jour par-dessus sans désinstaller | ⏳ | chaîne prête : 4 secrets exigés avant le build, échec explicite si absents, **aucun repli sur la clé de debug**. `versionCode` désormais **strictement croissant**. **Attend les secrets de Patrick.** |
| 5 | scénario terrain rejoué sur l'appareil | ⏳ | protocole prêt : `docs/recette/RECETTE-RC1.md`, 10 étapes, PASS/FAIL objectif, traces à capturer. **Attend un S24 Ultra.** |
| 6 | STATUS à jour avec le sha de l'APK et le journal de l'appareil | ⏳ | après le premier run |

**Les 3 premiers critères sont acquis et prouvés. Les 3 derniers attendent deux
choses de Patrick seul : les secrets de signature, et le téléphone.**

---

## Livré / partiel / cassé

### Livré et prouvé

| quoi | preuve |
|---|---|
| Vente vocale à la caisse | journal terrain `e758a37` : « Cinq piments » → prix demandé → micro rouvert seul → 5 Piments, 2 500 F |
| Ajout de produit à la voix (stock) | journal `NE7E` du 03/10 : produit → unité → prix → posé sur l'étal |
| Reconnaissance d'un produit de son étal | `STK-23`, 03/10 — reproduit avant correction |
| Annonce de caisse honnête à l'accueil | `ACC-03`, 03/10 — 6 cas au banc |
| Anti-écho du micro | `MIC-01` — balayage du dépôt, mordant prouvé par mutation |
| STT/TTS hors ligne (Sherpa natif) | `SherpaStt=true`, `SherpaTts=true` dans tous les journaux |
| Connexion (login + SMS) | journal 03/10 : `LOGIN_HTTP status 200` |
| `verify` exécute **tous** ses maillons | `VER-01` — 132 maillons, 129 verts / 3 rouges connus |
| Idempotence **par marchande** | `IDEM-01/02/03` — mordant prouvé par mutation |
| Règles d'agent (portée, délégation, plafonds) | `AGENT-A1/A2/A3` — 21 cas purs |
| Câblage d'agent + traçabilité serveur | `AGENT-A1..A4` — 19 cas |

### Partiel

| quoi | ce qui manque |
|---|---|
| **Agent WhatsApp — écriture** | les **plafonds** ne sont pas renseignés : toute écriture est refusée. Arbitrage du propriétaire |
| **Agent WhatsApp — lecture (b)** | fonctionne, **non vérifié en base** |
| ~~Agent + IDEM jamais passés en base~~ | **FERMÉ le 05/10** — 298 invariants joués sur PostgreSQL 16.13 réel. Les 5 tables existent après `DbInit` seul, index et contraintes **concordent exactement** entre `DbInit` et les 31 migrations (ADR-0002). Banc `idem-01-02-cloisonnement-marchande.spec.ts` |
| Boucle d'ambiguïté du prix (`538f261`) | corrigée, **aucun APK ne la porte** |
| Passerelle Odoo | lecture seule, et la **voie est en suspens** depuis le 05/10 |

### Cassé / rouge, et pourquoi

| quoi | état |
|---|---|
| `test:voix-trace-source` | 🟠 **rouge voulu** — 4 empreintes VOICE-01. Attend `--regenerer` |
| `test:i18n-empreintes-argent` | 🟠 empreinte `intentLocal` — diff établi : **14 phrases / 844, unité ajoutée, 0 franc déplacé**. Attend `--calculer` |
| `test:garde-argent` | 🟠 **12 entrés / 14 perdues**. Attend `--figer-perimetre` |
| `test:entree-unique`, `test:nom-tantie` | ❌ bancs **orphelins** découverts le 03/10, jamais exécutés avant. Hors `verify`, cause non diagnostiquée |

---

## Décisions déduites (avec source)

Voir `docs/DECISIONS.md` pour la liste datée complète. Les structurantes :

| décision | source |
|---|---|
| Le schéma se construit par `DbInitService`, pas par les migrations (`migrationsRun` OFF) | `docs/adr/ADR-0002`, `backend/src/main.ts` |
| `frontend_src/` est la source ; `frontend/` contient des **sorties de build** | `capacitor.config.ts` (`webDir: 'frontend/dist'`) |
| `POST /caisse/vente` est le **seul** chemin de vente | `caisse-rest.controller.ts:261` — une autre route a été fermée avec ce message |
| L'idempotence se juge **par marchande** | `fidelite_evenements` et `wallet_transactions` le faisaient déjà |
| ERPNext écarté, Odoo retenu puis **suspendu** | arbitrages des 04 et 05/10 |
| Auth agent = voie A, code **par SMS jamais par WhatsApp** | arbitrage du 05/10 |
| Plafonds d'agent : `null` = « pas encore décidé », **jamais « illimité »** | arbitrage du 05/10 |

---

## Hypothèses retenues

| hypothèse | raisonnement |
|---|---|
| **Le pilote reste caisse-seule** | trois verrous convergent : `CAISSE_CREDIT_ACTIF = false` en dur, le bandeau de `RC1.md` (« CE DOCUMENT NE COUVRE QUE LA CAISSE »), Keiwa hors pilote. Aucune instruction contraire |
| **`spike/oss-02-vad/` est mort** | `docs/oss/REGISTRE-OSS.md` marque OSS-02 **REJETÉ**. Conservé par prudence : un dossier mort coûte peu, une suppression hâtive coûte un historique |
| **Le hook `pre-push` sans husky** | règle de la maison : « aucun nouveau framework sans démonstration du gain ». Un hook git natif fait le même travail, sans dépendance |
| **Les seuils de garde-fous au niveau actuel** | des seuils idéaux bloqueraient tout le dépôt le premier jour. On empêche l'**aggravation**, on ne corrige rien à ce stade |

---

## À DÉFINIR

### Ce qui bloque RC1 — deux choses, et elles n'appartiennent qu'au propriétaire

1. **Les 4 secrets de signature.** Noms exacts attendus par la chaîne :
   `JULABA_ANDROID_KEYSTORE_BASE64`, `JULABA_ANDROID_KEYSTORE_PASSWORD`,
   `JULABA_ANDROID_KEY_ALIAS`, `JULABA_ANDROID_KEY_PASSWORD`. Sans eux, le
   build **s'arrête dans sa première minute** — c'est voulu : aucun repli sur
   la clé de debug. Le keystore ne vit jamais dans le dépôt, qui est **public**.
2. **Un Galaxy S24 Ultra**, pour les critères 4-5-6 de la DoD.

### Les refigeages — deux restent, tous deux refusés à un agent

3. **`garde-argent.mjs --figer-perimetre`** — autorisé par le propriétaire pour
   RC1, puis **refusé par le système de permissions à l'agent**. Le diff a été
   établi sans le lancer : il ne réécrit que `perimetre.noyau` (un inventaire
   dérivé des fichiers) et `perimetre.genereLe` (une date) — **ni montant, ni
   seuil, ni invariant, ni zone**. Il entérinerait **8 fichiers entrés, 0 sorti,
   0 reclassé**, tous apportés par nos lots (contrôleur et service d'agent,
   tables d'agent, les 3 migrations d'idempotence et d'Odoo).
4. **`garde-argent.mjs --figer-gardes`** — nécessaire pour entériner un
   **renommage de libellé** dans `test-verrou-connexion.mjs` : « ce qui est
   affiché est aussi DIT » est devenu « les deux cas (attente + avertissement)
   sont dits **PAR CLIP** ». Vérifié : la garantie n'est pas perdue, elle est
   **renforcée** (le nouveau libellé exige un clip audio référencé dans
   `services/entreeVoix.ts`, et l'assertion voisine interdit `parle(message)`).
   `garde-argent` compare des libellés, d'où le faux signalement d'assouplissement.
5. **`empreintesArgent.mts --calculer` : sans objet.** Le gate est **déjà vert**
   sur `main` — 10 empreintes sur 10 identiques à leur base, `2 560 000`
   conversations et `19 312` paiements énumérés, **0 violation**. Refiger un gate
   vert aurait réécrit une base d'argent pour rien. Non lancé.
6. **`test-voix-trace-source.mjs --regenerer`** (VOICE-01, 4 empreintes) —
   jamais autorisé, non lancé.

### Arbitrages en attente, non bloquants

7. **`verify` : la liste `CONNUS` est périmée face à `main`.** Elle nomme
   `test:i18n-empreintes-argent`, **redevenu vert**, et ignore `test:i18n-source`,
   **rouge sur `main`** (inventaire 412 / source 411 — un compteur de
   documentation, aucun montant ; correctif = `npm run i18n:inventaire`).
   L'état de référence « 3 rouges connus » est donc vrai **en nombre**, faux **en
   composition**. Inscrire `i18n-source` dans `CONNUS` **ferait taire un rouge** :
   c'est un arbitrage, pas une mise à jour mécanique.
8. **`schema-pilote.spec.ts`** reste rouge : l'empreinte gelée du pilote ne
   connaît pas `odoo_sync_journal`, table légitime d'ODOO-L1 déjà commitée sur
   une autre branche. Le banc demande `scripts/schema-pilote.mjs --figer` —
   **un cinquième refigeage**, non listé dans les quatre, et qui reste une
   décision.
9. **`julaba-latest.apk` signé en clé de debug traîne encore dans la Release
   `pilote-latest`.** Quelqu'un peut le télécharger en croyant prendre le
   pilote. Le retirer, ou laisser le premier build release l'écraser ?
10. **`jsonwebtoken` est utilisé par `backend/scripts/agent-creer.mjs` sans être
    déclaré** dans `backend/package.json`. N'empêche pas l'APK : backlog.
11. **La base de production : Render ou Supabase ?** `render.yaml` déclare
    `julaba-db`, `BASCULE-EXECUTEE-2026-08-15.md` dit que les `DB_*` sont
    surchargés vers Supabase. Seule la valeur de `DB_HOST` au tableau de bord
    tranche. Version PG également contradictoire (ADR-0004 dit 16,
    `reinitialiser-db.yml` dit 18 ; le Postgres de **test** est un 16.13).
12. **Les plafonds d'agent**, le **nouchi**, l'**échéance du pilote**, les **3
    testeurs** et les **5 prérequis §2** de `GO-PILOTE-JULABA.md` : inchangés,
    hors RC1.

---

## SEC-07 — fermé, et le `check` est vert

Le `check` avait trouvé un rouge sur `main` dès sa première exécution :
`backend/test/unit/pin-jamais-rendu.spec.ts`, cas **SEC-07**, « aucun secret
n'est tiré avec `Math.random` », désignant `anti-enumeration.ts`.

**Diagnostic confirmé par la lecture, pas supposé** : la valeur tirée sert à une
**gigue temporelle** anti-énumération (AUTH-07) — uniformiser le temps de
réponse pour qu'on ne devine pas au chronomètre si un compte existe. Elle est
consommée par un `setTimeout` deux lignes plus bas, dans une fonction
`Promise<void>` : elle ne sort ni par la réponse, ni par un log, ni par un
token. Les 5 autres `Math.random` des modules surveillés sont dans des
**commentaires**.

**Corrigé par `randomInt` de `node:crypto`, le banc n'a PAS été exempté.** Une
exemption s'oublie ; le banc, lui, doit rester mordant pour le jour où la ligne
suivante tirera vraiment un secret. Mordant reprouvé par mutation : en
réintroduisant `Math.random`, le banc redevient rouge. Borne exclusive
vérifiée sur 200 000 tirages (mêmes entiers `[0, 79]`, même intervalle de délai).

**`npm run check` sur `release/rc1` : 6 verts, 0 rouge, exit 0.** Le seul écart
restant est `garde-argent`, **informatif**, et il attend deux gestes réservés au
propriétaire (voir « À DÉFINIR »).

---

## Écart anti-spaghetti — mesuré le 05/10, rien corrigé

Les seuils sont réglés **au niveau actuel** : ils empêchent l'aggravation sans
bloquer. Ils se resserrent quand la dette baisse, jamais l'inverse.

| catégorie | mesure réelle | seuil posé | alertes |
|---|---|---|---|
| fichiers > 300 lignes | **185 fichiers**, max **6 644** (`FicheIdentificationDynamiqueBO.tsx`) | `max-lines: 6700` | 0 |
| fonction la plus longue | **2 262 lignes** (même fichier) | `max-lines-per-function: 2300` | 0 |
| complexité maximale | **166** (`FicheIdentificationDynamique.tsx`) | `complexity: 170` | 0 |
| duplication | **3,87 %** — 7 453 lignes sur 192 516, **301 clones** | `threshold: 4` | 0 |
| code mort et dépendances | **396 problèmes** : 41 fichiers inutilisés, **55 dépendances inutilisées**, 239 exports non lus, 28 exports en double | `--max-issues 400` | 0 |
| imports circulaires | `import/no-cycle` en **erreur** dès maintenant — seul seuil serré d'emblée | — | 0 |
| typage | `strict` déjà actif sur les deux workspaces | — | 0 |

**Les trois points les plus gênants** — les plus coûteux au quotidien, pas les
plus gros chiffres :

1. **Deux fichiers de 6 644 et 5 753 lignes** (`FicheIdentificationDynamiqueBO`
   et `FicheIdentificationDynamique`), dont une **fonction unique de 2 262
   lignes** à complexité 166. Personne ne peut relire ça, donc personne ne le
   modifie sans risque — et ils portent l'identification, c'est-à-dire
   l'entrée de tout acteur. **Et ils se ressemblent** : 283 lignes dupliquées
   entre deux `RecolteForm`, le même motif entre `MarchandAlertes` et
   `ProducteurAlertes`. C'est la duplication la plus coûteuse du dépôt :
   corriger un défaut oblige à le corriger deux fois, et on en oublie une.
2. **55 dépendances inutilisées.** Chacune est du temps d'installation, du
   poids, et une surface de sécurité pour rien. C'est aussi le signe que des
   lots passés n'ont pas « supprimé ce qu'ils rendaient inutile ».
3. **Le code portait 46 directives `eslint-disable` pour un eslint qui
   n'existait pas** (vérifié : aucune configuration, aucune dépendance avant
   ce jour). Des développeurs ont écrit des exemptions contre un outil absent
   — autrement dit, la règle était connue et personne ne pouvait la vérifier.

**Rien n'a été corrigé**, conformément à la consigne. Le lint est **vert à
zéro alerte** : il tient le plancher et refusera toute aggravation.

---

## Backlog

- Limite de requêtes **propre à l'agent** (seul le `ThrottlerGuard` global s'applique).
- Route d'écriture de stock pour l'agent (`stock:ecrire` existe, aucune route).
- `ODOO-L3/L4` (mapping sens vente, premier appel réel) — **gelés**.
- Les deux frottements consignés le 03/10 : **aucun bip** sur le chemin `BoutonDirePrix` ; **l'écoute dure 11 s** même quand le prix est compris en 2 s.
- Diagnostiquer `test:entree-unique` et `test:nom-tantie`.
- Réduire la dette anti-spaghetti (**ne rien corriger avant arbitrage**).

---

## Accès — ce qui marche, ce qui manque

| sujet | état |
|---|---|
| GitHub | ✅ `gh api` pleinement fonctionnel sur `julaba-app` (**permissions admin**). `julaba-whatsapp-agent` accessible après `add_repo` |
| Déploiement | ✅ `autoDeploy: true` sur `julaba-api` et `julaba-web` — **mais sur `main`, donc en production** |
| **Preview par branche** | ❌ **n'existe pas** (voir l'encadré en tête) |
| URLs de prod | ❌ **intestables depuis cette session** : l'egress refuse `julaba-api.onrender.com`, `julaba-web.onrender.com` et `julaba.online` (`connect_rejected`, 403 du proxy). À vérifier depuis un navigateur |
| Base de production | ⚠️ **contradiction non résolue** : `render.yaml` déclare `julaba-db` (Render), mais `docs/etape4/BASCULE-EXECUTEE-2026-08-15.md` affirme que les `DB_*` sont **surchargés au tableau de bord vers Supabase**. Seul le tableau de bord Render tranchera (`julaba-api` → *Environment* → `DB_HOST`) |
| Version Postgres | ⚠️ contradiction : ADR-0004 dit **16**, `reinitialiser-db.yml` dit **18** |
| **Base de preview / staging** | ❌ **elle n'existe pas** — aucune migration ne peut être jouée hors production sur un hôte |
| **Postgres de test** | ⚠️ injoignable **en l'état**, mais **à un geste près** : `scripts/pg-test-local.sh start` existe et Postgres 16 est installé localement. **C'est ce qui débloquerait les invariants** — jamais exécutés sur le lot Agent ni sur IDEM |
| Sauvegardes | ✅ `sauvegarde-db.yml` tourne chaque nuit ; artefact vérifié le 05/10 (~75,8 Ko) |
| Variables d'env | ✅ `backend/.env.example` les documente toutes (placeholders) |
| APK | ✅ `apk.yml` déclenchable à la main, artefact `julaba-apk-<sha7>`, Release `pilote-latest`. ⚠️ **signé avec la clé de debug** → chaque build signe différemment, donc toute mise à jour exige une **désinstallation, qui efface les données de la marchande**. Bloquant avant distribution |
| Docker / Azure | tranché par **ADR-0004** (28/09) : Render = prod ; OVH/Docker = secours **dormant** (manuel) ; Azure = miroir **muet**, PAT expiré le 08/09 ; `docker-compose.prod.yml` = vestige |
| Lovable | ❌ **aucune trace** dans le dépôt — hors stack |
| Supabase | vestiges de commentaires seulement, **aucune dépendance npm**. Mais voir la contradiction sur la base de prod |

### ⚠️ Alertes de sécurité remontées par l'enquête

1. **Le dépôt `julaba-app` est PUBLIC** (`"visibility":"public"`, vérifié par API).
2. **Mots de passe par défaut écrits en dur** : `backend/src/auth/auth.service.ts`
   **lignes 42-43**, appliqués à toute inscription réelle. Dans un dépôt public.
   `generateInitialPassword()` existe déjà au même endroit (l. 69-76).
3. **Un ancien secret est cité en clair** dans `.ai/SECURITY_AUDIT.md` l. 117,
   avec mention qu'il subsiste dans l'historique GitHub et Azure.
4. **ALERTE-SEC-01 toujours ouverte** : 29 identifiants en clair dans
   `akoun-dev/julaba` (public), dont 7 mots de passe back-office partageant une
   seule valeur.

*Aucune valeur de secret n'est reproduite ici — seulement les emplacements.*

---

## Pull requests

**Aucune ouverte sur RC1.** Règle permanente : *aucune PR sans que le
propriétaire la demande.*

**PR #261 — « cadre de travail » — ouverte, NON fusionnée, et plus bloquante
pour rien.** https://github.com/SOMET1010/julaba-app/pull/261
Le cadre est déjà **porté sur `release/rc1`** (commit `a0b11b7`), et
l'enquête a établi que `apk.yml` n'a **que** `workflow_dispatch` : il se
dispatche sur n'importe quelle branche. **RC1 se construit donc depuis
`release/rc1`, sans toucher à `main`, production intacte.** La fusion de #261
reste une demande à faire par le propriétaire, elle n'est sur le chemin de
rien.

⚠️ **PR #245 — interdite de merge** (Keiwa, hors pilote).

### Branches de travail de la session, conservées

| branche | contenu | sort |
|---|---|---|
| `release/rc1-integration-merges` | intégration par **merge** des 3 branches de lots, **avec ODOO-L1/L2** | **écartée** — Odoo est hors RC1. Conservée, rien n'est perdu |
| `rc1/apk` | seconde chaîne de signature, préfixe de secrets `ANDROID_*` | **écartée** — `release/rc1` portait déjà la sienne, préfixe `JULABA_ANDROID_*`. Seul son `versionCode` croissant a été repris |
| `rc1/recette` | le protocole de recette | **intégré** |
| `rc1/invariants` (locale) | le banc de preuve en base | **intégré** |
| `rc1/sec-07` (locale) | `randomInt` | **doublon** — déjà sur `release/rc1` (`f0f6451`), convergence indépendante |

---

## Agents mobilisés

`.claude/agents/` : **designer**, **dev-frontend**, **dev-backend**,
**recette**, **relecteur**. Créés le 05/10, aucun encore mobilisé sur un
livrable.
