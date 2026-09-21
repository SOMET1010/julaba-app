# Corpus préparatoire — Sénoufo Cebaara (senã́rì), parler de Korhogo

**Statut global : DRAFT. Validation native obligatoire : `true`.** Ce livrable est un corpus éditorial très limité. Il ne modifie aucun dépôt, moteur, mapping, logique métier, règle d’argent, fichier audio ni stratégie audio. Toutes les `168` lignes conservent leur `PROVISIONAL_KEY`, contexte, criticité, libellés français et placeholders à l’identique.

## Identification linguistique et code

Le libellé collectif **« Sénoufo »** couvre plusieurs langues et variétés; il n’est donc pas utilisé comme s’il désignait une seule langue. La variété sélectionnée est le **Cebaara / senã́rì, parler de Korhogo**, explicitement identifié comme tel par la source numérique consultée. Le registre ISO 639-3 confirme que **Cebaara Senoufo** est une langue individuelle vivante, de code **`sef`**.[1] Le champ `LANGUAGE_VARIETY` de chaque ligne mentionne cette variété précise.

> La sélection de `sef` ne rend pas les formes automatiquement transposables à tous les parlers dits sénoufo. Elle borne au contraire ce CSV au Cebaara de Korhogo.

## Portée linguistique réellement renseignée

Une base publique exploitable a été trouvée uniquement pour certains **numéraux Cebaara du parler de Korhogo**. Les graphies sont reprises sans normalisation depuis la table de numéraux, qui documente des formes modernes et, à partir de 20, des formes traditionnelles vigésimales.[2] La forme moderne est placée dans `TTS_CANONICAL`; lorsqu’une deuxième forme est explicitement fournie par la même table, elle est incluse dans `STT_VARIANTS` après ` | `. Pour les petites valeurs dont la source ne donne qu’une forme, la variante STT reproduit cette unique forme : aucune variante orthographique, phonétique ou grammaticale n’est inventée.

Aucune source suffisamment fiable et attribuée à cette même variété n’a été trouvée pour les intentions de marché, l’encaissement, la dette, la monnaie, les confirmations, les annulations, les unités ou les produits. Ces cellules `TTS_CANONICAL` et `STT_VARIANTS` sont donc **vides**, sans repli en français. Les nombres composés non explicitement affichés dans la table (notamment 31–39, 41–49, etc.) restent eux aussi vides : la régularité apparente ne remplace pas une attestation.

| Élément | Lignes | TTS/STT renseignés | Cellules linguistiques vides |
|---|---:|---:|---:|
| Intentions financières prioritaires | 15 | 0 | 15 |
| Nombres 0–100 | 101 | 37 | 64 |
| Centaines 200–900 | 8 | 8 | 0 |
| Mille | 1 | 1 | 0 |
| Unités et monnaie | 17 | 0 | 17 |
| Produits | 26 | 0 | 26 |
| **Total** | **168** | **46** | **122** |

| Criticité | Lignes | État |
|---|---:|---|
| `CRITICAL` | 10 | Toutes les formes sont vides; `DRAFT` |
| `HIGH` | 6 | Toutes les formes sont vides; `DRAFT` |
| `MEDIUM` | 110 | Numéraux attestés seulement; `DRAFT` |
| `LOW` | 42 | Produits/unités vides; `DRAFT` |

## Garanties de données

Les quatre colonnes de traçabilité ajoutées sont `LANGUAGE`, `LANGUAGE_CODE`, `LANGUAGE_VARIETY` et `VALIDATION_NATIVE_REQUISE`. Les valeurs sont respectivement `Sénoufo Cebaara (senã́rì)`, `sef`, `Cebaara — parler de Korhogo (numéraux attestés uniquement)` et `true` sur toutes les lignes. Toutes les lignes sont strictement à `STATUS=DRAFT`; aucune n’est présentée comme `NATIVE_VALIDATED` ou `FIELD_VALIDATED`.

Les placeholders `{montant}`, `{recu}`, `{monnaie}` et `{total}` restent exactement présents dans leurs lignes sources. Ces quatre lignes, comme l’ensemble des dix lignes `CRITICAL`, n’ont **aucun** texte Cebaara proposé : cette précaution empêche que la simple présence d’un mot ou d’un gabarit soit interprétée comme une instruction financière fiable. Le CSV ne crée aucune action d’encaissement ou de validation et ne contourne aucune confirmation métier.

## Risques et conditions de reprise

Le risque principal est la **sur-généralisation du nom « Sénoufo »** : une forme de Cebaara de Korhogo ne doit pas être étiquetée comme valable pour toutes les langues sénoufo. Le second risque est la **variation orthographique et tonale**, particulièrement importante pour une TTS ou une STT : la table numérique est une ressource de référence secondaire, non un protocole de prononciation validé sur le terrain. Les formes vigésimales fournies comme variantes peuvent différer dans la pratique commerciale contemporaine; elles doivent être testées avant toute activation.

Il faut d’abord confirmer que les personnes visées parlent bien le Cebaara de Korhogo, puis faire recueillir les phrases de marché auprès de vendeuses adultes de cette variété. Les dix intentions `CRITICAL` doivent recevoir **au moins deux validations natives indépendantes**, avec des tests de compréhension et reconnaissance dans une situation d’encaissement simulée. Les nombres, le franc/FCFA et les unités doivent aussi être testés dans des énoncés complets : un numéral isolé ne suffit pas à démontrer une lecture fiable d’un montant. Même après validation linguistique, les confirmations, calculs, annulations et paiements effectifs restent exclusivement sous le contrôle du moteur métier existant.

Aucun audio ni manifeste audio n’a été généré.

## Sources consultées

La mission Jùlaba fournie dans `/home/ubuntu/upload/pasted_content.txt` définit les clés, les priorités financières et les garde-fous. Le catalogue `/home/ubuntu/julaba-redesign/corpus-multilingue/00-fr-marche.csv` fournit les 168 lignes reproduites. Les ressources externes suivantes servent à identifier le code, la variété et les seules formes lexicales retenues :

## References

[1]: https://iso639-3.sil.org/code/sef "ISO 639-3 — Cebaara Senoufo [sef]"
[2]: https://www.omniglot.com/language/numbers/cebaara.htm "Numbers in Cebaara — information about counting in the Korhogo dialect; source cited: Jacques Rongier, Parlons sénoufo (2002)"
[3]: https://www.omniglot.com/writing/cebaara.htm "Cebaara (senã́rì) — geographic context and alternate names"
[4]: https://searchworks.stanford.edu/view/7654680 "Mills, Richard (2003), Dictionnaire sénoufo-français : sénanri-parler tyébara (Côte d’Ivoire)"
