# AUDIT PARCOURS — DÉTAILLANT — 2026-10-20

> **Nature :** audit fonctionnel statique du parcours fourni, confronté aux documents du dépôt.  
> **Branche de travail :** `dev`  
> **Statut :** à valider avec le métier et à recetter. Cet audit ne prétend pas prouver l'exécution réelle de chaque écran/API.

## 1. Périmètre et sources

- **Acteur métier :** détaillant ; sous-profil du rôle technique `marchand`.
- **Références :** `.ai/REQUIREMENTS.md`, `.ai/PROJECT_CONTEXT.md`, `.ai/AUDITS/ACTEURS/AUDIT-ACTEUR-MARCHAND-2026-09-28.md`, `docs/SOUS_PROFILS_MARCHAND.md`.
- **Périmètre du parcours fourni :** connexion, ouverture de caisse, consultation de stock, réapprovisionnement externe, ventes, historique, clôture, KEIWA/CNPS/CNAM, financement et JULABA ACADEMY.

## 2. Résumé du parcours cible

1. Se connecter à son espace.
2. Ouvrir la caisse et consulter le stock.
3. Si nécessaire, acheter les marchandises hors JULABA.
4. Enregistrer les ventes et consulter leur historique.
5. Clôturer la caisse et consulter le récapitulatif journalier.
6. Alimenter KEIWA et payer/suivre les cotisations sociales, si les intégrations sont effectivement disponibles.
7. Accéder aux offres de financement et aux formations, selon les critères des partenaires.

## 3. Constats fonctionnels

### 3.1 Points cohérents avec la doctrine du projet

- Le détaillant relève du sous-profil `détaillant` du rôle `marchand`.
- Le dépôt documente une caisse avec ventes, dépenses, sessions, crédit et objectifs.
- Le stock insuffisant ne doit pas provoquer une correction silencieuse : la doctrine exige avertissement, confirmation et traçabilité de la survente acceptée.
- Les opérations financières doivent être idempotentes et journalisées ; une annulation doit laisser une trace.
- Le parcours doit rester compréhensible à la voix avec Tata Nanti Lou et fonctionner de manière explicite hors connexion.

### 3.2 Écarts et points à confirmer

| ID | Constat | Priorité | Action requise |
|---|---|---|---|
| DET-01 | Le sous-profil détaillant n'a **aucun marché amont dans l'application** selon `docs/SOUS_PROFILS_MARCHAND.md`. L'approvisionnement externe décrit est donc cohérent avec l'état documenté. | P1 | Confirmer que l'absence de commande in-app est une décision produit et expliquer comment déclarer un réassort a posteriori. |
| DET-02 | **Correction partielle sur `dev`** : l'API `/stocks` expose `suivi_stock` et l'écran `GestionStock` distingue « Stock non suivi » d'une rupture. Les écrans caisse/vente et les autres indicateurs doivent encore être vérifiés pour propager ce signal partout. | P1 | Recetter la distinction sur toutes les vues qui lisent le stock, notamment la caisse et les alertes. |
| DET-03 | Le document prévoit ouverture et clôture de caisse, mais ne définit pas les contrôles, les écarts de caisse, ni la reprise en cas de fermeture interrompue. | P1 | Définir fond initial, mouvements pris en compte, rapprochement attendu et procédure de correction traçable. |
| DET-04 | Les cotisations CNPS/CNAM par KEIWA et l'alimentation depuis Wave, Orange Money, Moov Money ou MTN Money sont des affirmations métier ; leur disponibilité effective n'est pas établie par les seules exigences consultées. | P1 | Confirmer contrats, endpoints, statuts, frais, rapprochement, remboursements et gestion des échecs avant de les présenter comme opérations disponibles. |
| DET-05 | Le financement par Celpaid, Orange Bank ou UNACOOPEC ne doit pas être présenté comme un crédit garanti. Les invariants I4–I6 liés au crédit sont documentés comme incomplets/en échec et le crédit est indiqué comme désactivé par défaut. | P1 | Séparer « demande/orientation vers partenaire » de « crédit approuvé/décaissé » ; afficher critères, consentement et statut vérifiable. |
| DET-06 | JULABA ACADEMY est prévue, mais le parcours ne précise pas comment reprendre une formation, suivre la progression ou fonctionner avec un réseau intermittent. | P2 | Définir progression, téléchargement/cache si supporté, reprise et preuve de complétion. |
| DET-07 | Le parcours suppose que toutes les ventes sont enregistrées, mais ne spécifie pas les ventes hors connexion ni la prévention des doublons après synchronisation. | P1 | Tester outbox durable, idempotence, conflit de stock et résultat de synchronisation clairement annoncé à la marchande. |
| DET-08 | La fidélisation figure dans la carte fonctionnelle mais n'apparaît pas dans les étapes opérationnelles ; l'étude d'architecture signale une fidélité actuellement déconnectée de la vente. | P2 | Décider si les points sont calculés automatiquement après une vente ou si une action séparée est volontaire. |

## 4. Parcours nominal recommandé

Connexion → ouverture de caisse → état de stock explicite → réassort externe si nécessaire → enregistrement des ventes/dépenses → consultation du journal → clôture et rapprochement → consultation des résultats → services sociaux, financement et Academy selon disponibilité réelle.

**Garde-fous :**
- Ne jamais simuler une transaction KEIWA ou une cotisation si le prestataire ne l'a pas confirmée.
- Ne pas confondre absence de stock, stock non suivi et stock inconnu.
- En cas de vente hors ligne, indiquer clairement « enregistré sur cet appareil / en attente de synchronisation ».
- Une même vente rejouée ne doit produire ni deuxième encaissement ni deuxième décrément.
- La voix doit confirmer les éléments importants (produit, quantité, prix et résultat), sans rendre la lecture obligatoire.

## 5. Matrice minimale de recette

| Test | Résultat attendu |
|---|---|
| Compte détaillant connecté | Accès limité aux fonctions du sous-profil détaillant. |
| Aucun stock enregistré | L'interface n'affirme pas à tort que le produit est épuisé. |
| Stock insuffisant et vente confirmée | Avertissement audible/visible, manquant tracé selon la doctrine, aucun écrasement silencieux. |
| Double envoi d'une vente | Une seule transaction et un seul effet stock. |
| Perte réseau pendant une vente | Statut local explicite, reprise sans doublon après reconnexion. |
| Clôture de caisse | Totaux recalculables à partir des mouvements enregistrés ; écarts visibles. |
| Échec d'un paiement externe | État « échoué/en attente » non présenté comme payé ; possibilité de vérifier avant nouvelle tentative. |
| Financement partenaire | Aucune promesse d'éligibilité ni de décaissement avant réponse vérifiable du partenaire. |
| Usage sans lecture | Vente, résumé et clôture réalisables avec guidage vocal compréhensible. |

## 6. Priorités

- **P0 :** aucun nouveau P0 démontré par le seul descriptif ; les invariants financiers existants restent bloquants pour la recette.
- **P1 :** états du stock, clôture de caisse, offline/idempotence, vérification des intégrations KEIWA/CNPS/CNAM et cadrage du financement.
- **P2 :** fidélisation liée à la vente et suivi de formation.

## 7. Conclusion

Le parcours détaillant est plausible si le réapprovisionnement reste volontairement hors plateforme. En revanche, les services KEIWA/CNPS/CNAM, le financement et certaines fonctions transversales ne doivent pas être déclarés opérationnels sans preuve technique et métier. La recette doit d'abord sécuriser vente, caisse, stock et synchronisation.

**Statut : À RECETTER — audit fonctionnel statique, sans exécution E2E dans cet audit.**


## Mise à jour technique du 20/10/2026

- `backend/src/stocks-rest/stocks-rest.controller.ts` expose `suivi_stock` pour distinguer quantité nulle et quantité non renseignée.
- `frontend/src/app/contexts/StockContext.tsx` conserve cet état ; `GestionStock.tsx` affiche « Stock non suivi » sans le classer comme rupture.
- La politique de survente documentée côté caisse est préservée ; elle n'a pas été arbitrairement remplacée par un blocage.
