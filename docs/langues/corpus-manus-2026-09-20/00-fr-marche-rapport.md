# Corpus préparatoire — français oral de marché ivoirien

**Statut global : DRAFT.** Ce livrable est un corpus éditorial indépendant. Il ne modifie ni le moteur, ni les règles d’argent, ni les identifiants produit ou intention. Chaque clé du CSV commence par `PROVISIONAL_`; elle est explicitement temporaire et remappable lorsque le futur catalogue Claude sera disponible.

## Couverture livrée

Le fichier contient **168 lignes** : 15 intentions financières prioritaires, 101 nombres de 0 à 100, 8 centaines supplémentaires (200 à 900), mille, 17 unités ou dénominations demandées et 26 produits explicitement nommés dans la mission. La ligne `cent` est déjà couverte par la série 0–100; les lignes « centaines » supplémentaires commencent donc à 200. La mission écrit « etc. » après sa liste de produits; aucun produit non nommé n’a été ajouté afin de ne pas inventer de périmètre métier.

| Élément | Lignes | Décision |
|---|---:|---|
| Intentions prioritaires | 15 | Formulations courtes et orales; les gabarits conservent exactement `{montant}`, `{recu}`, `{monnaie}` et `{total}`. |
| Nombres | 110 | 0–100, puis 200–900 et mille; les variantes servent à la reconnaissance orale, sans créer de règle de calcul. |
| Unités et monnaie | 17 | « franc » et « FCFA » sont distincts afin de couvrir les deux dénominations écrites ou dites. |
| Produits nommés | 26 | Les formes singulier/pluriel et quelques formes d’usage sont proposées seulement dans `STT_VARIANTS`. |

## Décisions éditoriales

Le français de sortie privilégie une parole directe entre vendeuses : « Elle doit combien ? », « Tout ça, c’est combien ? » et « Tu as vendu quoi ? ». Le ton est courant, bref et compréhensible sans lecture soutenue. Aucun nouchi artificiel, formule administrative ou promesse de résultat financier n’a été ajouté.

Les formulations d’argent séparent la parole de l’action métier. Par exemple, « Oui, tu peux valider » exprime l’accord oral, mais ne définit ni n’exécute une validation. De même, « Encaisse ça » reste une commande linguistique. Les annotations de contexte rappellent que la confirmation, l’annulation, le calcul et l’encaissement effectif restent sous le contrôle du moteur existant.

Les champs `TTS_CANONICAL` visent une diction stable et brève. Les champs `STT_VARIANTS` sont séparés par ` | ` afin de rester lisibles dans une cellule CSV et de pouvoir être éclatés plus tard par un intégrateur. Les variantes sont des alternatives de parole ou d’orthographe de reconnaissance; elles ne constituent pas des synonymes métier et ne créent aucun mapping définitif.

## Validation requise avant intégration

Toutes les lignes restent à `STATUS=DRAFT`. Les 10 intentions de criticité `CRITICAL` doivent être validées par au moins deux locutrices ivoiriennes avant tout usage actif, avec un test d’écoute et de reconnaissance en situation d’encaissement. Les questions de prix et les libellés monétaires demandent également une double vérification. Les produits, unités et nombres doivent être testés auprès de vendeuses pour confirmer les pratiques réelles de vente et éviter les confusions liées au contexte.

Aucun nom de locutrice ou validatrice n’est renseigné : aucune validation humaine n’a été fournie. Aucun clip audio, manifeste audio, code, migration, fichier métier ou fichier de dépôt n’est créé par ce livrable.

## Schéma du CSV

| Colonne | Usage |
|---|---|
| `PROVISIONAL_KEY` | Clé temporaire, non métier et remappable. |
| `CATEGORY` | Famille éditoriale de la ligne. |
| `CONTEXT` | Situation d’emploi et garde-fou d’interprétation. |
| `MONEY_CRITICALITY` | Priorité de validation : `CRITICAL`, `HIGH`, `MEDIUM` ou `LOW`. |
| `FR_SOURCE` | Source française de référence ou libellé demandé. |
| `FR_MARCHE` | Réécriture en français oral de marché ivoirien. |
| `TTS_CANONICAL` | Forme stable à prononcer. |
| `STT_VARIANTS` | Variantes séparées par ` | `. |
| `STATUS` | Toujours `DRAFT` dans cette livraison. |
| `VALIDATION_NOTE` | Test humain à effectuer avant usage. |

## Référence de cadrage

La seule source de contenu est la mission Jùlaba fournie avec cette tâche. Le corpus n’effectue aucune traduction dans une langue locale et ne préjuge pas du futur catalogue Claude.
