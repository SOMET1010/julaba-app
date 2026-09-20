# Corpus préparatoire — Attié/Akyé (`ati`)

**Statut global : DRAFT.** Le fichier `07-attie-akye.csv` contient les **168 clés provisoires** du corpus français marché, sans modification des clés, de la criticité, des textes français, des contextes ni des placeholders. Il n’ajoute aucun audio et n’apporte aucune modification au dépôt, au moteur, à la logique métier ou aux règles d’argent.

## Décision linguistique

Le code **ISO 639-3 `ati`** est confirmé pour l’**Attié**. Les appellations **Akyé**, Akie, Atche, Atie et Atshe sont documentées comme noms alternatifs de la même entrée linguistique. [1] [2] La dénomination demandée, « Attié/Akyé », ne désigne toutefois pas une variété opérationnelle unique.

Les sources consultées distinguent au moins trois dialectes akyé : **bodin**, **kétin** et **naindin**. L’étude comparative les situe respectivement notamment à Bécédi-Brignan, Afféry et Memni et relève des différences morpho-lexicologiques, même si l’intercompréhension est forte. [4] Le naindin inclut en outre des parlers tels que le gnan et le lépin ; la description universitaire de référence porte précisément sur le parler de Memni. [3] [4] Une forme produite sans choix explicite de variété risquerait donc de privilégier une communauté, de perdre des oppositions de tons ou de fausser le lexique commercial.

Par prudence, **les 168 cellules `TTS_CANONICAL` et `STT_VARIANTS` sont vides**. Cette décision applique la consigne de ne pas inventer lorsqu’une langue recouvre plusieurs variétés ou que la fiabilité est insuffisante. Les sources accessibles confirment le code, la structure linguistique et l’existence de ressources descriptives, mais elles ne fournissent pas un corpus de formulations de marché validées, applicable indistinctement à toutes les variétés. La phonologie attié/akyé est tonale et ses formes publiées sont elles-mêmes rattachées à des parlers précis. [5] Un manuel et lexique spécialisés est explicitement consacré au bodin et compare ce dernier au nindin, ce qui renforce l’impossibilité de généraliser automatiquement ses formes. [6]

## Couverture structurée

| Élément | Résultat |
|---|---:|
| Lignes conservées | 168 |
| `PROVISIONAL_KEY` conservées et uniques | 168 |
| Formes TTS produites | 0 |
| Ensembles de variantes STT produits | 0 |
| Cellules linguistiques laissées vides | 336 |
| Lignes `STATUS=DRAFT` | 168 |
| Lignes `VALIDATION_NATIVE_REQUISE=true` | 168 |
| Lignes avec placeholders conservés | 4 |

| Catégorie | Lignes |
|---|---:|
| Intentions financières prioritaires | 15 |
| Nombres 0–100 | 101 |
| Centaines | 8 |
| Mille | 1 |
| Unités et dénominations | 17 |
| Produits | 26 |

| Criticité conservée | Lignes |
|---|---:|
| `CRITICAL` | 10 |
| `HIGH` | 6 |
| `MEDIUM` | 110 |
| `LOW` | 42 |

Les quatre gabarits avec placeholders sont inchangés : `PROVISIONAL_FRM_INTENT_05` contient `{montant}`, `PROVISIONAL_FRM_INTENT_07` contient `{recu}`, `PROVISIONAL_FRM_INTENT_08` contient `{monnaie}` et `PROVISIONAL_FRM_INTENT_09` contient `{total}`. Comme aucune phrase attié/akyé n’est émise, aucune formulation d’argent ambiguë n’est introduite.

## Structure du CSV et règles de statut

Le CSV conserve les dix colonnes source, y compris `FR_SOURCE`, `FR_MARCHE`, `CONTEXT`, `MONEY_CRITICALITY` et `VALIDATION_NOTE`. Il ajoute uniquement des colonnes de traçabilité linguistique : `LANGUAGE`, `LANGUAGE_CODE`, `VARIETY` et `VALIDATION_NATIVE_REQUISE`. La valeur de variété est volontairement `NON_PRÉCISÉE — Bodin / Kétin / Naindin` sur chaque ligne. Toutes les lignes sont exactement à `STATUS=DRAFT` et `VALIDATION_NATIVE_REQUISE=true`. Aucune ligne ne revendique `NATIVE_VALIDATED` ou `FIELD_VALIDATED`.

## Risques et condition de reprise

Le risque principal est **dialectal** : les variantes attestées ne sont pas interchangeables sans une décision communautaire sur la variété de lancement. Le risque **phonologique** est également important : l’akyé/attié a trois tons lexicaux décrits, ce qui rend une orthographe ou une prononciation non vérifiée impropre à un corpus TTS/STT. [5] Pour les montants, les demandes de prix, la validation, l’annulation et le rendu de monnaie, une approximation présente un risque opérationnel disproportionné.

Avant de remplir une ligne, le responsable produit doit sélectionner une variété cible et sa zone d’usage. Il faut ensuite constituer les formes en atelier avec des locutrices L1 de cette variété, conserver les tons et l’orthographe retenus, faire vérifier les phrases d’argent par au moins deux locutrices, puis conduire des essais STT dans une situation de marché. Ces validations doivent être consignées séparément avant de changer le statut de toute ligne. Aucun audio ne doit être produit sur la base du présent brouillon.

## Sources consultées

La mission Jùlaba fournie dans `/home/ubuntu/upload/pasted_content.txt` a été lue pour les contraintes de corpus et le fichier `/home/ubuntu/julaba-redesign/corpus-multilingue/00-fr-marche.csv` a été lu comme source des 168 lignes. Les sources externes ci-dessous ont servi exclusivement à vérifier le code, les noms et le périmètre dialectal ; elles n’ont pas été utilisées pour inventer des phrases.

## Références

[1]: https://iso639-3.sil.org/code/ati "ISO 639-3 Identifier Documentation: ati — Attié"
[2]: https://glottolog.org/resource/languoid/id/atti1239 "Glottolog 5.3: Attié"
[3]: https://theses.fr/1996GRE39026 "Description systématique de l'Attié de Memni, langue kwa de Côte d'Ivoire"
[4]: http://atse-ncho.blogspot.com/2021/01/analyse-morpho-lexicologique-des.html "Analyse morpho-lexicologique des dialectes akyé de Côte d'Ivoire"
[5]: https://typecraft.org/tc2wiki/Typological_Features_Template_for_Attie "Typological Features Template for Attie"
[6]: https://api.pageplace.de/preview/DT0400.9782296246638_A24213605/preview-9782296246638_A24213605.pdf "Parlons Akyé Bodin, suivi d'un lexique alphabétique akyé-français/français-akyé"
