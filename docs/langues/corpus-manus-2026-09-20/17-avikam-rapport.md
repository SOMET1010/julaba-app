# Rapport de préparation du corpus Avikam (ISO 639-3 : `avi`)

**Statut de livraison : `DRAFT` uniquement.** Le corpus associé conserve les 168 clés provisoires du catalogue français marché. Les cellules `TTS_CANONICAL` et `STT_VARIANTS` sont laissées vides sur toutes les lignes. Chaque ligne porte strictement `STATUS=DRAFT` et `VALIDATION_NATIVE_REQUISE=true`. Aucune ligne ne revendique `NATIVE_VALIDATED` ou `FIELD_VALIDATED`.

## Identification linguistique et décision opérationnelle

La langue ciblée est **l’Avikam**, dont le code **ISO 639-3 `avi`** est confirmé par l’autorité d’enregistrement comme actif, individuel et vivant. [1] Glottolog confirme le même identifiant et le glottocode `avik1243`; il situe la langue en Côte d’Ivoire et référence notamment les noms Avikam, Avekom, Brignan, Brinya, Gbanda, Kwakwa et Lahu. [2] Ces désignations sont des noms alternatifs documentés, pas une instruction suffisante pour retenir un parler local de marché.

**Variété opérationnelle : non identifiée.** La mission ne spécifie ni localité, ni communauté, ni orthographe de référence, ni locuteur·rice de la variété à enregistrer. La documentation accessible ne fournit pas de corpus conversationnel vérifiable ni de lexique complet permettant de faire une adaptation Avikam naturelle en contexte de marché. Wikitongues n’affiche aucun lexique, phrasebook, ressource externe ou échantillon vidéo pour `avi`. [3] La page lexicale publique consultée ne fournit qu’une seule entrée isolée, `ɛ̀sɔ̃́`, sans sens, catégorie, tonologie exploitable ni exemples d’usage. [4]

> À cause de cette base linguistique insuffisante, aucune phrase, variante STT, nombre, unité ou nom de produit Avikam n’a été inventé, calqué du français ou déduit d’une langue voisine. Cette décision s’applique en priorité aux énoncés financiers.

## Couverture et intégrité du CSV

| Élément | Résultat |
|---|---:|
| Langue | Avikam |
| Code confirmé | `avi` (ISO 639-3) |
| Variété opérationnelle | Non identifiée; à mandater avec une localité ou communauté Avikam précise |
| Lignes du catalogue conservées | 168 / 168 |
| Clés `PROVISIONAL_KEY` conservées | 168 / 168 |
| Cellules `TTS_CANONICAL` complétées | 0 |
| Cellules `STT_VARIANTS` complétées | 0 |
| Cellules linguistiques laissées vides | 336 / 336 |
| Lignes `STATUS=DRAFT` | 168 / 168 |
| Lignes `VALIDATION_NATIVE_REQUISE=true` | 168 / 168 |

La criticité, les contextes, les textes français et les clés provisoires ont été reconduits sans modification depuis le catalogue français marché. Les placeholders présents dans les champs source, dont `{montant}`, `{recu}`, `{monnaie}` et `{total}`, sont donc préservés strictement. Aucun audio n’a été généré. Aucun dépôt, moteur, logique métier ou règle d’encaissement n’a été modifié.

## Risques et conditions de remplissage ultérieur

| Risque | Conséquence | Contrôle requis |
|---|---|---|
| Aucune variété ou localité cible mandatée | Une formulation peut être étrangère à la communauté réellement visée | Désigner une communauté/localité Avikam et une convention orthographique avant rédaction |
| Base publique trop limitée | Invention de mots, de tons, de syntaxe ou de formes commerciales | Construire le corpus avec des locutrices et locuteurs compétents de la variété retenue |
| Aucun corpus de marché vérifiable | Calque du français au lieu d’une adaptation par situation | Éliciter chaque intention dans des jeux de rôle de vente ivoiriens; enregistrer les variantes spontanées |
| Intentions financières critiques | Confusion entre montant dû, reçu, monnaie à rendre, ordre d’encaissement et confirmation | Produire des énoncés distincts, courts et univoques; faire valider chaque intention critique par au moins deux locutrices; tester TTS/STT avec les nombres et placeholders réels sans modifier la logique métier |
| Nombres, unités et produits | Mauvaise lecture ou reconnaissance des quantités et montants | Éliciter séparément 0–100, centaines, mille, unités commerciales, produits et formes combinées; tester en bruit de marché |
| Orthographe et tons non stabilisés dans les sources ouvertes | Prononciation TTS imprécise ou changement de sens | Documenter la graphie retenue, les tons si la variété les note, et conserver l’accord explicite des validateurs |

Tout ajout ultérieur doit commencer en `DRAFT`. Il ne peut être promu que par une validation native documentée. Les énoncés d’argent critiques exigent au minimum deux validations natives indépendantes, puis un essai contextualisé de compréhension; aucune de ces validations n’a été effectuée dans cette livraison.

## Sources consultées

La mission `mission-julaba` a déterminé les limites de responsabilité, la priorité des énoncés d’argent, le statut `DRAFT` et l’interdiction d’inventer. Le catalogue local `00-fr-marche.csv` a déterminé les 168 clés, les placeholders, les contextes et les niveaux de criticité. Les sources externes ci-dessous ont servi à confirmer l’identification de l’Avikam et à évaluer la disponibilité d’une base linguistique publiquement vérifiable.

## References

[1]: https://iso639-3.sil.org/code/avi "ISO 639-3 Identifier Documentation: Avikam [avi]"
[2]: https://glottolog.org/resource/languoid/id/avik1243 "Glottolog 5.3: Avikam"
[3]: https://wikitongues.org/languages/avi/ "Wikitongues: Avikam"
[4]: https://lughayangu.com/avikam "Lugha Yangu: Avikam Language"
