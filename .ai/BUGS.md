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

## Bugs fonctionnels (2026-10-06) — Lot UX-1 « Promesses d'argent »

> Détectés par l'audit UX des 3 rôles (`docs/audit/AUDIT-UX-ROLES-2026-10-06.md`, explorations 14-a/14-b/14-c, spot-checks orchestrateur). Corrigés le même jour.

### BUG-001 — « Payer maintenant » (Keiwa → Paiements services) ne faisait rien
- **Priorité** : P0 · **Statut** : RÉSOLU · **Détecté** : 2026-10-06 (audit UX, convergent agents marchand + producteur)
- **Description** : le CTA du modal (CNPS, CIE, SODECI, école…) se contentait de fermer le modal et vider les champs — aucun appel API, aucune validation, aucun reçu. L'utilisateur croyait avoir réglé sa facture (impayé réel, pénalités). `PaiementsPage.tsx:262-269`.
- **Résolution** : drapeau `PAIEMENTS_SERVICES_ACTIFS = false` (doctrine POSCaisse 55-60, pas de promesse contradictoire) : porte retirée du wallet, route redirigée vers `/keiwa` (deep links compris), page conservée pour la bascule PSP.
- **Commits** : `68149f2` · **Vérifications** : tsc 0, charte 0, build 0, test:ci 0

### BUG-002 — Transfert keiwa irréversible en un tap, sans relecture ni verrou
- **Priorité** : P0 · **Statut** : RÉSOLU · **Détecté** : 2026-10-06 (audit UX, M-P0-3)
- **Description** : « Envoyer maintenant » appelait `transfererVersCompte` directement — ni PIN, ni relecture, ni verrou synchrone (double-tap même frame = double requête ; l'idempotence backend rattrapait, le geste restait non gardé). `TransfertPage.tsx:133-158, 467-483`.
- **Résolution** : relecture « Tu envoies X FCFA à Y — tu confirms ? » + verrou synchrone `envoiEnCoursRef` (pattern caisse POSCaisse 208-210).
- **Commits** : `f7e9544` · **Vérifications** : idem ci-dessus

### BUG-003 — Le marché virtuel annonçait « Paiement effectué avec succès » pour rien
- **Priorité** : P0 · **Statut** : RÉSOLU · **Détecté** : 2026-10-06 (audit UX, T2/P1-3 marchand)
- **Description** : après création des commandes (statut en_attente, AUCUN mouvement wallet — invariant B2), l'app disait et répétait « Paiement de X francs CFA par Y effectué avec succès », y compris pour mobile money/carte purement déclaratifs. `MarcheVirtuel.tsx:448-455, 488` + modal succès « Montant payé ».
- **Résolution** : annonces honnêtes selon le moyen (commande passée, à régler à la livraison ; Keiwa : débit à l'encaissement du vendeur, le PIN CONFIRME il ne paie pas) + modal succès « Montant à régler / rien n'est encore débité ».
- **Commits** : `67f72ef` · **Vérifications** : garde charte vert (plafond MarcheVirtuel intact)

### BUG-004 — Cotisation coopérative 25 000 F débitée en un tap, sans confirmation ni PIN
- **Priorité** : P0 · **Statut** : RÉSOLU · **Détecté** : 2026-10-06 (audit UX, M-P0-2)
- **Description** : POST `/cooperatives/cotisation` direct depuis le bouton, montant codé en dur, aucune confirmation, aucun PIN, aucune vérification de solde. `MaCooperative.tsx:156-172`.
- **Résolution** : relecture « Tu paies 25 000 FCFA à [coop] » + PIN 4 chiffres via /auth/pin/verify si `pinSecurityEnabled` + verrou synchrone + erreur affichée (role=alert) ET parlée + montant nommé `COTISATION_MONTANT`.
- **Commits** : `41b6671` · **Vérifications** : garde charte vert (MaCooperative reste à 0 couleur en dur)

## Bugs à détecter (surveillance active)

L'Agent QA doit surveiller en priorité :
1. **Vente offline** : cohérence DB après rejeu
2. **Webhook BPay** : idempotence du callback
3. **Refresh token** : rotation et détection de réutilisation
4. **Verrou PIN** : échelle d'attente (jamais définitif)
5. **Mutation de zone** : réaffectation identificateur
6. **Institution scope guard** : fail-closed si non configuré
