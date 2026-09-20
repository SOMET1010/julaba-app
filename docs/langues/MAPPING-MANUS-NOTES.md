# Correspondance corpus Manus → identifiants Claude — notes de lecture

**Fichier renseigné :** `docs/langues/CLAUDE-ID-MAPPING-RENSEIGNE.csv`
**Source :** `CLAUDE-ID-MAPPING-TEMPLATE.csv` du paquet Manus
(`manus/refonte-ui-ux-voix@2e8fc04`, `docs/langues/manus-draft-2026-09-20`).

**Ce qui a été fait, et rien d'autre.** Seules les trois colonnes `CLAUDE_ID`,
`MAPPING_STATUS` et `MAPPING_NOTE` ont été remplies. Les 168 clés provisoires, leur ordre
et toutes les autres colonnes sont **inchangés, octet pour octet** (vérifié : 0 colonne
source modifiée). Le corpus n'a pas été recréé, aucune traduction n'a été écrite.

**Ce qui n'a PAS été fait, et ne le sera pas avant votre feu vert.** Rien n'est importé
dans le moteur. Aucun mot, aucune phrase, aucune variante de ce corpus n'entre dans le
catalogue, le lexique ou la grammaire tant que cette correspondance n'est pas arrêtée et
que les validations linguistiques natives ne sont pas terminées.

## Résultat

| État | Lignes | Sens |
|---|---|---|
| `MAPPE` | 104 | Correspondance directe et sans réserve |
| `COMPOSE_EN_FR` | 48 | Aucun mot français direct : notre analyseur compose |
| `HORS_TABLE` | 8 | Unité absente de notre table canonique |
| `A_SCINDER` | 4 | La ligne mélange écoute et parole |
| `MAPPE_FRAGMENT` | 2 | Correspond à une partie d'une de nos phrases |
| `A_ARBITRER` | 1 | Demande une décision avant toute traduction |
| `SANS_EQUIVALENT` | 1 | Aucune clé chez nous |

159 des 168 lignes portent un identifiant ou un chemin. Les 9 sans valeur sont les 8 unités
hors table et la ligne sans équivalent.

## Convention de chemin

Les 153 lignes de lexique n'ont pas d'identifiant nommé chez nous : le lexique est une
table structurée. Le chemin est donc la clé stable.

- `lexique.produits.<canonique>` — par exemple `lexique.produits.attiéké`
- `lexique.unites.<canonique>` — par exemple `lexique.unites.kg`
- `lexique.unitesDites['unité']` — la tournure dite, « à l'unité »
- `lexique.nombres.mots#<valeur>` — le mot du nombre, désigné par sa **valeur**, qui ne
  dépend d'aucune langue
- `lexique.nombres.echelles.cent`, `.cents`, `.mille`
- `lexique.monnaie.parlee`, `lexique.monnaie.symbole`

Aucun identifiant nouveau n'a été inventé.

## Les huit points qui demandent une décision

1. **Liste blanche de validation.** `PROVISIONAL_FRM_INTENT_03` propose « Oui, tu peux
   valider. » La liste blanche française est **fermée** à huit réponses. Cette phrase n'y
   est pas. Elle n'entre ni en français ni dans une autre langue sans validation native et
   sans le drapeau finance.
2. **« Je valide ? » n'existe pas seule.** Chez nous la question est soudée à la relecture
   des trois nombres. Produire un clip isolé « Je valide ? » casserait la règle : aucune
   phrase vocale n'écrit de l'argent sans confirmer exactement l'état financier qu'elle
   vient de relire.
3. **Quatre lignes mélangent écoute et parole** (`INTENT_05`, `11`, `12`, `15`). Les
   phrases dites et les phrases écoutées ne se traduisent pas de la même façon : une
   variante d'écoute doit couvrir plusieurs manières de dire, une phrase dite n'en a
   qu'une. À scinder avant traduction.
4. **« Vérifie bien le compte » n'a pas d'équivalent.** Créer cette clé suppose de décider
   si Tantie peut inviter à vérifier sans relire les montants. En l'état, la doctrine dit
   non.
5. **48 nombres sur 110 n'ont pas de mot français direct** : 22 à 29, 32 à 39, et ainsi de
   suite, plus les centaines de 200 à 900. Notre analyseur les compose. Une langue qui ne
   compose pas de la même manière a besoin soit d'un mot propre, soit d'une règle de
   composition déclarée. C'est le point le plus lourd du corpus.
6. **Huit unités sont hors de notre table** : botte, bidon, sachet, paquet, carton, caisse,
   bouteille, panier. Aujourd'hui elles sont conservées telles que la marchande les dit.
   Deux portent une homonymie à trancher : « caisse » désigne aussi le module
   d'encaissement, « panier » désigne aussi le panier de vente.
7. **Deux produits de notre catalogue sont absents du corpus** : bière et biscuit. **Trois
   unités aussi** : bassine, pièce, boîte.
8. **Deux doublons** : `INTENT_13` et `INTENT_14` sont déjà couverts par des variantes
   existantes de la même intention que `INTENT_02`.

## Ce que la correspondance ne dit pas

Elle ne dit rien de la justesse linguistique : les cellules de traduction sont vides dans
la plupart des langues, et c'est honnête. Elle ne dit rien non plus de l'accord
grammatical ni des pluriels, qui restent du code français aujourd'hui. Elle n'a été
éprouvée par aucun test : c'est un document, pas une entrée dans le moteur.
