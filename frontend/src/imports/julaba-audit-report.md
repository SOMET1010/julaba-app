ROLE

Tu es un expert senior en architecture produit, UX marketplace, React et Supabase.

Ta mission est d'auditer entièrement cette application existante appelée JULABA et d'identifier :

1. ce qui est déjà implémenté
2. ce qui est incomplet
3. ce qui est cassé
4. ce qui manque
5. ce qui doit être corrigé

Ensuite tu dois implémenter les éléments manquants directement dans le projet tout en respectant l’architecture existante.

IMPORTANT :
Tu ne dois rien supprimer sans vérifier son utilité.
Tu dois préserver les composants et pages existants si possible.

--------------------------------------------------

CONTEXTE PRODUIT

JULABA est une plateforme agricole B2B avec 3 acteurs :

PRODUCTEUR
MARCHAND
COOPERATIVE

Chaque utilisateur possède un seul rôle.

--------------------------------------------------

FLUX METIER PRINCIPAL

Le flux principal est :

Plantation
→ Récolte
→ Produit
→ Marketplace
→ Commande
→ Paiement
→ Livraison
→ Historique

Tu dois vérifier que ce flux est correctement implémenté.

--------------------------------------------------

FLUX PRODUCTEUR

Un producteur peut :

Créer une plantation

Voir ses plantations dans
Mes Plantations

Créer une récolte depuis une plantation

Voir ses récoltes dans
Mes Récoltes

Créer un produit depuis une récolte

Publier ce produit dans
Marketplace Producteur

Voir :

Historique des ventes
Historique des récoltes

--------------------------------------------------

FLUX MARCHAND

Un marchand peut :

Voir les produits dans :

Marketplace Producteur
Marketplace Coopérative

Acheter des produits

Quantités fractionnées autorisées :

Exemple

Produit : 1000 kg

Le marchand peut acheter :

50 kg
100 kg
200 kg

Le marchand revend ensuite physiquement hors plateforme.

La plateforme sert à :

traçabilité
comptabilité
historique des achats

--------------------------------------------------

FLUX COOPERATIVE

Une coopérative peut :

Acheter sur Marketplace Producteur

Publier les produits achetés sur
Marketplace Coopérative

Les marchands peuvent acheter sur cette marketplace.

Elle peut aussi faire :

commandes groupées vers producteurs.

--------------------------------------------------

SCENARIOS DE COMMANDE

Scénario 1

Marchand
→ Marketplace Producteur
→ Achat au producteur

Scénario 2

Marchand
→ Marketplace Coopérative
→ Achat à la coopérative

Scénario 3

Coopérative
→ Commande groupée
→ Producteurs

--------------------------------------------------

STATUT PRODUITS

Chaque produit doit avoir un statut :

draft
available
reserved
sold
archived

reserved signifie :

commande validée mais paiement non effectué.

Tu dois vérifier la logique de ces statuts.

--------------------------------------------------

GESTION DU STOCK

Le stock doit être dynamique.

Exemple

Produit = 1000kg

Commande 200kg
Commande 50kg

Stock restant = 750kg

Si stock = 0
statut = sold.

--------------------------------------------------

GEOLOCALISATION

Les produits doivent être filtrables par :

région
ville
distance

Les marchands doivent pouvoir trouver les producteurs proches.

--------------------------------------------------

PAIEMENTS

Paiements possibles :

Stripe
Mobile Money
Jùlaba Wallet
Cash (hors plateforme)

Tu dois vérifier que le système supporte plusieurs méthodes.

--------------------------------------------------

LIVRAISON

La livraison peut être faite par :

Producteur
Coopérative

--------------------------------------------------

NOTIFICATIONS

Le système doit gérer :

notification vente
notification commande
notification paiement
notification stock faible
alerte système
notification back office
notification modification utilisateur par agent

--------------------------------------------------

UX CRITIQUES A VERIFIER

Analyse toute l’interface et détecte :

boutons non fonctionnels
actions sans logique
modals bloqués
navigation cassée
routes invalides

BUG connu :

La bottom bar apparaît devant les modals.
Elle doit être masquée quand un modal est ouvert.

Corriger ce problème.

--------------------------------------------------

ANALYSE TECHNIQUE

Identifier :

framework utilisé (React, Next, Vite)
structure du projet
pages
composants
contexts
API calls
connexion Supabase

Vérifier :

authentification
gestion des rôles
sécurité des actions

--------------------------------------------------

BASE DE DONNEES

Si Supabase est utilisé, vérifier la présence des tables :

users
plantations
harvests
products
orders
order_items
payments
notifications

Sinon proposer et implémenter la structure correcte.

--------------------------------------------------

AUDIT A EFFECTUER

Scanner tout le projet et produire un rapport interne contenant :

liste des pages
liste des composants
liste des context
routes utilisées
fonctions API
flux utilisateur

Identifier :

composants inutilisés
pages orphelines
routes mortes
logiques dupliquées

--------------------------------------------------

IMPLEMENTATION

Après l’audit :

Implémenter les éléments manquants pour compléter le système.

Priorité :

1. flux plantation → récolte → produit
2. marketplace
3. système commande
4. gestion stock
5. notifications
6. historique

--------------------------------------------------

CONTRAINTE

Ne pas casser l'architecture existante.

Réutiliser les composants existants quand c'est possible.

Améliorer l’UX sans changer la logique métier.

--------------------------------------------------

OBJECTIF FINAL

Obtenir une plateforme fonctionnelle où :

un producteur peut publier un produit
un marchand peut l’acheter
le stock se met à jour
la commande est enregistrée
le paiement est géré
la livraison est suivie
l’historique est visible
les notifications fonctionnent