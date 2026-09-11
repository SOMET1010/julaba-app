# Julaba — Suivi d’exécution de l’audit

## P0 — Fiabilité métier et sécurité

- [x] Vérifier les invariants du parcours marchand : mode avion, file locale, idempotence, stock et marge.
- [x] Faire passer les ventes, dépenses et opérations de stock initiées par Tata dans les méthodes standard de `CaisseContext`.
- [x] Ajouter des tests d’intégration et de non-régression pour vente, dépense et stock via Tata en mode connecté et hors ligne.
- [x] Rendre `StockContext` capable d’enfiler les mises à jour de stock existant hors ligne avant de raccorder Tata au stock.
- [x] Ajouter une clé d’idempotence aux écritures de stock côté serveur avant de rejouer les opérations hors ligne.
- [x] Étendre la file durable au rejeu typé des mises à jour de stock existant, avec méthode HTTP et clé d’idempotence conservées.
- [x] Faire exécuter l’action Tata `ajouter_stock` uniquement sur un produit existant et mettre l’ajustement dans cette file hors ligne.
- [ ] Exécuter la migration `StockOperationIdempotence` dans l’environnement cible avec `DB_MIGRATIONS_RUN=true` avant publication.
- [x] Créer une branche dédiée à la mise à niveau des dépendances vulnérables puis valider les régressions.
- [x] Mettre à niveau React Router vers la version corrective 7.18.3 et valider le routage Julaba.
- [x] Documenter les alertes NestJS et ExcelJS qui ne peuvent pas être corrigées sans mise à niveau majeure ou validation métier dédiée.

## P1 — Inclusion et autonomie

- [ ] Ajouter un guidage contextuel simple et accessible sur le parcours marchand.
- [ ] Définir le plan de couverture des clips Tata pour montants, quantités, unités et produits sans générer de fausse voix.
- [ ] Préparer les futurs packs Dioula/Bambara comme ressources installables hors ligne.

## P2 — Maintenabilité et performance

- [ ] Définir un budget de bundle et une stratégie de chargement différé des modules non marchands.
- [ ] Réduire progressivement les types `any` sur les parcours critiques.
- [ ] Ajouter un écran de gestion des opérations hors ligne rejetées.
