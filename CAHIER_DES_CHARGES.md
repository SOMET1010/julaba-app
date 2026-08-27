# CAHIER DES CHARGES FONCTIONNEL - Jùlaba
## Plateforme de commerce agricole pour la Côte d'Ivoire

**Version:** 5.0.0  
**Date:** 24 Août 2026  
**Architecture:** Mobile-first (Capacitor Android) + Web  
**Assistant vocal:** Tata Nanti Lou (offline-first)

---

## 1. VISION GLOBALE

Jùlaba est une plateforme numérique pour les **marchands, producteurs, coopératives et institutions** de Côte d'Ivoire. Le cœur du produit est la **vente par la voix** : une marchande occupée dicte ses ventes et dépenses à "Tata Nanti Lou", son assistante vocale, sans toucher l'écran.

### Acteurs de la plateforme

| Acteur | Couleur | Cible | Usage principal |
|--------|---------|-------|-----------------|
| **Marchand** | `#C66A2C` | Vendeuse au marché | Vente, caisse, stock |
| **Producteur** | `#2E8B57` | Agriculteur / éleveur | Récoltes, production, vente |
| **Coopérative** | `#2072AF` | Groupement de producteurs | Gestion collective, finances |
| **Institution** | `#712864` | Ministère / ONG / partenaire | Supervision, analytics |
| **Identificateur** | `#9F8170` | Agent de terrain | Enrôlement, identification |
| **Admin/BackOffice** | `#333333` | Équipe Jùlaba | Gestion plateforme |

---

## 2. MARCHAND

### 2.1 Accueil (`/marchand`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Caisse du jour | Montant actuel avec bouton "écouter" | ✅ Tata parle | ✅ |
| Masquer/afficher solde | Toggle œil pour cacher le montant | - | ✅ |
| Mode Soleil | Agrandir texte/contraste (inclusion) | ✅ "Mode soleil activé" | ✅ |
| Nouvelle vente | Ouvre la caisse (gestion panier en cours) | - | ✅ |
| Vendre à la voix | Modal push-to-talk → vente dictée | ✅ Tata répond | ✅ |
| Tuiles navigation | Stock, Dépenses, Ventes, Argent | ✅ dit le libellé | ✅ |
| Panier en cours | Bannière reprise si panier existant | - | ✅ |
| Bonjour personnalisé | "Bonjour Maman [prénom]" au toucher | ✅ | ✅ |
| Résumé du jour | Modal ventes/dépenses/caisse | ✅ les chiffres sont dits | ✅ |
| Fermer la journée | Clôture avec fond de caisse | ✅ confirmation vocale | ✅ |
| Modifier le fond | Ajuster le fond de caisse | ✅ | ✅ |

### 2.2 Caisse du Jour (`/marchand/caisse`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Catalogue produits | Grille avec images, prix, stock | - | ✅ |
| Recherche produit | Barre de recherche texte | - | ✅ |
| Ajout au panier | Bouton "+ Ajouter" ou swipe | ✅ "Produit ajouté" | ✅ |
| Vente rapide | Top 2 produits les plus vendus | ✅ | ✅ |
| Autre article | Montant libre sans produit catalogué | ✅ | ✅ |
| Quantité / Prix unitaire | Saisie directe (négoce) | ✅ dit la valeur | ✅ |
| Panier modal | Liste des articles, total, modification | ✅ total dit à voix | ✅ |
| Billets reçus | Toucher = billet ajouté | ✅ chaque billet dit sa valeur | ✅ |
| Monnaie coupures | Décomposition en billets réels | ✅ "Monnaie : 2000 × 1, 500 × 1" | ✅ |
| Compte juste | Montant reçu = total | ✅ "Compte juste" | ✅ |
| **Vendre à la voix** | Bouton Mic dans l'en-tête | ✅ push-to-talk intégré | ✅ |
| Validation vente | Enregistrement + écran succès | ✅ vibrer + "Vente enregistrée" | ✅ |
| Rupture de stock | Alerte si stock < quantité vendue | ✅ avertissement vocal | ✅ |
| Partager reçu | Envoi WhatsApp | - | ❌ (réseau) |
| Crédit | **DÉSACTIVÉ** (pilote espèces) | - | - |
| Mobile Money | **DÉSACTIVÉ** (déclaratif uniquement) | - | - |

### 2.3 Vente à la Voix (Modal)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Push-to-talk | Maintenir pour parler, relâcher pour analyser | ✅ bips start/stop | ✅ |
| STT offline | sherpa-onnx natif (APK Android) | - | ✅ |
| Produits reconnus | 25+ produits du vocabulaire marchand | - | ✅ |
| Nombres en lettres | Parseur complet (0 → 999 999) | - | ✅ |
| Nombres elliptiques | "mille cinq" = 1 500 FCFA | - | ✅ |
| Confirmation | "C'est bien ça ?" + auto-écoute | ✅ Tata pose la question | ✅ |
| Oui/Non vocal | 2 tentatives puis fallback boutons | ✅ | ✅ |
| Annulation | "Non" → "D'accord, j'annule" | ✅ clip annule | ✅ |
| Intentions supportées | Vente, Dépense, Réappro, Navigation | ✅ réponses adaptées | ✅ |
| Mains libres | Mot-réveil "Julaba" (opt-in) | ✅ "Oui ?" | ✅ |
| Historique | 20 derniers échanges persistés | - | ✅ |
| Hors-ligne | File de commandes à rejouer | ✅ | ✅ |

**Intentions vocales disponibles :**

| Intention | Exemple | Réponse Tata |
|-----------|---------|--------------|
| Vente | "J'ai vendu 10 tomates à 2000 francs" | "Vente de 10 tomates pour 2 000 francs, c'est bien ça ?" |
| Dépense | "J'ai acheté 3 sacs de riz à 6000" | "Dépense de 6 000 francs pour riz, c'est bien ça ?" |
| Réappro | "J'ai reçu 20 tomates" | "Stock reçu : 20 tomates, c'est bien ça ?" |
| Navigation | "Va au stock" | "J'ouvre ton stock" + navigation |
| Crédit | "Vendu à crédit" | "Le crédit n'est pas encore activé" |
| Consultation | "Combien j'ai vendu aujourd'hui ?" | Réponse avec les chiffres du jour |

**Navigation vocale :**

| Commande | Destination |
|----------|-------------|
| "Va au stock" / "Ouvre mon stock" | `/marchand/stock` |
| "Mes ventes" / "Voir les ventes" | `/marchand/ventes-passees` |
| "Mes dépenses" / "Le cahier" | `/marchand/cahier` |
| "Mon argent" / "Keiwa" | `/marchand/keiwa` |
| "Ma caisse" | `/marchand/caisse` |
| "Ouvre ma journée" | `/marchand/caisse` (ouverture) |
| "Ferme ma journée" | `/marchand/caisse` (clôture) |

### 2.4 Stock (`/marchand/stock`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Liste produits | Cartes avec image, prix, stock | ✅ guidage vocal | ✅ |
| Ajouter produit | Formulaire (nom, prix, stock, catégorie, image) | ✅ | ✅ |
| Modifier produit | Édition inline | ✅ | ✅ |
| Supprimer produit | Confirmation | ✅ | ✅ |
| Réapprovisionnement | Ajout de stock | ✅ | ✅ |
| Alertes stock bas | Badge rouge si stock < 10 | ✅ | ✅ |
| Catégories | Filtrage par catégorie | ✅ | ✅ |
| Recherche | Barre de recherche | ✅ (useVoiceCore) | ✅ |

### 2.5 Dépenses (`/marchand/cahier`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Liste dépenses | Historique chronologique | ✅ | ✅ |
| Ajouter dépense | Formulaire (montant, catégorie, description) | ✅ (useVoiceCore) | ✅ |
| Total du jour | Somme des dépenses | ✅ dit à voix | ✅ |
| Catégories | Aliment, transport, loyer, personnel, autre | ✅ | ✅ |
| Recherche | Filtrage par texte | ✅ | ✅ |

### 2.6 Ventes Passées (`/marchand/ventes-passees`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Historique ventes | Liste chronologique | ✅ guidage vocal | ✅ |
| Filtres | Par date, par produit | ✅ | ✅ |
| Détail vente | Produits, quantités, montants | ✅ | ✅ |
| Graphiques | Chiffre d'affaires journalier | ✅ | ✅ |

### 2.7 Marché Virtuel (`/marchand/marche`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Catalogue | Produits disponibles à l'achat | ✅ (useVoiceCore) | ✅ |
| Recherche | Barre de recherche | ✅ (useVoiceCore) | ✅ |
| Commander | Passer une commande fournisseur | ✅ | ❌ |
| Négociation | Prix discutable | ✅ | ✅ |

### 2.8 Tontines (`/marchand/tontines`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Liste tontines | Tontines auxquelles le marchand participe | ✅ | ✅ |
| Détail tontine | Montant, membres, prochaine cotisation | ✅ | ✅ |
| Cotiser | Paiement cotisation | ✅ | ❌ |

### 2.9 Autres Pages Marchand

| Page | Voix | Offline | Description |
|------|:----:|:-------:|-------------|
| Récoltes prévues | ❌ | ✅ | Prochaines récoltes à acheter |
| Profil | ❌ | ✅ | Informations personnelles |
| Commandes | ✅ | ✅ | Commandes en cours |
| Alertes | ❌ | ✅ | Notifications |
| Paramètres | ❌ | ✅ | Configuration |
| Ma Coopérative | ✅ | ✅ | Appartenance coopérative |
| Besoin coopérative | ✅ | ✅ | Besoins du groupe |
| Protection sociale | ✅ | ✅ | CNPS, CMU |
| Fidélité | ✅ | ✅ | Points de fidélité |
| Academy | ✅ | ✅ | Formations |
| Support | ❌ | ❌ | Contact support |

### 2.10 Portefeuille Keiwa (`/marchand/keiwa`)

| Page | Description | Voix | Offline |
|------|-------------|:----:|:-------:|
| Wallet | Solde, actions rapides | ❌ | ❌ |
| Transfert | Envoyer de l'argent | ❌ | ❌ |
| Paiements | Payer un service | ❌ | ❌ |
| Banque | Lier compte bancaire | ❌ | ❌ |
| Carte | Carte virtuelle | ❌ | ❌ |
| Historique | Transactions Keiwa | ❌ | ❌ |

---

## 3. PRODUCTEUR

### 3.1 Accueil (`/producteur`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| KPI Production | Volume total en kg | ❌ (no-op) | ✅ |
| KPI Revenus | Chiffre d'affaires total | ❌ (no-op) | ✅ |
| Récoltes du jour | Liste des récoltes | ❌ | ✅ |
| Ventes récentes | Dernières transactions | ❌ | ✅ |
| Score financier | Indice de confiance | ❌ | ✅ |
| Notifications | Alertes et messages | ❌ | ✅ |

### 3.2 Production (`/producteur/production`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Cycles de production | Liste des cycles en cours | ❌ | ✅ |
| Détail cycle | Phase, durée, prédictions | ❌ | ✅ |
| Saisonnalité | Données historiques | ❌ | ✅ |

### 3.3 Récoltes

| Page | Description | Voix | Offline |
|------|-------------|:----:|:-------:|
| Déclarer récolte | Formulaire (produit, quantité, date) | ❌ | ✅ |
| Mes récoltes | Historique des récoltes | ❌ | ✅ |
| Publier récolte | Mettre en vente sur le marché | ❌ | ❌ |

### 3.4 Commandes (`/producteur/commandes`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Commandes reçues | Liste des commandes clients | ✅ (écoute) | ✅ |
| Accepter/Refuser | Gestion des commandes | ✅ (écoute) | ❌ |
| Détail commande | Produits, quantités, client | ✅ (écoute) | ✅ |

### 3.5 Stocks (`/producteur/stocks`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Inventaire | Liste des produits en stock | ✅ (écoute) | ✅ |
| Ajouter produit | Formulaire | ✅ (écoute) | ✅ |
| Récoltes stockées | Produits récoltés en attente | ✅ (écoute) | ✅ |

### 3.6 Autres Pages Producteur

| Page | Voix | Offline | Description |
|------|:----:|:-------:|-------------|
| Profil | ❌ | ✅ | Informations producteur |
| Academy | ❌ | ✅ | Formations |
| Keiwa | ❌ | ❌ | Portefeuille |
| Paramètres | ❌ | ✅ | Configuration |
| Alertes | ❌ | ✅ | Notifications |
| Support | ❌ | ❌ | Contact |

---

## 4. COOPÉRATIVE

### 4.1 Accueil (`/cooperative`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| KPI Volume groupe | Chiffre d'affaires collectif | ❌ (no-op) | ✅ |
| KPI Trésorerie | Solde de la coopérative | ❌ (no-op) | ✅ |
| Adhésions en attente | Nombre de demandes | ❌ | ✅ |
| Accès rapides | Finances, Membres, Ajouter membre | ❌ | ✅ |

### 4.2 Gestion des Membres (`/cooperative/membres`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Liste membres | Tous les membres actifs | ✅ (recherche) | ✅ |
| Ajouter membre | Formulaire d'adhésion | ✅ (recherche) | ❌ |
| Profil membre | Détail d'un membre | ✅ (recherche) | ✅ |
| Suspension | Suspendre un membre | ✅ (recherche) | ❌ |

### 4.3 Finances (`/cooperative/finances`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Bilan financier | Recettes, dépenses, solde | ❌ | ✅ |
| Transactions | Historique des mouvements | ❌ | ✅ |
| Cotisations | Suivi des cotisations membres | ❌ | ✅ |

### 4.4 Trésorerie (`/cooperative/tresorerie`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Solde trésorerie | Montant disponible | ❌ | ✅ |
| Mouvements | Entrées / sorties | ❌ | ✅ |
| Prévisions | Prochains dépenses prévues | ❌ | ✅ |

### 4.5 Marché Coopératif (`/cooperative/marche`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Catalogue groupe | Produits de la coopérative | ✅ (recherche) | ✅ |
| Achats groupés | Commandes collectives | ✅ (recherche) | ❌ |
| Ventes groupées | Ventes en gros | ✅ (recherche) | ❌ |

### 4.6 Commandes (`/cooperative/commandes`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Commandes collectives | Suivi des commandes du groupe | ❌ | ✅ |
| Validation | Approuver/refuser | ❌ | ❌ |

### 4.7 Stock Coopératif (`/cooperative/stock`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Inventaire collectif | Stocks partagés | ✅ (recherche) | ✅ |
| Répartition | Distribuer aux membres | ✅ (recherche) | ❌ |

### 4.8 Autres Pages Coopérative

| Page | Voix | Offline | Description |
|------|:----:|:-------:|-------------|
| Profil | ❌ | ✅ | Informations coopérative |
| Academy | ❌ | ✅ | Formations |
| Keiwa | ❌ | ❌ | Portefeuille |
| Paramètres | ❌ | ✅ | Configuration |
| Support | ❌ | ❌ | Contact |

---

## 5. INSTITUTION

### 5.1 Accueil (`/institution`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| 9 Macro KPIs | Actifs, total, suspendus, transactions, valeur, digitalisation, CNPS, CNAM, croissance | ❌ | ❌ |
| Évolution transactions | Graphique temporel | ❌ | ❌ |
| Répartition par type | Graphique secteurs | ❌ | ❌ |
| Activité par région | Carte/régions | ❌ | ❌ |
| Courbe adoption | Taux de pénétration | ❌ | ❌ |
| Résumé du jour | Nouveaux inscrits, dossiers, transactions, alertes | ❌ | ❌ |
| Accès rapides | Gérer acteurs, Supervision | ❌ | ❌ |
| Alertes haute sévérité | Liste dépliable | ❌ | ❌ |

### 5.2 Analytics (`/institution/analytics`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Tableaux de bord | Indicateurs détaillés | ❌ | ❌ |
| Filtres | Par période, région, type | ❌ | ❌ |
| Export | Rapports téléchargeables | ❌ | ❌ |

### 5.3 Gestion des Acteurs (`/institution/acteurs`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Liste acteurs | Tous les acteurs de la zone | ❌ | ❌ |
| Filtres | Par type, statut, région | ❌ | ❌ |
| Détail acteur | Fiche complète | ❌ | ❌ |
| Suspendre | Suspension de compte | ❌ | ❌ |

### 5.4 Supervision (`/institution/supervision`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Vue d'ensemble | État des acteurs zone | ❌ | ❌ |
| Alertes | Notifications importantes | ❌ | ❌ |
| Interventions | Actions correctives | ❌ | ❌ |

### 5.5 Audit Trail (`/institution/audit-trail`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Journal d'activité | Toutes les actions des acteurs | ❌ | ❌ |
| Filtres | Par date, acteur, action | ❌ | ❌ |
| Détail action | Qui, quoi, quand | ❌ | ❌ |

### 5.6 Autres Pages Institution

| Page | Voix | Offline | Description |
|------|:----:|:-------:|-------------|
| Dashboard | ❌ | ❌ | Tableau de bord détaillé |
| Dashboard Analytics | ❌ | ❌ | Analytics avancés |
| Paramètres | ❌ | ❌ | Configuration |
| Profil | ❌ | ❌ | Informations institution |
| Academy | ❌ | ❌ | Formations |
| Keiwa | ❌ | ❌ | Portefeuille |
| Support | ❌ | ❌ | Contact |

---

## 6. IDENTIFICATEUR

### 6.1 Accueil (`/identificateur`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Recherche dynamique | Barre pour trouver/créer un acteur | ❌ | ❌ |
| Nouveau dossier | Fiche d'identification | ❌ | ❌ |
| Compteurs | Brouillons, En attente, Validés, Rejetés | ❌ | ❌ |
| Mon territoire | Zone assignée + KPIs | ❌ | ❌ |
| Missions | Objectif mensuel + progression | ❌ | ❌ |
| Alerte sécurité | "Écran sensible" | ❌ | ❌ |

### 6.2 Identification (`/identificateur/identification`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Fiche dynamique | Formulaire d'identification acteur | ❌ | ❌ |
| Données obligatoires | Nom, prénom, téléphone, activité, zone | ❌ | ❌ |
| Photo | Capture photo acteur | ❌ | ❌ |
| Géolocalisation | Position GPS | ❌ | ❌ |
| Sauvegarde brouillon | Sauvegarder pour plus tard | ❌ | ❌ |

### 6.3 Suivi (`/identificateur/suivi`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Liste dossiers | Tous les dossiers en cours | ❌ | ❌ |
| Filtres | Par statut, date | ❌ | ❌ |
| Détail dossier | Évolution du dossier | ❌ | ❌ |

### 6.4 Brouillons (`/identificateur/brouillons`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Liste brouillons | Dossiers non finalisés | ❌ | ❌ |
| Reprendre | Continuer une identification | ❌ | ❌ |
| Supprimer | Supprimer un brouillon | ❌ | ❌ |

### 6.5 Acteurs (`/identificateur/acteurs`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Liste acteurs | Acteurs identifiés | ❌ | ❌ |
| Détail acteur | Fiche complète | ❌ | ❌ |
| Demande mutation | Transfert vers une autre zone | ❌ | ❌ |

### 6.6 Statistiques & Rapports

| Page | Description | Voix | Offline |
|------|-------------|:----:|:-------:|
| Statistiques | Nombre d'identifications, taux validation | ❌ | ❌ |
| Rapports | Rapports生成és par l'identificateur | ❌ | ❌ |
| Dashboard | Vue d'ensemble | ❌ | ❌ |

---

## 7. BACKOFFICE (Admin)

### 7.1 Dashboard (`/backoffice/dashboard`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Ticker en temps réel | Transactions WebSocket | ❌ | ❌ |
| 7 KPIs | Acteurs, actifs, volume, suspendus, en attente, transactions, zones | ❌ | ❌ |
| Accès rapides | Dossiers, supervision, rapports, acteurs, missions | ❌ | ❌ |
| Objectifs nationaux 2026 | Barres de progression | ❌ | ❌ |
| Activité par région | Répartition géographique | ❌ | ❌ |
| Top 5 identificateurs | Performance | ❌ | ❌ |
| Qualité des données | Score data quality | ❌ | ❌ |
| Santé système | État des services | ❌ | ❌ |

### 7.2 Gestion des Acteurs (`/backoffice/acteurs`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Liste acteurs | Recherche + filtres avancés | ❌ | ❌ |
| Détail acteur | Fiche complète + historique | ❌ | ❌ |
| Créer acteur | Formulaire de création | ❌ | ❌ |
| Modifier | Édition informations | ❌ | ❌ |
| Suspendre | Suspension de compte | ❌ | ❌ |
| Supprimer (soft) | Suppression logique | ❌ | ❌ |
| Compteurs | Par type, par statut | ❌ | ❌ |

### 7.3 Enrôlement (`/backoffice/enrolement`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Dossiers en attente | Liste des dossiers à valider | ❌ | ❌ |
| Valider | Approuver un dossier | ❌ | ❌ |
| Rejeter | Refuser avec motif | ❌ | ❌ |
| Demande info | Demander des précisions | ❌ | ❌ |

### 7.4 Zones & Territoires (`/backoffice/zones`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Liste zones | Toutes les zones | ❌ | ❌ |
| Créer zone | Nouvelle zone géographique | ❌ | ❌ |
| Modifier zone | Édition périmètre | ❌ | ❌ |
| Carte acteurs | Visualisation carte | ❌ | ❌ |

### 7.5 Missions (`/backoffice/missions`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Liste missions | Toutes les missions | ❌ | ❌ |
| Créer mission | Nouvelle mission terrain | ❌ | ❌ |
| Assigner | Attribuer à un identificateur | ❌ | ❌ |
| Suivi | État d'avancement | ❌ | ❌ |

### 7.6 Supervision (`/backoffice/supervision`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Vue d'ensemble | État de la plateforme | ❌ | ❌ |
| Alertes | Notifications système | ❌ | ❌ |
| Interventions | Actions correctives | ❌ | ❌ |

### 7.7 Utilisateurs BO (`/backoffice/utilisateurs`)

| Fonctionnalité | Description | Voix | Offline |
|----------------|-------------|:----:|:-------:|
| Liste utilisateurs | Tous les comptes BO | ❌ | ❌ |
| Créer utilisateur | Nouveau compte admin | ❌ | ❌ |
| Permissions | Matrice de droits par rôle | ❌ | ❌ |
| Activity tracking | Dernière connexion | ❌ | ❌ |

**Rôles BackOffice :**

| Rôle | Permissions |
|------|-------------|
| `super_admin` | Tout (exclus de l'arbre — accès total) |
| `admin_general` | Tout sauf `utilisateurs.*` et `parametres.*` |
| `admin_national` | Même que admin_general moins `acteurs.delete` |
| `gestionnaire_zone` | Acteurs R/W, enrolement R/W/validate, supervision R, zones R, moderation R/W, mutations R/W, audit R |
| `operateur_terrain` | Acteurs R/W/suspend, enrolement R/validate, supervision R/W/freeze, moderation R/W, mutations R/W |

### 7.8 Autres Pages BackOffice

| Page | Description |
|------|-------------|
| Audit | Journal d'activité complet |
| Institutions | Gestion des institutions partenaires |
| Profil | Profil admin |
| Rapports | Génération de rapports |
| Notifications | Centre de notifications |
| Support | Support technique |
| Moderation | Signalements |
| Mutations | Transferts d'acteurs |
| Contenus | Gestion de contenu |
| Monitoring IA | Surveillance intelligence artificielle |
| Event Monitor | Événements système |
| Analytics Produit | Métriques produit |
| Score Financier | Scores de crédit |
| API Keys | Gestion des clés API |
| Marketplace | Gestion marketplace |
| Livraison | Suivi livraisons |
| Communication | Outils de communication |
| Cron Dashboard | Tâches planifiées |
| Config Institution | Configuration des institutions |
| Keiwa | Portefeuille plateforme |

---

## 8. FONCTIONNALITÉS PARTAGÉES

### 8.1 Portefeuille Keiwa (tous les rôles)

| Page | Description |
|------|-------------|
| Wallet | Solde, actions rapides, carte |
| Transfert | Envoi d'argent |
| Paiements | Paiement de services |
| Banque | Liaison compte bancaire |
| Carte | Carte virtuelle |
| Historique | Transactions Keiwa |

### 8.2 Academy (tous les rôles)

| Fonctionnalité | Description |
|----------------|-------------|
| Quiz | Questions à choix par rôle |
| Formation du jour | Contenu pédagogique quotidien |
| Badges | Système de gamification |
| Streak | Série de jours consécutifs |

### 8.3 Support (tous les rôles mobiles)

| Fonctionnalité | Description |
|----------------|-------------|
| Contact | Formulaire de contact |
| FAQ | Questions fréquentes |
| Ticket | Création de ticket |

### 8.4 Paramètres (tous les rôles)

| Fonctionnalité | Description |
|----------------|-------------|
| Profil | Informations personnelles |
| Mot de passe | Changement de mot de passe |
| Notifications | Gestion des alertes |
| Taille texte | Curseur d'ajustement |
| Niveau voix | Sélecteur de volume |
| Mode d'accès | Voix / Lecture / Auto |

### 8.5 Notifications (tous les rôles)

| Fonctionnalité | Description |
|----------------|-------------|
| Panneau notifications | Liste des alertes |
| Badge compteur | Nombre non lues |
| Push | Notifications push (web + mobile) |

---

## 9. SYSTÈME VOCAL - MATRICE COMPLÈTE

### 9.1 Capacités vocales par rôle

| Capacité | Marchand | Producteur | Coopérative | Institution | Identificateur | BackOffice |
|----------|:--------:|:----------:|:-----------:|:-----------:|:--------------:|:----------:|
| **Écouter (STT)** | ✅ | ✅ (partiel) | ✅ (recherche) | ❌ | ❌ | ❌ |
| **Parler (TTS)** | ✅ | ❌ (no-op) | ❌ (no-op) | ❌ | ❌ | ❌ |
| **Vente vocale** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Navigation vocale** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Wake word** | ✅ (opt-in) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Mains libres** | ✅ (opt-in) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Clips Tata** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Guidage vocal** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Billets qui parlent** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Mode Soleil** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 9.2 Pipeline vocal (marchand)

```
Utilisateur parle
  → Micro (MediaRecorder, webm/opus)
  → STT: sherpa-onnx natif (APK) / pas de STT web
  → Intent: localIntent.ts (regex, 0 réseau)
    → Vente/Dépense → confirmation → enregistrement
    → Réappro → confirmation → mise à jour stock
    → Navigation → changement d'écran
    → Crédit/Remboursement → message "pas encore activé"
  → Réponse: clip Tata OU TTS synthétisé
  → AudioManager: exclusivité, annulation, priorité
```

### 9.3 Technologie vocale

| Composant | Technologie | Capacité |
|-----------|------------|----------|
| STT | sherpa-onnx natif (Capacitor) | Français, hors-ligne |
| Intent | Regex locale | 5 intentions + navigation |
| TTS clips | 137 clips MP3 Tata Nanti Lou | Phrases fixes |
| TTS synthèse | Piper (local) → ElevenLabs → Navigateur | Texte libre |
| Voice Packs | Manifest CDN | Mise à jour sans rebuild |
| Wake word | "Julaba" (regex) | Mains libres opt-in |

---

## 10. MATRICE D'ACCÈS

### 10.1 Routes par rôle

| Module | Marchand | Producteur | Coopérative | Institution | Identificateur | BackOffice |
|--------|:--------:|:----------:|:-----------:|:-----------:|:--------------:|:----------:|
| Caisse/POS | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Stock | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Dépenses | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Marché | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ventes | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Récoltes | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Production | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Membres | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Finances coop | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Trésorerie | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Tontines | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Protection sociale | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Fidélité | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Identification | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Suivi id. | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Brouillons | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Analytics | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Supervision | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Audit trail | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Enrôlement | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Zones | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Missions | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Utilisateurs BO | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Institutions | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Moderation | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Keiwa | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Academy | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Paramètres | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Support | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Profil | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### 10.2 Bottom Bar Navigation par rôle

| Position | Marchand | Producteur | Coopérative | Institution | Identificateur |
|----------|----------|------------|-------------|-------------|----------------|
| 1 | Accueil | Accueil | Accueil | Accueil | Accueil |
| 2 | Marché | Production | Marché | Acteurs | Acteurs |
| 3 | **🎤 Mic/Tata** | **🎤 Mic/Tata** | **🎤 Mic/Tata** | Supervision | Suivi |
| 4 | Commandes | Commandes | Membres | Analytics | - |
| 5 | Moi | Moi | Moi | Moi | Moi |

---

## 11. CONTRÔLES D'ACCÈS

| Mécanisme | Fichier | Description |
|-----------|---------|-------------|
| Guard rôle/path | `types/constants.ts` | `checkRouteAccess()` vérifie rôle vs préfixe route |
| Cross-role | `types/constants.ts` | `CROSS_ROLE_ROUTES` (marchand → `/cooperative/stock`) |
| BO roles | `constants.ts` | `BO_ROLES` + `isBORole()` |
| Institution modules | `InstitutionLayout.tsx` | `canAccess(module)` via contexte |
| BO permissions | `bo-permissions.ts` | `hasPermission(key)` matrice 18 modules |
| SuperOnly | `bo-permissions.ts` | `utilisateurs`, `parametres` = super_admin uniquement |
| Voice disable | `AppContext.tsx` | Flag localStorage pour identificateur/institution |
| TTS guard | `AppContext.tsx` | `if (role !== 'marchand') return;` |
| mustChangePassword | `AppContext.tsx` | Force redirect `/change-password` |
| BO activity | `BackOfficeContext.tsx` | Tracking dernière connexion |

---

## 12. CONTEXTES REACT

| Contexte | Fournit | Utilisé par |
|----------|---------|-------------|
| `AppContext` | User, speak, stats, sessions, transactions | Tous |
| `CaisseContext` | Cart, produits, ventes, sessions caisse | Marchand |
| `StockContext` | Produits, CRUD stock | Marchand, Producteur, Coop |
| `ProducteurContext` | Cycles, récoltes, publications | Producteur |
| `CooperativeContext` | Membres, stats, finances | Coopérative |
| `InstitutionContext` | KPIs nationaux, analytics | Institution |
| `InstitutionAccessContext` | Permissions modules | Institution |
| `IdentificateurContext` | Identifications, missions | Identificateur |
| `BackOfficeContext` | Données BO complètes | BackOffice |
| `WalletContext` | Keiwa wallet | Tous |
| `CommandeContext` | Commandes | Marchand, Producteur, Coop |
| `NotificationsContext` | Push notifications | Tous |
| `AuditContext` | Journal d'activité | Institution, BackOffice |
| `RaccourcisContext` | Raccourcis vocal | Marchand |
| `RapportHebdoContext` | Rapport hebdomadaire | Marchand |
| `ObjectifContext` | Objectifs quotidiens + voix | Marchand |
| `SupportConfigContext` | Configuration support | Tous |
| `TicketsContext` | Tickets support | Tous |
| `ShortcutsContext` | Raccourcis clavier | Tous |
| `ModalContext` | Gestion modals | Tous |
| `AnimationWrapper` | Animations transitions | Tous |
| `ErrorBoundary` | Gestion erreurs | Tous |

---

*Document généré le 24 Août 2026*
