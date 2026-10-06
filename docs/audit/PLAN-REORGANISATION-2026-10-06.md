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

## 4. Décisions reportées (à trancher par l'équipe)

| Réf | Sujet | Recommandation |
|---|---|---|
| R18 | ~38 Mo d'images versionnées → git-lfs | Migrer vers git-lfs lors d'une fenêtre calme (coordonner tous les clones) |
| F14 | 5 chaînes frontend « horsVerify » (contournements de vérification) | Lot fonctionnel dédié, hors périmètre ménage |
| CI | Réintroduire des gardes Playwright ? | Si oui : depuis zéro, secrets en variables d'environnement, jamais en dur |

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
