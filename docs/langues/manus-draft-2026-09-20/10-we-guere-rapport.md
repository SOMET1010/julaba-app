# Rapport de préparation — Wè/Guéré

## Portée et décision linguistique

Ce livrable ne porte **que sur Wè/Guéré**. La variété de travail est identifiée comme **Wè Southern (Central Guéré)**, code **ISO 639-3 `gxx`**. Le registre officiel SIL classe `gxx` comme une langue vivante individuelle nommée *Wè Southern* [1]. Glottolog donne *Central Guéré*, *Gere*, *Guere*, *Guéré* et *Wèè* parmi ses noms alternatifs [2].

Le libellé large « Wê/Guéré » demeure cependant ambigu : le registre ISO distingue aussi **Wè Western** (`wec`) [3], et Glottolog associe également des noms Guéré/Wè à ce code [4]. La source de cadrage secondaire consultée décrit le guéré comme *Southern Wè / Central Guéré* mais mentionne d’autres variétés, notamment au Liberia [5]. Il faut donc confirmer avec les porteuses du projet la localité et la variété des locutrices avant toute collecte ou publication vocale. Le code `gxx` est ici une **désignation de périmètre**, non une validation qu’il convient à chaque communauté appelée Wê/Guéré.

## Traitement du corpus

Le fichier de sortie contient **168 lignes**, une pour chaque `PROVISIONAL_KEY` du corpus français marché. Toutes les clés provisoires, les contextes, les criticités, les textes français, les placeholders et les notes de validation ont été conservés sans modification. Les colonnes ajoutées rendent le ciblage linguistique explicite : `LANGUAGE_CODE=gxx`, `VARIETY=Wè Southern (Central Guéré)` et `VALIDATION_NATIVE_REQUISE=true`.

Aucune phrase Wè/Guéré n’a été créée. Les **168** cellules `TTS_CANONICAL` et les **168** cellules `STT_VARIANTS` sont volontairement vides. Cette décision est requise par l’absence de base publiée, vérifiable et localisée qui permette de produire des formulations naturelles de marché — en particulier de paiement — sans les inventer. Le site lexicographique Wè Southern consulté sollicite lui-même des contributions et ne fournit pas sur sa page de corpus lexical, de provenance des entrées ni de registre conversationnel [6]. Le dictionnaire Glosbe rencontré pour `gxx` est une paire Wè Southern–Nume communautaire, non une source de validation français/Wè ou de lexique de marché [7].

Toutes les lignes restent donc **`STATUS=DRAFT`** et **`VALIDATION_NATIVE_REQUISE=true`**. Aucun statut `NATIVE_VALIDATED` ni `FIELD_VALIDATED` n’est employé. Aucun audio n’a été généré, et aucun dépôt, moteur ou logique métier n’a été modifié.

| Élément contrôlé | Résultat |
|---|---:|
| Lignes source / lignes de sortie | 168 / 168 |
| `PROVISIONAL_KEY` uniques et conservées | 168 |
| `TTS_CANONICAL` remplis | 0 |
| `STT_VARIANTS` remplis | 0 |
| Lignes `STATUS=DRAFT` | 168 |
| Lignes `VALIDATION_NATIVE_REQUISE=true` | 168 |
| Placeholders source conservés (`{…}`) | 4 |
| Audio généré | 0 |

| Catégorie | Lignes | TTS/STT proposés |
|---|---:|---:|
| `FINANCIAL_PRIORITY_INTENT` | 15 | 0 |
| `NUMBER_0_100` | 101 | 0 |
| `NUMBER_HUNDREDS` | 8 | 0 |
| `NUMBER_THOUSAND` | 1 | 0 |
| `UNIT` | 17 | 0 |
| `PRODUCT` | 26 | 0 |

| Criticité conservée | Lignes | Disposition linguistique |
|---|---:|---|
| `CRITICAL` | 10 | Vides ; ne pas employer avant double validation native contextualisée. |
| `HIGH` | 6 | Vides ; validation native requise avant toute intégration. |
| `MEDIUM` | 110 | Vides ; collecte et vérification natives requises. |
| `LOW` | 42 | Vides ; collecte native requise. |

## Risques et exigences de validation

Les énoncés relatifs à l’argent portent un risque de confusion de montant, de validation ou d’annulation. Les dix lignes `CRITICAL` et les six lignes `HIGH` restent totalement vierges, y compris celles qui contiennent `{montant}`, `{recu}`, `{monnaie}` ou `{total}`. Les placeholders ne doivent jamais être traduits, supprimés, déplacés ou remplacés pendant la future collecte.

Le Wè/Guéré a une variation de dénomination et de variété documentée. Une version utile doit être recueillie auprès de locutrices adultes de la variété et de la localité sélectionnées, avec orthographe, tons, prononciation et registre marchand vérifiés. Pour les paiements, il faut deux validations indépendantes de locutrices Wè Southern/Central Guéré de la localité cible, suivies d’un test de compréhension en contexte de marché. La validation doit notamment confirmer que chaque formulation distingue clairement : montant dû, montant reçu, manque, monnaie rendue, validation et annulation. Des variantes STT ne peuvent être ajoutées qu’après enregistrement/transcription native et test de reconnaissance ; elles ne doivent pas être déduites de l’orthographe ni d’une traduction littérale du français.

## Sources consultées

[1] [SIL International, ISO 639-3 : Wè Southern (`gxx`)](https://iso639-3.sil.org/code/gxx), consulté le 20 septembre 2026. Source primaire du code : langue vivante individuelle.

[2] [Glottolog 5.3, Wè Southern (`weso1238`)](https://glottolog.org/resource/languoid/id/weso1238), consulté le 20 septembre 2026. Noms alternatifs et classification ; référence au relevé dialectal de Duitsman, Campbell et Kwejige (1972).

[3] [SIL International, ISO 639-3 : Wè Western (`wec`)](https://iso639-3.sil.org/code/wec), consulté le 20 septembre 2026. Source primaire montrant un code distinct.

[4] [Glottolog 5.3, Wè Western (`wewe1238`)](https://glottolog.org/resource/languoid/id/wewe1238), consulté le 20 septembre 2026. Noms alternatifs et bibliographie, dont *A survey of the Guere dialects in the Ivory Coast* (1972).

[5] [Omniglot, « Guere (Wèè) »](https://www.omniglot.com/writing/guere.htm), consulté le 20 septembre 2026. Source secondaire d’orientation, utilisée seulement pour recouper les noms et l’existence d’autres variétés ; non utilisée pour rédiger des énoncés.

[6] [Lughayangu, Wè Southern Language](https://lughayangu.com/we-southern), consulté le 20 septembre 2026. Ressource communautaire examinée ; insuffisante comme base de production, car la page demande des ajouts et ne fournit pas de corpus marchand vérifiable.

[7] [Glosbe, dictionnaire Wè Southern–Nume](https://glosbe.com/gxx/tgs), consulté le 20 septembre 2026. Ressource communautaire examinée ; paire linguistique non pertinente pour valider des formes françaises/Wè de marché.

## Fichiers livrés

| Fichier | Rôle |
|---|---|
| `10-we-guere.csv` | Corpus DRAFT conservateur : clés et métadonnées source préservées ; cellules Wè/Guéré volontairement vides. |
| `10-we-guere-rapport.md` | Justification linguistique, sources, risques et protocole de validation. |
