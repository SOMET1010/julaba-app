Voici les réponses à lui transmettre, sans ambiguïté.

---

## 1️⃣ Supabase

Supabase doit être considéré comme **backend cible immédiat**.

Instruction :

* Si Supabase est déjà connecté → vérifier cohérence + supprimer toute logique locale restante.
* Si non connecté → préparer le code pour migration immédiate :

  * Supprimer persistance locale critique
  * Supprimer auth simulée
  * Centraliser les appels data via un service unique (ex: `services/api.ts`)

Aucune logique ne doit dépendre définitivement du localStorage.

---

## 2️⃣ localStorage UI

Autorisé uniquement pour :

* thème (dark/light)
* langue
* état sidebar (ouverte/fermée)
* préférence visuelle purement cosmétique

Interdit pour :

* user
* role
* token
* wallet
* balance
* transactions
* PIN
* session

En cas de doute → supprimer.

---

## 3️⃣ États de chargement

Règle stricte :

* Toujours remplacer fallback démo par :

  * composant Loading existant
  * composant Error existant

Si inexistant → créer composant global réutilisable :

* `<AppLoader />`
* `<AppError />`

Aucune donnée fictive affichée si API absente.

---

## 4️⃣ Mock data développement

Différenciation stricte :

| Type                                 | Action    |
| ------------------------------------ | --------- |
| Mock dans flux applicatif            | Supprimer |
| Mock dans Storybook/tests isolés     | Conserver |
| Mock utilisé pour contourner backend | Supprimer |

Objectif : aucune donnée fictive accessible via navigation réelle.

---

## 5️⃣ Variables d’environnement

S’il existe :

* `.env.local` → vérifier qu’il n’est pas versionné
* `.env.example` → le mettre à jour

S’il n’existe pas :

Créer :

`.env.example` contenant uniquement :

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ELEVENLABS_API_KEY=
VITE_SMS_PROVIDER_KEY=
```

Aucune vraie clé dans le repo.

---

## 6️⃣ Score cible

Score minimum accepté :

**95 / 100**

En dessous → audit incomplet.

---

## Directive finale

Audit :

* Exhaustif
* Fichier par fichier
* Rapport chiffré
* Liste exacte des suppressions
* Liste exacte des fichiers modifiés
* Confirmation écrite qu’aucune donnée simulée n’est accessible via navigation normale

Zéro tolérance.
