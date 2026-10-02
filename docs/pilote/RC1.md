# JULABA PILOTE RC1 — la définition de « assez bon pour livrer »

**Jalon déclaré par Patrick, 02/10/2026.**

> C'est ce qui manquait : une définition de « assez bon pour livrer ». Sans
> elle, on peut continuer six semaines et toujours trouver une amélioration
> supplémentaire.

**À partir d'ici, on ne corrige plus que les bloquants terrain.** Tout le reste
part dans [`POST-PILOTE.md`](POST-PILOTE.md) — **même quand on sait déjà
comment l'améliorer.**

---

## La question qui tranche

> **Est-ce que ce défaut empêche une marchande de VENDRE, d'ENCAISSER, de
> RETROUVER SON PANIER, ou de CROIRE LE MONTANT AFFICHÉ ?**
>
> Non → `POST-PILOTE`. Oui → correction avant pilote.

**Ce n'est pas une nouvelle définition de « bloquant ».** C'est la lecture
terrain des trois cases de `docs/terrain/CLOTURE-CAISSE-VOCALE.md` §5, qui
reste **la seule source** :

- il fait **écrire un montant faux** (ou perdre une vente) ;
- il fait **dire un montant faux** à une marchande qui ne lit pas ;
- il **empêche** l'un des sept gestes d'aboutir.

Deux listes de « bloquant » qui divergeraient seraient pires que pas de liste.
S'il faut un jour changer la règle, on change la §5 — pas ce document.

---

## Les huit critères de sortie

Un APK devient **version candidate stable** quand les huit tiennent **sur le
terrain**, pas sur le banc :

| | critère |
|---|---|
| 1 | la **vente tactile** fonctionne |
| 2 | la **vente vocale** fonctionne sur les phrases essentielles |
| 3 | l'**encaissement** donne le bon montant |
| 4 | **PAN-01** et **P0.1** tiennent |
| 5 | **aucune perte d'argent** |
| 6 | **aucun crash bloquant** |
| 7 | l'app **démarre** et on peut **se connecter** |
| 8 | **hors-ligne / reconnexion** ne cassent pas la caisse |

Les critères 1 à 5 sont de l'argent : ils se prouvent, ils ne s'estiment pas.

---

## Ce qu'on accepte EXPLICITEMENT pour le pilote

Écrit ici pour qu'aucune de ces lignes ne redevienne un chantier par surprise :

- **la voix n'est pas parfaite** ;
- **elle peut attendre 2,8 s** après avoir fini de parler ;
- **il reste des améliorations de bruit** à faire ;
- **Maestro n'a pas 10 flows verts** — il en a 1, et c'est suffisant ;
- **certains écrans sont encore gros** ;
- **TanStack Query, Dexie, XState et les autres restent post-pilote**.

Accepter n'est pas ignorer : chacune de ces lignes a son entrée datée dans
`POST-PILOTE.md`.

---

## Le régime, jusqu'au pilote

**Interdit :**

- aucun nouveau chantier OSS ;
- aucun refactoring d'architecture ;
- aucune amélioration UX non bloquante ;
- aucune nouvelle expérimentation pour optimiser un réglage qui marche.

**Autorisé :** les **P0 / P1 bloquants** au sens de la question ci-dessus, et
rien d'autre.

**Et ça contraint l'agent autant que l'équipe** — c'est la même contrainte que
la §5 de la clôture : un défaut non bloquant trouvé en chemin se **consigne**
et ne se corrige pas. Même petit. Même si ça prend cinq minutes. C'est la
dix-neuvième fois que cette phrase est écrite dans ce dépôt, et c'est la
raison pour laquelle on n'avait jamais fini.

---

## Où en est la candidate

**APK `ca2e817`** — construit le 02/10/2026, run #54 (187,7 Mo).
Contient **MIC-02A** (`SILENCE_FIN_MS` 2200) et **MIC-02B** (seuil adaptatif).
Sans voix dioula, sans montants dioula.

**Statut : CANDIDATE RC1** — validé par Patrick le 02/10/2026. Ce n'est plus
« un APK encore en amélioration ». On ne cherche plus ce qu'on peut améliorer :
on cherche **uniquement** si l'un des huit critères de sortie échoue de manière
bloquante.

S'il n'y a **aucun défaut bloquant**, on fige — **même s'il existe encore un
meilleur réglage possible**, et on sait déjà qu'il en existe un : voir
`POST-PILOTE.md`, entrées MIC-02C et MIC-02D.
