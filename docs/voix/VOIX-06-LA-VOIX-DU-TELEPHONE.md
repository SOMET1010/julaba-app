# « La voix de James Park » — ce qu'elle est, et pourquoi on ne peut pas compter dessus

**26/09/2026.** Retour de Patrick après un test : écrans 1 et 2 en voix
enregistrée, puis « à partir de l'écran de vente, la voix de James Park, qui
était vraiment très adaptée et très bien ».

## Ce nom n'est pas dans le dépôt

Cherché partout : aucun `james`, aucun `park`. Ce n'est donc ni un clip, ni un
identifiant que nous aurions choisi.

C'est **une voix du téléphone**. Quand aucun clip ne correspond, l'application
demande au système la liste de ses voix (`speechSynthesis.getVoices()`) et en
retient une, selon cette règle (`services/elevenlabs.ts`) :

1. le dialecte d'abord — `fr-CI` avant `fr-FR` avant n'importe quel `fr-*` ;
2. puis une voix de FEMME, parce que Tantie Nanti Lou en est une ;
3. et le choix est mémorisé, pour que toute l'appli parle de la même voix.

## Le compliment est une bonne nouvelle. Et un avertissement.

Si cette voix sonne juste, tant mieux — mais **elle n'est pas la nôtre**. Elle
appartient à ce téléphone-là. Sur un autre appareil, une autre marque, une
autre version d'Android, la marchande entendra autre chose : une autre voix,
un autre accent, parfois aucune voix française du tout.

C'est exactement la raison d'être du lot A : une voix qu'on choisit, qui voyage
avec l'application, et qui ne dépend d'aucun réglage de téléphone.

**Ce qui est encourageant, en revanche** : ce retour dit qu'une voix de
synthèse PEUT sonner juste sur ce parcours. C'est la première fois qu'on
l'entend. Si on sait laquelle c'est, elle devient une référence utile pour
diriger la voix du lot B.

## Comment savoir exactement laquelle c'est

Le journal la nomme déjà — `vtrace.ttsVoixNavigateur(voix, lang, rate, pitch)`.
Sur le téléphone qui a produit ce test :

```js
JSON.parse(localStorage.getItem('julaba_journal_voix') || '[]')
  .filter(e => e.type === 'TTS_VOIX_NAVIGATEUR').slice(-5)
```

On y lira le nom exact, la langue servie, le débit et la hauteur.

## Un trou dans le filtre, relevé au passage — OUVERT

Le choix « voix de femme » repose sur une liste de PRÉNOMS :

```
FEMME : amelie, audrey, aurelie, virginie, julie, marie, celine, lea,
        manon, chloe, sandrine, female, femme, google français…
HOMME : thomas, nicolas, paul, daniel, male, homme, guillaume, mathieu
```

Ce sont des prénoms français. Une voix masculine portant un nom étranger —
« James », précisément — ne figure dans aucune des deux listes : elle échoue au
test « femme », puis passe le repli « pas un homme », et devient la voix de
Tantie.

**On ne corrige rien pour l'instant, et c'est délibéré** : la voix entendue a
été jugée bonne. Changer le filtre la ferait disparaître sans qu'on sache par
quoi elle serait remplacée — on perdrait un résultat qui plaît pour réparer un
défaut théorique.

À trancher quand on saura son nom : soit elle est vraiment féminine et la
liste s'enrichit, soit elle ne l'est pas et c'est la règle « Tantie est une
femme » qu'il faut revoir, pas la liste.
