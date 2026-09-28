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

## Date de passation

YYYY-MM-DD
