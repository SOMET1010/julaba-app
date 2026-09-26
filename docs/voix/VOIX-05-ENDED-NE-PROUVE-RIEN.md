# « ended » ne prouvait pas qu'on avait entendu quelque chose — VOIX-05

**26/09/2026.** Banc web, geste 1 (effacer un chiffre).

## Ce qui s'est passé

Le journal de voix inscrivait, à chaque ⌫ :

```
/voix/tata/login-24.mp3 → ended    (2 s)
```

Durée crédible, fin normale. Sur la foi de cette ligne, le banc a rendu
**OK**. Moi aussi. Le clip ne sortait pas.

Et comme les gestes 2 et 5 reposaient sur le même journal, **tous leurs
verdicts sont tombés avec celui-là**. Quatre « OK » annulés par une ligne.

## Pourquoi c'est la pire panne possible

Un indicateur qui se tait laisse un doute. Un indicateur qui **ment** fabrique
la preuve du contraire : il ne se contente pas de rater la panne, il certifie
qu'il n'y en a pas. Plus personne ne cherche.

C'est le même défaut que partout ailleurs dans ce projet, appliqué à
l'outillage : *une information existe, quelqu'un en aval la jette ou la
re-devine*. Ici, le lecteur savait quatre choses — le volume, l'état muet, la
position de lecture, la durée — et n'en rapportait aucune.

## Ce que `onended` dit, et ce qu'il ne dit pas

`onended` se déclenche quand l'élément `<audio>` atteint sa fin. C'est tout.

Il ne dit pas :

- si le **volume** de l'élément était à zéro ;
- si l'élément était **coupé** (`muted`) ;
- si la **tête de lecture a bougé** — une lecture qui finit à `currentTime` ≈ 0
  n'a rien joué, quoi qu'en dise `onended` ;
- si le navigateur a **refusé l'autoplay** — ce refus arrive dans le `catch` de
  `play()`, porte un nom (`NotAllowedError`), et n'apparaissait nulle part.

## Ce qu'on a changé

Deux écouteurs, en **lignes de journal uniquement** — le gel VOICE-01 exige
que le fichier, une fois ses lignes `vtrace.` retirées, soit identique à sa
référence. La ligne d'origine `audio.onended = () => done("ended")` n'a donc
pas bougé d'un caractère.

Le journal porte désormais, à chaque fin de clip :

```
issue: 'ended', volume, muted, lu (currentTime), duree, alerte
```

et `alerte` nomme les trois cas qui rendent une fin normale silencieuse :
**FIN SANS LECTURE**, **ELEMENT COUPE**, **VOLUME A ZERO**.

À l'appel de `play()`, deux issues de plus : `play-accepte` et `play-refuse`,
cette dernière avec le nom de l'erreur. « Pas de son » et « son refusé par le
navigateur » ne se ressemblent plus — ce sont deux pannes différentes, et une
seule se répare dans notre code.

## Ce que ça ne fait PAS

**Ça ne répare rien.** On ne sait toujours pas pourquoi le clip est muet ; on
saura seulement, au prochain test, laquelle des quatre causes c'est.

C'est délibéré : le fichier est bon (`login-24.mp3`, crête −3,3 dB, RMS
−17 dB, comparable aux clips humains), le code du lecteur est correct, et rien
dans ce qu'on peut lire d'ici ne désigne un coupable. Chercher plus loin sans
mesure, ce serait deviner — et une correction à l'aveugle sur un défaut qu'on
ne reproduit pas en fabrique deux autres.

## Comment lire le journal

Il n'est **pas** dans la console. Il vit dans le stockage local :

```js
JSON.parse(localStorage.getItem('julaba_journal_voix') || '[]').slice(-20)
```

Cherche les entrées `TTS_MOTEUR` portant `issue`. Si tu vois
`alerte: 'FIN SANS LECTURE'`, le clip n'a jamais démarré. Si tu vois
`issue: 'play-refuse'`, c'est le navigateur qui a dit non.
