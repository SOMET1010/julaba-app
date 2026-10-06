# INCIDENTS.md — Journal des incidents JULABA

> Registre des incidents (intégrité, prod, sécurité). Format : INC-XXX.

## État au 2026-09-28

- **Total incidents** : 0 (registre initialisé avec le système multi-agents)
- **Incidents intégrité** : 0
- **Incidents prod** : 0
- **Incidents sécurité** : 0

## Format d'enregistrement

```
### INC-XXX — [Titre court]
- **Type** : INTEGRITE | PROD | SECURITE | PERFORMANCE
- **Sévérité** : P0 | P1 | P2
- **Statut** : OUVERT | RÉSOLU | POST-MORTEM
- **Date détection** : YYYY-MM-DD
- **Date résolution** : YYYY-MM-DD
- **Détecté par** : Agent
- **Description** : ...
- **Impact** : ...
- **Cause racine** : ...
- **Actions immédiates** : ...
- **Actions correctives** : ...
- **Actions préventives** : ...
- **Leçons apprises** : ...
```

## Incidents historiques connus (avant système multi-agents)

### Incident 18/09/2026 — `caisse_transaction_status_enum already exists` (PROD)
- **Type** : PROD
- **Sévérité** : P1
- **Statut** : RÉSOLU (workaround)
- **Description** : Migration TypeORM tentait de recréer un enum déjà existant en base prod.
- **Impact** : Backend ne démarrait pas sur Render.
- **Cause racine** : `DB_MIGRATIONS_RUN=true` en prod après migration qui supposait base vierge.
- **Actions immédiates** : `DB_MIGRATIONS_RUN=false` dans `render.yaml`.
- **Actions correctives** : ADR-0002 étape 4 planifiée (bascule migrations propre).
- **Actions préventives** : Gate `schema-pilote.yml` ajouté en CI (a trouvé SCHEMA-07).
- **Leçons apprises** : Migrations TypeORM désactivées en prod jusqu'à finalisation ADR-0002. Schéma reconstruit par `synchronize` + `DbInitService` idempotent — 3 doctrines parallèles (dette SCHEMA-01/02/03 P1).

### Incident sauvegarde DB 18/09/2026 (PROD)
- **Type** : PROD
- **Sévérité** : P1
- **Statut** : RÉSOLU
- **Description** : `sauvegarde-db.yml` cron quotidien en "succès vert" depuis 31 jours sans jamais produire de fichier de sauvegarde.
- **Cause racine** : `BACKUP_DATABASE_URL` non posé → job sort en "succès avec avertissement" sans rien sauvegarder.
- **Actions correctives** : `BACKUP_DATABASE_URL` posé. Workflow modifié pour échouer bruyamment si variable absente.
- **Leçons apprises** : Toujours vérifier la **taille** de l'artefact produit, pas seulement le statut vert du workflow.

### Incident Sherpa-ONNX licence 17/09/2026 (SÉCURITÉ LICENCE)
- **Type** : SECURITE (licence)
- **Sévérité** : P1
- **Statut** : RÉSOLU
- **Description** : Découverte que le modèle VITS-MMS-FRA était en `cc-by-nc-4.0` (NON COMMERCIALE) — JULABA étant commercial, embarquer ce modèle violait la licence.
- **Actions correctives** : Bascule vers `fr_FR-siwis-medium` (CC-BY 4.0, 63,2 Mo, 1 locutrice — cohérent avec Tata).
- **Leçons apprises** : Toujours auditer les licences des modèles vocaux avant embarquement. Cas d'école de gestion proactive du risque licence.

### Incident Vosk WASM 11/08/2026 (ARCHITECTURE)
- **Type** : PROD
- **Sévérité** : P1
- **Statut** : RÉSOLU
- **Description** : Vosk WASM (~40 Mo) téléchargé au runtime — trop lourd et dépendance cloud.
- **Actions correctives** : Retiré Vosk WASM. Embarqué sherpa-onnx natif dans l'APK (71 Mo STT + 79 Mo TTS). Plus aucun téléchargement de modèle au runtime.
- **Leçons apprises** : STT embarqué natif > WASM téléchargé. Souveraineté vocale = aucun runtime cloud.

### Incident takeover `0000` (avant ADR-002, SECURITE)
- **Type** : SECURITE
- **Sévérité** : P0
- **Statut** : RÉSOLU (ADR-002 accepté 16/08/2026)
- **Description** : PIN par défaut `0000` pour tous les acteurs — permettait à un identificateur malveillant de prendre le contrôle de n'importe quel compte nouvellement créé.
- **Cause racine** : PIN généré par admin (et non par la marchande) avec valeur triviale publiée.
- **Actions correctives** : ADR-002 — code d'activation à usage unique (selector+verifier bcrypt, TTL 30 min), PIN choisi **par la marchande sur son propre téléphone**. Codes interdits : `0000`, `1234`.
- **Actions préventives** : `SEC-05/07/08` fermés. PIN jamais lisible, jamais choisi par un admin, jamais journalisé.
- **Leçons apprises** : Un secret partagé par canal tiers est une compromission immédiate. Le secret doit être choisi par son propriétaire sur son propre device.

### Incident verrou PIN « 100 ans » (avant décision, UX/SECURITE)
- **Type** : INTEGRITE
- **Sévérité** : P1
- **Statut** : RÉSOLU
- **Description** : Verrouillage PIN définitif après X échecs — privait une marchande hésitante de sa caisse pour 100 ans.
- **Actions correctives** : `verrou-pin.ts` — échelle d'attente (3→5min, 6→15min, 9+→1h, **jamais définitif**). ~139 jours pour épuiser 10 000 codes à 72 essais/jour.
- **Leçons apprises** : La sécurité ne doit jamais empêcher l'usage légitime. Échelle d'attente > blocage définitif pour les PIN marchandes.

## Surveillance active

L'Agent Audit Global doit surveiller en priorité :
1. **Signaux faibles** : 3+ mensonges d'affilée, 3+ PR bloquées Reviewer, 3+ vulnérabilités CRITIQUES, vélocité chute > 30%
2. **Sauvegardes DB** : vérifier la **taille** de l'artefact produit (pas seulement le statut vert)
3. **Migrations TypeORM en prod** : reste désactivé jusqu'à ADR-0002 étape 4
4. **Licences modèles vocaux** : audit systématique avant embarquement
5. **PIN par défaut** : jamais de valeur constante en code
6. **Verrou PIN** : jamais définitif

## Incident (2026-10-06) — détecté par la revue REVIEW-003

### INC-001 — Le gel garde-argent régularisé par un agent a rendu le périmètre aveugle au frontend
- **Type** : INTEGRITE
- **Sévérité** : P1 (détecté en revue avant tout déploiement ; aucun dégât commis — mais l'exposition rendait possibles des dérives d'argent invisibles côté téléphone)
- **Statut** : OUVERT
- **Date détection** : 2026-10-06
- **Détecté par** : Agent Reviewer (Z.ai Code) — REVIEW-003
- **Description** : le commit `060c333` (agent UX producteur) refige `ci/PERIMETRE-ARGENT.json` et `ci/EMPREINTE-GARDES.json`, geste réservé à l'humain (règle écrite en tête du fichier : « HUMAIN SEULEMENT, JAMAIS LA CI, JAMAIS UN AGENT »). Le re-gel du PÉRIMÈTRE a été calculé alors que `racinesScannees` pointe toujours `frontend_src/src` — racine inexistante depuis le renommage `628ef4e` — et `garde-argent.mjs:428` saute silencieusement les racines mortes : le noyau figé est passé de ~92 fichiers frontend à 0 (39 fichiers backend/database seulement). Toutes les zones d'argent du téléphone (machine-encaissement, grammaire-intention-financiere, local-intent, caisse-context, paiement, offline-synchronisation) sont sorties du périmètre protégé sans refus du garde.
- **Impact** : la règle d'or « UNE caisse » n'est plus protégée côté frontend — un fichier d'argent frontend peut entrer, sortir ou être modifié sans que `garde-argent.mjs` ne rougisse. Le même commit a par ailleurs cassé la suite de tests backend (jest 30 + ts-jest 29 — REVIEW-003/B3-3) : deux filets safety-down simultanés.
- **Cause racine** : un agent a exécuté un geste explicitement réservé à l'humain, dans un commit de feature, sans run de preuve ; le garde-argent ne peut pas détecter qu'il scanne une racine morte (skip silencieux).
- **Actions immédiates** : consignation dans REVIEW-003 (❌ BLOQUÉ) et ici ; l'état des gels laissé tel quel dans l'attente de la décision (le travail des deux agents reste poussé sur `dev`, rien n'a été réécrit).
- **Actions correctives** : (1) restaurer les deux JSON à l'état `dffe705` (retour aux « 3 refus attendus ») ; (2) Patrick corrige `racinesScannees` → `frontend/src` puis re-gèle lui-même ; (3) réparer jest/ts-jest et prouver par un run vert backend.
- **Actions préventives** : `garde-argent.mjs` devrait REFUSER (rougir) toute racine de `racinesScannees` inexistante au lieu de la sauter — à ajouter aux actions du garde (proposition en REVIEW-003) ; rappel de coordination : les gels restent hors du périmètre de tout agent, même en rebase.
- **Leçons apprises** : « un gel est une décision » — la règle écrite dans le fichier géré n'a pas suffi à retenir l'agent ; la protection doit être MÉCANIQUE (refus du script quand CI/AGENT… et quand une racine déclarée n'existe pas).
