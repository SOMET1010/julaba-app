# Lot B — trois clips à produire

**Suite du lot A.** Mêmes consignes que
`docs/voix/PROMPT-AGENT-GENERATION-VOIX.md` : même voix, même format, même
livrable. Seul le contenu change.

Joindre `docs/voix/LOT-B-A-ENREGISTRER.csv` (3 lignes).

---

## Ce qu'on produit

**3 fichiers `.wav`** : `login-38`, `login-39`, `login-40`.

## Pourquoi ces trois-là

L'écran de connexion fait `parle(error)` sur chacun de ses messages d'erreur.
Mais cette porte ne dit que ce qui a une clé — et **treize messages n'en
avaient aucune**. L'écran vibrait, affichait un texte, et se taisait. À une
marchande qui ne sait pas lire, sur l'écran qui connecte.

Sept ont été fermés avec des clips du lot A, sans rien enregistrer. Deux ne
doivent pas parler. Un reste en arbitrage. **Ces trois-là n'avaient aucun
équivalent** : il a fallu les écrire.

Ce qu'elles remplacent :

| Avant | Maintenant |
|---|---|
| « Réponse inattendue. Réessaie dans un instant. » | « Ça n'a pas bien répondu. Attends un petit moment, puis reprends. » |
| « Réponse serveur invalide » | « Ça n'a pas marché comme il faut. Reprends depuis le début. » |
| « Préfixe invalide » | « Ce numéro-là ne commence pas comme un numéro d'ici. Regarde bien le début. » |

Trois messages de technicien, devant quelqu'un qui n'a pas à savoir ce qu'est
un serveur, une réponse ou un préfixe.

## Deux points de direction, propres à ce lot

**`login-38` et `login-39` se ressemblent — ne les dis pas pareil.** Le geste
diffère : dans l'une on **retente**, dans l'autre on **recommence**. Que
l'oreille entende cette différence : la première peut être posée, rassurante ;
la seconde plus nette, parce qu'elle demande un vrai recommencement.

**`login-40` ne gronde pas.** Une marchande qui tape un mauvais numéro ne fait
pas une faute : elle s'est trompée de chiffre, ou elle dicte le numéro de
quelqu'un d'autre. Le ton reste celui d'une aînée qui montre où regarder, pas
d'une machine qui refuse.

## Format et livrable — rappel

`.wav` PCM 16 bits, **24 000 Hz**, mono, **−16 LUFS** intégré, crête ≤ −1 dBTP,
silences coupés ≤ 100 ms. Même voix que le lot A. Elle ne se présente jamais.

Livre les 3 `.wav` **et** le CSV `fichier,texte_exact_prononce` avec ce qui a
été réellement prononcé, mot pour mot. Sans lui, rien ne se branche : un mot
d'écart et le clip n'est jamais joué, sans erreur ni trace.

---

## Ajout du 26/09 — cinq consignes de plus (`login-41` → `login-45`)

**Pourquoi elles s'ajoutent.** Le banc web a relevé ceci : sur le MÊME écran,
« Entre ton code secret à quatre chiffres » sort en **voix de synthèse du
navigateur — Microsoft Julie, fr-FR** — puis, quelques secondes plus tard,
`login-21` sort en voix de Tantie.

Une voix de Windows métropolitaine sur l'écran d'entrée d'une application
ivoirienne, suivie d'une voix du marché. Personne n'avait choisi ça : c'est ce
qui reste quand les six clips d'origine sont éteints en production (ils sont
marqués `prototype`, non validés) et que le texte retombe sur la synthèse.

**Ce qu'on enregistre : exactement les textes actuels, mot pour mot.** Ils
disent plus que le script (« Les ronds en haut vont se remplir » — c'est ce
qui dit à une marchande que ça marche), et on ne les remplace pas. On leur
donne seulement une voix.

Même consigne que pour les trois premières : ne reformule rien, et renvoie ce
qui a été réellement prononcé.

**Le lot B passe donc à 8 fichiers.**
