# Recette terrain — VOIX-V5 (écran du code secret muet)

**Une seule session de test. Vingt minutes. Un téléphone.**
Ce document existe pour que Patrick n'ait à le faire **qu'une fois**.

## Ce qu'on cherche à prouver

Une marchande connue de l'appareil mais **sans biométrie** arrive
directement sur l'écran « Ton code secret ». La consigne vocale partait
avant tout geste dans la page ; la politique autoplay du navigateur la
coupait **en silence**. L'écran restait muet pour quelqu'un qui ne lit pas.

Le correctif ajoute à cette étape le filet de rattrapage que les deux
autres avaient déjà. La recette doit répondre à **une** question :
le silence venait-il bien de l'autoplay, et le filet le rattrape-t-il ?

## Préalable

- Un téléphone Android avec un compte Jùlaba **déjà mémorisé** et dont la
  **biométrie est désactivée**. C'est le seul cas qui reproduit le défaut.
- Le correctif n'est **pas sur `main`** : l'authentification est un module
  sacré et la Constitution exige une preuve réelle avant de merger
  (principe 3). L'APK se construit depuis la branche.

## Étape 0 — Construire l'APK depuis la branche

```bash
git fetch origin claude/clever-allen-dnr8by
git checkout claude/clever-allen-dnr8by
npm ci

export VITE_API_URL=https://julaba-api.onrender.com/api/v1   # OBLIGATOIRE
npm run build -w frontend_src
npx cap sync android
cd android && ./gradlew assembleDebug
```

`VITE_API_URL` doit être exportée **avant** le build — sans elle, l'APK ne
joint aucun backend (voir `docs/SHERPA_ONNX_APK.md`).

## Étape 1 — Armer le mode développeur, PUIS fermer l'app

1. Ouvrir l'app, arriver sur l'écran de connexion.
2. Taper **5 fois de suite, rapidement** (moins d'une demi-seconde entre
   chaque) le **coin haut-gauche** de l'écran. Le pied de page outils
   apparaît, avec le bouton **« 🐞 Rapport de test »**.
3. **Fermer complètement l'app** — la retirer des applications récentes,
   pas seulement la mettre en arrière-plan.

> **Pourquoi dans cet ordre.** Ces 5 tapes sont des gestes : elles
> débloquent l'audio et fausseraient la mesure. Le réglage développeur est
> mémorisé sur l'appareil et survit à la fermeture — au rallumage, le
> bouton sera là sans qu'aucun geste n'ait été fait.

## Étape 2 — LA MESURE (ne toucher à rien)

1. Rouvrir l'app. Elle doit arriver **directement** sur « Ton code secret ».
2. **Ne toucher l'écran sous aucun prétexte pendant 5 secondes.** Écouter.

> **Tata dit-elle « Entre ton code secret à 4 chiffres » ?  OUI / NON**

## Étape 3 — Le rattrapage

3. Toucher l'écran **une seule fois**, n'importe où.

> **La consigne se fait-elle entendre maintenant ?  OUI / NON**

## Étape 4 — Le rapport

4. Descendre en bas de l'écran, appuyer sur **« 🐞 Rapport de test »**,
   puis partager ou coller le texte dans la conversation.

## Comment lire le résultat

| Étape 2 | Étape 3 | Conclusion |
|---|---|---|
| NON | **OUI** | **Résultat attendu.** Le silence venait bien de l'autoplay, et le filet le rattrape. VOIX-V5 est **GO** — le correctif peut être mergé sur `main`. |
| **OUI** | — | L'audio n'était pas verrouillé sur cet appareil : l'autoplay n'explique pas le silence signalé en recette. Le diagnostic est à reprendre — le rapport dit où regarder. |
| NON | NON | L'autoplay n'est pas seul en cause. Le rapport tranche : si `VOICES` **et** `VOICES_TARDIVES` sont vides, le téléphone n'a **aucune voix française installée** — c'est une panne de moteur vocal, pas d'autoplay, et le correctif ne pouvait pas la résoudre. |

## Ce que le rapport doit contenir

Dans cet ordre, au début du journal :

```
SESSION login
DEVICE  {"synth": true, ...}            ← speechSynthesis présent ?
VOICES  {"total": N, "fr": [...]}       ← voix françaises du téléphone
LOGIN_ETAPE_INITIALE {"step":"password","biometrie":false,"guidage":true}
VOIX_CODE_TENTEE {"arriveeDirecte":true,"guidage":true}
VOIX_CODE_REJOUEE_APRES_GESTE           ← n'apparaît qu'après le toucher
```

- `step` vaut autre chose que `"password"` → le préalable n'est pas rempli
  (compte non mémorisé, ou biométrie encore active). Reprendre à zéro.
- `guidage: false` → l'appareil est en **mode lecture** : la consigne
  automatique est volontairement muette. Ce n'est pas le défaut cherché.
- `VOIX_CODE_REJOUEE_APRES_GESTE` absent après le toucher → le filet ne
  s'est pas armé ; c'est un défaut du correctif lui-même.
- `VOICES` vide mais `VOICES_TARDIVES` rempli → le catalogue était
  simplement en retard, le téléphone a bien des voix.

## Après la recette

Coller le rapport dans la conversation. Selon le tableau ci-dessus,
`coordination/JULABA-STATUS.md` repassera à `BESOIN_PATRICK: NON` et la
suite s'enchaînera sans nouvelle intervention.
