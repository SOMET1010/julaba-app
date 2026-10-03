# BUGS.md — Bugs fonctionnels JULABA

> Registre des bugs fonctionnels détectés. Format : BUG-XXX.

## État au 2026-09-28

- **Total bugs** : 0 (registre initialisé)
- **Bugs P0** : 0
- **Bugs P1** : 0
- **Bugs P2** : 0
- **Bugs P3** : 0
- **Bugs résolus** : 0

## Format d'enregistrement

```
### BUG-XXX — [Titre court]
- **Priorité** : P0 | P1 | P2 | P3 | P4
- **Statut** : OUVERT | EN_COURS | RÉSOLU | FERMÉ
- **Date détection** : YYYY-MM-DD
- **Détecté par** : Agent QA
- **Environnement** : prod | staging | dev | test
- **Description** : ...
- **Étapes pour reproduire** :
  1. ...
  2. ...
- **Comportement attendu** : ...
- **Comportement observé** : ...
- **Fichiers concernés** : ...
- **Tests liés** : ...
- **Commits liés** : ...
- **Résolution** : ...
- **Date résolution** : YYYY-MM-DD
- **Leçon apprise** : ...
```

## Bugs connus (hérités du registre dette, à formaliser)

Les items suivants sont issus de `docs/dette/REGISTRE-MAITRE.md` (révision 20). Ils ne sont pas des bugs fonctionnels à proprement parler, mais des dettes identifiées qui peuvent se manifester comme bugs :

### ARG-08 (P2 — modèle)
- 0 colonne `devise` sur `caisse_transactions` (XOF reste une convention)
- **Impact** : pas de bug visible tant que XOF est la seule devise, mais bloque le multi-devise futur

### ARG-11 (P1 — crédit)
- Condition bloquante de réouverture du crédit (liste incomplète corrigée au contre-audit)
- **Crédit actuellement désactivé** : `CAISSE_CREDIT_ACTIF = false`

### ROUTE-01 (P2 — hygiène)
- Route `/transactions` concurrente masquée non supprimée
- **Impact** : route potentiellement appelée par erreur

### MKT-01 / MKT-02 (P2 — marketplace)
- `marketplace-data.ts` mock vivant en pilote
- **Impact** : données mock peuvent s'afficher en production

### I4, I5, I6 (invariants en `it.failing`)
- I4 : Idempotence crédit
- I5 : Idempotence acompte
- I6 : Traçabilité crédit (spécification périmée — à réécrire)
- **Impact** : crédit désactivé donc pas de bug en production

## Bugs à détecter (surveillance active)

L'Agent QA doit surveiller en priorité :
1. **Vente offline** : cohérence DB après rejeu
2. **Webhook BPay** : idempotence du callback
3. **Refresh token** : rotation et détection de réutilisation
4. **Verrou PIN** : échelle d'attente (jamais définitif)
5. **Mutation de zone** : réaffectation identificateur
6. **Institution scope guard** : fail-closed si non configuré
