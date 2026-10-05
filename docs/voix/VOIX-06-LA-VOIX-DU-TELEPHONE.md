# « La voix de James Park » — c'était Genspark, donc la nôtre

**26/09/2026.** Ce document a d'abord dit le contraire. Il est corrigé ici, et
l'erreur est gardée parce qu'elle est instructive.

## Ce que Patrick a dit, et ce que j'en ai fait

> « Écrans 1 et 2 avaient la voix je pense enregistrée. Mais à partir de
> l'écran de vente, on avait la voix de James Park qui était vraiment très
> adaptée et très bien. »

J'ai cherché « james » et « park » dans le dépôt, n'ai rien trouvé, et j'ai
conclu : c'est une voix du système, choisie par `speechSynthesis`. J'ai écrit
tout un document là-dessus, avec une règle de choix, un trou dans un filtre de
prénoms, une dette ouverte.

**C'était faux.** « James Park » était une transcription de **Genspark** —
l'outil qui a produit le lot A. La voix qu'il entendait était **la nôtre**.

## Pourquoi je me suis trompé, et ce que ça enseigne

J'ai traité une transcription approximative comme une donnée. Le nom n'était
pas dans le dépôt : au lieu d'en conclure « je n'ai pas compris ce mot », j'en
ai conclu « ce mot désigne autre chose », et j'ai construit une explication
cohérente par-dessus.

Une explication cohérente n'est pas une explication vraie. La bonne réponse
était de demander, pas de déduire — c'est exactement la règle du projet :
**information manquante → on demande, on n'invente pas.**

## Ce que le vrai retour signifie

**C'est une validation.** La voix du lot A plaît sur le terrain, et sur le
parcours qui compte. C'est la première fois qu'on a un avis d'usage sur elle,
et il est bon. Le lot B peut être commandé avec la même direction, en
confiance.

## Ce qui reste à établir

Quatre clips du lot A seulement sont joués par une phrase écrite en dur dans
le code — `login-17`, `login-24`, `login-35`, `login-36` — et **tous sur
l'écran de connexion**. Aucun sur l'écran de vente.

Vingt-quatre autres ont leur texte au catalogue, mais y figurer ne suffit pas :
encore faut-il que le code dise ce texte-là.

Donc **on ne sait pas encore quel clip il a entendu sur l'écran de vente**.
Trois possibilités, et le journal les départage :

1. c'était un clip de connexion, entendu juste avant d'arriver à la vente ;
2. c'était la synthèse native d'Android, prise pour la voix du lot A ;
3. un clip du lot A est bien joué là-bas par un chemin que je n'ai pas mesuré.

```js
JSON.parse(localStorage.getItem('julaba_journal_voix') || '[]')
  .filter(e => e.type === 'TTS_MOTEUR').slice(-20)
```

Les entrées portent l'URL du clip. Le nom du fichier tranchera.

## Et la voix diffère bien entre Render et l'APK

Ce point-là tient toujours, et il est indépendant : sur Render c'est
`speechSynthesis` du navigateur qui assure le repli ; sur l'APK c'est la
synthèse native d'Android. Deux moteurs, deux voix — pour tout ce qui n'a pas
de clip. C'est une raison de plus de finir le lot B.
