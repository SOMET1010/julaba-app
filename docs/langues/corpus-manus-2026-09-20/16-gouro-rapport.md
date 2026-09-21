# Rapport de couverture — Gouro (goa)

## Périmètre et décision éditoriale

Ce livrable couvre **uniquement le gouro, code ISO 639-3 `goa`**, avec une cible explicite : **le parler de la zone de Zuénoula**. Il contient les mêmes **168 `PROVISIONAL_KEY`** que `00-fr-marche.csv`, sans doublon. Les colonnes `PROVISIONAL_KEY`, `CATEGORY`, `CONTEXT`, `MONEY_CRITICALITY`, `FR_SOURCE` et `FR_MARCHE` sont reprises sans changement de contenu. Toutes les lignes portent `STATUS=DRAFT` et `VALIDATION_NATIVE_REQUISE=true`.

La règle appliquée est conservatrice : une cellule `TTS_CANONICAL` ou `STT_VARIANTS` n’est renseignée que lorsqu’un lemme ou une expression correspondant directement à l’entrée est attesté dans une source lexicographique centrée sur Zuénoula. Ce n’est **ni une traduction mot à mot**, ni une validation d’oralité marchande. Aucune phrase complète n’a été reconstruite à partir de grammaire ou de lexèmes isolés.

| Mesure | Résultat |
|---|---:|
| Clés françaises de référence | 168 |
| Clés présentes dans `16-gouro.csv` | 168 |
| Doublons | 0 |
| Lignes avec forme(s) documentaire(s) | 39 |
| Lignes laissées linguistiquement vides | 129 |
| Lignes `DRAFT` | 168 |
| Lignes avec validation native requise | 168 |
| Phrases/prix/unités monétaires à criticité `CRITICAL` ou `HIGH` renseignés | 0 |

## Variété ciblée et distinction des variantes

La source centrale est le *Dictionnaire gouro-français* d’Olga Kuznetsova et Natalia Kuznetsova (2021), qui indique que ses données appartiennent majoritairement à la **zone de Zuénoula**. Sa section sur les dialectes précise que les données non marquées sont majoritairement de Zuénoula et que les entrées d’autres variantes sont explicitement étiquetées `Sinfra`, `Vavoua`, `Nord` ou `Sud`. Cette convention a été suivie strictement.

En conséquence, les formes explicitement étiquetées **Sinfra** ou **Vavoua** ne sont pas utilisées comme variantes STT de Zuénoula. Deux décisions importantes illustrent cette règle : `PROVISIONAL_FRM_NUMBER_007` est vide parce que les formes attestées pour « sept » sont étiquetées Sinfra ; `PROVISIONAL_FRM_PRODUCT_05_BANANE` est vide parce que `miì` est étiqueté Sinfra et que `bánà` est étiqueté Sinfra/Vavoua. À l’inverse, `sʋlaá` (« huit ») est retenu car le renvoi de l’entrée `yaá` l’attribue explicitement à Zuénoula. Les variantes Sinfra de « huit » ne sont pas ajoutées au STT.

## Sources consultées

1. **Kuznetsova, Olga & Natalia Kuznetsova. 2021.** [*Dictionnaire gouro-français*](https://doi.org/10.4000/mandenkan.2599), *Mandenkan*, 66, p. 3–186. Dictionnaire d’environ 2 400 entrées, fondé sur un travail de terrain réalisé entre 2005 et 2019 ; base documentaire primaire des lemmes retenus, de l’orthographe, des tons et du marquage dialectal.
2. **COCOON / Huma-Num.** [Fiche Guro](https://cocoon.huma-num.fr/exist/crdo/language/goa). Confirmation indépendante du code ISO 639-3 `goa` et des références descriptives de la langue.
3. **Omniglot.** [Guro language and alphabet](https://www.omniglot.com/writing/guro.htm). Source secondaire consultée pour le contexte géographique et l’écriture latine ; non utilisée seule pour renseigner une cellule.
4. `/home/ubuntu/upload/pasted_content.txt`. Consignes de portée, adaptation par situation et sécurité des formulations financières.
5. `/home/ubuntu/julaba-redesign/corpus-multilingue/00-fr-marche.csv`. Source canonique des 168 clés, catégories, criticités, contextes et formulations françaises à conserver.

## Couverture renseignée

Les formes retenues sont des **étiquettes lexicales documentées**, non des phrases de vente validées. Elles couvrent 12 lignes numériques non phrastiques, 19 produits et 8 unités/contenants.

| Catégorie | Total | Renseignées | Vides | Décision |
|---|---:|---:|---:|---|
| `FINANCIAL_PRIORITY_INTENT` | 15 | 0 | 15 | Toutes vides : pas de phrase financière reconstruite. |
| `NUMBER_0_100` | 101 | 11 | 90 | Seulement les numéraux/exemples explicitement attestés : 1–6, 8–10, 20, 30. |
| `NUMBER_HUNDREDS` | 8 | 1 | 7 | Seul « deux cents » est directement attesté (`wúlù, wúlû`); pas de paradigme extrapolé. |
| `NUMBER_THOUSAND` | 1 | 0 | 1 | Vide : l’exemple de « mille francs CFA » ne suffit pas à isoler une forme stable et non financière pour « mille ». |
| `PRODUCT` | 26 | 19 | 7 | Lemmatisation directe seulement. |
| `UNIT` | 17 | 8 | 9 | Contenants/unités directement glossés seulement ; ni kilogramme ni litre n’est déduit. |

### Formes lexicales retenues par domaine

| Domaine | Formes retenues (orthographe documentaire) |
|---|---|
| Numéraux | `dʋ` (1), `fíé` (2), `yaá` (3), `zìɛ́n` (4), `sólú` (5), `suɛdʋ` / `suɛlʋ` (6), `sʋlaá` (8), `sʋlàzìɛ́n` (9), `vu` (10), `yɔ dʋ` (20), `yɔ dʋ wɔ́lɛ́ vu` (30), `wúlù` / `wúlû` (200) |
| Produits | `tɔmàtí` (tomate), `zìàn-bhɛɛ yìlì` / `zìàn yìlì` (gombo), `cɛ̂kɛ́` / `cɛɛ̌` (attiéké), `bɔ'ùn` (plantain), `yá` (igname), `buù` (manioc), `jàbhá` / `jàbá` (oignon), `pɔ` (poisson), `wi` (viande, relationnel), `manɛ` (poulet), `nyɔ́nɔ́` (huile), `sukálo` (sucre), `sáá` (riz), `zɔ̀lɛ́` (haricot), `gòò` (maïs), `fɔn` (foutou), `lôwuò pʋlʋ` (orange-fruit), `sabhílí` (savon), `yí` (jus/liquide) |
| Unités et contenants | `dìn` (botte/régime), `mana` (sachet), `dìlì` (paquet), `bùú` (morceau), `gbò` (caisse), `bútêlí` (bouteille), `cɛɛ̀` (panier en rotin) |

## Lacunes délibérées et risques

Les cellules laissées vides ne sont pas des oublis. Elles signalent que l’attestation est absente, trop spécifique, dialectalement hors Zuénoula, ou insuffisante pour un emploi de marché. Sont notamment vides : zéro ; sept ; 11–19, 21–100 sauf 30 ; les centaines autres que 200 ; mille ; piment générique ; banane générique ; aubergine générique ; ail ; sel ; lait générique ; farine générique ; unité commerciale générique ; tas ; sac de marchandises ; kilo ; bidon ; litre ; carton ; franc et FCFA.

Les risques principaux sont les suivants :

- **Variation interne :** le gouro couvre plusieurs zones. L’emploi d’une forme marquée Sinfra/Vavoua à Zuénoula sans essai auprès de locuteurs pourrait produire une forme inattendue ou mal perçue.
- **Tons et orthographe :** le gouro possède cinq tons phonologiques et une orthographe avec `ɛ`, `ɔ`, `ɩ`, `ʋ`, nasalisation et accents tonals. Les chaînes du CSV conservent l’orthographe documentaire, mais une voix TTS/STT doit être testée par des locuteurs, notamment pour les voyelles et tons.
- **Équivalence de domaine :** certains lemmes sont spécialisés : `wi` est relationnel (« viande »), `cɛɛ̀` est un panier en rotin, `gbò` couvre aussi valise/cercueil, et `nyɔ́nɔ́` couvre huile/graisse. Leur adéquation à chaque scène de marché reste à vérifier.
- **Absence de validation conversationnelle :** un dictionnaire atteste un mot, pas la tournure naturelle qu’emploierait une commerçante. Aucun énoncé d’intention libre n’a donc été fabriqué.
- **Sécurité financière :** les 15 intentions financières prioritaires et les lignes de prix, franc et FCFA sont vides. Aucun texte du CSV ne doit être compris comme une permission de modifier une confirmation métier ou un flux de paiement.

## Protocole de validation native requis

Avant mise en production, constituer un groupe d’au moins deux locuteur·rices adultes du parler de Zuénoula, idéalement dont une personne pratiquant un commerce de marché. Tester séparément : (1) le lemme isolé et son ton ; (2) le nom en contexte de produit/contenant ; (3) la compréhension par STT avec bruit de marché ; et, dans une phase séparée, (4) les formulations financières sans jamais les relier à une confirmation métier. Toute correction doit conserver les clés et placeholders existants, documenter la localité du locuteur, le contexte et la décision de variante.

Aucun audio, aucun code, aucun moteur et aucune logique métier n’ont été modifiés.
