# Test web — la voix de l'écran de connexion

**Version attendue : `31af95e` ou plus récente.**
URL : https://julaba-web.onrender.com

---

## Ce qu'on te demande

L'écran de connexion **parlait à peine**. On vient d'y brancher quatorze
moments vocaux. Ton travail : **dire ce que tu entends**, moment par moment.

Ce qu'on cherche n'est pas une erreur à l'écran : c'est **un silence**. Un
silence ne s'affiche pas, ne lève aucune exception, et personne ne le signale
jamais. C'est pour ça qu'on te demande d'écouter.

## Étape 0 — la version, avant tout le reste

Ouvre `https://julaba-web.onrender.com/sw.js` et cherche la ligne :

```js
const BUILD = '<hash> · <date>'
```

- Si le hash est `31af95e` **ou plus récent** → continue.
- Si c'est un hash plus ancien → **arrête-toi et dis-le**. Render n'a pas
  fini de déployer, et tout ce que tu testerais serait l'ancienne version.

> Ne te bloque pas sur l'égalité exacte : plus récent convient. C'est
> l'inverse qui invalide le test.

## Avant de commencer — deux réglages

1. **Monte le son**, et mets-toi au calme. Certains clips durent moins d'une
   seconde.
2. **Le journal de voix n'est PAS dans la console** — corrigé le 26/09 après
   un premier test. Il vit dans le stockage local, sous la clé
   `julaba_journal_voix`, avec des événements `TTS_DEMANDE`, `TTS_MOTEUR`,
   `TTS_FIN`, `TTS_COUPEE`. Pour le lire :

   ```js
   JSON.parse(localStorage.getItem('julaba_journal_voix') || '[]').slice(-20)
   ```

   C'est ta preuve quand l'oreille hésite — et ta seule preuve si tu n'as pas
   de son du tout. Dis-le si c'est le cas : un verdict au journal reste
   utile, mais il ne remplace pas une écoute.
3. Le navigateur **bloque le son tant qu'on n'a pas cliqué** sur la page.
   Clique une fois n'importe où avant de juger un silence.

---

## Les gestes, du plus simple au plus difficile

Pour chacun : fais le geste, note **ce que tu entends** et **ce que la console
affiche**. Si rien ne sort, dis-le — c'est l'information la plus utile.

### 1. Effacer un chiffre — le plus facile

Sur l'écran du numéro, tape **trois chiffres**, puis appuie sur la touche
effacer (⌫).

- **Attendu** : « C'est effacé net. »
- Avant aujourd'hui : rien du tout.

### 2. Le pavé passe en images

Cherche le bouton qui bascule le code en images (il est sur l'écran du code
secret). Appuie dessus, puis appuie encore pour revenir.

- **Attendu (aller)** : « Voilà les photos qui sont sorties à la place des
  chiffres. Ton code n'a pas changé. »
- **Attendu (retour)** : « Voilà les chiffres maintenant. Mets ton code comme
  d'habitude. »
- Avant : rien.

> **Gestes 3 et 4 : inatteignables dans l'interface actuelle** — constaté le
> 26/09. Le bouton « C'est mon numéro » est désactivé tant qu'il manque des
> chiffres, et l'écran du code n'a pas de bouton Valider : `handleLogin` n'est
> appelé qu'avec quatre chiffres déjà saisis. Ces deux chemins sont donc du
> code défensif, pas des parcours. Ne t'acharne pas ; passe au geste 5.
> AUTH_11 reste atteignable par la DICTÉE (geste 7).

### 3. Valider un numéro trop court

Tape **5 chiffres seulement**, puis valide.

- **Attendu** : « Il manque encore des chiffres dedans. Continue. »
- Avant : l'écran l'écrivait, la voix se taisait.

### 4. Valider sans code

Va jusqu'à l'écran du code secret, **ne tape rien**, et valide.

- **Attendu** : « Bon, mets les quatre chiffres de ton code secret. »
- Avant : l'écran écrivait « Entre ton mot de passe », en silence.

### 5. Un mauvais code, plusieurs fois

Entre un numéro valide, puis un **mauvais code**, plusieurs fois de suite
jusqu'à ce que l'application proteste.

- **Attendu, au blocage** : « Tu as trop forcé. Patiente un peu d'abord avant
  de réessayer. »
- Dis aussi ce qui est dit aux essais **avant** le blocage.

### 6. Le numéro qui ne commence pas comme ici

Tape un numéro de 10 chiffres commençant par **`00`** (donc aucun opérateur
ivoirien).

- **Attendu à l'écran** : « Ce numéro-là ne commence pas comme un numéro
  d'ici. Regarde bien le début. »
- **Attendu à l'oreille** : **rien** — ce clip n'est pas encore enregistré.
  C'est normal. Confirme juste que le TEXTE est bien celui-là.

### 7. Le micro — si tu peux

Si l'écran propose de dicter le numéro :

- **Refuse l'autorisation du micro** → attendu : « Problème avec le micro —
  réessaie » (voix humaine) et à l'écran « Le micro ne prend pas là. Faut
  taper ton numéro ici. »
- **Accepte, puis dis n'importe quoi d'incompréhensible** → attendu : « Je
  n'ai pas compris. Tape ton numéro, ou réessaie. » (voix humaine aussi)

> Ces deux-là sont les seuls du lot à être en **VRAIE VOIX HUMAINE**. Si tu
> entends une différence de timbre avec les autres, c'est normal et c'est
> même ce qu'on espère. Dis-nous si la transition entre les deux voix
> s'entend, et si elle gêne.

---

## Ce que tu renvoies

Un tableau, une ligne par geste :

```
geste, ce que j'ai ENTENDU, ce que l'écran AFFICHAIT, ligne de console, verdict
1. effacer, "C'est effacé net.", -, playClip /voix/tata/login-24.mp3, OK
3. numéro court, RIEN, "Il manque encore des chiffres dedans. Continue.", aucune ligne, MUET
```

**Trois choses valent plus que le reste :**

1. **Les silences.** Un geste où rien ne sort alors que le tableau l'annonce.
   Cite la console : y a-t-il eu une demande de parole, ou rien du tout ?
2. **Les décalages.** Si tu ENTENDS autre chose que ce que tu LIS à l'écran,
   dis les deux. C'est un défaut à part entière.
3. **Le timbre.** Sur les deux clips humains (§7), et sur l'enchaînement avec
   les autres.

## Ce que tu ne fais pas

- **Ne juge pas les formulations.** Elles sont arbitrées. Si une te paraît
  maladroite, signale-la à part, mais ne la compte pas comme un défaut.
- **N'essaie pas de te connecter pour de bon.** On teste les moments où ça
  ACCROCHE, pas le parcours réussi.
- **Ne conclus pas d'un silence qu'il est anormal** avant d'avoir cliqué une
  fois sur la page (le navigateur bloque le son sinon).
