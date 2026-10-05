# HANDOFF — SECURITY_TO_TEAM

> Passation de l'Agent Security vers l'équipe : vulnérabilités détectées.

## Audit sécurité

- **Feature concernée** : FEATURE-XXX (ou audit global)
- **Date** : YYYY-MM-DD
- **Auditeur** : Agent Security

## Vulnérabilités détectées

### SEC-XXX (CRITIQUE / HAUTE / MOYENNE / BASSE)
- **Description** : ...
- **Localisation** : `file:line`
- **CVE** : ... (si applicable)
- **Score CVSS** : ...
- **Plan de correction** : ...
- **Effort** : S | M | L | XL
- **Statut** : OUVERT | EN_COURS | RÉSOLU

## Dépendances vulnérables

| Package | Version | Sévérité | CVE | Plan |
|---|---|---|---|---|
| ... | ... | ... | ... | `npm audit fix` |

## Règles de sécurité à respecter

1. **JWT + Refresh rotation + WebAuthn + PIN AES-256-GCM**
2. **Allow-list rôles fail-closed** (super_admin jamais créable par signup)
3. **Verrou PIN modernisé** (jamais définitif)
4. **Sanitization défense en profondeur** (ClassSerializerInterceptor + stripSensitiveUserFields + @Exclude)
5. **Throttling ciblé** sur endpoints sensibles
6. **Audit logs** pour mutations sensibles
7. **Idempotence** sur mutations financières

## Recommandations préventives

- ...
- ...


## Écoute ops — accès recette ANSUT (AUTH-14b, 2026-10-05)

> Runbook demandé par le registre de dette (DEBT_REPORT §AUTH-14b). Le log serveur
> des accès TEST_PHONES est VOLONTAIREMENT actif en production : il compte les
> accès recette, il faut l'ÉCOUTER.

- **Ce qui se journalise** : tout accès `login` ou `check-phone` à un numéro de
  recette ANSUT, en WARN, numéro **masqué** (`08 •• •• 40 40`) — jamais le
  numéro complet. Source : `backend/src/auth/anti-enumeration.ts` (AUTH-07).
- **Quelle liste est active** : au démarrage, le backend logue
  `TEST_PHONES actifs : source=env|code, N numéros (masqués)` — `source=env`
  quand `AUTH_TELEPHONES_TEST` est posée dans l'environnement (liste
  AUTORITAIRE par environnement, AUTH-07-sous-dette), `source=code` sinon
  (repli développement).
- **Commande de comptage** :
  - dev/sandbox : `rg "accès TEST_PHONE" backend-dev.log`
  - prod (selon centralisation) : `journalctl -u julaba-api | grep "accès TEST_PHONE"`
    ou l'équivalent agrégateur sur le flux de logs du conteneur API.
- **Seuil d'alerte proposé** : les accès recette sont légitimes mais RARES.
  Alarmer si > 10 accès/24 h sur un même numéro hors fenêtre de recette
  planifiée, OU toute trace `source=code` en production (l'env autoritaire
  doit y être posée — un repli code en prod signe un .env incomplet).
- **Branchement** : à câbler sur la centralisation de logs production au
  moment où Sentry/monitoring prod sera activé (désactivés dans le sandbox).

## Date de passation

YYYY-MM-DD
