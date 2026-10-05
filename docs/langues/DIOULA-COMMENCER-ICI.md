# Lancer le dioula — une langue, trois lots

Une seule langue à la fois. Le dioula d'abord : c'est la plus parlée sur les
marchés d'Abidjan.

Fichier de travail : **`docs/langues/DIOULA-A-TRADUIRE.csv`** — 514 lignes,
une colonne `DIOULA` à remplir, triées par lot.

---

## Ce que l'ingénierie a déjà fait, et qui n'est pas à refaire

- L'emplacement du dioula (`locales/dyu-ci/`) **existe**, vide.
- Tant qu'il est vide, **tout retombe sur le français** et l'application se
  comporte exactement comme aujourd'hui. Chaque repli est écrit au journal.
- Ajouter une langue est un **ajout de données**. Aucun composant métier ne
  connaît un code de langue, aucune logique ne change.

**Rien à coder pour commencer. Tout ce qui manque est de la langue.**

---

## Les trois lots, dans cet ordre

### LOT 1 — ARGENT · 124 phrases · à valider par un locuteur, jamais deviné

Les montants, les totaux, la monnaie à rendre, la relecture avant validation
(« Elle doit 4 000. Elle t'a donné 5 000. Tu rends 1 000. **Je valide ?** »).

**Règle dure : tant que ce lot n'est pas validé, la partie financière continue
de répondre en français.** C'est voulu, c'est dans le moteur, et ça protège la
marchande : une langue incomplète ne peut pas fausser un compte.

⚠️ **Les `{variables}` se recopient telles quelles** — `{total}`, `{recu}`,
`{monnaie}`. Ce sont les nombres réels de la vente. Les traduire ou les
déplacer casserait la phrase.

### LOT 2 — DÉCOR · 364 phrases · traduisibles librement

Boutons, questions, encouragements, messages d'aide. Aucun risque financier.
C'est ce qui donne à Tantie sa voix et sa chaleur, et ça peut avancer **en
parallèle** de la validation du lot 1.

### LOT 3 — ÉCOUTE · 26 intentions · ce que la marchande DIT

Pas des phrases à prononcer : les façons de dire une même chose, pour que le
moteur reconnaisse. Il en faut **plusieurs par intention** — une marchande ne
dit pas « oui valide » de la même façon deux fois.

Colonne `DIOULA_VARIANTES_STT`, séparées par `|`. Forme normalisée : minuscules,
sans accents, sans ponctuation.

---

## Le mur : les nombres

**48 nombres sur 110 n'ont aucun mot direct** — ils se composent
(« vingt-deux », « trois mille sept cents »).

**Règle arrêtée par Patrick : aucune langue locale n'hérite automatiquement de
la règle de composition française.** Le dioula ne compose pas comme le français.

Donc, pour chaque nombre, il faut **déclarer explicitement** l'une des trois :

1. une **forme lexicale** (un mot propre) ;
2. une **règle de composition validée** par un locuteur ;
3. l'**absence de couverture** — et alors ce nombre reste dit en français.

**Jamais d'invention automatique.** C'est la dette `LANG-01`, ouverte.

Jùlaba est une caisse : **les nombres sont l'argent**. Une caisse qui annonce
un montant faux est pire qu'une caisse muette. C'est pourquoi le lot 1 ne
s'active pas sans cette validation.

---

## Qui fait quoi — arbitrage du 20/09/2026

| | Ingénierie | Manus |
|---|---|---|
| Fournit | identifiants, catalogue, moteur, validateurs, le CSV | **toutes les traductions**, les variantes d'écoute, la validation linguistique, **toute la voix** : choix des voix, enregistrements, prosodie |
| Ne touche jamais | le contenu linguistique — **aucune traduction inventée** | la logique métier, la machine d'encaissement, les gates |

---

## L'ordre que je recommande

1. **Lot 2 (décor)** pour entendre le dioula tout de suite, sans risque.
2. **Les nombres**, avec un locuteur, devant une vraie vendeuse.
3. **Lot 1 (argent)** seulement après, et validé à l'oreille.
4. **Lot 3 (écoute)** en dernier : il se règle mieux une fois qu'on a entendu
   de vraies marchandes parler à l'application.

Une vendeuse qui écoute et valide vaut plus que dix relectures sur écran.
