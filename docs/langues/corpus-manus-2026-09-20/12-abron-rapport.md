# Corpus de préparation — Abron (abr)

**Statut global : DRAFT.** Le fichier `12-abron.csv` contient les **168** lignes du catalogue français de marché, avec chaque `PROVISIONAL_KEY`, `MONEY_CRITICALITY`, placeholder, libellé français et contexte conservés à l’identique. Les deux cellules linguistiques `TTS_CANONICAL` et `STT_VARIANTS` sont volontairement **vides sur les 168 lignes**. Cette abstention est la seule option sûre : aucune source consultée ne fournit un lexique ou un corpus attribuable permettant de produire des énoncés naturels de marché, et encore moins des énoncés monétaires sûrs, dans la variété ivoirienne ciblée.

## Identification linguistique

Le code ISO 639-3 confirmé est **`abr`**, qui désigne l’**Abron**, langue individuelle vivante dans la table officielle ISO 639-3 [1]. Les noms rencontrés dans les sources sont **Abron**, **Bron**, **Brong**, **Bono**, **Bono-Twi**, **Doma** et **Gyaman** [2] [3].

La cible géographique demandée est l’**abron/bron de Côte d’Ivoire**, dans l’aire du **district du Zanzan**, notamment autour de **Tanda et Bondoukou**, localisation rapportée pour le groupe Brong ivoirien [4]. Cette aire ne permet pas, avec les sources disponibles, de sélectionner de façon fiable un sous-parler, une orthographe de marché ou une norme écrite précise. Les ressources textuelles et audio accessibles décrivent souvent le même code comme Abron/Bono au Ghana, y compris une variété explicitement libellée « Abron: Bono » [5], tandis que le projet de traduction Bono est ancré au Ghana [6]. Elles ne doivent donc pas être transposées sans contrôle au marché ivoirien.

> **Variété opérationnelle à faire valider :** Abron/Bron de Côte d’Ivoire, aire Tanda–Bondoukou (Zanzan). Aucun sous-parler ou standard orthographique n’est retenu comme confirmé dans ce livrable.

## Décision sur les cellules linguistiques

Toutes les sorties linguistiques sont laissées vides : **0/168 lignes** ont un `TTS_CANONICAL` ou des `STT_VARIANTS` remplis, et **168/168 lignes** restent à compléter par des données attestées. Cette décision couvre aussi les nombres, unités, produits et les quinze intentions prioritaires. Un dictionnaire communautaire Abron–français signale des traductions et exemples provenant de sources diverses, mais sa page publique ne donne ni les entrées vérifiables nécessaires ni une attribution à l’aire ivoirienne [7]. Cette base ne suffit pas à remplir un corpus de production.

Le CSV ajoute la colonne `VALIDATION_NATIVE_REQUISE`, réglée à **`true`** pour chaque ligne. La colonne `STATUS` vaut strictement **`DRAFT`** pour chaque ligne. Aucun élément n’est marqué `NATIVE_VALIDATED` ni `FIELD_VALIDATED`.

| Élément contrôlé | Résultat |
|---|---:|
| Lignes reprises du CSV français | 168 |
| `PROVISIONAL_KEY` conservées | 168/168 |
| Criticité conservée | 168/168 |
| Placeholders conservés (`{montant}`, `{recu}`, `{monnaie}`, `{total}`) | 4/4 |
| `TTS_CANONICAL` rempli | 0/168 |
| `STT_VARIANTS` rempli | 0/168 |
| `STATUS=DRAFT` | 168/168 |
| `VALIDATION_NATIVE_REQUISE=true` | 168/168 |

## Risques et conditions de levée

Le principal risque est la confusion entre **Abron/Bron ivoirien** et les ressources **Bono/Brong ghanéennes**. Un transfert non vérifié peut introduire des formes absentes du parler local, des choix orthographiques non reconnus ou une prononciation inadaptée. Le deuxième risque est l’absence d’un lexique public attribuable qui relie des mots à une situation de vente ivoirienne. Une simple correspondance dictionnairique ne prouve ni la naturalité ni la compréhension en marché.

Les phrases financières restent entièrement vides, car une erreur sur l’encaissement, la dette, la monnaie rendue, le montant manquant ou la validation peut créer une ambiguïté opérationnelle. Elles devront être construites par au moins deux locutrices adultes de l’aire Tanda–Bondoukou, puis testées distinctement en écoute TTS et reconnaissance STT, avec conservation stricte des placeholders. Les nombres et unités doivent être contrôlés dans des montants réels en FCFA. Les produits doivent être contrôlés auprès de vendeuses, car les emprunts au français, au dioula ou à une autre langue de contact peuvent être préférés selon le marché.

Aucun audio, manifeste audio, code, dépôt, moteur ou logique métier n’a été créé ou modifié.

## Sources consultées

Le contenu et le schéma initial proviennent de la mission fournie dans `/home/ubuntu/upload/pasted_content.txt` et du catalogue local `/home/ubuntu/julaba-redesign/corpus-multilingue/00-fr-marche.csv`. Les sources externes ont servi uniquement à confirmer le code, les noms, la distribution et les limites de variété; elles n’ont fourni aucune formulation ajoutée au CSV.

## Références

[1]: https://iso639-3.sil.org/code/abr "ISO 639-3 Identifier Documentation: Abron [abr]"
[2]: https://glottolog.org/resource/languoid/id/abro1238 "Glottolog 5.3: Abron"
[3]: https://joshuaproject.net/languages/abr "Joshua Project: Abron language profile"
[4]: https://joshuaproject.net/people_groups/10971/IV "Joshua Project: Brong in Côte d’Ivoire"
[5]: https://globalrecordings.net/fr/language/abr "Global Recordings Network: langue Abron"
[6]: https://biblesociety-ghana.org/our-work/abron-or-bono-bible-translation-project/ "Bible Society of Ghana: Abron or Bono Bible Translation Project"
[7]: https://fr.glosbe.com/abr/fr "Glosbe: Dictionnaire Abron–français"
