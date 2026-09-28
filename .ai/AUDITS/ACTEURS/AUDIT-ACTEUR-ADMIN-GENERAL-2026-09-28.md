# AUDIT ACTEUR — ADMIN GÉNÉRAL — 2026-09-28

## 1. Identité et périmètre

- **Rôle** : `admin-general`
- **Catégorie** : back-office
- **Référence fonctionnelle** : `.ai/REQUIREMENTS.md`, `.ai/PROJECT_CONTEXT.md`, `docs/INVENTAIRE_RECETTES_V1.md`
- **Périmètre fonctionnel attendu** : administration globale BO, acteurs, institutions, supervision, wallet, audit et configuration autorisée
- **Sous-profils / variantes** : —

## 2. Fonctionnalités attendues

- Gestion BO
- acteurs
- identificateurs
- institutions
- supervision
- wallet
- audit
- configuration
- score financier
- API keys selon droits

## 3. Audit des parcours

### Authentification et compte
- Connexion adaptée au rôle.
- Gestion de session, refresh et révocation.
- PIN/WebAuthn lorsque applicable.
- Respect du statut du compte.
- Accès uniquement aux routes autorisées.

### Parcours métier
- Tester séparation super-only
- API keys
- reset
- PIN identificateur
- audit
- fail-closed
- permissions

### Voix et accessibilité
- Les actions importantes doivent être utilisables sans dépendre uniquement du texte.
- Les parcours critiques doivent rester compréhensibles avec Tata Nanti Lou.
- Les contrôles tactiles doivent respecter la cible ≥ 44 px.
- Le mode offline doit être explicite lorsqu'une opération peut être mise en attente.

### Notifications et support
- Notifications in-app/push selon les événements du rôle.
- WebSocket uniquement avec identité et autorisation valides.
- Support/tickets accessible selon les droits.

## 4. Risques / écarts à surveiller

1. P0/P1: secrets/API keys
2. P1: WebSocket
3. P1: permissions
4. P2: fonctions stub

## 5. Matrice de recette

| Domaine | À vérifier | Critère d'acceptation |
|---|---|---|
| Auth | connexion / refresh / logout | aucune session ou route hors périmètre |
| Autorisation | routes API + UI | fail-closed, aucune élévation |
| Métier | parcours principal | résultat atomique et traçable |
| Argent | opérations financières | idempotence + journal append-only |
| Stock | mouvements concernés | cohérence stock/ledger |
| Offline | perte réseau/rejeu | pas de doublon |
| Voix | commande vocale critique | action réalisable sans texte seul |
| Notifications | événement métier | notification cohérente et non dupliquée |
| Audit | action sensible | trace exploitable |
| Données | données personnelles | accès limité au périmètre autorisé |

## 6. Tests critiques recommandés

1. Connexion → expiration access token → refresh → poursuite du parcours.
2. Compte suspendu/révoqué → accès refusé immédiatement.
3. Rejeu de toute opération financière ou stock → une seule écriture effective.
4. Perte réseau pendant l'opération → outbox → crash → reprise → résultat unique.
5. Tentative d'accès à une ressource d'un autre périmètre → **403/404 selon contrat**, aucune fuite de données.
6. Action interdite via API directe, même si l'UI masque le bouton → refus serveur.
7. Vérification de la traçabilité de toute annulation/mutation sensible.

## 7. Priorités spécifiques

| Priorité | Sujet |
|---|---|
| P0 | P0/P1: secrets/API keys |
| P1 | P0/P1: secrets/API keys ; P1: WebSocket ; P1: permissions |
| P2 | P2: fonctions stub |

## 8. Conclusion

Le rôle **Admin général** couvre un parcours métier identifiable et doit être validé indépendamment des autres acteurs. La priorité de recette est de vérifier que les droits réels du backend correspondent aux fonctionnalités affichées, puis de valider les invariants argent/stock/offline applicables au rôle.

**Statut de l'audit : À RECETTER — audit statique.**
