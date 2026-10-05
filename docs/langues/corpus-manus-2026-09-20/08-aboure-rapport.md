# Rapport de préparation du corpus Abouré (ISO 639-3 : `abu`)

**Statut de livraison : DRAFT uniquement.** Le fichier de corpus associé contient les 168 clés provisoires d’origine, avec les cellules `TTS_CANONICAL` et `STT_VARIANTS` intentionnellement laissées vides. Chaque ligne porte `STATUS=DRAFT` et `VALIDATION_NATIVE_REQUISE=true`. Aucune ligne ne revendique une validation native ou terrain.

## Décision linguistique

La langue cible est **l’Abouré**, aussi référencée comme **Abure, Abule, Abonwa et Akaplass**. Le code **ISO 639-3 `abu`** est confirmé comme un identifiant actif, individuel et vivant. [1] La langue est attestée dans le Sud-Est ivoirien, notamment dans l’aire Grand-Bassam–Bonoua. [2]

La **variété précise n’est pas déterminée** par la mission ni par le fichier source. La documentation consultée décrit plusieurs dialectes abouré : **ɛ̀hɛ̀, èhívɛ̀ tíbɛ́, èhívɛ̀ et òsùwɔ̰́**. [3] Elle cite aussi une esquisse phonologique portant explicitement sur le parler de Moossou. [3] Ces variétés et les contrastes de tons empêchent de sélectionner une forme TTS/STT de marché sans mandat dialectal et validation de locuteurs compétents.

> Conformément à la consigne de ne pas inventer lorsqu’une langue recouvre plusieurs variétés ou que la fiabilité est insuffisante, aucune phrase, nombre, unité ou nom de produit Abouré n’a été fabriqué ni extrapolé.

## Couverture et intégrité du CSV

| Élément | Résultat |
|---|---:|
| Langue | Abouré / Abure |
| Code confirmé | `abu` (ISO 639-3) |
| Variété opérationnelle | Non spécifiée ; aucune sélectionnée |
| Lignes source conservées | 168 / 168 |
| Clés `PROVISIONAL_KEY` conservées | 168 / 168 |
| Cellules TTS complétées | 0 |
| Cellules variantes STT complétées | 0 |
| Cellules linguistiques laissées vides | 336 (`TTS_CANONICAL` + `STT_VARIANTS`) |
| Statut de chaque ligne | `DRAFT` |
| Validation native requise | `true` sur chaque ligne |

La criticité, les contextes, les clés provisoires et les placeholders de la source ont été conservés sans modification. Les placeholders sont donc préservés dans les colonnes source, y compris `{montant}`, `{recu}`, `{monnaie}` et `{total}`. Aucun audio n’a été produit. Aucun dépôt, moteur, règle métier ou logique d’encaissement n’a été modifié.

## Justification du seuil de prudence

L’étude lexicale consultée fournit un petit inventaire de mots isolés, de pronoms et de verbes, et confirme l’importance des tons. [3] Elle ne fournit pas un lexique complet et normalisé pour les 168 entrées, ni des énoncés conversationnels de marché, ni les constructions impératives, interrogatives et financières nécessaires. Elle indique même que les adjectifs numéraux connaissent des divergences entre les langues comparées. [3] Par conséquent, il n’existe pas de base raisonnable pour produire des nombres de 0 à 100, des montants, des unités, des produits ou des variantes de parole avec une sûreté suffisante.

Le dictionnaire public repéré se présente comme une plateforme contributive, mais sa page Abure ne restitue pas de données lexicales contrôlables ni de corpus d’usage ; il ne peut donc pas valider les formulations demandées. [4] Les phrases financières, en particulier, resteraient dangereusement ambiguës en l’absence d’une variété mandatée et d’une double validation native.

## Risques et validation à effectuer avant remplissage

| Risque | Conséquence possible | Contrôle requis |
|---|---|---|
| Variété non assignée parmi les dialectes documentés | Forme non naturelle, inadaptée ou erronée pour la communauté ciblée | Désigner formellement une variété et une localité d’usage avant rédaction |
| Contrastes tonals et graphie non paramétrés | Erreur de sens ou prononciation TTS insuffisante | Fixer une orthographe, inclure les tons si nécessaire et faire relire par un·e spécialiste de la variété |
| Absence de corpus de marché Abouré vérifié | Calques du français ou de langues voisines | Co-construire les intentions avec des vendeuses locutrices de la variété retenue |
| Intentions d’argent critiques | Mauvaise compréhension d’un montant, d’un rendu ou d’une confirmation | Produire des énoncés très courts ; valider séparément chaque formulation critique avec au moins deux locutrices ; tester le TTS et le STT en situation, sans modifier la logique métier |
| Nombres, unités et placeholders variables | Mauvaise segmentation du nombre, de l’unité ou du montant | Éliciter les nombres et formes commerciales dans la variété retenue ; tester les phrases avec chaque placeholder en contexte |

Le remplissage ultérieur doit rester en `DRAFT` jusqu’à ce qu’une validation humaine documentée soit disponible. La mission impose au minimum une validation par deux locutrices pour le contenu financier critique ; ce contrôle est indispensable ici.

## Sources consultées

La mission `mission-julaba` et le corpus français fourni ont déterminé le schéma, les clés, la criticité et les exigences de sécurité. Les sources externes ci-dessous ont servi exclusivement à confirmer l’identification de la langue, l’existence de variétés et les limites de la base linguistique disponible.

## References

[1]: https://iso639-3.sil.org/code/abu "ISO 639-3 Identifier Documentation: Abure [abu]"
[2]: https://glottolog.org/resource/languoid/id/abur1243 "Glottolog 5.3: Abure"
[3]: https://www.ziglobitha.org/wp-content/uploads/2021/11/11-Koko-Irene-KOUASSI-Koman-Denise-ANGUI-pp145-154.pdf "Étude comparative de l’abouré et de l’éotilé : aspect lexical"
[4]: https://lughayangu.com/abure "Abure Language"
