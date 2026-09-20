# Rapport de préparation — corpus Baoulé (bci)

**Statut global : DRAFT.** Le fichier `02-baoule.csv` couvre les 168 clés du catalogue français sans modifier les clés provisoires, les contextes, la criticité, les textes français ou leurs placeholders. Chaque ligne porte `STATUS=DRAFT` et `VALIDATION_NATIVE_REQUISE=true`. Aucun contenu n’est déclaré `NATIVE_VALIDATED` ni `FIELD_VALIDATED`.

## Langue et variété retenues

Le code **ISO 639-3 `bci`** est confirmé : l’autorité ISO identifie `bci` comme le Baoulé, langue individuelle vivante. [1] Le corpus emploie uniquement des formes écrites publiées comme relevant du **Baoulé central (Wawle)**. Une source numérale décrit explicitement cette variété comme la norme de sa forme écrite, tout en signalant que l’orthographe n’est pas pleinement fixée et que des variétés régionales existent. [2]

Cette précision ne permet pas d’assimiler le corpus à une variété de terrain particulière, par exemple Kode, ni à l’ensemble des pratiques urbaines d’Abidjan. Les cellules qui exigeraient une phrase contextuelle, une grammaire de transaction, un terme de monnaie, une unité de vente ou un nom de produit restent donc vides. Ce choix évite de substituer une formulation construite, une traduction française ou une forme dialectale non localisée à une expression de marché réellement validée.

## Contenu livré

Le fichier livré est `/home/ubuntu/julaba-redesign/corpus-multilingue/02-baoule.csv`. Il reprend les 168 lignes du fichier `00-fr-marche.csv` et insère la colonne booléenne `VALIDATION_NATIVE_REQUISE` sans modifier les colonnes de référence. Les 109 lignes remplies correspondent exclusivement aux formes numérales disposant d’un appui documentaire concordant : `001` à `100`, les centaines `200` à `900`, et `1000`. Les 59 autres cellules linguistiques restent vides.

| Groupe | Lignes | TTS_CANONICAL / STT_VARIANTS | Décision |
|---|---:|---|---|
| Intentions financières et marchandes | 15 | Vides | Les sources consultées ne fournissent pas de formulations Baoulé central attestées en interaction marchande. Les 10 lignes `CRITICAL` restent donc sans texte, y compris celles avec `{montant}`, `{recu}`, `{monnaie}` et `{total}`. |
| Nombre zéro | 1 | Vides | Les ressources numérales retenues commencent à un ; aucun équivalent zéro n’a été ajouté. |
| Nombres 1–100 | 100 | Remplis | Formes du Baoulé central. Les variantes STT sont limitées aux graphies alternatives explicitement attestées, par exemple `kun | kɔn` et `ablansan | ablasan`. |
| Centaines et mille | 9 | Remplis | `ya` avec le numéral pour 200–900, et `akpi` pour 1 000, conformément aux sources numérales. |
| Unités, franc et FCFA | 17 | Vides | Aucune forme transactionnelle vérifiée n’a été déduite. Les deux lignes `HIGH` de monnaie sont vides. |
| Produits | 26 | Vides | Le dictionnaire de référence est documenté comme riche en lexique agricole, mais les entrées nécessaires ne sont pas accessibles ici de façon contrôlable ; aucune forme n’a été inférée. |

Les deux ressources numérales concordent notamment sur `kun`, `nnyɔn`, `nsan`, `nnan`, `nnun`, `nsiɛn`, `nso`, `mɔcuɛ`, `ngwlan`, `blu`, `ablaɔn`, `ya` et `akpi`. [2] [3] Les variantes limitées à certaines dizaines ne sont pas présentées comme des synonymes validés en usage marchand : elles sont conservées seulement comme variantes orthographiques publiées pour une future évaluation STT. Aucun ton n’a été ajouté à partir d’une supposition. Le Baoulé est décrit comme une langue tonale, et les tons peuvent être distinctifs ; une écriture non tonale doit donc être vérifiée à l’oral avant synthèse ou reconnaissance. [2] [4]

## Règles de sûreté appliquées

Les phrases d’argent n’ont reçu ni TTS ni variante STT. Cela concerne tous les montants, confirmations et annulations. Ainsi, aucun placeholder financier n’a été déplacé, traduit, supprimé ou entouré de texte susceptible de modifier son interprétation. Les clés métier et la criticité du fichier source sont inchangées. Le livrable est un corpus de préparation ; il ne génère aucun audio et n’apporte aucune modification au dépôt, au moteur ni à la logique métier.

Les notes de validation de chaque ligne remplie précisent que la graphie est documentaire, mais que les tons, l’articulation et l’usage marchand attendent une validation native. Les notes des lignes vides indiquent explicitement le motif : absence de base Baoulé central suffisamment fiable et contextualisée.

## Risques et validation requise

Le premier risque est **dialectal et orthographique**. Les sources décrivent le Baoulé central comme une référence écrite tout en reconnaissant des usages régionaux et une orthographe non entièrement stabilisée. [3] La variété locale des utilisatrices doit donc être identifiée avant d’introduire une variante STT. Le deuxième risque est **tonal** : la graphie retenue ne porte pas un balisage tonal exploitable pour piloter une prononciation TTS sans locutrice native. [2] [4]

Le troisième risque concerne **l’argent**. Les formes numériques isolées ne doivent pas être considérées comme des énoncés de prix, de dette, de monnaie à rendre ou de confirmation. Les 10 intentions `CRITICAL`, les 4 questions de montant `HIGH`, ainsi que `franc` et `FCFA`, exigent une collecte et une validation par au moins deux locutrices natives du Baoulé central habituées au marché ivoirien. Elles doivent prononcer les formulations en contexte réel, contrôler les valeurs exactes des placeholders, puis tester la reconnaissance sur bruit de marché avant toute intégration.

Pour les unités et produits, la prochaine étape sûre consiste à relever les entrées de l’édition de référence du *Dictionnaire baoulé-français* (Timyan, Kouadio et Loukou, 2003) avec l’indication de variété et de ton lorsqu’elle est disponible. Une étude récente confirme l’importance de cet ouvrage et sa couverture de lexique agricole, mais elle ne remplace pas la consultation contrôlée de chaque entrée ni l’élicitation auprès de vendeuses. [5]

## Sources consultées

Le catalogue local `/home/ubuntu/julaba-redesign/corpus-multilingue/00-fr-marche.csv` et la mission locale `/home/ubuntu/upload/pasted_content.txt` ont défini les clés, placeholders, criticités et contraintes de livraison. Les sources externes ci-dessous ont été consultées pour identifier la langue, la variété, les formes numérales et les limites documentaires. Aucune sortie de traducteur automatique, aucune transcription audio et aucune source non attribuable n’a été utilisée pour remplir le corpus.

## Références

[1]: https://iso639-3.sil.org/code/bci "ISO 639-3 Identifier Documentation: bci — Baoulé"
[2]: https://baoule.ci/guide-pour-apprendre-a-compter-en-langue-baoule-de-cote-divoire/ "Guide pour apprendre à compter en langue Baoulé de Côte d’Ivoire"
[3]: https://desmotsetdeslangues.eklablog.com/compter-en-baoule-a114408476 "Compter en Baoulé"
[4]: https://eric.ed.gov/?id=ED048591 "An Introduction to Spoken Baoule. Preliminary Text"
[5]: https://bop.unibe.ch/LPIA/article/download/12974/version/13278/16198/63098 "Le lexique de l’agriculture dans le dictionnaire baoulé-français : approches terminologique et métalexicographique"
