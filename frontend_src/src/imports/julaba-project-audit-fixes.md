Analyse le projet JÙLABA et corrige tous les problèmes détectés dans l'audit en ignorant pour l'instant les migrations SQL Supabase et la création des tables.

Objectif : stabiliser le code, améliorer la sécurité, corriger les routes et préparer l'application pour l'intégration future des tables.

1. Ignorer temporairement la base de données
   Ne pas créer ni modifier les migrations Supabase.
   Ne pas modifier les fichiers SQL.
   Créer plutôt des mocks ou adapters temporaires pour les APIs manquantes afin que l'application reste fonctionnelle côté interface.

2. Corriger les routes
   Analyser toutes les routes de l'application et :

* supprimer les routes orphelines
* connecter les pages existantes à la navigation
* corriger les routes mortes
* vérifier que chaque rôle (producteur, marchand, coopérative, institution, identificateur, back-office) a accès uniquement à ses routes.

3. Sécuriser les routes sensibles
   Restreindre l'accès aux routes suivantes :

/database
/create-super-admin
/diagnostic-db

Conditions :

* accessibles uniquement si role = super_admin
* accessibles uniquement si NODE_ENV = development.

4. Nettoyer les composants inutilisés
   Scanner tous les dossiers components et pages pour identifier :

* composants non utilisés
* modals non utilisés
* imports inutilisés
* composants dupliqués.

Supprimer ou refactoriser ces éléments.

5. Nettoyer les contexts
   Supprimer le context deprecated suivant :

RecolteContext.tsx

Vérifier que chaque context restant est :

* utilisé par au moins un composant
* correctement fourni par un Provider
* consommé avec useContext.

6. Corriger les modals producteur
   Préparer les modals suivants pour fonctionner même sans base de données :

CreerCycleModal
EnregistrerRecolteModal
PublierRecolteModal

Créer des services temporaires mockés qui simulent :

* création cycle
* enregistrement récolte
* publication marketplace.

Les données doivent être stockées temporairement dans un state global ou un mock service.

7. Optimiser les performances
   Réduire la taille du bundle en appliquant :

* lazy loading des dashboards
* dynamic imports pour analytics et charts
* code splitting pour les modules lourds.

Objectif : bundle < 500KB.

8. Améliorer l'expérience utilisateur
   Ajouter :

* loaders pendant les requêtes
* gestion des erreurs centralisée
* notifications succès/erreur.

9. Ajouter les exports analytics
   Implémenter :

export CSV
export PDF

pour les dashboards institution et back-office.

10. Préparer l'application pour les futures tables Supabase
    Créer une couche services propre :

/services/api

avec des fonctions prêtes à connecter plus tard :

createCycle()
createRecolte()
publishRecolte()
createCommande()
createPaiement()

Ces fonctions doivent pour l'instant utiliser des mocks.

11. Générer un rapport final
    Après corrections, produire un rapport contenant :

* fichiers modifiés
* composants supprimés
* routes corrigées
* optimisations appliquées
* structure prête pour l'intégration Supabase future.
