# Rapport de préparation — Ébrié / Atchan

## Décision de livraison

Le fichier `06-ebrie.csv` contient les **168** clés provisoires du catalogue français, avec les contextes, criticités, placeholders et champs métier préservés. Son code de langue est **`ebr`** (ISO 639-3). La langue doit être désignée prioritairement **Atchan**; **Tchaman** est l’autonyme du peuple, tandis qu’**Ébrié** est le libellé ISO et un exonyme encore employé dans les catalogues linguistiques. [1] [2] [3]

Toutes les cellules `TTS_CANONICAL` et `STT_VARIANTS` sont intentionnellement vides. Toutes les lignes sont `STATUS=DRAFT` et portent `VALIDATION_NATIVE_REQUISE=true`. Aucun contenu n’est déclaré `NATIVE_VALIDATED` ou `FIELD_VALIDATED`.

## Variété et périmètre linguistique

La variété cible n’est pas suffisamment précisée pour établir un corpus de marché sûr. Les ressources consultées décrivent l’Atchan/Tchaman autour d’Abidjan, dans environ soixante villages; les données phonologiques publiées couvrent notamment Anono, Blockhauss et Attécoubé. Elles ne fournissent pas une norme de conversation commerciale transversale, ni une assignation de variété au catalogue demandé. [3] [4]

> **Varieté retenue dans les métadonnées :** Atchan/Tchaman (ISO 639-3 `ebr`), aire de la lagune Ébrié–Abidjan. **Sous-variété de marché : non spécifiée.**

Cette absence est bloquante pour les formulations de caisse, les nombres, les unités, les produits et les variantes STT. L’Atchan est tonal; l’accentuation et les tons peuvent distinguer des formes. Une transcription inférée ou une variante sans validation peut donc altérer le sens et compromettre tant la synthèse que la reconnaissance vocale. [4] [5]

## Couverture linguistique

| Élément | Lignes | TTS_CANONICAL renseigné | STT_VARIANTS renseigné | Décision |
|---|---:|---:|---:|---|
| Intentions financières prioritaires | 15 | 0 | 0 | Vide : contexte caisse et actes de validation non attestés dans une variété de marché identifiée. |
| Nombres 0–100, centaines et mille | 110 | 0 | 0 | Vide : aucune série numérique publiquement vérifiée n’a été extraite avec une forme orthographique et une variété utilisables. |
| Unités | 17 | 0 | 0 | Vide : les lexèmes commerciaux et leurs accords/tons ne sont pas attestés pour le contexte cible. |
| Produits | 26 | 0 | 0 | Vide : aucune liste de produits de marché native, cohérente et spécifique à la variété cible n’a été vérifiée. |
| **Total** | **168** | **0** | **0** | **Prudence : aucune invention linguistique.** |

Un corpus universitaire Atchan comprend un lexique et des séances sur les nombres, ainsi que des transcriptions alignées. Toutefois, les fichiers détaillés de ces séances n’ont pas été utilisés pour remplir ce CSV car le travail disponible ne relie pas de manière vérifiable chaque forme de marché à la sous-variété, au ton, au contexte transactionnel et aux variantes orales requis ici. [6]

## Risques et protocole de validation requis

Les dix intentions `CRITICAL` ne doivent jamais être complétées par rétrotraduction depuis le français. Elles exigent au minimum deux locutrices ou locuteurs natifs de la même variété de marché, un scénario d’encaissement joué, et une vérification indépendante de chaque placeholder `{montant}`, `{recu}`, `{monnaie}` et `{total}`. Les formulations doivent distinguer sans ambiguïté le montant dû, le montant remis, le manque et la monnaie, sans être interprétées comme une modification des règles métier.

Pour les nombres, unités et produits, le validateur doit confirmer la forme isolée, la forme dans un groupe nominal de vente, les tons à prononcer et les formes réellement attendues par le STT. Les variantes STT doivent être des énoncés réellement utilisés dans la même communauté, non de simples orthographes sans accents ni des paraphrases françaises.

Aucun audio, manifeste audio, code, dépôt, moteur ni logique métier n’a été créé ou modifié dans cette mission.

## Sources consultées

Les sources suivantes ont été consultées pour vérifier l’identifiant, l’autodésignation, l’orthographe, l’aire linguistique, les risques tonals et l’existence de matériaux primaires. Elles documentent la langue mais ne constituent pas, à elles seules, un lexique de marché validé pour la sous-variété demandée.

## Références

[1]: https://iso639-3.sil.org/code/ebr "ISO 639-3 Identifier Documentation: Ebrié [ebr]"
[2]: https://glottolog.org/resource/languoid/id/ebri1238 "Glottolog 5.3: Ebrié"
[3]: https://cla.berkeley.edu/projects/atchan.html "Atchan language project"
[4]: https://compass.onlinelibrary.wiley.com/doi/10.1111/lnc3.12488 "The phonology of Atchan"
[5]: https://www.omniglot.com/writing/tchaman.htm "Tchaman (Caman)"
[6]: https://doi.org/10.7297/X29P30NW "Materials of the Atchan Language Project"
[7]: https://song-story-corpus.github.io/assc-zola/ "Atchan Song and Story Corpus"
