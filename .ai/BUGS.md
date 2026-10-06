# BUGS.md — Bugs fonctionnels JULABA

> Registre des bugs fonctionnels détectés. Format : BUG-XXX.

## État au 2026-10-06

- **Total bugs** : 8 (5 résolus, 3 ouverts)
- **Bugs P0** : 0 ouvert
- **Bugs P1** : 3 ouverts
- **Bugs P2** : 0 ouverts
- **Bugs P3** : 0
- **Bugs résolus** : 5

> Numérotation : BUG-006 et BUG-007 n'ont jamais été attribués (numéros sautés par l'histoire du registre — constaté en REVIEW-004). Ils restent RÉSERVÉS : ne pas les réattribuer, les prochains bugs prennent BUG-011 et suivants.

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

### BUG-005 — Le callback /paiement/failed affichait « Paiement effectué ✅ »
- **Priorité** : P1 · **Statut** : RÉSOLU · **Détecté** : 2026-10-06 (audit UX T5 « callbacks /pay à vérifier », confirmé à l'exécution UX-6)
- **Description** : les 4 routes de callback (`/pay/success`, `/pay/error`, `/paiement/success`, `/paiement/failed`) montent toutes `PaySuccessPage`, qui ne détectait l'échec que par `pathname.includes('error')` — « failed » passe au travers : une erreur de paiement PSP s'affichait comme un succès. `PaySuccessPage.tsx:7`.
- **Résolution** : détection `/error|failed/` — les quatre callbacks affichent désormais l'état réel.
- **Commits** : cf. UX-6 (fix wallet BUG-005) · **Vérifications** : tsc 0, test:ci 0
## Bugs ouverts — Revue audit UX du 2026-10-06

### BUG-008 — Écriture récolte/publication producteur perdue hors ligne
- **Priorité** : P1 · **Statut** : OUVERT · **Date détection** : 2026-10-06
- **Détecté par** : Agent Reviewer, revue de `AUDIT-UX-ROLES-2026-10-06.md`
- **Environnement** : dev / terrain hors ligne
- **Description** : les créations de récolte et de publication appellent directement l'API sans outbox ni idempotence. Une coupure réseau après saisie ne laisse pas de mutation rejouable.
- **Comportement attendu** : conserver la saisie avec propriétaire, clé d'idempotence et statut « à synchroniser », puis rejouer au retour réseau.
- **Fichiers concernés** : `frontend/src/app/contexts/ProducteurContext.tsx:351-371,481-485`.
- **Tests liés** : à créer — outbox producteur nominal, 4xx lettre morte, 5xx rejeu.

### BUG-009 — Annulation de commande producteur sans confirmation
- **Priorité** : P1 · **Statut** : OUVERT · **Date détection** : 2026-10-06
- **Détecté par** : Agent Reviewer, revue de `AUDIT-UX-ROLES-2026-10-06.md`
- **Environnement** : dev / pilote
- **Description** : le bouton « Annuler la commande » déclenche directement `cancelCommande()` sans confirmation, raison ni verrou synchrone.
- **Comportement attendu** : relecture texte/voix, confirmation explicite, verrou anti double-tap et retour d'erreur visible.
- **Fichiers concernés** : `frontend/src/app/components/producteur/CommandesProducteurPage.tsx:1627-1683`.
- **Tests liés** : à créer — annulation confirmée, annulation abandonnée, double-tap, erreur réseau.

### BUG-010 — Revenu gagné incluant des commandes non livrées
- **Priorité** : P1 · **Statut** : OUVERT · **Date détection** : 2026-10-06
- **Détecté par** : Agent Reviewer, revue de `AUDIT-UX-ROLES-2026-10-06.md`
- **Environnement** : dev / pilote
- **Description** : `revenusTotal` additionne toute commande non annulée, y compris `en_attente`, `confirmee` et `en_cours`, tandis que l'interface annonce « Tu as gagné ».
- **Comportement attendu** : séparer revenu livré/encaissé, montant en attente et montant annulé ; utiliser une fonction métier unique dans tous les écrans.
- **Fichiers concernés** : `frontend/src/app/contexts/ProducteurContext.tsx:606-614`, `frontend/src/app/components/producteur/Revenus.tsx:100-114`.
- **Tests liés** : à créer — commandes par statut, cohérence KPI/écran revenus/voix.

## Bugs à détecter (surveillance active)

L'Agent QA doit surveiller en priorité :
1. **Vente offline** : cohérence DB après rejeu
2. **Webhook BPay** : idempotence du callback
3. **Refresh token** : rotation et détection de réutilisation
4. **Verrou PIN** : échelle d'attente (jamais définitif)
5. **Mutation de zone** : réaffectation identificateur
6. **Institution scope guard** : fail-closed si non configuré
