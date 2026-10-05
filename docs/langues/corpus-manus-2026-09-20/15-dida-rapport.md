# Corpus Dida — décision de sûreté linguistique

**Statut global : DRAFT.** Ce livrable traite exclusivement l’étiquette linguistique **Dida**. Il ne crée aucun audio et ne modifie ni dépôt, ni moteur, ni logique métier. Les 168 clés provisoires du corpus français marché ont été reprises dans le même ordre, avec leur catégorie, contexte, criticité, texte français et placeholders inchangés.

## Décision de variété et de code

Aucune variété Dida précise n’a été indiquée dans la demande. Les sources consultées montrent que **Dida ne désigne pas une seule langue ISO 639-3 utilisable comme cible de corpus** : Ethnologue présente un sous-groupe de quatre langues de Côte d’Ivoire — Dida de Lakota (`dic`), Dida de Yocoboué (`gud`), Guébie (`gie`) et Neyo (`ney`). Glottolog confirme séparément Lakota Dida (`dic`) et Yocoboué Dida (`gud`). La valeur de code de ce CSV reste donc volontairement **`a-confirmer`**. La variété est indiquée comme non précisée dans chaque ligne; aucune de ces options n’est sélectionnée par défaut.

En conséquence, les champs **`TTS_CANONICAL`** et **`STT_VARIANTS`** sont vides sur les 168 lignes. Cette abstention est intentionnelle : elle évite de faire passer du lexique, une morphosyntaxe, une orthographe ou des tons d’une variété à une autre sous l’étiquette générale « Dida ». Elle s’applique aussi aux nombres, unités, produits et aux quinze intentions de marché; les formes françaises ne sont pas recyclées comme formes Dida.

| Mesure de contrôle | Résultat |
|---|---:|
| Lignes source reprises | 168 |
| Clés `PROVISIONAL_KEY` conservées à l’identique | 168/168 |
| Criticités `MONEY_CRITICALITY` conservées à l’identique | 168/168 |
| Placeholders des champs français conservés | 168/168 |
| Lignes avec TTS Dida renseigné | 0 |
| Lignes avec variantes STT Dida renseignées | 0 |
| Lignes à `STATUS=DRAFT` | 168/168 |
| Lignes à `VALIDATION_NATIVE_REQUISE=true` | 168/168 |

## Conditions avant rédaction du corpus Dida

Le commanditaire doit d’abord désigner une **seule variété** et sa zone d’usage — par exemple Lakota (`dic`) ou Yocoboué (`gud`) — sans présumer de l’intercompréhension avec les autres membres du sous-groupe. La rédaction devra alors être menée avec une base traçable propre à cette variété et une locutrice ou un locuteur natif compétent dans l’usage commercial local. Pour les dix lignes `CRITICAL`, deux validations natives indépendantes en contexte d’encaissement sont nécessaires; les nombres, montants et formes de monnaie devront être écoutés et testés en reconnaissance avant toute intégration. Aucune ligne ne peut être promue à `NATIVE_VALIDATED` ou `FIELD_VALIDATED` par ce livrable.

## Sources consultées

| Source | Élément vérifié | Usage dans la décision |
|---|---|---|
| [Ethnologue, sous-groupe Dida](https://www.ethnologue.com/subgroup/957/) (consulté le 20 septembre 2026) | Quatre langues : Lakota `dic`, Yocoboué `gud`, Guébie `gie`, Neyo `ney`, toutes en Côte d’Ivoire | Établit que « Dida » est une étiquette plurielle, insuffisante pour choisir un seul code ou corpus. |
| [Glottolog, Yocoboué Dida](https://glottolog.org/resource/languoid/id/yoco1235) (consulté le 20 septembre 2026) | Code ISO 639-3 `gud`; références de description et de phonologie | Confirme une cible Yocoboué distincte et l’existence de documentation, sans fournir un corpus marchand validé. |
| [Glottolog, Lakota Dida](https://glottolog.org/resource/languoid/id/lako1244) (consulté le 20 septembre 2026) | Code ISO 639-3 `dic`; descriptions grammaticales et lexiques distincts | Confirme une cible Lakota distincte; empêche l’assignation arbitraire de `dic` au Dida générique. |
| [Omniglot, Yocoboué Dida](https://www.omniglot.com/writing/yocobouedida.htm) (consulté le 20 septembre 2026) | Divo et Lozoua/Lozwa signalés comme dialectes; tons indiqués | Renforce le risque d’une graphie et d’une réalisation tonale non vérifiées; source secondaire, non utilisée pour traduire. |
| Mission Jùlaba fournie (`/home/ubuntu/upload/pasted_content.txt`) | Clés, priorités, garde-fous de l’argent et exigence de validation | Définit le périmètre éditorial et l’interdiction de modifier les règles métier. |
| Corpus français marché fourni (`00-fr-marche.csv`) | 168 lignes, clés provisoires, criticités et placeholders | Source structurelle de toutes les lignes reprises. |

## Risques ouverts

| Risque | Conséquence évitée dans ce CSV | Réduction requise |
|---|---|---|
| Confusion entre Lakota, Yocoboué, Guébie et Neyo | Une phrase peut être non naturelle, incomprise ou attribuée au mauvais code | Sélection explicite d’une variété et d’une zone avant rédaction. |
| Tones et orthographes non stabilisés entre parlers | TTS erroné et faible reconnaissance STT | Source écrite propre à la variété, puis écoute et tests natifs. |
| Ambiguïté sur les phrases d’argent | Erreur de montant, d’encaissement, de rendu ou de validation orale | Deux validations natives pour les lignes `CRITICAL`, tests en situation réelle simulée et conservation stricte des placeholders. |
| Faux niveau de maturité | Intégration prématurée d’un corpus supposé prêt | Maintien de `DRAFT` et de `VALIDATION_NATIVE_REQUISE=true` sur chaque ligne. |

Aucun contenu de ce fichier ne revendique `NATIVE_VALIDATED` ou `FIELD_VALIDATED`.
