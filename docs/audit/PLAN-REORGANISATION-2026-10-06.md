# PLAN DE RÉORGANISATION DU DÉPÔT — 2026-10-06

> Diagnostic d'architecture + plan d'exécution en phases. Document de traçabilité :
> chaque phase est commitée séparément sur `dev` pour permettre un rollback git ciblé.

## 1. Contexte

Audit complet livré le 2026-10-05 (11 périmètres : système auth + 10 acteurs,
scores 42 à 80 — voir `.ai/AUDITS/`). Le présent plan traite la **dette de
réorganisation du dépôt** constatée à la même occasion : artefacts sandbox
versionnés, code mort, dépendances fantômes, Orphelins CI.

## 2. Constat quantifié (avant travaux)

| Zone | Constat | Volume |
|---|---|---|
| Racine | `skills/` versionné (tooling sandbox) | 1076 fichiers / ~61 Mo |
| Racine | `.zscripts/`, `tool-results/`, `download/` versionnés | 12 fichiers |
| Racine | `.audit_ui_*` ×4 (brouillons d'audit) | 4 fichiers |
| Racine | `azure-pipelines.yml` (CI abandonnée) + `docker-compose.prod.yml` | 2 fichiers |
| Racine | `tests/` Playwright orphelin **avec identifiants en dur** | 6 fichiers |
| Backend | Modules coquilles vides `tickets/`, `escrow/` | 16 lignes |
| Backend | `src/audit/` mal nommé (service vivant, 12 références) | renommage |
| Backend | `jspdf` déclaré, jamais importé côté backend | 1 dépendance |
| Frontend | 6 composants Universal*BO sans aucun importeur + 6 exports morts du barrel | 1786 lignes |
| Frontend | Dépendances jamais importées (à re-vérifier) | ~10 paquets |

## 3. Phases et statut d'exécution

### Phase 0 — Hygiène git ✅ (ce commit)
- Désalignage (untrack) de `skills/`, `.zscripts/`, `tool-results/`, `download/`
  (les fichiers restent en local, jamais plus versionnés ; `.gitignore` verrouillé).
- Suppression des brouillons `.audit_ui_*` ×4.
- Archivage de `azure-pipelines.yml` et `docker-compose.prod.yml` dans `docs/archive/`
  (l'CI de référence est GitHub Actions ; le compose prod n'est plus la voie de déploiement).
- **Suppression de `tests/`** (Playwright orphelin, jamais câblé au CI) —
  ⚠️ **ce dossier contenait des identifiants en dur (`tests/specs/api.spec.ts`) :
  les identifiants concernés doivent être ROTÉS côté environnement de recette** ;
  ils restent dans l'historique git (voir §5).
- Rédaction du présent document.

### Phase 1 — Backend ✅
- Suppression des coquilles vides `backend/src/tickets/` et `backend/src/escrow/`
  (+ retrait des imports dans `app.module.ts`).
  - ⚠️ correction du diagnostic initial : **`ansut/` est VIVANT** (service de
    reconnaissance vocale ANSUT/Lafricamobile + ffmpeg, référencé par `sms.service`)
    → conservé. Les modules `-rest` candidats (oneci, cycles, évaluations, fidélité,
    producteurs) ont tous un contrôleur actif → conservés.
- Renommage `backend/src/audit/` → `backend/src/audit-log/` (le nom `audit`
  prêtait à confusion avec les audits documentaires ; service vivant,
  12 références mises à jour).
- Retrait de `jspdf` de `backend/package.json` (utilisé côté frontend uniquement).

### Phase 2 — Frontend ✅
- Suppression des 6 composants Universal*BO sans aucun importeur (types inclus) :
  `UniversalAvatarBO`, `UniversalBadgeBO`, `UniversalFilterPanelBO`,
  `UniversalSearchBarBO`, `UniversalTableBO`, `UniversalToastBO`
  + retrait de leurs 6 exports du barrel `universal/index.ts` (le barrel reste :
  `BOZones.tsx` y importe des composants vivants). Total : 1786 lignes.
  - ⚠️ correction du diagnostic initial : `UniversalCardBO` et `UniversalCardBOZone`
    sont VIVANTS (imports relatifs `./` depuis BOActeurs/BOZones/BOEnrolement/BOMarketplace)
    → conservés.
- Retrait de 10 dépendances jamais importées (vérifiées une à une) :
  `react-hook-form`, `cmdk`, `papaparse` + `@types/papaparse`, `qrcode`
  (seul `qrcode.react` est utilisé), `react-day-picker`, `react-resizable-panels`,
  `jsqr`, `@nestjs/core` (framework backend déclaré côté frontend !), `playwright-core`.
  - gardés malgré le scan : `@capacitor/core|android|cli` (requis par `android/` — `npx cap sync`),
    `tsx` (binaire appelé par les scripts npm).
- Suppression de 12 images sans aucune référence (~558 Ko) : 11 vignettes
  `produit-*.png` (remplacées par `assets/images/produits/*.jpg`) + `tantie-login.png`
  (écran d'accueil redessiné).
  - conservées : les icônes PWA `tantie-sagesse-*` (référencées par
    `public/manifest.json` et `public/sw.js`).

### Phase 3 — Vérifications ✅
- `nest build` (backend) et `tsc -b` + `vite build` (frontend) verts après chaque phase.

### Phase 4 — Ménage approfondi (second passage, scans parallèles front + back) ✅ (aefc7fa)
- **Backend** :
  - suppression de `src/ansut/` (module + service) — ⚠️ **inverse le keep de la
    Phase 1** : `sms.service.ts` implémente son **propre** client HTTP ANSUT
    (`AnsutSmsResult`, POST `/api/message/send`) et lit lui-même les variables
    `ANSUT_*` (qui restent donc dans `.env.example`) ; le « référencé par
    sms.service » du diagnostic était une confusion avec ces lectures d'env.
  - suppression des modules orphelins `producteur/cycles/` (module + service + 2 dto)
    et `producteur/recoltes/recoltes.module.ts` + `update-recolte.dto.ts` — la
    rationale INIT-011 (« conserver pour les relations TypeORM ») était
    techniquement erronée : les entités sont chargées par **glob**
    (`database.module.ts`) et le `forFeature` d'un module jamais importé est
    inerte ; les endpoints vivants sont servis par `cycles-rest` / `recoltes-rest`.
    **Entités conservées** (`cycles/entities/cycle.entity.ts`,
    `recoltes/entities/recolte.entity.ts`).
  - DTOs orphelins : `wallets/dto/credit-wallet.dto.ts`.
  - 3 specs e2e jamais câblées (`academy`, `auth`, `stocks-rest` controllers —
    bootent `AppModule` + `supertest`, incompatibles avec `test/unit` « pur » ;
    à réécrire dans `test/invariants` si besoin de les réactiver).
  - dep `@sentry/profiling-node` jamais importée (`instrument.ts` n'utilise que
    `@sentry/node`).
- **Frontend** :
  - suppression de `voicePacks.ts` + `voicePacks.test.mts` (102+80 l.) —
    remplaçant runtime : le stub vivant `voicePacksRuntime.ts` ;
    `public/voix/manifeste.exemple.json` **conservé** (référencé par
    `mp3Encoder.ts` et `collecteVoixDB.ts`).
  - `studioWav.test.mts` adapté (n'importe plus `validerManifeste`) + typage
    précis du retour de `genererManifesteStudio` — garde `test:studio` verte.
  - `README-MOCK-SERVICE.md` (décrit des fichiers disparus) supprimé ;
    script `test:packs` retiré (et de la chaîne `test:ci`) ;
    `docs/PACKS_VOIX.md` → `docs/archive/`.
- **Vérifications** : `tsc --noEmit` backend, `tsc -b` + `vite build` frontend,
  garde `test:studio` — tous exit 0 ; lockfile resynchronisé (`npm install`).
- **Correction d'audit (Task 9)** : « bo-permissions.ts mort » est **périmé** —
  `config/bo-permissions.ts` est utilisé (`BOUtilisateurs.tsx`) ; les 3
  registres de permissions sont tous vivants → chantier d'**unification
  fonctionnelle**, pas de code mort.

## 4. Décisions reportées (à trancher par l'équipe)

| Réf | Sujet | Recommandation |
|---|---|---|
| R18 | ~16,6 Mo de binaires versionnés (clips voix `public/voix` 11 Mo, images 4,9 Mo) → git-lfs | Procédure documentée en **§7** — à exécuter en fenêtre coordonnée (rewrite d'historique) |
| F14 | 5 chaînes frontend « horsVerify » (contournements de vérification) | Lot fonctionnel dédié, hors périmètre ménage |
| CI | Réintroduire des gardes Playwright ? | Si oui : depuis zéro, secrets en variables d'environnement, jamais en dur |
| PERF | Unification des 3 registres de permissions BO (tous vivants, cf. Phase 4) | Lot fonctionnel : désigner `config/bo-permissions.ts` comme source unique |

## 5. Note sécurité

La suppression d'un fichier de l'arbre ne l'efface pas de l'**historique** git.
Les identifiants présents dans `tests/specs/api.spec.ts` (historique) et toute
fuite passée doivent être traités par **rotation des secrets**, pas par simple
suppression. (Référence : incident tool-results du 2026-10-05, worklog 8-bis.)

## 6. Garde-fous

- Un commit par phase → `git revert <sha>` rétablit une phase entière.
- Branche de travail : `dev` (alignée de force sur `main` @ aa780ae le 2026-10-06 ;
  le travail INIT-016..021 antérieur de `dev` est sauvegardé sur
  `backup/dev-init-016-021`).

## 7. Procédure R18 — migration git-lfs (fenêtre coordonnée)

> ⚠️ Le `git lfs migrate import` **réécrit l'historique** : invalide tous les
> clones existants et les PR ouvertes. À exécuter uniquement après annonce d'un
> gel des pushs et avec l'accord de toute l'équipe.

**Prérequis** : `git-lfs >= 3` sur tous les postes ; CI GitHub Actions :
ajouter `git-lfs/setup-git-lfs@v0` avant le checkout (ou `GIT_LFS_SKIP_SMUDGE=1`
pour les jobs qui n'ont pas besoin des binaires).

**Mesure actuelle (2026-10-06)** : `public/voix` 11 Mo (clips mp3 tata),
`src/assets/images` 4,2 Mo, `src/assets/redesign` 632 Ko, `public/images`
728 Ko — soit ~16,6 Mo de binaires candidats.

**Étapes** :
1. `git tag pre-lfs-migration` (rollback facile) ; faire pousser toutes les
   branches de travail.
2. `git lfs install`
3. `git lfs migrate import --everything --include="*.mp3,*.png,*.jpg,*.jpeg,*.webp,*.woff2"`
   (le SVG du logo reste en git ordinaire : texte compressible).
4. Vérifier : `git lfs ls-files | wc -l` ; `git count-objects -vH` (size-pack
   avant/après) ; un `npm ci` + `vite build` sur un clone frais.
5. Pousser : `git push origin --force --all && git push origin --force --tags`.
6. Équipe : re-clone (ou `git lfs fetch --all && git reset --hard origin/<branche>`).

**Variante sans rewrite (adoption progressive)** : commiter un `.gitattributes`
avec les mêmes patterns dès maintenant — seules les **nouvelles** versions de
binaires passent en LFS, l'historique garde les blobs (gain limité tant que
l'étape 3 n'est pas jouée). Ne PAS activer sans vérifier que la CI dispose de
git-lfs, sinon les builds et clones échouent.
