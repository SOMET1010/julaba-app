# Recette terrain groupée — une seule séance

**C'est la seule mobilisation physique de Patrick avant le GO pilote.**
Compter **40 minutes**, un téléphone Android, un endroit où le réseau est
mauvais (ou le mode avion).

Les scénarios sont dans un ordre qui compte : plusieurs dépendent de l'état
laissé par le précédent, et le premier ne vaut que s'il est fait **avant**
tout autre geste.

> **Ce document ne contient plus que ce qu'une base de données et un
> navigateur ne peuvent pas prouver.** Tout le reste a été vérifié
> automatiquement — voir « Ce qui est déjà prouvé » à la fin. Si un scénario
> te paraît manquer, il est probablement là.

---

## Étape 0 — Construire et installer l'APK

```bash
git fetch origin claude/clever-allen-dnr8by
git checkout claude/clever-allen-dnr8by
npm ci

export VITE_API_URL=https://julaba-api.onrender.com/api/v1   # OBLIGATOIRE
npm run build -w frontend_src
npx cap sync android
cd android && ./gradlew assembleDebug
```

`VITE_API_URL` doit être exportée **avant** le build. Sans elle, l'app
n'atteint aucun backend — c'est un défaut déjà payé une fois (`1958d6a`), et
il se voit immédiatement : « Réponse inattendue » à la connexion.

**Ce qui est vérifié ici, et ce qui ne peut pas l'être.** Les trois premières
commandes ont été exécutées sur `claude/clever-allen-dnr8by` (16/09/2026) :
le build sort dans `frontend/dist` (le `webDir` de `capacitor.config.ts`),
`npx cap sync android` copie **exactement** ce build (même empreinte de
bundle `index-*.js`), l'URL de l'API y est bien incluse et le paquet posé est
`com.julaba.app`. Seul `./gradlew assembleDebug` n'a pas pu être joué : il
demande le SDK Android, absent de l'environnement des instances.

Ce que ta machine doit donc avoir pour la dernière commande :

| Prérequis | Valeur attendue |
|---|---|
| SDK Android | plateforme **36** installée (`compileSdk`/`targetSdk` = 36) |
| JDK | **17 ou plus** (imposé par le plugin Android Gradle 8.13) |
| `ANDROID_HOME` ou `android/local.properties` | doit pointer sur le SDK, sinon Gradle s'arrête aussitôt |
| Réseau | le premier `assembleDebug` télécharge Gradle 8.14.3 et ses plugins |

`google-services.json` est absent du dépôt **volontairement** : le build le
détecte et continue sans lui (seules les notifications push sont inactives).
Ce n'est pas une erreur à corriger avant la séance.

**Préalable :** un compte marchande **mémorisé sur l'appareil** et dont la
**biométrie est désactivée**. C'est le seul cas qui reproduit le scénario 1.

**Armer le mode développeur maintenant, puis fermer l'app :** 5 tapes
rapides sur le coin haut-gauche de l'écran de connexion. Le bouton
« 🐞 Rapport de test » apparaît en bas. Fermer ensuite **complètement**
l'app (la retirer des applications récentes).

> Ces 5 tapes sont des gestes : elles débloqueraient l'audio et fausseraient
> le scénario 1. Le réglage est mémorisé et survit à la fermeture.

---

## Scénario 1 — La voix sur l'écran du code secret

*2 min. **À faire en tout premier**, sans avoir touché l'écran avant.*

1. Ouvrir l'app. Elle doit arriver **directement** sur « Ton code secret ».
2. **Ne toucher à rien pendant 5 secondes.** Écouter.
   → Tata dit-elle « Entre ton code secret à 4 chiffres » ?  **OUI / NON**
3. Toucher l'écran **une fois**, n'importe où.
   → La consigne se fait-elle entendre maintenant ?  **OUI / NON**

| Étape 2 | Étape 3 | Ce que ça prouve |
|---|---|---|
| NON | **OUI** | **Attendu.** Le silence venait du navigateur, le filet le rattrape. |
| **OUI** | — | L'audio n'était pas bloqué sur cet appareil : le diagnostic est à reprendre. |
| NON | NON | Autre cause — le rapport de test tranche (voir plus bas). |

---

## Scénario 2 — Tata parle-t-elle vraiment sur CET appareil ?

*3 min. Aucune base ne peut répondre à ça.*

1. Se connecter. Sur l'accueil, toucher le bouton qui fait parler Tata.
   → Entends-tu sa voix ?  **OUI / NON**
2. Toucher le montant de la caisse (« MA CAISSE AUJOURD'HUI »).
   → Annonce-t-elle le montant à voix haute ?  **OUI / NON**
3. Descendre en bas, toucher **« 🐞 Rapport de test »**, partager le texte.

> Le rapport contient la liste des **voix françaises installées** sur le
> téléphone. Si elle est vide, Tata ne peut pas parler — c'est une panne du
> téléphone, pas de l'app, et ça change tout le reste.

---

## Scénario 3 — Elle est appelée comme elle l'a demandé

*4 min. Traverse deux systèmes : le back-office et le téléphone.*

1. Back-office, fiche de cette marchande : remplir **« Comment veux-tu
   qu'on t'appelle ? »** avec par exemple « Tantie Awa ». Enregistrer.
2. Sur le téléphone, se déconnecter puis se reconnecter.
   → L'accueil dit-il « Bonjour Tantie Awa » ?  **OUI / NON**
3. **Fermer complètement l'app et la rouvrir.**
   → L'écran de **connexion** le dit-il aussi ?  **OUI / NON**

> L'étape 3 est celle qui compte : là, elle n'est pas encore authentifiée.
> **Première fois après mise à jour :** seul le prénom peut s'afficher.
> C'est normal — le choix est appris à l'entrée suivante. Un nom **absent**
> n'est pas un défaut ; un nom **faux** en serait un.

---

## Scénario 4 — L'argent, avec de vrais doigts

*8 min. La logique est prouvée ailleurs ; ici on vérifie que **le doigt
attrape ce qu'il vise**. Noter les montants exacts, pas « ça a marché ».*

Partir d'une journée non ouverte (fermer la caisse d'abord si besoin).

1. **Vendre avant d'ouvrir la journée** : « Vendre » → « Caisse complète »
   → « + Autre article » → montant **1 500**, libellé « Tomates » →
   « Ajouter » → « Encaisser » → « Compte juste » → « Payer en espèces ».
   → La vente aboutit-elle ?  **OUI / NON**
2. Accueil → toucher le montant de la caisse → **« Modifier le fond »**.
   Composer **5 000 F** en touchant les billets.
   → As-tu attrapé le billet visé du premier coup ?  **OUI / NON**
   → Le total affiché est-il **5 000** ?  **__________**
3. Toucher « Modifier ». Puis **fermer complètement l'app et la rouvrir**.
   → La caisse affiche-t-elle **6 500 F** ?  **__________**
4. Toucher le montant → **« Fermer la caisse »**. Saisir **6 000**.
   → Écart annoncé : **__________**  (attendu : **− 500**)
5. Confirmer la fermeture.
   → La caisse affiche-t-elle toujours **6 500 F** ?  **__________**

> L'étape 2 est la seule qui ne peut pas être testée sans doigt : les
> rangées de billets ne défilent plus (`f5754ad`), mais c'est un vrai
> pouce qui le confirme.
> Les étapes 3, 4 et 5 sont des **montants** : s'ils diffèrent de ceux
> attendus, c'est un incident — note-les tels quels.

---

## Scénario 5 — La dictée avec un vrai micro

*5 min. Impossible à simuler : aucune instance n'a de microphone.*

1. « Mon stock » → ajouter un produit → toucher le **micro** et dire un
   nom de produit (« tomate »).
   → Le nom est-il repris correctement ?  **OUI / NON**
2. Recommencer **dans le bruit** si possible (marché, radio).
   → Toujours correct ?  **OUI / NON**
3. Partager le **rapport de test** après coup : il contient ce que la
   reconnaissance a réellement entendu.

---

## Scénario 6 — Réseau faible, puis coupé

*8 min. Le cœur de Jùlaba : au marché, le réseau va et vient.*

1. **Mode avion activé.** Faire une vente complète (comme au scénario 4).
   → L'app laisse-t-elle vendre ?  **OUI / NON**
   → Que dit-elle sur l'état de la connexion ?  **__________**
2. Toujours hors ligne : « Mon stock ».
   → Les **images des produits** sont-elles visibles (tomate, igname…) ou
     des cases vides ?  **VISIBLES / VIDES**
3. **Désactiver le mode avion.** Attendre une minute.
   → La vente faite hors ligne est-elle remontée dans « Mes ventes » ?
     **OUI / NON**
   → Le montant est-il **compté une seule fois** ?  **OUI / NON**

> L'étape 3 est la plus importante de toute la séance. Une vente comptée
> deux fois, ou perdue, est le défaut le plus grave possible.

---

## Ce qu'il faut capturer si ça échoue

Pour **chaque** scénario qui ne donne pas le résultat attendu :

1. **Le rapport de diagnostic** — « 🐞 Rapport de test », partagé tel quel.
2. **Les montants exacts** relevés, pas un résumé.
3. **Une photo de l'écran** si ce qui cloche se voit.
4. **Ce que tu as fait juste avant** — l'ordre des gestes change tout dans
   les scénarios 1, 4 et 6.

Coller le tout dans la conversation. Rien d'autre n'est attendu de Patrick.

---

## Ce qui est déjà prouvé — et n'est donc PAS dans cette feuille

Vérifié automatiquement, contre un vrai Postgres et un vrai navigateur
(`./scripts/pg-test-local.sh start`, `npm run test:invariants -w backend`,
`scripts/mesure-ecrans.cjs`). Rien à refaire au téléphone :

| Sujet | Comment c'est prouvé |
|---|---|
| Le fond déclaré arrive en base et survit au rechargement | invariants + navigateur, montants relevés |
| La fermeture enregistre le comptage, la théorique et l'écart | invariants + navigateur (écart −500 vérifié) |
| Le journal distingue déclaration et correction | tests unitaires + invariants |
| Rouvrir une journée fermée ne touche pas au fond | invariant |
| Une vente aboutit et la caisse suit | navigateur, du doigt jusqu'à la base |
| « Rejoindre une coopérative » (500 depuis le 23 août) | 5 invariants en base réelle |
| Aucune cible tactile sous 44 px, 3 rôles, 8 écrans | mesure sur le bundle de production |
| Aucun débordement horizontal, aucun élément sous le menu | même mesure |
| Les images de produits restent visibles sans réseau | vérifié hébergeur d'images bloqué |
| Le nom d'adresse ne devine jamais un titre | 13 cas de test |

Si un de ces points échoue quand même sur le terrain, c'est que la preuve
automatique ne couvrait pas le vrai cas : dis-le, la preuve sera corrigée
avant le code.
