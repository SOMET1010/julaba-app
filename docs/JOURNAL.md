# Journal — Julaba coordo

Une entrée par session de chef de chantier. Le plus récent en haut.
Les passations détaillées restent dans `docs/passation/`.

---

## 05/10/2026 (suite) — clôture de PR #259

Décision de Patrick : GO pour les trois refigeages, ODOO-L1/L2 hors pilote,
les 6 bancs orphelins renvoyés à un lot qualité séparé.

- Tête avant refigeage : `e6d5333` (identique au diagnostic, + JOURNAL seul).
- Refigeages (`b77a5d9`) : périmètre 4 entrés / 1 sorti ; gardes 188 fichiers,
  3083 assertions ; empreinte `intentLocal` seule changée.
- Local : `verify` 131/132 (reste `test:voix-trace-source`, VOICE-01, ancien,
  hors lot) ; `test:ci` vert ; tsc 0 ; backend 251/251.
- CI sur `b77a5d9` : 6/6 verte, dont « Verdict du garde-fou ».
- **#259 fusionnée : `main` = `ea499ab`** (merge commit).

- **APK construit depuis `ea499ab`** (GO Patrick) : run 37277252742, vert.
  `julaba-ea499ab.apk` (= `julaba-latest.apk`) sur la release `pilote-latest`,
  272 976 125 octets, SHA-256
  `1a2f3d9327716828e3b6002327bb1deea6ae0661b88d82b4eae7e6ec69a580aa`.
  Debug, signature v2 vérifiée, `com.julaba.app`, targetSdk 36.
  Options : API `https://julaba-api.onrender.com/api/v1`, voix dioula NON,
  argent dioula NON, clips prototypes NON (défauts du workflow).

Prochain lot : recette pilote sur 2–3 téléphones avec cet APK.

---

## 05/10/2026 — état réel avant fusion dans `main`

Branche : `claude/integration-main` (PR #259), tête mesurée `3381cc6`.

### Mesures (locales, Node 22, `npm ci`)

| porte | résultat |
|---|---|
| `npm run test:ci -w frontend_src` | **exit 0 — vert** (44 maillons) |
| `npm run verify` (frontend) | exit 1 — 129 verts, **3 rouges connus**, aucun rouge nouveau |
| `npm run test:unit -w backend` | 33 suites, 251/251 |
| `node ci/check-tsc-baseline.mjs` | 0 erreur |
| `node ci/garde-argent.mjs --base origin/main` | exit 1 — 3 refus (voir ci-dessous) |

CI GitHub sur `3381cc6` : 5 jobs verts sur 6 (build/tests/gate TS,
invariants PostgreSQL ×2, schéma, détection chemin d'argent).
**Seul rouge : « Verdict du garde-fou ».**

### test:ci — rouge depuis le 01/10, root-causé et corrigé

Corrigé par la session d'intégration du 03/10 (commits `e940e13`, `4b69940`,
`18b7731`), constaté vert aujourd'hui en local et en CI :

- `test:vendre-unifie`, `test:correction` : attentes périmées par des
  décisions déjà prises (montant dit en toutes lettres ; « bon » isolé n'est
  plus un oui, VOIX-08) ;
- `test:offline-voice-hook` : vrai défaut — Tata reposait « c'est bien ça ? »
  après le « oui ». Corrigé dans le code (`18b7731`).

### Pourquoi PR #259 n'est PAS fusionnée (règle 7 non réunie)

Le « Verdict du garde-fou » refuse pour 3 motifs, et **les trois ne se
lèvent que par un refigeage réservé à Patrick** :

1. **Périmètre d'argent bougé non déclaré** (4 entrés, 1 sorti) →
   `garde-argent.mjs --figer-perimetre`.
2. **Garde desserrée dans une plage qui touche l'argent** (14 assertions
   perdues, déjà déclarées GARDE-ASSOUPLIE) → `--figer-gardes`.
3. **Preuve d'exécution refusée** parce que `test:i18n-empreintes-argent` est
   rouge (empreinte `intentLocal` : 14 phrases / 844, unité ajoutée, aucun
   franc déplacé — cf. `docs/passation/SESSION-2026-10-03.md` §3.4) →
   `empreintesArgent.mts --calculer`.

Aucun agent ne lance ces refigeages. Choix retenu : **attendre Patrick**
plutôt que fusionner avec un check rouge.

### Divergence de branches à connaître

`claude/clever-allen-dnr8by` porte 4 commits du 05/10 absents de l'intégration :

| commit | contenu | traitement |
|---|---|---|
| `2ee1a8b` | fiche API agent serveur (doc seule) | non intégré — projet post-pilote |
| `e798bcb` | VER-03, correctif `garde-argent.mjs` | **doublon** de `ef4fbee` déjà sur l'intégration (même cause, même effet : 188 gardes, 4 entrés / 14 perdues). Ne pas fusionner les deux. |
| `f7035ee` | ODOO-L1, journal de synchro en Postgres (DDL DbInit + migration) | **en suspens** : voie Odoo « plus retenue » (Patrick) |
| `077c4f0` | ODOO-L2, pont vente → passerelle, inactif par flag | **en suspens**, touche `caisse-rest.controller.ts` ; son propre message dit « à relire avant tout usage » |

Option recommandée : après fusion de #259, `clever-allen` cesse d'être la
branche de travail ; ODOO-L1/L2 restent sur leur branche jusqu'à décision.

### Ce qui attend Patrick

- les 3 refigeages ci-dessus (débloquent #259) ;
- sort des commits ODOO-L1/L2 (voie Odoo abandonnée ?) ;
- les 6 bancs orphelins : entrent-ils dans `verify` ? ;
- APK : aucun appareil n'a vu les lots du 03/10 (AMB-01 bis invérifié) ;
- prérequis pilote non constatés (`docs/pilote/GO-PILOTE-JULABA.md`) :
  TRUST_PROXY, sauvegarde quotidienne, Sentry, UptimeRobot, recette 2–3
  téléphones ; plus les 3 testeurs.
