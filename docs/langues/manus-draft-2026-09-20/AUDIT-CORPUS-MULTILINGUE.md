# Audit du corpus multilingue Jùlaba

**Conclusion.** Le français marché fournit 168 clés provisoires. Les corpus locaux restent des matériaux de collecte `DRAFT`, pas des traductions prêtes pour la production. L’audit bloque toute intégration lorsqu’une clé, un placeholder ou un statut diverge.

## Couverture

- Corpus langue trouvés : **19/19**.
- Langues entièrement renseignées : **0**.
- Langues partiellement renseignées : **5**.
- Langues sans formulation linguistique fiable : **14**.
- Erreurs bloquantes : **0**.

| Langue | Code | Lignes remplies | Vides | Critiques remplies | Intégrité |
|---|---|---:|---:|---:|---|
| Dioula | dyu | 110/168 | 58 | 0/10 | PASS |
| Baoule | bci | 109/168 | 59 | 0/10 | PASS |
| Agni | any | 0/168 | 168 | 0/10 | PASS |
| Bete | btg/bev — à sélectionner | 0/168 | 168 | 0/10 | PASS |
| Adioukrou | adj | 0/168 | 168 | 0/10 | PASS |
| Ebrie | ebr | 0/168 | 168 | 0/10 | PASS |
| Attie Akye | ati | 0/168 | 168 | 0/10 | PASS |
| Aboure | abu | 0/168 | 168 | 0/10 | PASS |
| Senoufo | sef | 46/168 | 122 | 0/10 | PASS |
| We Guere | gxx | 0/168 | 168 | 0/10 | PASS |
| Dan Yacouba | dnj | 0/168 | 168 | 0/10 | PASS |
| Abron | abr | 0/168 | 168 | 0/10 | PASS |
| Koulango | nku/kzc — à sélectionner | 0/168 | 168 | 0/10 | PASS |
| Lobi | lob | 0/168 | 168 | 0/10 | PASS |
| Dida | a-confirmer | 0/168 | 168 | 0/10 | PASS |
| Gouro | goa | 39/168 | 129 | 0/10 | PASS |
| Avikam | avi | 0/168 | 168 | 0/10 | PASS |
| Abidji | abi | 0/168 | 168 | 0/10 | PASS |
| Alladian | ald | 17/168 | 151 | 0/10 | PASS |

## Règle de mise en production

Aucune phrase locale ne doit être branchée au moteur ou transformée en clip final avant remappage sur le catalogue d’IDs de Claude. Toute phrase financière requiert deux validations natives indépendantes, puis un test de compréhension en situation de vente. Les cellules vides représentent une décision de prudence et non une erreur de traduction.

## Erreurs bloquantes

Aucune erreur de structure, de clé, de placeholder ou de statut n’a été détectée.

## Références

[1]: https://iso639-3.sil.org/ "ISO 639-3 Language Codes"
[2]: file:///home/ubuntu/upload/pasted_content.txt "Mission Jùlaba — corpus linguistique et voix"
