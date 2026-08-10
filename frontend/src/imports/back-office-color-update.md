OBJECTIF
Améliorer uniquement l’apparence visuelle du **Back-Office** en appliquant une nouvelle palette de couleurs.

⚠️ CONTRAINTE ABSOLUE
Ne modifier **aucune logique**, **aucune structure**, **aucun composant**, **aucune navigation**, **aucune route**, **aucune donnée**, **aucune animation**.

La seule modification autorisée est **la couleur**.

────────────────
PÉRIMÈTRE STRICT
────────────────

Modifier uniquement :

Interface **Back-Office**

Ne rien modifier dans :

* Marchand
* Producteur
* Coopérative
* Institution
* Identificateur
* Marketplace
* Academy
* Assistant IA
* Pages publiques

Le changement doit être **isolé au Back-Office uniquement**.

────────────────
PALETTE À APPLIQUER
────────────────

Couleur principale :

#EEC053

Couleur secondaire :

#181816

────────────────
RÈGLES D’APPLICATION
────────────────

Couleur principale #EEC053 utilisée pour :

* boutons principaux
* badges actifs
* éléments sélectionnés
* indicateurs actifs
* hover des boutons
* highlight des tableaux
* progress bars
* CTA principaux

Couleur secondaire #181816 utilisée pour :

* fond principal du BackOffice
* sidebar
* header
* footer
* fond des dashboards
* modals
* overlays

────────────────
TEXTE & CONTRASTE
────────────────

Sur fond #181816 :

texte principal : blanc
texte secondaire : gris clair

Sur fond #EEC053 :

texte : noir

Respecter un contraste élevé pour lisibilité institutionnelle.

────────────────
COMPOSANTS À METTRE À JOUR
────────────────

Mettre à jour uniquement les couleurs dans :

Sidebar BackOffice
Header BackOffice
Dashboard widgets
Tableaux de données
Badges de statut
Boutons
Modals
Formulaires
Charts
Cartes statistiques

Aucune modification :

* tailles
* spacing
* typographie
* layout
* responsive
* icônes
* animations

────────────────
STRUCTURE CSS
────────────────

Créer ou mettre à jour uniquement les variables :

--bo-primary: #EEC053
--bo-secondary: #181816

Remplacer toutes les couleurs existantes du BackOffice par ces variables.

────────────────
ISOLATION ABSOLUE
────────────────

Les nouvelles couleurs doivent être appliquées **uniquement dans le namespace BackOffice** :

classes
layouts
wrappers
providers

Aucune fuite de style vers les autres profils.

────────────────
VÉRIFICATION OBLIGATOIRE
────────────────

Vérifier que :

* Marchand UI n’a pas changé
* Producteur UI n’a pas changé
* Coopérative UI n’a pas changé
* Institution UI n’a pas changé
* Identificateur UI n’a pas changé

Seul le **Back-Office** doit refléter la nouvelle palette.

────────────────
RAPPORT FINAL
────────────────

Fournir un rapport indiquant :

1. les fichiers modifiés
2. les variables CSS ajoutées
3. les composants BackOffice impactés
4. confirmation que les autres profils n’ont subi **aucune modification**.
