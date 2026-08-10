Voici le **prompt exact** à lui envoyer pour implémenter la Coopérative à 100%, sans modifier l’UI existante et en clonant strictement le menu **“Produits”** de l’interface Marchand.

---

# PROMPT — IMPLÉMENTATION COMPLÈTE “COMMANDES GROUPÉES” (COOPÉRATIVE)

## IMPORTANT — CONTRAINTE ABSOLUE UI

* Cloner à 100% la structure UI du menu **“Produits” du profil Marchand**
* Même grille
* Même hiérarchie
* Même cartes
* Même filtres
* Même boutons
* Même modals
* Même comportement responsive
* Même animations
* Ne rien déplacer
* Ne rien redessiner
* Ne pas modifier la Bottom Bar

Uniquement adapter le contenu fonctionnel.

---

# 1️⃣ STRUCTURE GÉNÉRALE

Dans le menu “Commandes Groupées”, créer **2 vues horizontales sous forme de switch boutons** (comme des tabs) :

* Bouton 1 : **Achats Groupés**
* Bouton 2 : **Ventes Groupées**

Disposition :

* Deux boutons horizontaux en haut
* Même style que filtres Produits Marchand
* Actif = fond primaire
* Inactif = outline

---

# 2️⃣ VUE 1 — ACHATS GROUPÉS

## ÉTAPE 1 : COLLECTE BESOINS

Affichage en cartes (structure identique carte produit Marchand).

Chaque carte = une commande groupée en cours.

Afficher :

* Nom produit
* Date limite participation
* Nombre membres contributeurs
* Volume total actuel
* Statut : Collecting

Bouton CTA :

* “Participer”
* “Voir détails”

---

### DÉTAIL COLLECTE

Sections internes :

### Membres contributeurs

Liste :

* Nom membre
* Quantité demandée
* Date participation

### Quantités individuelles

* Total consolidé en temps réel
* Barre progression vers objectif

### Date limite participation

* Compteur dynamique

Statut global affiché en badge :

Collecting → Negotiating → Validated → Paid → Distributed

---

## ÉTAPE 2 : AGRÉGATION (Statut = Negotiating)

Afficher :

* Volume total consolidé
* Fournisseurs comparés
* Prix négocié final
* Économie réalisée

Bouton :

* “Valider commande”

---

## ÉTAPE 3 : VALIDATION (Statut = Validated)

Afficher :

* Montant total
* Contribution par membre
* Date limite paiement

---

## ÉTAPE 4 : PAIEMENT COLLECTIF (Statut = Paid)

Afficher :

### Contribution par membre

* Montant individuel
* Statut paiement (Paid / Pending)

### Paiement consolidé

* Total reçu
* Solde restant

Statut global affiché en header.

---

## ÉTAPE 5 : DISTRIBUTION (Statut = Distributed)

Afficher :

* Volume reçu
* Répartition stock par membre
* Confirmation réception (toggle par membre)
* Historique date réception

---

# 3️⃣ VUE 2 — VENTES GROUPÉES

Même structure UI que Achats.

Objectif :
Permettre à la coopérative de vendre en gros.

Cartes affichent :

* Produit
* Volume total disponible
* Membres contributeurs
* Prix collectif
* Statut commande

Workflow identique :

Collecting → Negotiating → Validated → Paid → Distributed

Mais logique inversée :

Collecte → Agrégation offre membres → Négociation acheteur → Paiement reçu → Distribution revenus

---

# 4️⃣ STATUTS OBLIGATOIRES

Chaque commande groupée doit avoir :

* Badge couleur dynamique
* Historique changement statut
* Date changement statut
* Log interne

---

# 5️⃣ MODALS OBLIGATOIRES

* Modal participer (quantité + confirmation)
* Modal validation commande
* Modal confirmation paiement
* Modal confirmation réception
* Modal suspension commande (admin coop)

Même structure que modals Produits Marchand.

---

# 6️⃣ KPI À AFFICHER EN HAUT DE PAGE

Au-dessus des cartes :

* Total commandes groupées actives
* Volume consolidé en cours
* Économies réalisées (achats)
* Revenus générés (ventes)

Même style que résumé Produits Marchand.

---

# 7️⃣ RÈGLES MÉTIER À IMPLÉMENTER

* Impossible passer à Negotiating si date limite non atteinte
* Impossible passer à Validated sans volume minimum
* Impossible passer à Paid si contributions incomplètes
* Impossible passer à Distributed sans confirmation réception

---

# 8️⃣ RESPONSIVE

Mobile :

* Cartes empilées
* Switch Achats/Ventes sticky
* Modals plein écran
* Bouton retour visible

Web :

* Grille 2 ou 3 colonnes (identique Produits)
* Filtres en haut
* Modals centrées

---

# 9️⃣ OBJECTIF FINAL

La Coopérative doit avoir :

* 2 vues claires (Achats / Ventes)
* Workflow complet 5 statuts
* Gestion membres détaillée
* Paiement collectif structuré
* Distribution tracée
* UI identique au menu Produits Marchand
* 0 modification structurelle

---

Si nécessaire, je peux te faire maintenant :

* Les règles base de données exactes (tables & relations)
* Ou les calculs automatiques détaillés par statut.
