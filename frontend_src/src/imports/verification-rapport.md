
Objectif : Vérifier point par point que 100% des spécifications ont été respectées, sans exception.
Tu dois :
* Vérifier chaque module
* Vérifier chaque bouton
* Vérifier chaque modal
* Vérifier chaque état
* Vérifier chaque rôle
* Vérifier la cohérence responsive
* Vérifier la conformité UI
* Vérifier les règles système
Si un élément manque, est partiel ou incohérent → le signaler précisément.
Ne rien corriger pour l’instant. Fournir uniquement un rapport structuré.

1️⃣ VÉRIFICATION DESIGN & COHÉRENCE UI
Confirmer :
* Respect à 100% du design system existant
* Même grille
* Même composants
* Même hiérarchie
* Même radius
* Même ombres
* Même animations
* Sidebar identique aux autres apps (version Web)
* Bottom Bar identique aux autres apps (version Mobile)
* Aucun élément déplacé
Indiquer :
* Conforme
* Partiellement conforme
* Non conforme

2️⃣ VÉRIFICATION CHARTE COULEUR
Confirmer :
* Primaire = #E6A817
* Secondaire = #3B3C36
* Sidebar en brun anthracite
* Boutons primaires miel ambré
* Hover correct
* Contrastes accessibles

3️⃣ VÉRIFICATION RÔLES & PERMISSIONS
Vérifier présence et fonctionnement :
* Super Admin
* Admin National
* Gestionnaire de Zone
* Analyste / Observateur
Pour chaque rôle :
* Permissions exactes
* Restrictions régionales si applicable
* Accès lecture seule si nécessaire
* Test de blocage actions interdites

4️⃣ DASHBOARD GLOBAL
Vérifier affichage :
* Total acteurs par type
* Actifs / Suspendus
* Volume transactions
* Valeur totale
* % digitalisation
* % inclusion sociale
* Commissions générées
* Objectifs atteints
Graphiques :
* Croissance mensuelle
* Activité par région
* Répartition par profil
* Performance identificateurs
Alertes :
* Fraude
* Inactivité
* Dossiers en attente
* Anomalies

5️⃣ MODULE ACTEURS
Vérifier :
Vue Liste :
* Filtres (Type, Région, Statut, Date, Performance)
* Colonnes complètes
* Actions rapides fonctionnelles
Vue Détail :
* Informations générales
* Documents
* Transactions
* KPI
* Historique actions
* Boutons critiques fonctionnels

6️⃣ MODULE ENRÔLEMENT
Vérifier :
Création ADMIN :
* Tous champs
* Permissions
* Rôle
* Activation
Création IDENTIFICATEUR :
* Zone
* Institution rattachée
* Objectif mensuel
Validation COOPÉRATIVE :
* Statuts Draft → Pending → Approved → Rejected
* Motif rejet obligatoire

7️⃣ SUPERVISION
Vérifier :
Transactions globales :
* Filtres avancés
* Colonnes complètes
* Actions (Geler, Annuler, Corriger, Litige)
Logs automatiques lors modification.

8️⃣ ZONES & TERRITOIRES
Vérifier :
* Création zone
* Modification
* Attribution gestionnaire
* Statistiques par zone

9️⃣ COMMISSIONS & PAIEMENTS
Vérifier :
* Paramétrage taux
* Calcul automatique
* Historique
* Export comptable

🔟 ACADEMY MANAGEMENT
Vérifier :
* Création module
* Attribution par profil
* Gestion XP
* Activation / Désactivation
* Statistiques engagement

1️⃣1️⃣ MISSIONS & OBJECTIFS
Vérifier :
* Création objectifs
* Attribution par zone
* Suivi performance
* Classement

1️⃣2️⃣ PARAMÈTRES
Vérifier :
* Règles scoring
* Seuil alertes
* Suspension auto
* Gestion rôles dynamique

1️⃣3️⃣ AUDIT & LOGS
Vérifier :
* Journalisation complète
* Ancienne / Nouvelle valeur
* Date
* IP
* Export PDF / Excel / CSV

1️⃣4️⃣ RÈGLES SYSTÈME
Confirmer :
* Soft delete uniquement
* Double confirmation actions critiques
* Historique immuable
* RBAC strict
* Permissions modulables

1️⃣5️⃣ RESPONSIVE
VERSION WEB :
* Sidebar fixe
* Multi-colonnes
* Modals centrées
VERSION MOBILE :
* Bottom Bar fixe
* Tables transformées en cartes
* Navigation stack
* Bouton retour visible

1️⃣6️⃣ TESTS FONCTIONNELS
Simuler :
* Création ADMIN
* Création IDENTIFICATEUR
* Validation COOPÉRATIVE
* Modification transaction
* Suspension acteur
* Changement rôle
* Attribution zone
Vérifier que chaque action génère un log.

FORMAT DU RAPPORT
Présenter :
* ✅ Conforme
* ⚠️ Partiel
* ❌ Manquant
Avec :
* Module
* Élément
* Problème précis
* Gravité (Critique / Majeur / Mineur)

Objectif :
Obtenir un rapport précis permettant de corriger 100% des écarts.
Ne rien omettre. Vérifier chaque détail.
