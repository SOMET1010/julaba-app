# Recette terrain groupée — une seule session, un seul téléphone

**C'est la seule mobilisation physique de Patrick avant le GO.**
Tous les scénarios sont ici, dans l'ordre. Ne pas les faire dans le
désordre : plusieurs dépendent de l'état laissé par le précédent.

> Document vivant : il s'enrichit à chaque défaut corrigé pendant le lot A.
> Tant que le lot A n'est pas clos, **ne pas exécuter** — attendre que le
> statut dans `coordination/JULABA-STATUS.md` passe à
> `TYPE_BESOIN: TEST_PHYSIQUE_ANDROID`.

## Préalable (une fois)

- Un téléphone Android, un compte Jùlaba mémorisé, **biométrie désactivée**.
- APK construit depuis la branche `claude/clever-allen-dnr8by` :

```bash
git fetch origin claude/clever-allen-dnr8by
git checkout claude/clever-allen-dnr8by
npm ci
export VITE_API_URL=https://julaba-api.onrender.com/api/v1   # OBLIGATOIRE
npm run build -w frontend_src
npx cap sync android
cd android && ./gradlew assembleDebug
```

- Mode développeur armé **avant** de commencer : 5 tapes rapides sur le coin
  haut-gauche de l'écran de connexion, puis **fermer complètement l'app**.
  Ces tapes sont des gestes : elles fausseraient le scénario 1.

---

## Scénario 1 — La voix sur l'écran du code secret

*Corrigé dans `e54ef6c`. Durée : 2 min.*

1. Ouvrir l'app. Elle doit arriver **directement** sur « Ton code secret ».
2. **Ne toucher à rien pendant 5 secondes.** Écouter.
   → Tata dit-elle « Entre ton code secret à 4 chiffres » ?  **OUI / NON**
3. Toucher l'écran **une fois**, n'importe où.
   → La consigne se fait-elle entendre maintenant ?  **OUI / NON**

| Étape 2 | Étape 3 | Conclusion |
|---|---|---|
| NON | **OUI** | **Attendu.** Le silence venait de l'autoplay, le filet le rattrape. |
| **OUI** | — | L'audio n'était pas verrouillé : le diagnostic est à reprendre. |
| NON | NON | Autre cause. Le rapport tranche (voir « Ce qu'il faut capturer »). |

---

## Scénario 2 — Le fond de caisse déclaré après une vente

*Corrigé dans `cee1daa`. Durée : 5 min. **C'est un scénario argent** :
noter les montants exacts, pas « ça a marché ».*

Se connecter avec une journée **non encore ouverte** (si une journée est
déjà ouverte, fermer la caisse d'abord).

1. **Vendre AVANT d'ouvrir la journée.** Faire une vente de 1 000 F.
   → L'app laisse-t-elle vendre sans bloquer ?  **OUI / NON**
2. Revenir à l'accueil, toucher **« Ouvrir ma journée »**, saisir **5 000 F**.
   → Quel montant la carte affiche-t-elle ?  **__________ F**
3. **Fermer complètement l'app et la rouvrir.**
   → Quel montant la carte affiche-t-elle maintenant ?  **__________ F**

> **C'est l'étape 3 qui compte.** Avant le correctif, elle affichait **0 F** :
> le montant saisi n'avait jamais atteint la base. Les deux montants des
> étapes 2 et 3 doivent être **identiques et égaux à 5 000**.

4. Toucher **« Modifier le fond »**, saisir **3 500 F**. Fermer et rouvrir l'app.
   → Montant affiché : **__________ F**  (attendu : 3 500)

> Avant le correctif, « Modifier le fond » ne persistait rien : le montant
> revenait à sa valeur précédente au rechargement.

---

## Scénario 3 — Rouvrir une journée fermée

*Corrigé dans `cee1daa`. Durée : 2 min.*

1. Fermer la caisse normalement (comptage réel au choix).
2. Regarder la carte du haut de l'accueil.
   → Que dit-elle ?  **« Journée ouverte » / « Ouvre ta journée »**

> **Attendu : « Ouvre ta journée ».** Avant le correctif elle annonçait
> « Journée ouverte » avec un fond à l'appui, et le bouton d'ouverture
> disparaissait — la marchande ne pouvait plus rouvrir sa journée.

3. Toucher « Ouvrir ma journée », saisir un montant **différent** du fond du
   matin.
   → Le fond du jour a-t-il changé ?  **OUI / NON** (attendu : **NON**, et
   Tata doit dire de passer par « Modifier le fond »)

---

## Scénarios à venir

Ajoutés au fil du lot A. À ce jour : dictée « Dis le nom » du produit
(livrée, jamais validée sur micro réel) ; parcours marchande complet en
réseau faible et hors ligne.

---

## Ce qu'il faut capturer si ça échoue

Pour **chaque** scénario qui ne donne pas le résultat attendu :

1. **Le rapport de diagnostic** : descendre en bas de l'écran de connexion,
   toucher **« 🐞 Rapport de test »**, partager le texte.
2. **Les montants exacts** relevés, pas un résumé.
3. **Une photo de l'écran** si ce qui cloche est visible.
4. **Ce que tu as fait juste avant** — l'ordre des gestes change tout dans
   les scénarios 2 et 3.

Coller le tout dans la conversation. Rien d'autre n'est attendu de Patrick.
