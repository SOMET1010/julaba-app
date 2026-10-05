# Rapport de préparation du corpus — Dioula

**Statut global : DRAFT.** Ce livrable couvre uniquement le **dioula** et ne contient ni audio ni modification de code, de dépôt, de moteur ou de logique métier.

## Identification linguistique et périmètre

Le code confirmé est **ISO 639-3 `dyu`**, dont le libellé enregistré est **Dyula** et dont le statut est « active, individual, living » [1]. La cible opérationnelle est le **dioula véhiculaire de Côte d’Ivoire**, une koïnè mandingue utilisée dans les échanges, plutôt qu’un parler localisé. Cette cible est bien le parler décrit en Côte d’Ivoire comme distinct du dioula de Kong et de Bondoukou, et partagé comme langue véhiculaire à l’échelle du pays [2].

Cette précision ne supprime pas la variation : la littérature décrit ce véhiculaire comme issu du contact entre plusieurs parlers mandings ivoiriens et de pays voisins [2]. Des ressources documentent aussi séparément le dioula de Kong et le dioula d’Odienné/Samatiguila [3]. Le fichier indique donc explicitement la variété cible : **« Dioula véhiculaire de Côte d’Ivoire (koïnè mandingue; non Kong/non Odienné) »**. Il ne faut pas le présenter comme une validation d’un parler de Kong, d’Odienné ou du Burkina Faso.

## Résultat livré

Le CSV contient **168 lignes**, avec les clés provisoires, catégories, niveaux de criticité, contenu français et placeholders du catalogue source conservés à l’identique. Les colonnes ajoutées sont `LANGUAGE_CODE`, `LANGUAGE_VARIETY` et `VALIDATION_NATIVE_REQUISE`. Chaque ligne porte `LANGUAGE_CODE=dyu`, `STATUS=DRAFT` et `VALIDATION_NATIVE_REQUISE=true`.

| Traitement linguistique | Lignes | Décision |
|---|---:|---|
| Nombres 0–100 | 101 | `TTS_CANONICAL` et `STT_VARIANTS` renseignés à partir de paradigmes numériques Dioula publiés et recoupés. |
| Centaines 200–900 | 8 | `TTS_CANONICAL` et `STT_VARIANTS` renseignés. |
| Mille | 1 | Renseigné, avec les deux formes publiées `waga kelen` et `baa` séparées entre canonique et variante. |
| Intentions, dont 15 intentions financières | 15 | Cellules TTS/STT laissées vides. |
| Unités, dont franc et franc CFA | 17 | Cellules TTS/STT laissées vides. |
| Produits | 26 | Cellules TTS/STT laissées vides. |
| **Total** | **168** | **110 lignes renseignées ; 58 lignes volontairement vides.** |

Les nombres reposent sur une ressource de numération explicitement étiquetée Dioula/Julakan, qui fournit les cardinaux de 0 à 100, les centaines et le millier [4]. Les formes 1–25 et le comptage en CFA ont été recoupés avec une ressource dédiée au système monétaire Dyula/Bambara [5]. Les variantes STT ne sont proposées que lorsqu’une alternative est explicitement publiée, par exemple `kelen | dɔ`, `looru | duuru` et `seegi | seegin`. Les tons ne sont pas notés dans le corpus ; ce choix suit une pratique de dictionnaires dioula qui n’écrivent généralement pas les tons hors documents lexicaux [6].

## Décision de sécurité pour les intentions de marché et l’argent

Aucune phrase financière n’a été traduite de manière littérale ni inférée depuis le français, le bambara, le dioula burkinabè ou un parler ivoirien local. Toutes les cellules `TTS_CANONICAL` et `STT_VARIANTS` des **15 intentions** sont donc vides, y compris les dix lignes `CRITICAL` : encaissement, dette, confirmation, annulation, montant manquant, montant reçu, monnaie rendue, total, vérification et demande de validation. Les placeholders `{montant}`, `{recu}`, `{monnaie}` et `{total}` sont conservés strictement dans les colonnes source et marché ; aucun placeholder n’a été déplacé, modifié ou traduit.

Les unités et produits sont également laissés vides. Le dictionnaire public consulté est explicitement un dictionnaire de **Dioula du Burkina Faso** [6] et, bien qu’il soit utile pour recouper la numération, ne fournit pas une base suffisante pour imposer des noms de denrées, mesures commerciales ou formulations de marché au dioula véhiculaire ivoirien. Cette retenue évite de présenter comme ivoirienne une forme locale, un emprunt régional ou un calque.

> **Aucune ligne n’est NATIVE_VALIDATED ou FIELD_VALIDATED.** Chaque ligne reste `DRAFT` et requiert une validation native avant usage.

## Contrôles effectués

Un contrôle automatisé a confirmé que les 168 clés provisoires sont présentes dans le même ordre, que les niveaux `MONEY_CRITICALITY`, `CONTEXT`, `FR_SOURCE` et `FR_MARCHE` sont inchangés, que les placeholders sources sont inchangés et que toutes les lignes sont en `DRAFT` avec `VALIDATION_NATIVE_REQUISE=true`. Les cellules TTS et STT sont toujours soit toutes deux renseignées, soit toutes deux vides. Aucun fichier audio n’a été produit.

## Risques et validation native requise

Le principal risque est la **variation du dioula véhiculaire ivoirien**. Il faudra sélectionner au moins deux locutrices ou locuteurs adultes qui utilisent ce véhiculaire dans le commerce ivoirien, idéalement dans des zones de marché différentes, et enregistrer leur profil de variété sans les confondre avec Kong ou Odienné. Les validations des dix intentions `CRITICAL` doivent se faire séparément : chaque phrase doit être comprise sans ambiguïté comme une demande d’information ou une commande orale, jamais comme une confirmation métier autonome.

Les nombres sont seulement préremplis en **DRAFT**. Il faut tester la prononciation des formes avec `ɔ` et `ɛ`, les formes concurrentes publiées, la reconnaissance STT des nombres isolés et leur association à un montant en FCFA. Avant remplissage des 58 lignes vides, la validation doit recueillir une formulation spontanée de marché pour chaque intention et une désignation réellement employée pour chaque unité ou produit. Toute forme obtenue au Burkina Faso, au Mali, à Kong ou à Odienné doit être marquée comme telle et ne devenir canonique pour le véhicule ivoirien qu’après validation native ciblée.

## Sources consultées

Les sources ci-dessous ont été consultées pour identifier la langue, sa variété véhiculaire et les seules formes numériques préremplies. Les catalogues bibliographiques ivoiriens sont consignés comme sources de cadrage documentaire, non comme une attestation directe des chaînes du CSV.

1. Documentation ISO 639-3 du code `dyu` [1].
2. Étude sociolinguistique du dioula véhiculaire de Côte d’Ivoire [2].
3. Catalogue bibliographique IdRef des descriptions de Kong, Odienné et du lexique ivoirien [3].
4. Portail linguistique de l’Indiana University et son manuel archivé *Basic Dyula* [7].
5. Notice du *Lexique fondamental du dioula de Côte-d’Ivoire* de Dumestre [8].
6. Tableau de numération Dioula et système de monnaie Dyula/Bambara [4] [5].
7. Dictionnaire public Dioula du Burkina Faso, ses conventions graphiques et sa portée géographique [6].

## Références

[1]: https://iso639-3.sil.org/code/dyu "ISO 639-3: Dyula [dyu]"
[2]: https://journals.openedition.org/corela/4586 "Le dioula véhiculaire : situation sociolinguistique en Côte d’Ivoire"
[3]: https://www.idref.fr/028152360 "Dioula (langue) — notice d’autorité IdRef"
[4]: https://www.omniglot.com/language/numbers/dioula.htm "Numbers in Dioula"
[5]: https://coastsystems.net/en/docs/money/ "Dyula and Bambara Numbering and Currency System"
[6]: https://www.webonary.org/dioula-bf/en/overview/introduction/ "Introduction — Dioula Burkina Faso dictionary"
[7]: https://celt.indiana.edu/portal/Dyula/index.html "Dyula Language Portal — Indiana University"
[8]: https://www.sudoc.fr/018903525 "Lexique fondamental du dioula de Côte-d’Ivoire / G. Dumestre"
