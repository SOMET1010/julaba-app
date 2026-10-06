# CHANGELOG.md — JULABA

> Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).
> Adjonction du système multi-agents le 2026-09-28.

## [Non publié]

### Corrigé — Lot UX-1 « Promesses d'argent » (2026-10-06)
Suivi de l'audit UX des 3 rôles (`docs/audit/AUDIT-UX-ROLES-2026-10-06.md`) — décisions §8 tranchées, lot UX-1 exécuté (BUG-001..004) :
- **Paiements services (Keiwa)** : plus de « Payer maintenant » sans backend — page masquée derrière `PAIEMENTS_SERVICES_ACTIFS`, porte retirée du wallet, route redirigée (BUG-001, `68149f2`)
- **Transfert keiwa** : relecture obligatoire « Tu envoies X à Y — tu confirms ? » + verrou synchrone anti double-tap (BUG-002, `f7e9544`)
- **Marché virtuel** : annonce « Commande passée — à régler à la livraison » au lieu de « Paiement effectué avec succès » (aucun mouvement wallet à la création, invariant B2) ; modal succès « Montant à régler / rien n'est encore débité » (BUG-003, `67f72ef`)
- **Cotisation coopérative (25 000 F)** : relecture + PIN conditionnel (`pinSecurityEnabled`, /auth/pin/verify) + verrou synchrone + erreurs affichées ET parlées (BUG-004, `41b6671`)
- Vérifications : `tsc -b` 0, garde charte marchande vert, `vite build` 0 (21,9 s), `test:ci` 44 maillons 0, garde-argent = les 3 refus attendus (gels humains en attente), aucun refus nouveau

### Ajouté — Système multi-agents (2026-09-28)
- Initialisation du dossier `.ai/` avec 30+ fichiers de pilotage
- Audit initial complet : backend (76/100), frontend (73/100), DevOps (68/100), sécurité (72/100), documentation (78/100)
- Premier audit global (`AUDIT-001`) : score 73/100 (autorisé pour PROD ≥ 60/100)
- Cartographie de l'architecture, des 361 endpoints API, du design system, du plan de test
- Synthèse du registre de dette existant (48 items OUVERTS, 0 P0)
- Plan de test E2E initial
- Guide d'accessibilité (WCAG 2.1 AA + voice-first)
- Budget performance (bundle 565/800 KB, Core Web Vitals à instrumenter)
- Workflows formalisés (7 phases + audit global périodique)

## [5.0.0] — Pilote 15/09/2026

### Ajouté
- APK Android pilote (Capacitor 8, compileSdk 36, debug-signed)
- Distribution via GitHub Releases (`pilote-latest` tag, retention 14 jrs)
- Voix offline native : sherpa-onnx STT zipformer2 FR (~71 Mo) + VITS-Piper TTS siwis CC-BY 4.0 (~79 Mo)
- 137 clips mp3 Tata Nanti Lou pré-cachés (~7 Mo)
- PWA complète (SW custom, manifest, IndexedDB)
- 5 flux Maestro mobile (jamais exécutés — écrits sans appareil)

### Modifié
- ADR-0003 : 6 arbitrages de Patrick sur unités/devise/stockabilité (2 appliqués, 1 partiel, 3 décidés différés)
- Doctrine voice-first (Patrick, 20/09/2026) : « La voix est une propriété du PARCOURS, pas de l'écran »
- 6 lots voix (A, B, B2, C, D, E) + 2 lots habillage (F, F2) livrés

### Sécurité
- ADR-002 : fin du takeover `0000` (code d'activation à usage unique, PIN choisi par la marchande)
- Verrou PIN modernisé : échelle d'attente (3→5min, 6→15min, 9+→1h, jamais définitif)
- Argent gelé pour Keiwa / B-Pay / mobile money (invariant `argent-gele-b2.spec.ts`)

### Architecture
- ADR-0001 : décrément de stock à la vente (cycle `disponible → réservation → conversion → livraison → annulation`)
- ADR-0002 : convergence schéma vers migrations reproductibles (étapes 1-3 réalisées, étape 4 en attente)
- Catalogue-maître : miroir Postgres du référentiel Odoo 19 (POC désactivé par défaut)
- Odoo gateway : allow-list lecture seule, bascule mock/real via `ODOO_CLIENT_MODE`

### Corrections
- 33 dettes FERMÉES (registre révision 20)
- SCHEMA-07 trouvé par `schema-pilote.yml` avant le terrain
- Incident 18/09/2026 : `caisse_transaction_status_enum already exists` → `DB_MIGRATIONS_RUN=false` en prod

## Historique antérieur

Voir `git log` pour le détail des 780 commits (780 commits au total, ~51% signés Claude, contributeurs : Claude 396 / PATRICK 198 / SOMET1010 132 / claude[bot] 35 / Pascal Somet 14 / ABOA AKOUN BERNARD 3).
