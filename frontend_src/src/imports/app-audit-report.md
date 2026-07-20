Analyse toute l’architecture de l’application et réalise un audit complet du système.

Objectif : vérifier que toutes les fonctionnalités métier fonctionnent correctement et identifier les incohérences dans les routes, les composants, les context React et les flux de données.

1. Audit des flux métier principaux
   Vérifie le fonctionnement complet du cycle agricole :
   Plantation → Récolte → Publication Marketplace → Commande → Paiement → Livraison → Historique.

Pour chaque étape :

* vérifier que la création fonctionne
* vérifier que les données sont correctement enregistrées
* vérifier que l’étape suivante peut utiliser ces données
* détecter les erreurs logiques ou données manquantes.

2. Audit des routes
   Scanner toutes les routes de l’application et identifier :

* routes déclarées mais sans page
* pages non accessibles
* routes mortes
* routes non reliées à la navigation.

3. Audit des composants
   Analyser tous les composants et identifier :

* composants non utilisés
* modals non utilisés
* composants importés mais jamais affichés
* duplications de composants.

4. Audit des contexts React
   Analyser tous les context dans /contexts :

* context créés mais jamais utilisés
* context importés mais non consommés
* context contenant des données non affichées dans l’interface.

5. Audit de cohérence des données
   Identifier les incohérences de base de données :

* récoltes sans cycle de production
* publications sans récolte
* commandes sans publication
* paiements sans commande.

6. Audit des stocks marketplace
   Vérifier :

* stock négatif
* publication disponible mais stock = 0
* commande supérieure au stock disponible.

7. Audit UX par rôle
   Tester les interfaces pour chaque rôle :

* producteur
* marchand
* coopérative
* identificateur
* institution
* back-office.

Vérifier que chaque rôle peut accéder uniquement à ses fonctionnalités et que les données s’affichent correctement.

8. Audit des performances
   Identifier :

* pages lentes
* requêtes inutiles
* chargements multiples
* composants trop lourds.

9. Audit sécurité
   Vérifier :

* gestion des permissions
* accès aux données selon les rôles
* endpoints exposés sans contrôle.

10. Rapport final
    Produire un rapport structuré contenant :

* les erreurs détectées
* les incohérences système
* les composants inutilisés
* les routes mortes
* les problèmes de données
* les problèmes de sécurité
* les optimisations recommandées.

Prioriser les corrections selon leur impact sur le fonctionnement de la plateforme.
