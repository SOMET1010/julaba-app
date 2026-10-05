# STATUS — JULABA

**Source de vérité de la passation.** Mise à jour à chaque étape franchie et
avant toute fin de session.

| | |
|---|---|
| relevé | **05/10/2026** |
| branche par défaut | `main` |
| branche en cours | `claude/agent-auth-idempotence` |
| dernier commit | `447d1ce` — AGENT-V1 |
| dépôt | `SOMET1010/julaba-app` |

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

## Backlog

- Limite de requêtes **propre à l'agent** (seul le `ThrottlerGuard` global s'applique).
- Route d'écriture de stock pour l'agent (`stock:ecrire` existe, aucune route).
- `ODOO-L3/L4` (mapping sens vente, premier appel réel) — **gelés**.
- Les deux frottements consignés le 03/10 : **aucun bip** sur le chemin `BoutonDirePrix` ; **l'écoute dure 11 s** même quand le prix est compris en 2 s.
- Diagnostiquer `test:entree-unique` et `test:nom-tantie`.
- Réduire la dette anti-spaghetti (**ne rien corriger avant arbitrage**).

---

## Pull requests

**Aucune ouverte par cette session.** Règle permanente : *aucune PR sans que
le propriétaire la demande.*

⚠️ **PR #245 — interdite de merge** (Keiwa, hors pilote).

---

## Agents mobilisés

`.claude/agents/` : **designer**, **dev-frontend**, **dev-backend**,
**recette**, **relecteur**. Créés le 05/10, aucun encore mobilisé sur un
livrable.
