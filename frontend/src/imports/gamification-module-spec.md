Objectif :
Créer un **module de Gamification / Micro-formation quotidienne In-App**, conforme au cahier des charges , intégré dans :

* 📍 Bouton dédié dans **Profil (MOI)**
* 🔁 Raccourci visible sur Dashboard
* ⚠️ Sans modifier la structure UI existante
* 100% cohérent avec le design actuel (même grille, mêmes composants, mêmes modals)

---

# ARCHITECTURE GLOBALE DU MODULE

Nom recommandé :
**“JÙLABA Academy”**

Objectif :

* Fidélisation
* Montée en compétence
* Augmentation usage plateforme
* Amélioration qualité & conformité

---

# 1️⃣ STRUCTURE GÉNÉRALE (COMMUNE À TOUS LES PROFILS)

## A. Accès

### 1. Depuis Dashboard

Carte dynamique :

* “Formation du jour disponible”
* Barre progression circulaire
* Bouton CTA : “Commencer”

### 2. Depuis Profil (MOI)

Nouvel item :

* Icône 🎓
* Label : “Academy”

---

# 2️⃣ ÉCRAN PRINCIPAL ACADEMY

### Header

* Titre : “Formation du jour”
* Compteur streak (jours consécutifs)
* Badge niveau utilisateur

---

### Bloc 1 : Progression

* Niveau actuel
* XP cumulés
* Barre progression animée
* Prochain badge à débloquer

---

### Bloc 2 : Module du jour

Carte interactive :

* Durée estimée (2–3 min)
* Thématique
* Points à gagner
* Bouton “Démarrer”

---

### Bloc 3 : Historique

* Modules complétés
* Score obtenu
* Badges débloqués

---

# 3️⃣ STRUCTURE D’UN MODULE

Chaque module = 5 micro-étapes maximum

### ÉTAPE 1 : Mini contenu pédagogique

* Texte court
* Illustration
* Exemple concret
* Animation légère

---

### ÉTAPE 2–4 : Questions interactives

Types :

* QCM
* Vrai / Faux
* Mise en situation
* Glisser-déposer (si supporté)

Feedback immédiat :

Si correct :

* Animation validation
* +XP
* Message encouragement

Si faux :

* Correction affichée
* Explication pédagogique
* Pas de blocage

---

### ÉTAPE 5 : Résultat

* Score %
* XP gagné
* Badge débloqué (si applicable)
* Bouton “Continuer”
* Partage facultatif

---

# 4️⃣ SYSTÈME DE GAMIFICATION

## 🎯 Points (XP)

* Bonne réponse : +10
* Module complété : +20 bonus
* Streak 7 jours : +50

---

## 🏅 Niveaux

Niveau 1 → Débutant
Niveau 2 → Actif
Niveau 3 → Expert
Niveau 4 → Leader

Calcul automatique selon XP cumulés.

---

## 🔥 Streak

* Compteur jours consécutifs
* Réinitialisation après 48h d’absence
* Animation flamme

---

## 🎁 Récompenses

Non financières :

* Badge visible profil
* Priorité mise en avant
* Boost visibilité offre (producteur)
* Badge “Coopérative certifiée”
* Badge “Agent Expert”

---

# 5️⃣ CONTENU SPÉCIFIQUE PAR PROFIL

---

# 🔵 PRODUCTEUR

Thématiques :

1. Qualité & grading
2. Fixation prix intelligent
3. Gestion stock
4. Respect délais
5. Optimisation marge
6. Bonnes pratiques post-récolte

Exemple question :

“Si votre stock est inférieur à 10%, que devez-vous faire ?”

Objectif :
Augmenter fiabilité et conversion.

---

# 🟢 COOPÉRATIVE

Thématiques :

1. Négociation collective
2. Agrégation efficace
3. Répartition équitable
4. Gestion financière
5. Transparence

Cas pratique :

“Comment répartir une économie de 200 000 FCFA entre 10 membres proportionnellement ?”

Objectif :
Professionnaliser gestion collective.

---

# 🟤 IDENTIFICATEUR

Thématiques :

1. Vérification documents
2. Conformité légale
3. Capture GPS précise
4. Détection fraude
5. Procédure rejet

Scénario :

“Un document est flou, que faites-vous ?”

Objectif :
Améliorer qualité enrôlement.

---

# 🟣 ADMINISTRATION / INSTITUTION

Thématiques :

1. Analyse KPI
2. Inclusion sociale
3. Lecture données marché
4. Détection anomalies
5. Pilotage adoption

Question type :

“Une baisse de 30% d’activité sur une région signifie ?”

Objectif :
Optimiser gouvernance.

---

# 6️⃣ MÉCANIQUE TECHNIQUE

## Base de données

Tables nécessaires :

* academy_modules
* academy_questions
* academy_answers
* user_academy_progress
* user_badges
* user_streak

---

## Règles

* 1 module débloqué par jour
* Contenu dynamique selon profil
* Randomisation questions
* Historique conservé

---

# 7️⃣ MICRO-INTERACTIONS

* Confetti animation si 100%
* Haptic léger mobile
* Progression animée
* Compteur XP dynamique
* Feedback sonore optionnel

---

# 8️⃣ KPIs À MESURER

* Taux complétion
* Rétention 7 jours
* Corrélation formation / performance
* Temps moyen module

---

# 9️⃣ STRATÉGIE DE FIDÉLISATION

* Notification push quotidienne
* Rappel si module non fait
* Badge spécial 30 jours consécutifs
* Classement régional (optionnel)

---

# 10️⃣ ROADMAP DE DÉPLOIEMENT

Phase 1 :

* MVP QCM simple
* XP + Streak

Phase 2 :

* Badges avancés
* Classement

Phase 3 :

* Certificat digital
* Module long premium

---

# SYNTHÈSE STRATÉGIQUE

Ce module doit :

* Augmenter engagement quotidien
* Améliorer qualité écosystème
* Créer différenciation forte
* Renforcer conformité cahier des charges

---

Si tu veux, je peux maintenant :

* Te rédiger le prompt Figma Make IA ultra détaillé pour implémentation exacte
* Ou créer le plan de base de données Supabase complet prêt à brancher.
