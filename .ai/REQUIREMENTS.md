# REQUIREMENTS.md — JULABA

> Exigences fonctionnelles et non-fonctionnelles. Lue par QA / PO et tous les agents.

## 1. Exigences fonctionnelles (synthèse métier)

### Authentification & rôles (10 rôles)
- **Self-signup** : `marchand`, `producteur`, `cooperateur` uniquement
- **Création par identificateur/operateur_terrain** : `marchand`, `producteur`, `cooperateur`
- **BO** : `super_admin`, `admin_general`, `admin_national`, `gestionnaire_zone`, `operateur_terrain`
- **Acteurs** : `marchand`, `producteur`, `cooperateur`, `institution`, `identificateur`
- **`super_admin`** : uniquement via endpoint dédié `/auth/create-super-admin`

### P0.0 — Activation (ADR-002)
- Code d'activation à usage unique (selector+verifier bcrypt, TTL 30 min)
- PIN choisi **par la marchande sur son propre téléphone** (jamais par un admin)
- Codes interdits : `0000`, `1234`
- Verrouillage progressif : 3→5min, 6→15min, 9+→1h, **jamais définitif**

### Caisse (module sacré)
- Vente, dépense, session, crédit, raccourcis, objectifs
- **Argent = journal append-only** (ADR-001) : `caisse == fond_initial + Σ(mouvements du journal du jour)`
- **Fond de caisse informatif, jamais bloquant**
- **Vente > stock** : avertir, confirmer, ne pas bloquer (jamais d'écrasement silencieux)
- **Annulation : rien n'est jamais supprimé** — événement TRACÉ
- **Idempotence** : `caisse_transactions.idempotencyKey`
- **Plafond wallet** : 10M XOF

### Stock (ADR-0001)
- Décrément atomique à la vente
- Cycle : `disponible → réservation (en_attente) → conversion (confirmée) → livraison (sans effet stock) → annulation (restitue 'active' seulement)`
- `recolte_id` explicite obligatoire pour ventes directes (refus 400 sinon)
- Survente tracée (jamais clampée) — invariant I3

### Wallet & transactions
- Verrous pessimistes `pessimistic_write` sur `Wallet`
- `assertCompteActif` dans la même transaction que l'écriture
- Idempotence sur transfert et paiement commande
- Plafond 10M XOF
- Limite 5 sessions/user (FIFO)

### Coopératives & tontines
- Coopérative : nom, zone, responsable, membres, stock, transactions
- Tontine : nom, responsable, montant cotisation, cadence jours, cycle courant, mouvements

### Producteur
- Cycles : culture, surface, parcelle, dates plantation/récolte
- Récoltes : produit, quantité, unité, qualite, statut, prix unitaire
- Publications : produit, quantité, prix, qualité, localisation, type marché
- Commandes : négociation, paiement, livraison

### Backoffice
- 33 routes : acteurs, enrôlement, supervision, zones, carte, academy, missions, audit, utilisateurs, institutions, rapports, notifications, support, moderation, mutations, contenus, monitoring-ia, event-monitor, analytics, score-financier, api-keys, marketplace, livraison, communication, cron, config-institution, keiwa

### Voice-first (doctrine Patrick 20/09/2026)
- Tata Nanti Lou : STT sherpa-onnx offline + TTS ElevenLabs cloud + VITS-Piper offline
- 137 clips mp3 pré-cachés pour fonctionner hors-ligne dès le 1er jour
- « Aucune information importante ne doit exister uniquement sous forme de texte »

### Notifications
- 14 routes, rôles variables
- WebSocket `/ws` pour temps réel
- Web Push VAPID pour navigateurs
- Cron `@Cron 0 * * * *` pour alertes

### Intégrations externes
- **B-Pay** : webhook callback, cron pending
- **ANSUT/SMS** : envoi OTP, notifications
- **ONECI** : vérification NNI
- **OpenAI / ElevenLabs** : LLM + TTS cloud
- **Odoo 19 Gateway** : POC désactivé par défaut, allow-list lecture seule

## 2. Exigences non-fonctionnelles

### Sécurité
- **JWT + Refresh rotation + WebAuthn + PIN AES-256-GCM**
- `helmet` + CORS manuel + `@nestjs/throttler`
- `ClassSerializerInterceptor` + `stripSensitiveUserFields` (défense en profondeur)
- Allow-list rôles fail-closed
- Audit logs en DB
- Backup chiffré AES-256-CBC
- Loi ivoirienne n°2013-450 (RGPD local)

### Performance
- Bundle initial ≤ 800 KB (CI)
- Lazy loading systématique des routes
- Manual chunks vendors
- Cache-Control immutable 1y sur assets
- Pré-cache SW intelligent

### Accessibilité
- WCAG 2.1 AA minimum
- Voice-first obligatoire
- Cible tactile ≥ 44 px (CI)
- 3 confits visuels (normal/soleil/sombre)
- Taille texte ajustable

### Offline
- PWA complète (SW custom, manifest, IndexedDB)
- File durable `caisse_outbox` + `caisse_dead` avec idempotence
- Atomicité transactionnelle
- Distinction 4xx (lettre morte) vs 5xx (transitoire)
- CAP=5 retries

### Disponibilité
- Render `autoDeploy: true`
- Healthcheck `/api/v1/health` (Render + Docker)
- Process guards non-dying (`unhandledRejection` + `uncaughtException` capturés)
- Bind port AVANT db-init/seed (healthcheck Render passe immédiatement)
- Retry DB 10×/3s

### Backup
- Dump quotidien 01:30 Abidjan, chiffre AES-256-CBC si `BACKUP_PASSPHRASE`
- Rétention 7 jrs (quotidien) / 35 jrs (dimanche)
- Reset DB avec dump obligatoire (taille ≥ 10 000 octets)

### Conformité
- **Loi ivoirienne n°2013-450** (protection données personnelles)
- Droit à l'oubli : `DELETE /auth/account` anonymise TOUS champs personnels (invariant exécutable)
- Argent préservé à la suppression (CONSTITUTION §7)
- Consentement parlé pour non-lectrices (Décision métier n°8)

## 3. Invariants business (I1-I7)

| # | Invariant | Statut |
|---|---|---|
| **I1** | Vente atomique (vente + tous effets d'inventaire = tout-ou-rien) | BLOQUANT |
| **I2** | Idempotence vente (même `idempotency_key` ⇒ 1 transaction + 1 décrément) | BLOQUANT |
| **I3** | Survente tracée (vendre > stock accepté, jamais clampé silencieusement, trace `manquant` dans le ledger) | BLOQUANT |
| **I4** | Idempotence crédit (même crédit rejoué ⇒ 1 dette, `montant_du` non doublé) | `it.failing` |
| **I5** | Idempotence acompte (acompte rejoué ⇒ 1 seul encaissement) | `it.failing` |
| **I6** | Traçabilité crédit (vente à crédit laisse une trace `caisse_transaction`) | `it.failing` — spécification périmée (à réécrire) |
| **I7** | Cohérence stock au rejeu offline | partiel (couvert par I2) |

## 4. Contraintes réglementaires

- **Loi ivoirienne n°2013-450** — protection données personnelles
- **ANSUT** — partenaire réglementaire
- **BICICI / Orange Money / MTN / Moov / Wave** — accords partenaires (à documenter)
- **Licences dépendances** : toutes permissives (MIT/Apache/BSD), sauf Sherpa-ONNX cc-by-nc-4.0 (contourné par VITS-Piper CC-BY 4.0)

## 5. Conventions de gouvernance (CONSTITUTION)

1. **8 principes** avec mécanismes CI actionnables
2. **Modules sacrés** : Auth, Caisse, Crédit, Fermeture, Synchro, Argent
3. **ADR obligatoire** pour toute décision arch majeure
4. **Cliquets Jest** (`it.failing` → `it`) : un blocker corrigé mais non promu fait échouer la CI
5. **Anti-doublon en CI**
6. **DoD formalisé**
7. **Invariants de confiance mesurables**
8. **Promotion `develop → master` réservée à Alex** (action humaine consciente)

## 6. Roadmap produit (synthèse JULABA_DECISIONS.md)

### Terminus
- Voice-first robuste pour analphabètes
- Offline-first pour argent réel
- Caisse, stock, crédit, wallet, coopératives, tontines
- Backoffice complet (33 routes)
- APK Android pilote (debug-signed)

### En cours / pilotes
- Pilote terrain par Patrick (15/09/2026)
- APK distribué via GitHub Releases
- Production réelle sur Render

### À venir (P1)
- `AUTH-RECOVERY-01` : parcours « numéro perdu »
- Crédit réactivé (CAISSE_CREDIT_ACTIF = false actuellement)
- ADR-0002 étape 4 : bascule migrations
- Politique de confidentialité visible
- `license-checker` en CI
- Semver formel + Keep-a-Changelog
- Tests Maestro exécutés (émulateur Android en CI)
