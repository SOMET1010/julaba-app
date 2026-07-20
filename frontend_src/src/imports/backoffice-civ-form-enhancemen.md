OBJECTIF

Améliorer les formulaires du **Back-Office uniquement** pour qu’ils soient adaptés à la **Côte d’Ivoire**, avec des valeurs par défaut et des listes prédéfinies.

⚠️ CONTRAINTE ABSOLUE

Ne modifier :

* aucune logique métier
* aucune API
* aucune donnée existante
* aucune route
* aucune structure Supabase

Les modifications doivent concerner **UNIQUEMENT l’UI des formulaires Back-Office**.

---

# 1️⃣ SCOPE

Appliquer ces améliorations à **TOUS les formulaires du Back-Office** qui contiennent :

* pays
* téléphone
* région
* localisation
* statut
* type d’acteur
* devise
* date

Ne rien modifier dans :

* Marchand
* Producteur
* Coopérative
* Identificateur
* Institution
* Marketplace
* Academy
* Assistant IA

---

# 2️⃣ LOCALISATION PAR DÉFAUT

Tous les formulaires doivent être **pré-remplis pour la Côte d’Ivoire**.

Valeurs par défaut :

Pays
Côte d’Ivoire

Devise
Franc CFA (XOF)

Format date
JJ/MM/AAAA

Format monétaire
XOF

---

# 3️⃣ TÉLÉPHONE

Les champs téléphone doivent utiliser un **sélecteur de pays**.

Valeur par défaut :

Côte d’Ivoire

Affichage :

+225 | 07 XX XX XX XX

Le préfixe doit être automatiquement positionné sur **+225**.

---

# 4️⃣ HIÉRARCHIE ADMINISTRATIVE

Implémenter une hiérarchie administrative complète de la Côte d’Ivoire.

Niveaux :

District
Région
Département
Sous-préfecture
Commune

Langue :

Français + noms locaux.

Exemples :

Abidjan
Bouaké
Korhogo
San Pedro
Yamoussoukro
Daloa

---

# 5️⃣ DROPDOWNS INTELLIGENTS

Les listes doivent être **dépendantes**.

Exemple :

Utilisateur choisit :

Région →
les Départements correspondants apparaissent.

Département →
les Sous-préfectures correspondantes apparaissent.

Sous-préfecture →
les Communes correspondantes apparaissent.

---

# 6️⃣ STATUTS PAR DÉFAUT

Ajouter des statuts standards pour les utilisateurs.

Liste :

Actif
Suspendu
En attente

Valeur par défaut :

Actif

---

# 7️⃣ TYPES D’ACTEURS

Dans les formulaires concernés, proposer une liste prédéfinie :

Producteur
Marchand
Coopérative
Institution
Identificateur

---

# 8️⃣ COMPORTEMENT DES FORMULAIRES

Lorsqu’un administrateur ouvre un formulaire BO :

Les champs doivent déjà afficher :

Pays : Côte d’Ivoire
Téléphone : +225
Devise : XOF
Statut : Actif

Les champs géographiques deviennent dynamiques selon les choix.

---

# 9️⃣ STOCKAGE DES DONNÉES

Ces listes doivent être **hardcodées dans l’UI** pour le moment.

Aucune requête API nécessaire.

Structure recommandée :

fichier :

/src/app/data/civ-geography.ts

Contenant :

districts
regions
departements
sous_prefectures
communes

---

# 🔟 UX

Les dropdowns doivent :

* être rapides
* être filtrables par recherche
* supporter auto-complétion

Exemple :

taper "Bou" → Bouaké apparaît.

---

# 1️⃣1️⃣ ACCESSIBILITÉ

Les champs doivent rester :

* lisibles
* simples
* adaptés aux utilisateurs administratifs

---

# 1️⃣2️⃣ RAPPORT FINAL

Fournir :

1. la liste des formulaires BO modifiés
2. le fichier de données Côte d’Ivoire créé
3. confirmation que les autres profils n’ont pas été modifiés
4. confirmation qu’aucune logique métier n’a été impactée.
