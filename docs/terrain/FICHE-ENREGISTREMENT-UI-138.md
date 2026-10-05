# Fiche d'enregistrement — un seul clip, `ui-138.mp3`

> ## ⚠️ CE N'EST PLUS URGENT — 25/09/2026, décision de Patrick
>
> **« Le filet parle partout. »** Quand aucun clip ne correspond à une phrase,
> la synthèse prend désormais le relais au lieu de se taire. La caisse DIT donc
> déjà « Je n'ai pas compris. Touche le micro et redis-moi. »
>
> Ce clip devient un **confort**, plus une nécessité : il remplacera la voix de
> synthèse par celle de Tata Nanti Lou quand il sera enregistré. Le reste de
> cette fiche reste valable — seul le caractère urgent tombe.
>
> Ce que ça change aussi : la phrase est dite **tout de suite**, sur le
> prochain APK, sans attendre un passage en studio.


**25/09/2026.** Texte choisi par Patrick.

## Pourquoi

Quand la caisse ne comprend pas ce qu'on lui dit, elle **écrit** sa réponse mais
ne la **dit pas** : aucun clip n'existe pour cette phrase, et le code refuse la
voix de synthèse en français (« clip Tata enregistré ou texte seul. Jamais de
voix navigateur »).

Une marchande qui ne lit pas se retrouve alors devant un écran **muet**, sans
savoir quoi faire. C'est la doctrine numéro un qui saute : *aucune information
importante uniquement en texte*.

## Ce qu'il faut faire dire à Tata Nanti Lou

Une phrase, mot pour mot :

> **« Je n'ai pas compris. Touche le micro et redis-moi. »**

Ton : le même que les 137 autres clips — posé, chaleureux, pas d'excuse ni de
reproche. Elle ne dit pas que la marchande s'est trompée ; elle dit quoi faire
maintenant.

## Où le déposer

```
frontend_src/public/voix/tata/ui-138.mp3
```

Format : MP3, comme les autres. Les clips existants font entre 19 et 52 Ko.

## Puis, une ligne de code

Dans `frontend_src/src/app/services/tataUiClips.ts`, à sa place alphabétique :

```ts
{ file: "/voix/tata/ui-138.mp3", text: "Je n'ai pas compris. Touche le micro et redis-moi." },
```

C'est tout. La correspondance texte → clip est automatique
(`tataUiClipForText`) : la phrase affichée par la caisse est **déjà** exactement
celle-ci, figée par `clipEchecCaisse.test.mts`.

`tataUiClips.ts` étant sous gel VOICE-01, il faudra ensuite régénérer la
référence — **geste de Patrick, pas d'un agent** :

```
node frontend_src/scripts/test-voix-trace-source.mjs --regenerer
```

## Vérifier

```
npm run test:clip-echec-caisse -w frontend_src
```

Tant que le clip manque, il affiche `⏳ clip PAS ENCORE ENREGISTRÉ` sans faire
échouer la chaîne. Une fois déposé et déclaré, il vérifie tout seul que le
contrat tient.

---

## Une piste à écouter AVANT d'enregistrer

**Neuf clips sont déjà présents sur le serveur et déclarés nulle part** — aucun
manifeste, aucune trace dans l'historique. Si l'un d'eux dit déjà quelque chose
d'approchant, il n'y a rien à enregistrer :

```
https://julaba-web.onrender.com/voix/tata/ui-037.mp3
https://julaba-web.onrender.com/voix/tata/ui-041.mp3
https://julaba-web.onrender.com/voix/tata/ui-059.mp3
https://julaba-web.onrender.com/voix/tata/ui-062.mp3
https://julaba-web.onrender.com/voix/tata/ui-085.mp3
https://julaba-web.onrender.com/voix/tata/ui-086.mp3
https://julaba-web.onrender.com/voix/tata/ui-096.mp3
https://julaba-web.onrender.com/voix/tata/ui-105.mp3
https://julaba-web.onrender.com/voix/tata/ui-108.mp3
```

Ces neuf-là méritent de toute façon d'être écoutés et inventoriés : ce sont des
enregistrements payés qui ne servent à rien tant que personne ne sait ce qu'ils
disent.
