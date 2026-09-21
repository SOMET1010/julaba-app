# Corpus multilingue Jùlaba — brouillon Manus

Ce paquet contient un corpus préparatoire pour le français oral de marché ivoirien et dix-neuf langues locales. Il ne modifie ni le moteur, ni les règles métier, ni l’authentification, ni la caisse.

Le fichier `00-fr-marche.csv` contient **168 clés provisoires**. Les fichiers numérotés `01` à `19` conservent ces mêmes clés. `JULABA-LANG-CATALOG-MANUS-DRAFT.csv` réunit les dix-neuf langues dans un format long. `CLAUDE-ID-MAPPING-TEMPLATE.csv` permet à Claude d’associer les clés provisoires aux IDs définitifs sans perdre la traçabilité.

Tous les contenus locaux portent le statut **DRAFT**. Une cellule vide signifie que les agents n’avaient pas de base assez fiable et ont choisi de ne pas inventer. Les phrases financières exigent deux validations natives indépendantes, puis un essai terrain avant toute intégration ou production audio.

## Ordre d’utilisation

1. Claude renseigne les IDs définitifs dans le modèle de remappage.
2. Manus reporte ces IDs dans le catalogue long sans modifier les textes.
3. Des locutrices natives valident les phrases et variantes. Les formulations financières reçoivent deux validations.
4. Manus produit les clips uniquement pour les lignes validées.
5. Claude intègre les IDs et le moteur. QA contrôle les règles d’argent.

## Fichiers de contrôle

`AUDIT-CORPUS-MULTILINGUE.md` résume la couverture et les blocages. `INDEX-CORPUS.csv` donne une ligne par langue. `manifest-corpus.json` contient les empreintes SHA-256 des livrables.

## Références

[1]: https://iso639-3.sil.org/ "ISO 639-3 Language Codes"
