# Rapport de préparation — Koulango

## Conclusion

Le fichier `13-koulango.csv` contient **168 lignes**, toutes au statut **DRAFT** et avec `VALIDATION_NATIVE_REQUISE=true`. Les champs `TTS_CANONICAL` et `STT_VARIANTS` sont volontairement vides pour les **168 lignes**. Aucun contenu linguistique koulango n’est livré, car la demande indique seulement « Koulango » sans préciser la variété, alors que cette étiquette recouvre des langues ou variétés suffisamment différentes pour être traitées séparément. Cette abstention est nécessaire, en particulier pour les **10 lignes CRITICAL** et les **6 lignes HIGH** liées à l’argent.

## Identification linguistique

Les identifiants ISO 639-3 disponibles ne correspondent pas à un unique « koulango » générique. **Bouna Kulango** est une langue individuelle vivante, code **`nku`** [1]. **Bondoukou Kulango**, aussi appelé localement **Goutougo**, est une langue individuelle vivante distincte, code **`kzc`** [2]. Une synthèse descriptive indique que les variétés de Bouna et de Bondoukou diffèrent sensiblement et peuvent être considérées comme des langues distinctes [3]. La grammaire de référence d’Elders distingue en outre un groupe septentrional centré sur Bouna, une variante méridionale autour de Bondoukou, Tanda et Nassian, ainsi qu’un parler Nabay plus minoritaire [4].

> **Code à confirmer : aucun code unique n’est sûr pour ce corpus.** Le code doit être fixé avec la communauté cible : `nku` seulement si les utilisatrices emploient le koulango de Bouna; `kzc` seulement si elles emploient le koulango de Bondoukou/Goutougo. Le parler Nabay requiert une vérification spécifique avant toute attribution.

## Décision de corpus

Les clés `PROVISIONAL_KEY`, les placeholders éventuels, la colonne `MONEY_CRITICALITY`, les contextes et les contenus français source/marché ont été conservés sans changement. Les deux seules cellules destinées à la langue cible, `TTS_CANONICAL` et `STT_VARIANTS`, sont vides. Cette décision évite de mélanger des formes de Bouna et de Bondoukou, de convertir une graphie d’une variété dans l’autre, ou de produire des équivalents financiers supposés. Aucune piste audio n’a été produite et aucune logique, dépôt, moteur ou règle métier n’a été modifié.

La colonne explicite `VALIDATION_NATIVE_REQUISE` a été ajoutée afin de satisfaire la contrainte de validation : elle vaut `true` pour chaque ligne. `STATUS` vaut `DRAFT` pour chaque ligne. Les lignes ne portent donc ni `NATIVE_VALIDATED` ni `FIELD_VALIDATED`.

## Risques et conditions avant remplissage

Le risque principal est une **confusion de variété** : une forme qui paraît attestée pour Bouna (`nku`) ne peut pas être transférée à Bondoukou/Goutougo (`kzc`), ni l’inverse. Les sources consultées identifient les variétés et la documentation grammaticale, mais ne fournissent pas un corpus public contrôlable de tours conversationnels de marché, de variantes STT ou de formulations financières homologuées. Elles ne justifient donc pas la création de phrases TTS/STT.

Les énoncés financiers exigent une prudence renforcée. Après sélection documentée de la variété, ils devront être élaborés par situation de marché, conservant les placeholders à l’identique, puis validés indépendamment par au moins deux locuteurs natifs adultes habitués aux transactions orales. Les nombres, unités et noms de produits devront aussi être recueillis dans cette même variété et testés avec des locuteurs représentatifs, car ils peuvent présenter des différences lexicales ou de graphie.

## Sources consultées

La consultation a porté sur le répertoire ISO 639-3 pour les deux codes, Glottolog pour la fiche de Bondoukou, la notice de la grammaire de Stefan Elders pour la dialectologie et Omniglot pour la synthèse des deux principales variétés. Le fichier de mission et le corpus français fourni ont également été lus pour les contraintes de conservation, de validation et de criticité.

## Références

[1]: https://iso639-3.sil.org/code/nku "ISO 639-3 Identifier Documentation: nku — Bouna Kulango"
[2]: https://iso639-3.sil.org/code/kzc "ISO 639-3 Identifier Documentation: kzc — Bondoukou Kulango"
[3]: https://www.omniglot.com/writing/kulango.htm "Kulango (Nkuraeng) language and alphabet"
[4]: https://www.koeppe.de/titel_grammaire-kulango-parler-de-bouna-cote-d-ivoire "Grammaire kulango (parler de Bouna, Côte d’Ivoire), Stefan Elders"
[5]: https://glottolog.org/resource/languoid/id/bond1246 "Glottolog 5.3: Bondoukou Kulango"
