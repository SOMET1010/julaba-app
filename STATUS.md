# STATUS — JULABA

**Source de vérité de la passation.** Mise à jour à chaque étape franchie et
avant toute fin de session.

> Décision de Patrick (07/10/2026, point 7) : **ce fichier fait foi**. `docs/PASSATION.md`
> et `docs/JOURNAL.md` sont archivés (bandeau en tête, plus mis à jour) et renvoient ici.

| | |
|---|---|
| relevé | **05/10/2026** |
| branche par défaut | `main` |
| branche en cours | `claude/cadre-de-travail` |
| dernier commit | `1ae880d` — cadre de travail (3 commits) |
| dernier lot applicatif | `447d1ce` — AGENT-V1, sur `claude/agent-auth-idempotence` |
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

## Livrable en cours

**Aucun.** La session précédente a livré le Lot A (authentification d'agent) et
l'a poussé. Le prochain livrable attend l'arbitrage du propriétaire — voir
« Proposition » plus bas.

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
| **Tout le lot Agent + IDEM** | **aucun test n'a touché un Postgres** : 4 tables, ~15 requêtes SQL, prouvées par lecture seulement |
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

1. **Les plafonds d'agent** — par opération et par jour. Bloque toute écriture WhatsApp.
2. **Les 4 refigeages** — `--regenerer`, `--calculer`, `--figer-perimetre`, `--figer-gardes`.
3. **Les 6 bancs orphelins** : entrent-ils dans `verify` ? 4 verts, 2 rouges.
4. **L'APK** — dix lots poussés, aucun appareil ne les a vus.
5. **La voie ERP** — Odoo suspendu le 05/10, rien ne le remplace.
6. **Le nouchi** — langue retenue pour l'agent, **outillée nulle part** (ni lexique, ni corpus, ni test).
7. **L'échéance du pilote** — aucune date dans le dépôt.
8. **Les 3 testeurs** et les **5 prérequis §2** de `GO-PILOTE-JULABA.md`, non constatés.
9. **Dossiers au statut incertain** : `spike/`, `infra/odoo-poc/`, `tests/`, `database/`, `coordination/`, `nginx/`, `docker-compose*.yml`, `azure-pipelines.yml`.
10. **Un Postgres de test joignable** — sans lui, les invariants ne tournent pas.

---

## Le `check` a trouvé un rouge sur `main` dès sa première exécution

```
CHECK — 5 vert(s), 1 rouge(s), 0 absent(s)
❌ tests unitaires · backend
🟠 garde-argent (informatif — écart connu)
```

**Le test qui échoue :** `backend/test/unit/pin-jamais-rendu.spec.ts`, cas
**SEC-07** — « aucun secret n'est tiré avec `Math.random` ». Il désigne
`backend/src/auth/anti-enumeration.ts:108`.

**Mon analyse : c'est un faux positif du banc, pas un défaut de sécurité.**

```ts
const echeance = debut + PLANCHER_MS + Math.floor(Math.random() * GIGUE_MS);
```

`Math.random()` sert ici à une **gigue temporelle** — uniformiser le temps de
réponse pour qu'on ne puisse pas deviner, au chronomètre, si un compte existe.
**Ce n'est pas un secret**, c'est un délai. Le banc cherche `Math.random` dans
les fichiers sensibles sans distinguer « tirer un secret » de « tirer un
délai ».

**Deux issues, et c'est un arbitrage :**
- **exempter explicitement** ce cas dans le banc, avec le motif écrit (« un
  délai n'est pas un secret ») — c'est ce que je recommande ;
- ou **passer à `randomInt`** par précaution : un jitter prévisible affine
  théoriquement une mesure de timing, même si le plancher fixe domine.

**Je n'ai rien corrigé** (consigne). Conséquence à connaître : **le `check` est
rouge sur `main`, donc le hook `pre-push` bloquera** jusqu'à l'arbitrage. Les
tests restent volontairement **bloquants** : les rendre informatifs
désactiverait le filet pour supprimer un message, ce qui est l'inverse du but.

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

**PR #261 — « cadre de travail » — OUVERTE, NON FUSIONNÉE.**
https://github.com/SOMET1010/julaba-app/pull/261 · `claude/cadre-de-travail` → `main`
· 3 commits, 19 fichiers · `mergeable_state: unstable` (la CI `check` y est
rouge, du rouge préexistant SEC-07 décrit plus haut).

**Pourquoi elle n'est pas fusionnée alors que l'autorisation était donnée :**
l'autorisation (« je t'autorise à les faire arriver sur la branche par
défaut ») a été donnée **avant** que l'enquête n'établisse qu'il n'existe
aucune preview et que `autoDeploy: true` porte sur `main`. Fusionner, c'est
**déployer la production**. Cet effet n'était pas connu au moment de
l'autorisation : la fusion attend donc une confirmation explicite.

Règle permanente : *aucune PR sans que le propriétaire la demande.*

⚠️ **PR #245 — interdite de merge** (Keiwa, hors pilote).

---

## Agents mobilisés

`.claude/agents/` : **designer**, **dev-frontend**, **dev-backend**,
**recette**, **relecteur**. Créés le 05/10, aucun encore mobilisé sur un
livrable.
