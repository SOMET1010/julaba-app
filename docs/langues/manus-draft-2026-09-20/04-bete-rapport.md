# Corpus Bété — état DRAFT

## Conclusion

Le libellé **« Bété » ne permet pas de sélectionner une langue ISO 639-3 unique**. Il désigne un ensemble de langues et variétés kru du centre-ouest de la Côte d’Ivoire. Les références officielles distinguent notamment le **bété de Gagnoa (`btg`)** et le **bété de Daloa (`bev`)**, deux langues vivantes individuelles distinctes. La documentation descriptive cite aussi les ensembles occidental et oriental, avec des références à Gagnoa, Guibéroua et Daloa. [1] [2] [3]

Aucune variété cible n’étant fournie, aucun code de langue ne peut être confirmé pour ce lot. Conformément à la consigne de ne pas inventer lorsque la langue recouvre plusieurs variétés ou que la fiabilité est insuffisante, les champs **`TTS_CANONICAL`** et **`STT_VARIANTS`** sont laissés vides pour les 168 lignes. Ce choix couvre aussi les intentions financières critiques : aucune formulation monétaire non vérifiée n’est introduite.

> **État de livraison :** fichier de préparation uniquement. Toutes les lignes sont `STATUS=DRAFT` et `VALIDATION_NATIVE_REQUISE=true`. Aucune ligne n’est déclarée `NATIVE_VALIDATED` ni `FIELD_VALIDATED`.

## Fichier livré et contrôles

| Élément | Résultat |
|---|---|
| Langue demandée | Bété |
| Code de langue | À confirmer — pas de code unique attribuable à « Bété » sans variété |
| Variété | À désigner explicitement (par exemple Gagnoa `btg` ou Daloa `bev`) |
| Corpus livré | `04-bete.csv` |
| Lignes conservées | 168 / 168 |
| Clés provisoires conservées | 168 / 168 |
| Criticité conservée | 168 / 168 |
| `TTS_CANONICAL` vide | 168 / 168 |
| `STT_VARIANTS` vide | 168 / 168 |
| `STATUS=DRAFT` | 168 / 168 |
| `VALIDATION_NATIVE_REQUISE=true` | 168 / 168 |
| SHA-256 du CSV | `7720e325c6909c79cc73e468fc40297e2bde9a1a29e2c7f982d1def9d7473ed7` |

## Périmètre et intégrité du corpus

Le CSV source français de marché a été lu afin de conserver à l’identique chaque `PROVISIONAL_KEY`, le contexte, la criticité, les placeholders éventuels tels que `{montant}`, `{recu}`, `{monnaie}` et `{total}`, ainsi que les textes de référence en français. Les seules cellules linguistiques laissées vides sont `TTS_CANONICAL` et `STT_VARIANTS`; les statuts ont été fixés à `DRAFT` et l’exigence de validation native est explicitement portée par la colonne `VALIDATION_NATIVE_REQUISE`.

Aucun audio n’a été produit. Aucun dépôt, moteur, logique métier, règle de paiement ou configuration applicative n’a été modifié.

## Risques et condition de reprise

Le risque principal est de confondre des usages non intercompréhensibles ou de diffuser à une communauté une formulation d’une autre variété. Le risque est particulièrement élevé pour les commandes et confirmations d’argent, les nombres et les unités commerciales : une erreur phonologique, tonale, lexicale ou pragmatique peut altérer la reconnaissance vocale ou introduire une ambiguïté sur un montant.

La reprise linguistique requiert d’abord une décision produit géolocalisée : **variété, zone de marché et code ISO 639-3**. Le corpus devra ensuite être produit avec des locutrices natives de cette variété, séparément pour la phrase TTS canonique et plusieurs variantes STT réellement employées. Les 15 intentions financières prioritaires, les nombres, les formes de prix et les unités devront être testés en situation de marché auprès d’au moins deux locutrices natives avant tout passage au-delà de `DRAFT`.

## Sources consultées

La documentation ISO 639-3 de SIL identifie `btg` comme **Gagnoa Bété**, langue individuelle vivante, et `bev` comme **Daloa Bété**, également langue individuelle vivante. [1] [2] Une synthèse descriptive des langues bété confirme le caractère de groupe/continuum et la pluralité de ses ensembles et variétés; elle est utilisée uniquement comme contextualisation et non comme source de formulations. [3]

## References

[1]: https://iso639-3.sil.org/code/btg "ISO 639-3 Identifier Documentation: Gagnoa Bété [btg]"
[2]: https://iso639-3.sil.org/code/bev "ISO 639-3 Identifier Documentation: Daloa Bété [bev]"
[3]: https://en.wikipedia.org/wiki/B%C3%A9t%C3%A9_languages "Bété languages"
