# Deux règles de voix dans le même code — mesuré le 25/09/2026

L'agent de test a relevé : **« toutes les phrases que j'ai entendues sont lues
par la voix de synthèse du navigateur (Microsoft Julie), aucune par les clips
enregistrés de Tata. »**

Je lui avais dit que c'était interdit. **C'est plus subtil que ça.**

## Ce que le code dit, aux deux endroits

**`hooks/useVoiceCore.ts`, dans `ttsSpeak`** :

> « Choix B : clip Tata enregistré ou texte seul. **Jamais de voix
> navigateur.** »

Là, si aucun clip ne correspond à la phrase, **rien n'est dit**. C'est ce qui
rend « Je n'ai pas compris » muet.

**`services/elevenlabs.ts`, dans `speakBrowser`** :

> « la voix intégrée du navigateur (`speakBrowser`), **filet de dernier
> recours** quand ni un clip de Tata ni la synthèse native ne peuvent
> répondre »

Là, la voix du navigateur parle. Elle est appelée par `audioManager.ts`.

**Les deux sont assumées et documentées. Elles se contredisent.**

## Ce que ça donne en pratique

| Chemin | Ce qui parle |
|---|---|
| `useVoiceCore.ttsSpeak` (la caisse vocale) | un clip, ou **rien** |
| `audioManager` → `speakBrowser` | la voix du téléphone / du navigateur |

Sur le **web**, la synthèse native (`nativeTts`, l'APK) n'existe pas : tout ce
qui passe par `audioManager` tombe donc sur Microsoft Julie. Sur l'**APK**, la
synthèse native répond d'abord — ce que l'agent a entendu n'est pas ce que la
marchande entendra.

## Pourquoi ça compte

Ce n'est pas un défaut de code : les deux chemins font ce qui est écrit. C'est
une **question sans réponse** : *Tantie a-t-elle le droit de parler avec une
voix qui n'est pas la sienne ?*

- **Si oui**, alors `ttsSpeak` a tort de se taire, et « Je n'ai pas compris »
  n'aurait jamais dû être muet — il suffisait de laisser le filet jouer.
- **Si non**, alors `speakBrowser` ne devrait pas exister, et il faut accepter
  le silence quand un clip manque — donc enregistrer tous les clips.

Aujourd'hui les deux réponses coexistent, et **ce qu'une marchande entend
dépend du chemin qu'a pris la phrase** — pas d'une décision.

## Ce que ça change pour le clip `ui-138`

La fiche d'enregistrement (`FICHE-ENREGISTREMENT-UI-138.md`) part du principe
que le silence est la règle. Si Patrick tranche « le filet a le droit de
parler », alors le clip devient un confort, plus une nécessité : la phrase
serait dite tout de suite, avec une voix de synthèse, en attendant la vraie.

## Décision attendue de Patrick

Trois voies :

1. **Le silence reste la règle.** `speakBrowser` est retiré. Toute phrase sans
   clip est muette — il faut alors enregistrer les clips manquants avant le
   terrain.
2. **Le filet a le droit de parler**, partout et de la même façon. `ttsSpeak`
   cesse de se taire ; une phrase sans clip est dite par la synthèse.
3. **Le filet parle, mais seulement hors de l'argent.** Les montants et les
   relectures restent réservés à la vraie voix ; le reste est dit par défaut.

Chacune touche le comportement vocal, donc les fichiers sous gel VOICE-01.
Aucune n'est prise ici.
