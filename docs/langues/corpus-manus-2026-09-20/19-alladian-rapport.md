# Corpus préparatoire — Alladian (`ald`)

**Statut global : DRAFT.** Le fichier associé est un corpus linguistique préparatoire pour **l’alladian uniquement**. Il ne modifie aucun dépôt, moteur, traitement d’encaissement, règle métier, audio ni logique de reconnaissance. Toutes les lignes sont explicitement à `STATUS=DRAFT` et `VALIDATION_NATIVE_REQUISE=true`. Aucune ligne n’est déclarée `NATIVE_VALIDATED` ou `FIELD_VALIDATED`.

## Langue, code et variété de travail

Le code **ISO 639-3 `ald`** est confirmé pour l’**Alladian**, langue vivante individuelle [1]. La variété de travail est désignée avec prudence comme **alladian de la sous-préfecture de Jacqueville, Lagunes, Côte d’Ivoire**. Les sources situent l’alladian dans une vingtaine de villages aux environs de Jacqueville [2] et dans la plaine entre la côte et la lagune Ébrié [3]. Elles ne fournissent pas une normalisation écrite de marché ni une segmentation dialectale suffisamment détaillée pour imposer une variété standard. Cette désignation locale doit donc être confirmée par les validateurs natifs avant intégration.

## Couverture réellement livrée

Le CSV conserve strictement les **168** `PROVISIONAL_KEY`, catégories, niveaux `MONEY_CRITICALITY`, contextes et placeholders du corpus français de référence. Les champs français restent la trace de l’intention source. Les champs linguistiques alladian sont `TTS_CANONICAL` et `STT_VARIANTS`; les métadonnées ajoutées identifient la langue, son code, la variété de travail et l’exigence de validation native.

Seules **17 lignes numériques** reçoivent une forme alladian : 1–10, 12, 20, 21, 30, 100, 200 et 1 000. Ces formes sont transcrites telles qu’attestées dans une table de numéraux alladian qui localise ses données à Jacqueville et crédite Zepp (1983), avec relevés par Inge Egner de SIL [3]. Chaque forme présente une seule variante STT identique à la forme canonique : aucune variante orthographique, phonétique ou conversationnelle n’a été fabriquée.

Les **151 autres lignes** ont intentionnellement leurs cellules `TTS_CANONICAL` et `STT_VARIANTS` vides. Cela inclut les 15 intentions de marché et d’argent, les unités, les produits, zéro, les nombres non attestés par la table et les centaines non attestées. Le document de numéraux indique lui-même des termes manquants et demande une vérification par des données récentes avec transcription API et tons [3]. La monographie de Duponchel est décrite comme une enquête lexicale de 661 pages [4], mais son contenu lexical intégral n’était pas accessible dans les sources consultées. Il serait imprudent de reconstruire des phrases, des dérivations numériques ou des noms de produits à partir d’une parenté avec l’avikam ou d’un modèle français.

| État des champs linguistiques | Lignes | Décision |
|---|---:|---|
| Formes attestées, isolées | 17 | TTS canonique et unique candidat STT renseignés; validation native encore obligatoire. |
| Cellules linguistiques vides | 151 | Aucune formulation suffisamment attestée pour le contexte demandé; aucune invention. |
| Intentions financières critiques | 10 | TTS/STT vides; élicitation puis validation contextualisée par au moins deux locutrices Alladian requises. |
| Autres intentions financières | 5 | TTS/STT vides; validation native contextuelle requise. |

## Traitement des messages d’argent

Aucune phrase financière n’a été traduite, adaptée ou approximée. Les dix intentions `CRITICAL`, notamment celles portant sur l’encaissement, le montant dû, le manque, la monnaie, le total, la validation et l’annulation, conservent leurs clés, leur criticité et leurs placeholders (`{montant}`, `{recu}`, `{monnaie}`, `{total}`) sans ajout de texte alladian. Cette abstention empêche qu’une forme non vérifiée produise une ambiguïté entre montant remis, montant dû, monnaie et action de confirmation.

Avant tout usage, un protocole d’élicitation doit distinguer explicitement : la commande orale, la demande du prix, le total dû, l’argent effectivement reçu, le montant manquant, la monnaie à rendre, l’accord oral et l’annulation. Il doit être conduit avec **au moins deux locutrices alladianes** de la variété effectivement ciblée, puis suivi d’un test TTS/STT sur des montants et des unités en situation de marché. L’accord oral ne doit jamais être interprété comme une règle de paiement ou une confirmation métier.

## Risques et limites

La table de numéraux source mentionne un système vigésimal traditionnel, des termes manquants et la nécessité de vérifier les tons avec des données nouvelles [3]. Les formes numériques livrées sont donc des candidats de corpus, non des formes opérationnelles validées. Leur orthographe, leur ton, leur domaine d’emploi et l’éventuelle présence de classificateurs doivent être confirmés oralement. Aucune forme n’est dérivée pour les nombres absents : l’application de règles de composition non vérifiées créerait précisément le type d’ambiguïté que ce corpus doit éviter.

La documentation de référence confirme que l’Alladian est une langue distincte, avec le code `ald`, et la rapproche de l’avikam [1] [5]. Cette proximité n’autorise aucun emprunt de mots ni aucune extrapolation interlangue. Les formes de produits, de mesures, de monnaie, de prix et de dialogue de marché restent inconnues pour cette livraison. L’orthographe n’est pas considérée comme standardisée pour la synthèse ou la reconnaissance sans revue native.

## Sources consultées

Les fichiers de cadrage consultés sont la mission fournie (`/home/ubuntu/upload/pasted_content.txt`) et le corpus source français (`/home/ubuntu/julaba-redesign/corpus-multilingue/00-fr-marche.csv`). Ils définissent le périmètre, les clés provisoires, les contextes, les placeholders et les exigences de sécurité; ils ne constituent pas une source de traduction alladian.

Les sources externes ci-dessous ont été consultées pour le code, l’aire de parole, la documentation disponible et les numéraux. La consultation de la notice bibliographique de la monographie ne rendait pas son lexique intégral accessible; aucune forme absente des sources n’a donc été inférée.

## Références

[1]: https://iso639-3.sil.org/code/ald "ISO 639-3 Identifier Documentation: Alladian [ald]"
[2]: https://fr.wikipedia.org/wiki/Alladian_(langue) "Alladian (langue) — aire de parole et villages autour de Jacqueville"
[3]: https://lingweb.eva.mpg.de/channumerals/Alladian.htm "Alladian numerals — Jacqueville, data credited to Zepp and Inge Egner"
[4]: https://glottolog.org/resource/reference/id/90924 "Duponchel 1974, L'Alladian: phonologie et enquête lexicale"
[5]: https://glottolog.org/resource/languoid/id/alla1248 "Glottolog: Alladian languoid alla1248"
