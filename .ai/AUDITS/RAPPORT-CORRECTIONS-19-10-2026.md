# RAPPORT UNIQUE DES CORRECTIONS — 19/10/2026

| | |
|---|---|
| Date | 19/10/2026 |
| Déclencheur | Corrections liées à la dictée web, aux wallets manquants et aux petits correctifs dev/UX |
| Dépôt | `github.com/SOMET1010/julaba-app` — branche `dev` |
| Méthode | Cause tracée dans le code + preuve `fichier:ligne`, bancs rejoués |
| État au moment du lot | `verify` : 144/152 (2 rouges connus + 6 préexistants à l'HEAD) — aucun rouge nouveau introduit |

---

## 1) Vue chronologique

| Commit | Message | Objet |
|---|---|---|
| `55a8e0c0` | `feat(voix): dictée web par la reconnaissance native du navigateur (DICTÉE-WEB)` | Dictée web pour vente + écran de connexion (hors APK) |
| `725caf7e` | `fix(wallets): créer les wallets manquants automatiquement` | Plus de 404 `/wallets/me` à l'accueil |
| `0643e688` | `docs(status): trace du lot dictée web (commit 55a8e0c0 poussé)` | Traçabilité STATUS/DECISIONS |

---

## 2) Détail des corrections avec cause et preuve

### 2.1 DICTÉE-WEB — dictée navigateur sur web
- **Demande / constat** : sherpa-ONNX est un plugin Capacitor natif. Sur le navigateur web, il n'existe pas. Sans correctif, la dictée était indisponible ou cassait sur la version web.
- **Cause** : `useVoiceCore` s'appuyait uniquement sur le moteur natif sherpa. Il fallait une branche « web » utilisant `SpeechRecognition` du navigateur, avec un contrat identique à celui du moteur hors-ligne.
- **Preuve**
  - `frontend/src/app/voice-offline/webReco.ts` — module `webReco` : `conclure()` / `annuler()`, exclusion Capacitor Android/iOS, gestion des erreurs typées, normalisation du résultat.
  - `frontend/src/app/voice-offline/webReco.test.mts` — **29/29** verts (correction du stub `results` cumulatif + `resultIndex`).
  - `frontend/src/app/hooks/useVoiceCore.ts` — branchement web (`recoWebDispo()`, routage vers `webReco`), logs/trace conservés.
  - `frontend/src/app/hooks/useDicteeLive.ts` — branche `surWeb` + `surPasseSTT` partagé.
  - `frontend/src/app/components/auth/LoginPassword.tsx` — `voixEcouteDispo = offlineModelReady() || recoWebDispo()` pour permettre la dictée sur l'écran de code/connexion web.
  - `frontend/package.json` + `frontend/scripts/maillons-verify.json` — inscription du banc `test:web-reco` (maillon ajouté).
- **Bancs** : `npm run test:web-reco` (29/29), `tsc -b` 0, `verify` stable (mêmes rouges connus/préexistants).
- **Décision** : `docs/DECISIONS.md` — « DICTÉE-WEB » (19/10) : sherpa reste moteur APK, web utilise `SpeechRecognition` ; contrat `conclure()/annuler()` strict pour éviter un texte périmé après `abort()`.

### 2.2 Wallets manquants à l'accueil
- **Constat** : certains comptes n'avaient pas de wallet → `GET /wallets/me` renvoyait 404 et l'accueil faisait croire que la caisse était cassée.
- **Cause** : pas de création paresseuse côté API et pas de rattrapage en base au démarrage.
- **Preuve**
  - `backend/src/wallets/wallets.service.ts` — `getByUserId` crée le wallet manquant à la demande (création paresseuse) au lieu de renvoyer 404.
  - `backend/src/database/db-init.service.ts` — backfill idempotent des wallets manquants.
- **Bancs** : `backend` tests unitaires passent (35 suites / 288 tests).
- **Décision** : `docs/DECISIONS.md` — « `GET /wallets/me` crée le wallet manquant… » (19/10).

### 2.3 Proxy Vite `/socket.io` (dev)
- **Constat** : le WebSocket ne se connectait pas en dev.
- **Cause** : proxy mal configuré pour WebSocket.
- **Preuve** : `frontend/vite.config.ts` — proxy `/socket.io` avec `ws: true` pointant vers `http://localhost:3001`.
- **Décision** : `docs/DECISIONS.md` — « proxy Vite `/socket.io` (`ws: true` → `localhost:3001`) » (19/10).

### 2.4 Bouton « Retour » retiré de l'écran code secret
- **Constat** : le bouton « Retour » était visible sur l'écran du code secret alors qu'il fallait éviter ce retour direct.
- **Cause** : élément présent dans `LoginPassword`.
- **Preuve** : `frontend/src/app/components/auth/LoginPassword.tsx` — suppression/masquage du bouton retour ; le bouton « Effacer » reste le seul moyen pour vider.
- **Décision** : `docs/DECISIONS.md` — « bouton « Retour » retiré de l'écran code secret (le bouton Effacer vide reste le retour) » (19/10).

---

## 3) Traçabilité documentaire
- `docs/DECISIONS.md` — ajouts datés 19/10 (DICTÉE-WEB, wallets, proxy + bouton retour)
- `STATUS.md` — mise à jour 19/10 (« dictée web » tracé, PUSH de `55a8e0c0`/`0643e688` relevé)
- `.ai/AUDITS/AUDIT-AJOUT-PRODUIT-VOCAL-2026-10-19.md` — présent (non committé à ce lot) pour information

---

## 4) Preuve non-régression
| Vérification | Résultat |
|---|---|
| `cd frontend && npx tsc -b` | **EXIT 0** |
| `cd frontend && npm run test:web-reco` | **29/29** |
| `cd frontend && npm run verify` | **144/152** (2 connus : `test:voix-trace-source`, `test:garde-argent` + 6 préexistants) — **aucun rouge nouveau** |
| `cd backend && npx jest -c jest-unit.config.cjs` | **35 suites / 288 tests verts** |

---

## 5) Conclusion
- **Sherpa** reste le moteur **natif APK** (plugins `SherpaSttPlugin.kt`/`SherpaTtsPlugin.kt`). Sur **web**, c'est bien `SpeechRecognition` navigateur qui est utilisé — **pas** une restriction à une liste de produits. L'appariement produit reste côté applicatif.
- Les 4 points ci-dessus sont corrigés, tracés et vérifiés. Pas de régression sur les bancs existants.
