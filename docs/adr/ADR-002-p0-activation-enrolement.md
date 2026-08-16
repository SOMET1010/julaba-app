# ADR-002 — P0.0 : enrôlement inerte + activation par la marchande (fin du takeover `0000`)

**Statut :** accepté (cadrage validé, option B) — 16/08/2026
**Contexte de sécurité :** audit P0.0 (voir SPEC-AUTH-CIBLE §0.4).

## Problème (prouvé sur `main`)

- `identifications.controller.ts:327` pose `password = '0000'` à l'enrôlement.
- `auth.service.ts:28` : `DEFAULT_PASSWORD_ACTEUR = '0000'` — **secret global constant**.
- `auth.service.ts:142-143` : le compte naît `ACTIF` + `mustChangePassword: true`.
- `POST /auth/login` accepte `numéro + '0000'` → **tokens valides émis, sans présence
  de la marchande**. Le garde `mustChangePassword` (jwt.strategy) est contournable :
  `change-password` (auth.controller:295) n'exige que l'**ancien** PIN (`0000`, connu)
  → l'attaquant pose un nouveau PIN → **compte pris, marchande verrouillée dehors**.

**Exploitable par quiconque connaît le numéro** (non secret), tant que la marchande
n'a pas changé son PIN — potentiellement jamais, pour une non-lectrice.

## Décision (option B)

À l'enrôlement : **aucun secret de connexion utilisable n'est créé** ; le compte reste
**non-loginable** (`status = en_attente_activation`) ; un **code d'activation à usage
unique et expirant** est émis. L'activation se fait **sur le téléphone de la marchande**,
où **elle choisit son secret initial** (PIN ≠ `0000`/`1234` en P0 ; remplacé par le mot
de passe imagé de la déc. 3). Au terme, le compte devient loginable.

**Exigences dures :**
- Le code ne DOIT **jamais** être réutilisable ni suffire seul à établir une **session
  normale** (il n'ouvre QUE l'activation).
- **Expiration courte** (30 min, séance assistée) + **consommation atomique/idempotente**.
- **Journalisation** : qui a initié l'enrôlement, quand l'activation a eu lieu.
- **Aucun repli silencieux** vers un PIN par défaut si l'activation échoue.

## Périmètre

- **DANS (ce lot)** : backend — statut `en_attente_activation` + rejet au login ;
  entité/table `activation_codes` (hash + selector, expiry, `used_at`, `created_by`) ;
  `ActivationService` (émission + consommation atomique) ; endpoint `POST /auth/activer` ;
  ré-écriture de l'enrôlement (inerte + code) ; **migration** (enum + table + neutralisation
  des comptes existants encore à `0000`) ; **test invariant** prouvant que l'exploit échoue.
- **DANS (suivi immédiat)** : écran d'activation minimal (saisir le code + choisir le PIN).
- **HORS (lots ultérieurs)** : mot de passe **imagé** (déc. 3), **WebAuthn/biométrie**
  (déc. 5), **récupération** complète (déc. 4).

## Ce que P0.0 ferme — et le résiduel (honnêteté)

- ✅ **Ferme le trou de masse** : plus de secret constant `0000` ; compte inerte →
  « quiconque connaît le numéro » ne peut plus entrer ni prendre le compte.
- 🟠 **Résiduel ciblé** : le code d'activation est **détenu par l'identificateur** (il le
  voit à l'enrôlement). Un identificateur **malveillant**, avec le code **et** le
  téléphone en séance, pourrait activer et poser un secret qu'il connaît. Atténué par
  **usage-unique + expiry court + journalisation** (traçable/révocable). Sa fermeture
  **cryptographique** exige le facteur propre à elle → **imagé privé (déc. 3)** ou
  **biométrie (déc. 5)**.

**Interprétation du critère de sortie.** « Numéro + tout ce que connaît l'identificateur
⇒ ni session caisse, ni choix du secret à sa place » est **pleinement** atteint pour la
**connaissance permanente** (numéro, constante `0000`, `mustChangePassword`). Le **code
d'activation à usage unique** est une **capacité éphémère tracée**, pas une connaissance
permanente ; le résiduel « identificateur + code + téléphone en séance » est fermé
cryptographiquement par la déc. 3/5, pas par P0.0 seul. **P0.0 tue l'exploit de masse ;
déc. 3 tue l'abus ciblé.**
