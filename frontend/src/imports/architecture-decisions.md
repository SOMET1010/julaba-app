## 1. Architecture Navigation (décision prioritaire)

### Bottom Bar recommandée

**ACCUEIL / IDENTIFICATION / SUIVI / PROFIL**

**Pourquoi :**

* Flux métier principal = créer → suivre → gérer son compte.
* “MEMBRES” devient inutile si les acteurs sont accessibles via SUIVI + recherche.
* Simplifie la hiérarchie mentale du persona : il est un **agent opérationnel territorial**, pas un gestionnaire communautaire.

---

## 2. Rôle exact du Persona (Identificateur)

### Positionnement clair

L’Identificateur est :

* Un **agent territorial assigné à une seule zone**
* Un **opérateur de création et mise à jour**
* Un **contrôleur local**
* Non décisionnaire final (validation = Institution)

Il ne :

* Ne voit pas les autres zones
* Ne valide pas définitivement
* Ne gère pas la gouvernance globale

Son pouvoir = **opération locale contrôlée**

---

## 3. Structure fonctionnelle optimale

### ACCUEIL (Dashboard)

Contient uniquement :

1. **Tantie Sagesse (fixe en haut, non scrollable)**

   * Texte dynamique contextuel
   * Accessible via bouton bottom bar
   * Rôle : guidance métier + pédagogie

2. **Compteurs globaux cliquables**

   * Total Draft
   * Total Submitted
   * Total Approved
   * Total Rejected
     → Redirige vers SUIVI avec filtre automatique

3. Section **Mon Territoire**

   * Zone assignée (badge visible)
   * Statistiques locales
   * Missions en cours

---

### IDENTIFICATION (1 seul écran, 3 onglets)

Structure recommandée :

**Nouveau Dossier / Brouillons / Soumissions**

Logique :

* Draft = local, modifiable
* Submitted = en attente Institution
* Approved/Rejected visibles dans SUIVI

---

### SUIVI

Liste complète filtrable :

* Draft
* Submitted (Under Review = Submitted → fusionner)
* Approved
* Rejected

Pipeline officiel :
**Draft → Submitted → Approved / Rejected**

Supprimer “Under Review” comme statut distinct pour éviter confusion cognitive.

---

## 4. GPS

Option retenue :
**Mock par défaut + activation GPS réel**

Logique :

* Permet démo / test
* Permet traçabilité réelle
* Compatible avec contrôle Institution

---

## 5. Gestion des Modals

Recommandation stratégique :

* Supprimer les modals lourds type IdentificationsModal si la nouvelle structure les absorbe.
* Garder uniquement :

  * Confirmations
  * Alertes zone bloquée
  * Validation rapide

Le Dashboard doit devenir structurel, pas modal-driven.

---

## 6. Règles Territoriales – Clarification Stratégique

### Attribution

* 1 Identificateur = 1 zone unique
* Zone assignée uniquement par Institution

### Création Acteur

* Marchand/Producteur automatiquement rattaché à :

  * La zone de l’Identificateur
  * L’Identificateur créateur
* Numéro = identifiant unique + login

### Recherche

* Peut rechercher inter-zone
* Peut voir existence
* Si hors zone → fiche verrouillée + message bloquant
* Icône 🔒 + badge zone visible

### Modification autorisée

Peut modifier uniquement :

* Données d’identification
* Données liées à son enregistrement

Pas :

* Données institutionnelles
* Données financières globales

---

## 7. Nomenclature Zones (Décision recommandée)

### Marchands

Utiliser : **Marché physique**
Ex: "Marché de Cocody"

Pourquoi :

* Plus concret
* Correspond à l’action terrain

### Producteurs

Utiliser : **Village ou Localité précise**
Pas région large.
Granularité fine = meilleure traçabilité.

---

## 8. Coopératives

Pour l’instant :

* 1 coopérative = 1 zone

Architecture backend prête pour multi-zones (feature future).

---

## 9. Gouvernance Institution

L’Institution :

* Crée / modifie zones
* Assigne / réassigne identificateurs
* Gère mutations
* Corrige zone lors validation
* Dashboard statistique par zone

Elle est la seule vue globale.

---

## 10. Persona Synthèse Finale

L’Identificateur parfait comprend que :

* Son territoire est exclusif
* Sa mission est locale
* Il est responsable de la qualité des données
* Il est limité volontairement pour protéger la gouvernance
* Il opère dans un cadre strict mais clair

C’est un **agent terrain structuré**, pas un administrateur.

---

## Points définitivement clarifiés

* Under Review = Submitted (fusion)
* MEMBRES supprimé de la bottom bar
* Modals réduits
* GPS hybride
* Zones verrouillées
* Recherche inter-zone visible mais non consultable
* Badge zone obligatoire sur toutes les cards
* Pipeline unique clair