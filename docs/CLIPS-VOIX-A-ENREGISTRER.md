# Clips de voix à enregistrer — ce qui manque, et pourquoi

> Écrit le 16/09/2026, après une séance sur appareil réel.

## Le constat qui rend ce document nécessaire

**Dans l'APK, la voix de synthèse ne produit aucun son. Seuls les clips
enregistrés s'entendent.** Établi par trois recoupements sur le téléphone de
Patrick, le même jour :

| Écran | Clip enregistré ? | Tata parle ? |
|---|---|---|
| Accueil | non (fichier absent) | **non** |
| Onboarding | non (fichier absent) | **non** |
| « Ton numéro » | non (phrase sans clip) | **non** |
| « Ton code secret » | oui — `ui-035.mp3` | **oui** |

Or tout le code est écrit en supposant le contraire. `onboardingVoix.ts` dit :
*« Tant qu'un clip n'est pas encore fourni, on retombe sur la voix de secours
FR »*. **Ce filet n'existe pas sur Android.** Conséquence directe : toute
phrase sans clip est un silence, et une marchande qui ne lit pas se retrouve
devant un écran muet.

Tant que ce point n'est pas tranché (voir « Question ouverte » en fin de
document), **écrire une nouvelle phrase sans enregistrer son clip revient à
n'écrire rien du tout**.

## 1 — Les 8 clips d'introduction (priorité haute)

Le code les attend déjà, sous ces noms exacts. Leur absence est la cause du
silence des deux premiers écrans — les tout premiers qu'une marchande voit.

À déposer dans `frontend_src/public/voix/tata/`.

| Fichier | Texte à dire |
|---|---|
| `intro-accueil.mp3` | Bonjour ! Moi, c'est Tata Nanti Lou. Je serai avec toi pour vendre, compter ton argent et faire grandir ton commerce. Beaucoup de commerçantes travaillent déjà avec moi. Maintenant, c'est ton tour. On commence ? |
| `intro-retour.mp3` | Re-bonjour ! On y va. |
| `intro-1.mp3` | Je serai avec toi chaque jour dans ton commerce. On est ensemble. |
| `intro-2.mp3` | Tu vends. J'enregistre. Je compte. Tu sais toujours combien tu gagnes. |
| `intro-3.mp3` | Tu peux me parler, ou utiliser le clavier. C'est toi qui décides. |
| `intro-4.mp3` | Tout est prêt. Ouvrons ta boutique. |
| `intro-mode.mp3` | Comment préfères-tu travailler avec moi ? Le plus simple : laisse-moi choisir, je m'adapte à toi. Sinon : je sais lire et écrire, ou je lis un peu, ou je préfère parler. Il n'y a pas de mauvais choix. |
| `intro-bravo.mp3` | Bravo ! Nous sommes prêtes. Ouvrons ta boutique. |

## 2 — Les dix chiffres (priorité haute)

Sans eux, la **relecture du numéro dicté** reste muette. C'est le seul
contrôle dont dispose quelqu'un qui ne lit pas pour vérifier ce que Tata a
compris — le défaut remonté le 16/09 (« quand je me trompe en dictant, il
continue sans me donner aucune option vocale de le modifier »).

Dits **détachés**, comme on épelle un numéro — pas « soixante-dix » mais
« sept », « zéro ».

| Fichier | Texte à dire |
|---|---|
| `chiffre-0.mp3` | zéro |
| `chiffre-1.mp3` | un |
| `chiffre-2.mp3` | deux |
| `chiffre-3.mp3` | trois |
| `chiffre-4.mp3` | quatre |
| `chiffre-5.mp3` | cinq |
| `chiffre-6.mp3` | six |
| `chiffre-7.mp3` | sept |
| `chiffre-8.mp3` | huit |
| `chiffre-9.mp3` | neuf |

> Le code joue aujourd'hui la suite des chiffres par synthèse
> (`chiffresEpeles()` dans `LoginPassword.tsx`). Une fois ces dix fichiers
> déposés, il faudra les enchaîner à la place — petit travail de code, à faire
> quand les clips existent, pas avant.

## 3 — L'écran du nouveau code (priorité moyenne)

Le changement de code forcé à la première connexion. Il emprunte aujourd'hui
`ui-035.mp3` (« Entre ton code secret à 4 chiffres »), ce qui est compris mais
imprécis : on ne dit pas qu'il s'agit de **choisir** un code, ni qu'il faut le
**redire**.

| Fichier | Texte à dire |
|---|---|
| `code-choisir.mp3` | Choisis ton nouveau code, celui que tu utiliseras tous les jours. |
| `code-redire.mp3` | Redis le même code, pour être sûre. |
| `code-different.mp3` | Les deux codes ne sont pas les mêmes. Choisis à nouveau ton code. |

## Comment enregistrer

Mêmes conditions que les 137 clips existants, sinon la voix change d'un écran
à l'autre et la marchande entend deux personnes différentes :

- même voix, même pièce, même micro ;
- silences coupés au début et à la fin ;
- volume harmonisé à **-16 LUFS** ;
- débit ralenti d'environ **10 %** ;
- format **MP3**, nom de fichier **exact** (le code cherche ce nom précis).

Le service worker pré-cache automatiquement tout `public/voix/tata/*.mp3` :
une fois déposés, les clips fonctionnent hors ligne sans autre réglage.

## Question ouverte, à trancher avant d'aller plus loin

**Pourquoi la voix de synthèse est-elle muette dans l'APK ?** Deux causes
possibles, deux conséquences opposées :

1. **Aucune voix française installée sur l'appareil.** Se règle côté téléphone,
   et le filet de secours redevient vrai — on peut continuer à écrire des
   phrases sans clip.
2. **La WebView n'expose pas de synthèse utilisable.** Alors le filet
   n'existera jamais, et il faut **cesser d'écrire du code qui compte dessus** :
   chaque phrase parlée devient un livrable studio.

La ligne `VOICES` du rapport de diagnostic (5 tapes sur le coin haut-gauche de
l'écran de connexion → « 🐞 Rapport de test ») tranche entre les deux. C'est
une décision d'architecture, pas un réglage d'écran.
