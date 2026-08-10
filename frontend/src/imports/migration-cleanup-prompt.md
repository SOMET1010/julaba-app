Voici le **prompt exact** à transmettre pour audit + nettoyage technique complet avant migration Supabase.

---

## 🔎 PROMPT — NETTOYAGE PRÉ-PRODUCTION OBLIGATOIRE

Effectue un audit technique exhaustif du projet avant migration backend.

Objectif : code propre, aucune simulation, aucune donnée locale critique, aucune clé exposée.

---

### 1️⃣ SUPPRESSION DU LOCALSTORAGE CRITIQUE

Actions obligatoires :

* Scanner tout le projet (`global search`)
* Identifier toute utilisation de :

  * `localStorage`
  * `sessionStorage`
  * `window.localStorage`
* Supprimer toute persistance contenant :

  * user
  * role
  * token
  * wallet
  * transaction
  * session
  * auth
  * balance
  * PIN

Remplacer par :

* Supabase Auth session
* Supabase DB calls

Conserver uniquement si :

* préférence UI non sensible (ex: thème sombre)

Rapport attendu :

* Liste des fichiers modifiés
* Nombre total d’occurrences supprimées

---

### 2️⃣ SUPPRESSION DES MOCK DATA

Actions obligatoires :

* Rechercher :

  * `mock`
  * `fake`
  * `demo`
  * `dummy`
  * `sample`
  * `testData`
* Supprimer :

  * fichiers mock inutilisés
  * tableaux statiques simulant des utilisateurs
  * transactions fictives
  * wallets simulés
  * profils hardcodés

Aucun fallback automatique ne doit injecter de données fictives.

Rapport attendu :

* Liste complète des fichiers supprimés
* Confirmation qu’aucune donnée statique ne simule un utilisateur

---

### 3️⃣ SUPPRESSION DES FALLBACK DÉMO

Rechercher :

* `if (!data)`
* `|| demoData`
* `|| fallback`
* `|| []`
* `|| defaultUser`

Interdire :

* Remplacement automatique par données de démonstration
* Création automatique d’utilisateur fictif si erreur

Le comportement correct doit être :

* Loading state
* Error state
* Aucun affichage fictif

Rapport attendu :

* Liste des conditions fallback supprimées
* Confirmation qu’aucun écran ne fonctionne en mode simulation

---

### 4️⃣ VÉRIFICATION ABSOLUE DES CLÉS API

Scanner l’intégralité du projet pour :

* `sk-`
* `pk-`
* `AIza`
* `SUPABASE_KEY`
* `ELEVEN`
* `TWILIO`
* `VONAGE`
* `process.env.` hardcodé
* clés directement collées dans le code

Interdiction formelle :

* Clé API dans fichier .tsx
* Clé dans utils
* Clé dans service
* Clé dans constants

Toutes les clés doivent être :

* uniquement dans variables d’environnement
* jamais commit dans GitHub

Si clé détectée :

* Supprimer immédiatement
* Remplacer par variable env
* Ajouter au .env.local

Rapport attendu :

* Confirmation écrite qu’aucune clé n’est présente dans le code
* Liste des variables d’environnement nécessaires

---

## 📊 RAPPORT FINAL OBLIGATOIRE

Format attendu :

1. Nombre total de localStorage supprimés
2. Nombre de mock files supprimés
3. Nombre de fallback supprimés
4. Confirmation sécurité clés API
5. Score Production Cleanliness /100

---

Aucune approximation.
Aucune tolérance.
Analyse complète de tout le projet, fichier par fichier.
