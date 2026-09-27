# Lots B et C — 15 clips à produire, en une fois

**Suite du lot A.** Mêmes consignes que
`docs/voix/PROMPT-AGENT-GENERATION-VOIX.md` : **même voix, même format, même
livrable**. Seul le contenu change.

Joindre les deux CSV :
- `docs/voix/LOT-B-A-ENREGISTRER.csv` — 8 lignes, écran de connexion
- `docs/voix/LOT-C-A-ENREGISTRER.csv` — 7 lignes, parcours d'ajout au stock

---

## Ce qu'on produit

**15 fichiers `.wav`** : `login-38` → `login-45`, et `stk-10` → `stk-16`.

## Lot B — l'écran de connexion (8 clips)

L'écran fait `parle(error)` sur chacun de ses messages d'erreur, mais cette
porte ne dit que ce qui a une clé — et **treize messages n'en avaient aucune**.
L'écran vibrait, affichait un texte, et se taisait. Sur l'écran qui connecte,
devant quelqu'un qui ne sait pas lire.

`login-38/39/40` remplacent trois messages de technicien :

| Avant | Maintenant |
|---|---|
| « Réponse inattendue. Réessaie dans un instant. » | « Ça n'a pas bien répondu. Attends un petit moment, puis reprends. » |
| « Réponse serveur invalide » | « Ça n'a pas marché comme il faut. Reprends depuis le début. » |
| « Préfixe invalide » | « Ce numéro-là ne commence pas comme un numéro d'ici. Regarde bien le début. » |

`login-41` → `login-45` remplacent **cinq clips prototypes en voix Callirrhoe**,
aujourd'hui éteints en production : ce sont les consignes d'entrée, donc les
toutes premières phrases qu'une marchande entend de l'application.

**`login-38` et `login-39` se ressemblent — ne les dis pas pareil.** Le geste
diffère : dans l'une on **retente**, dans l'autre on **recommence**.

## Lot C — le parcours d'ajout au stock (7 clips)

Nouveau. Trois retours de terrain du 26/09 sur Render, tous de la même
famille : **l'écran affiche, et personne ne dit**.

- Les trois questions du parcours (« Qu'est-ce que tu vends ? », puis l'unité,
  puis le prix) étaient **écrites, jamais dites**. Le parcours n'émettait que
  des accusés de réception : elle savait qu'on l'écoutait, pas quoi dire.
- Le grand bouton « C'est bon » était **grisé et muet** : elle appuie, rien ne
  bouge, rien ne le lui dit.
- Le micro qui lâche annonçait sa panne **par le seul canal qu'elle ne peut pas
  lire**.

Ces sept phrases sont ce qui comble ces silences. Elles sont aujourd'hui dites
en voix de synthèse ; ce lot leur donne la vraie voix.

### Trois points de direction, propres à ce lot

**`stk-11` et `stk-12` ne sont pas le même refus — surtout pas le même ton.**
`stk-11`, elle n'a rien tapé : on l'invite. `stk-12`, elle a tapé une lettre —
**elle a presque fini**. Si `stk-12` sonne comme un reproche ou comme un
retour au départ, la phrase rate : le geste attendu est de CONTINUER, pas de
recommencer. Dis-la comme on encourage quelqu'un à finir son mot.

**`stk-14` est une phrase d'argent.** « Il manque le prix. Tape-le. » Nette,
sans hésitation, sans sourire de politesse. C'est le moment où un zéro entrerait
en caisse et fausserait chaque vente.

**`stk-16` : ne prononce pas les guillemets.** Le texte porte « Touche
« Ajouter un produit ». » — on doit entendre *Touche Ajouter un produit*, le
nom du bouton détaché par une courte respiration, pas par des guillemets lus.

## Ce que ces clips ne feront PAS tout seuls

L'appariement d'un clip se fait **par le TEXTE**, jamais par le nom du fichier.
Un fichier livré et rangé au bon endroit ne joue pas pour autant : il faut
qu'une entrée le déclare, et que le texte déclaré corresponde **au mot près** à
ce que le code dit. Livrer les WAV ne suffit donc pas — c'est un travail de
dépôt qui suit, côté code.

C'est aussi pourquoi **le texte à enregistrer ne doit pas être retouché**, même
d'une virgule : un mot d'écart, et le clip reste muet sans aucune erreur.
