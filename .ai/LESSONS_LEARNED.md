# LESSONS_LEARNED.md — Leçons apprises JULABA

> Alimenté par tous les agents après chaque feature ou incident.

## État au 2026-09-28

- **Total leçons** : 12 (10 héritées + 2 système multi-agents)

## Leçons héritées (avant système multi-agents)

### 1. Un secret partagé par canal tiers est une compromission immédiate
- **Contexte** : PIN par défaut `0000` choisi par l'identificateur → takeover possible
- **Leçon** : Le secret doit être choisi par son propriétaire sur son propre device
- **Application** : ADR-002 (code activation 30 min + PIN choisi par marchande)
- **Date** : 16/08/2026

### 2. La sécurité ne doit jamais empêcher l'usage légitime
- **Contexte** : Verrouillage PIN définitif après X échecs → marchande privée de sa caisse 100 ans
- **Leçon** : Échelle d'attente > blocage définitif pour les PIN marchandes
- **Application** : `verrou-pin.ts` (3→5min, 6→15min, 9+→1h, jamais définitif)
- **Date** : avant 16/08/2026

### 3. STT embarqué natif > WASM téléchargé
- **Contexte** : Vosk WASM (~40 Mo) téléchargé au runtime — trop lourd
- **Leçon** : Souveraineté vocale = aucun runtime cloud
- **Application** : sherpa-onnx natif dans l'APK (71 Mo STT + 79 Mo TTS)
- **Date** : 11/08/2026

### 4. Toujours auditer les licences des modèles vocaux avant embarquement
- **Contexte** : VITS-MMS-FRA cc-by-nc-4.0 (NON COMMERCIALE) — JULABA étant commercial
- **Leçon** : Cas d'école de gestion proactive du risque licence
- **Application** : Bascule vers `fr_FR-siwis-medium` CC-BY 4.0
- **Date** : 17/09/2026

### 5. Toujours vérifier la taille de l'artefact produit, pas seulement le statut vert du workflow
- **Contexte** : `sauvegarde-db.yml` en "succès vert" 31 jours sans jamais produire de fichier
- **Leçon** : `BACKUP_DATABASE_URL` non posé → job sort en "succès avec avertissement" sans rien sauvegarder
- **Application** : Workflow modifié pour échouer bruyamment si variable absente
- **Date** : 18/09/2026

### 6. Migrations TypeORM en prod = risque d'enum déjà existant
- **Contexte** : Incident 18/09/2026 `caisse_transaction_status_enum already exists`
- **Leçon** : Migrations TypeORM supposent base vierge — en prod, schéma déjà existant
- **Application** : `DB_MIGRATIONS_RUN=false` en prod (workaround), ADR-0002 étape 4 planifiée
- **Date** : 18/09/2026

### 7. Un ADR qui dit 'fait' alors que le code n'est pas branché coûte plus cher qu'un ADR qui dit 'décidé, pas fait'
- **Contexte** : ADR-0003 affirmait `devise.ts` appliqué — l'auditeur a relevé que c'était faux
- **Leçon** : Auto-correction documentée (l'ADR avertit lui-même)
- **Application** : Registre dette à 20 révisions, l'auditeur rouvre et referme ses propres erreurs
- **Date** : après 19/09/2026

### 8. Le registre de dette doit être établi par inspection ligne à ligne du code, pas par lecture de messages de commit
- **Contexte** : Les messages de commit peuvent mentir (sur-estimation, oublis)
- **Leçon** : Source de vérité = code uniquement
- **Application** : `docs/dette/REGISTRE-MAITRE.md` établi par inspection, 20 révisions
- **Date** : depuis 19/09/2026

### 9. La voix est une propriété du PARCOURS, pas de l'écran
- **Contexte** : Voice-first limité à l'écran → info importante uniquement textuelle
- **Leçon** : Aucune information importante ne doit exister uniquement sous forme de texte
- **Application** : 6 lots voix (A, B, B2, C, D, E) + 2 lots habillage (F, F2)
- **Date** : 20/09/2026

### 10. Une revue qui viole la Constitution doit échouer
- **Contexte** : 8 principes produits sans mécanismes CI → revues subjectives
- **Leçon** : Chaque principe doit avoir un mécanisme CI actionnable
- **Application** : Constitution avec 8 principes + mécanismes (anti-doublon CI, ADR obligatoire, DoD, modules sacrés, invariants testables)
- **Date** : avant 22/09/2026

## Leçons du système multi-agents (depuis 2026-09-28)

### 11. Initialiser le système multi-agents sur un projet existant révèle 3 types de dette
- **Contexte** : Application du prompt multi-agents sur julaba-app (780 commits, projet pilote mature)
- **Leçon** : L'audit initial révèle systématiquement 3 catégories de dette cachées :
  1. **Dette de gouvernance open-source** (README, LICENSE, semver, CHANGELOG) — souvent absente même sur projets matures
  2. **Dette d'observabilité** (metrics, logs structurés, Core Web Vitals, alerting) — pas prioritaire en pilote, critique pour le scale
  3. **Dette de cohérence** (3 chaînes de déploiement concurrentes, 2 contrôleurs dupliqués, dépendances parasites) — invisible au quotidien, bloquante pour la maintenance
- **Application** : Audit initial à systématiser avant toute prise en main d'un projet existant
- **Date** : 2026-09-28

### 12. Le score 73/100 est un bon score pour un pilote — ne pas viser 100/100 immédiatement
- **Contexte** : Premier audit global de julaba-app à 73/100
- **Leçon** : Viser 60/100+ pour PROD, 80/100+ pour scale, 90/100+ pour mission-critique. Le 100/100 est un horizon, pas un objectif immédiat.
- **Application** : Plan d'action P0 (5 actions), P1 (10 actions), P2 (10 actions) — étaler sur 2 mois
- **Date** : 2026-09-28

## Format d'enregistrement

```
### N° — [Titre court]
- **Contexte** : ...
- **Leçon** : ...
- **Application** : ...
- **Date** : YYYY-MM-DD
- **Source** : Incident / Feature / Audit / Rétrospective
- **Agent** : <Agent>
- **Liens** : ADR-XXX, BUG-XXX, INC-XXX, etc.
```

## Rétrospective du système multi-agents (à compléter après 5 features)

*(À venir après les 5 premières features terminées)*

## Règle de mise à jour

- Chaque agent DOIT ajouter au moins 1 leçon après chaque feature terminée
- Chaque incident DOIT produire au moins 1 leçon
- Les leçons sont **honnêtes** : pas de leçon cosmétique
- Les leçons sont **actionnables** : doivent aboutir à un changement de pratique
