# Corpus préparatoire — Adioukrou (`adj`)

**Statut global : DRAFT.** Le code **ISO 639-3 `adj`** est confirmé pour l’**Adioukrou**, langue individuelle vivante. Aucune variété locale précise n’est identifiée par les sources consultées. En conséquence, les colonnes `TTS_CANONICAL` et `STT_VARIANTS` sont volontairement **vides pour les 168 lignes**. Cette retenue applique la consigne de ne pas inventer lorsque la base linguistique ou la variété est insuffisamment fiable.

## Décision de sûreté linguistique

Les ressources consultées confirment l’existence de l’Adioukrou en Côte d’Ivoire, son code `adj` et son écriture latine. Elles ne fournissent pas un lexique éditorial vérifiable permettant de rédiger les intentions de marché, les énoncés monétaires, les nombres de 0 à 100, les unités ou les produits demandés. La page de dictionnaire consultée invite d’ailleurs les locuteurs à ajouter les mots manquants, sans présenter un corpus lexical exploitable. Une phrase proposée ici serait donc une invention non contrôlée, avec un risque direct de confusion pour les montants, les paiements et la monnaie.

La valeur `VARIETY` est laissée vide. Le nom de langue et ses graphies alternatives sont documentés, mais aucune source consultée ne permet d’associer le corpus à une variété de marché explicitement nommée et validée. **`adj` désigne la langue, non une variété de déploiement confirmée.**

## Couverture et intégrité

| Élément | Résultat |
|---|---:|
| Lignes conservées | 168 |
| Clés `PROVISIONAL_KEY` conservées | 168 / 168 |
| Criticités `MONEY_CRITICALITY` conservées | 168 / 168 |
| Placeholders des colonnes françaises conservés | 4 / 4 occurrences : `{montant}`, `{recu}`, `{monnaie}`, `{total}` |
| `TTS_CANONICAL` renseignés | 0 |
| `STT_VARIANTS` renseignés | 0 |
| `STATUS=DRAFT` | 168 / 168 |
| `VALIDATION_NATIVE_REQUISE=true` | 168 / 168 |
| Contenu marqué `NATIVE_VALIDATED` ou `FIELD_VALIDATED` | 0 |

Le CSV reprend à l’identique les colonnes de référence `PROVISIONAL_KEY`, `CATEGORY`, `CONTEXT`, `MONEY_CRITICALITY`, `FR_SOURCE`, `FR_MARCHE` et `VALIDATION_NOTE`. Il ajoute `LANGUAGE`, `LANGUAGE_CODE`, `VARIETY` et `VALIDATION_NATIVE_REQUISE`. Les champs linguistiques ont été vidés ; les textes français et les placeholders restent ainsi disponibles comme support de validation sans avoir été modifiés. Aucun audio, code, dépôt, moteur ou logique métier n’a été modifié.

## Risques et condition de reprise

Les 10 lignes `CRITICAL` portent sur l’encaissement, la dette, l’accord, l’annulation, le manque, le compte, le reçu, la monnaie, le total et la demande de validation. Elles ne doivent recevoir aucun contenu opérationnel avant une élicitation dirigée auprès d’au moins deux locutrices natives de la même variété de marché. Les 5 lignes `HIGH` et les deux dénominations de monnaie nécessitent la même vérification de désambiguïsation.

Le corpus devra être repris seulement après obtention d’une base attribuable à une variété précise : enregistrements consentis ou élicitation avec locutrices Adioukrou, orthographe retenue et, pour les montants, test d’écoute/STT en contexte de marché. Il faudra alors faire contrôler séparément les placeholders et les formes numériques. Ces contrôles sont essentiels car des sources descriptives indiquent un système tonal à cinq tons ; une orthographe ou une prosodie non validée peut changer la compréhension.[3]

## Sources consultées

La désignation et le code ont été vérifiés auprès de la table et de la fiche ISO 639-3 de SIL. La fiche Linguae/Wikitongues a été utilisée pour le statut de développement, la zone d’usage, l’écriture et les graphies alternatives. La description linguistique de synthèse a été utilisée uniquement pour le système tonal et le caractère insuffisant des informations de variété ; elle n’est pas employée comme source de traductions. Lughayangu a été consulté pour la disponibilité lexicale et ne présentait pas de lexique utilisable dans l’extraction consultée.

## Références

[1]: https://iso639-3.sil.org/code/adj "ISO 639-3 Identifier Documentation: adj — Adioukrou"
[2]: https://linguae.martonpaulo.com/adj/ "Linguae: Adioukrou language profile"
[3]: https://en.wikipedia.org/wiki/Adjukru_language "Adjukru language: phonology and language overview"
[4]: https://lughayangu.com/adioukrou "Lughayangu: Adioukrou Language"
