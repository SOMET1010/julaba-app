# Corpus préparatoire — Agni (Anyin), marché ivoirien

**Décision : aucune forme TTS ni variante STT n’est proposée dans cette livraison.** Le fichier contient les **168 lignes** du catalogue marché français, avec toutes les clés provisoires, les contextes, les libellés français, les criticités et les placeholders conservés. Les colonnes `TTS_CANONICAL` et `STT_VARIANTS` sont volontairement vides sur les 168 lignes. Chaque ligne est à `STATUS=DRAFT` et `VALIDATION_NATIVE_REQUISE=true`.

## Identification linguistique

Le nom demandé, **Agni**, correspond à **Anyin**, dont le code ISO 639-3 actif est **`any`**. La documentation consultée répertorie plusieurs parlers sous ce nom, notamment Sanvi, Indénié, Bini, Bona, Moronou, Djuablin, Ano, Abé, Barabo et Alangua. Aucune variété cible, aucun lieu de marché précis et aucun corpus Agni validé n’ont été fournis. La variété est donc renseignée comme **non spécifiée** dans le CSV et aucune phrase ne doit être inférée pour l’ensemble de ces parlers.[1] [2]

> **Règle appliquée :** une forme absente est préférable à une forme plausible mais non attribuable à une variété Agni précise. Cette précaution vaut particulièrement pour les montants, les confirmations, l’annulation, la dette et la monnaie rendue.

## Couverture et état du fichier

| Élément | Valeur |
|---|---:|
| Langue | Agni (Anyin) |
| Code ISO 639-3 confirmé | `any` |
| Variété livrable | Non spécifiée; aucune forme générée |
| Lignes du catalogue | 168 |
| Lignes avec TTS/STT vides | 168 |
| Lignes `CRITICAL` | 10 |
| Statut de toutes les lignes | `DRAFT` |
| Validation native requise | `true` |

| Catégorie | Lignes |
|---|---:|
| `FINANCIAL_PRIORITY_INTENT` | 15 |
| `NUMBER_0_100` | 101 |
| `NUMBER_HUNDREDS` | 8 |
| `NUMBER_THOUSAND` | 1 |
| `PRODUCT` | 26 |
| `UNIT` | 17 |

| Criticité | Lignes |
|---|---:|
| `CRITICAL` | 10 |
| `HIGH` | 6 |
| `LOW` | 42 |
| `MEDIUM` | 110 |

## Garanties de conservation

Les `PROVISIONAL_KEY` sont reproduites à l’identique. Les colonnes `MONEY_CRITICALITY`, `CONTEXT`, `FR_SOURCE`, `FR_MARCHE` et `VALIDATION_NOTE` sont reprises du catalogue français sans adaptation. Les placeholders `{montant}`, `{recu}`, `{monnaie}` et `{total}` sont donc conservés strictement dans les lignes concernées. Les quatre colonnes ajoutées — `LANGUAGE`, `LANGUAGE_CODE`, `LANGUAGE_VARIETY` et `VALIDATION_NATIVE_REQUISE` — rendent le périmètre linguistique et la validation obligatoire lisibles par machine.

Le CSV ne crée aucune règle d’argent, ne modifie aucun moteur, dépôt, mapping ou logique métier, et ne contient aucun audio. Une cellule TTS/STT vide n’est pas une forme de repli en français; elle signifie explicitement qu’aucune forme Agni n’est revendiquée.

## Risques et conditions de reprise

Le risque principal est la **variation interne d’Anyin/Agni** : une phrase peut être naturelle dans un parler et incorrecte, artificielle ou ambiguë dans un autre. Les orthographes et les réalisations orales peuvent aussi diverger, ce qui affecte directement la prononciation TTS et la reconnaissance STT. En conséquence, aucun nombre, unité, nom de produit, terme monétaire ou commande d’encaissement n’est renseigné sans variété et validation humaine.

Avant de remplir les cellules linguistiques, il faut désigner une variété précise — par exemple Agni-Indénié ou Agni-Sanvi, sans présumer de son équivalence avec les autres parlers — puis recueillir et faire vérifier les formulations par des locutrices adultes de cette variété qui vendent ou achètent réellement au marché. Les **10 lignes `CRITICAL`** exigent au minimum deux validations natives indépendantes, suivies d’un test d’écoute et de reconnaissance en situation d’encaissement. Elles restent `DRAFT` tant que ce protocole n’est pas documenté. Une validation native ne permet pas de modifier les règles métier ou d’interpréter une confirmation financière hors du moteur existant.

## Sources consultées

La mission Jùlaba fournie avec la tâche définit le périmètre, les clés et les exigences de prudence. Le catalogue `00-fr-marche.csv` fourni définit les 168 lignes reprises. Les sources externes ci-dessous ont servi uniquement à confirmer le code et à identifier le risque de pluralité des parlers; elles ne servent pas de base pour inventer des textes Agni de marché.

## References

[1]: https://iso639-3.sil.org/code/any "ISO 639-3 Identifier Documentation: Anyin [any]"
[2]: https://rosettapanglossia.longnow.org/index.php?title=Anyin_language_(any) "Anyin language (any): alternate names, dialect list and ISO 639-3 code"
