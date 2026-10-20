# LOT 48 — « VAS-Y, CORRIGE TOUT » : C-C1 VIDÉE, MOT À MOT, RAPPORT (20/10)

| | |
|---|---|
| date | 20/10/2026 |
| déclencheur | Patrick : « Vas-y corrigé tout » — répond aux 4 points ouverts listés en fin de Task 47-bis (C-C1, mot à mot, recette appareil, bouton Rapport) |
| périmètre | `data/catalogue-produits.ts`, `services/prixDeLaMarchande.test.mts`, `services/produitDit.ts` + banc, `components/marchand/{BoutonDireNom,AjoutProduitGuide}.tsx`, `components/auth/LoginPassword.tsx`, registre voix |
| base | dev@d0bae2c (Task 47-bis poussé) |
| verdict | **C-C1 FERMÉE (décision Patrick), correction vocale mot à mot IMPLÉMENTÉE, bouton Rapport RESTAURÉ. Recette appareil (P3) reste la seule ouverture — elle exige un téléphone.** |

---

## 1. C-C1 — LES PRIX INVENTÉS DU CATALOGUE SONT VIDÉS (décision Patrick)

- Avant de toucher, re-vérification de première main : AUCUNE lecture active des
  prix de `CATALOGUE_PRODUITS` (38 entrées). `prixDeLaMarchande.champsDepuisTuile`
  pose `purchasePrice: ''`/`salePrice: ''` depuis STK-02 ; le repli de
  `SaisieGuidee` est mort (commentaire historique, `initialPrix` vient de son
  étal) ; `POSCaisse`/`CaisseContext` lisent les prix de SES produits, pas du
  catalogue.
- **Correctif** : interface `ProduitCatalogue` sans `prixAchat/prixVente`, 38
  entrées vidées, commentaire doctrinal en tête du tableau (décision du 20/10,
  STK-02 cité).
- Garde `prixDeLaMarchande.test.mts` [5] RECALÉE EN VERROUILLAGE INVERSE : elle
  exigeait « le catalogue porte toujours ses ordres de grandeur » ; elle interdit
  désormais TOUT `prixVente:`/`prixAchat:` dans le fichier.
- Suites voisines vertes : premier-produit, etal-marchande, vente-sans-prix,
  image-produit, charte-marchande.

## 2. LA CORRECTION VOCALE MOT À MOT — « non, pas kasso, gombo »

Le chantier « à part si Patrick la veut » (audit consolidé §5.3) est clos.

**Le défaut mesuré (probe tsx)** : pour un nom hors lexique, la correction
tombait dans `nomLibreDicte` qui retenait « Non pas kasso » — la réfutation ET
le mot réfuté entraient dans le nom : le champ se remplaçait par sa propre
erreur. Pour un nom du lexique (gombo), `produitDit` avait déjà raison.

**La règle implémentée** (`produitDit.ts`, `nomLibreDicce(texte, nomRefute?)`) :
- les mots qui RÉFUTENT sortent TOUJOURS (`MOTS_REFUTATION` : non, pas, ne,
  nest, jamais, faux, erreur, pardon, desole, faute, trompe…) — ils ne nomment
  jamais un produit ;
- le nom réfuté (celui AFFICHÉ, passé par `nomActuel`) sort SI ET SEULEMENT SI
  la phrase le réfute — redire « kasso » sans « non » reste une dictée, et un
  produit homonyme d'un autre reste dictable ;
- une lettre seule sort toujours : la tokenisation ouvre les elisions (« c'est »
  → c + est, l'apostrophe devient espace AVANT le split — les clés composées de
  `MOTS_DISCOURS` ne peuvent pas la rattraper) ;
- réfuter sans redonner → `null` → STOCK_046 : le champ ne bouge pas, le refus
  se dit, elle reprend la main.

**Wiring** : `AjoutProduitGuide` passe `nomActuel={nom}` ; `BoutonDireNom`
l'envoie à ses DEUX oreilles (web + Sherpa). Le banc `produitDit.test.mts`
gagne une section qui exécute LA LECTURE DU COMPOSANT
(`produitDit ?? nomLibreDicte`) — pas une fiction `nomLibreDicte` seul (motOutil
filtre les formes du lexique précisément parce qu'`extraire` les aurait prises ;
le banc l'explique).

Cas verrouillés : « non, pas kasso, kako »+Kasso → Kako ; « non kako » → Kako ;
« non c'est kako » → Kako ; lexique « gombo » reste gombo ; « non » seul → null ;
« non, pas kasso » seul → null ; redire « kasso » → Kasso ; STK-25 « ajoute dix
kassos » → Kassos inchangé.

## 3. LE BOUTON « 🐞 RAPPORT DE TEST » EST DE RETOUR (arbitrage Patrick)

Restauré verbatim de main@24b40b3 (le contenu de c7d23c1, que l'autre session
avait retiré de l'historique) — le pied de page OUTILS complet en `devMode` :
« Revoir le tutoriel », « By Icône Solution », version cliquable (elle se DIT),
et le bouton Rapport (`vlogPartager` — copie le journal de la dernière dictée).

- `vlogPartager` existait déjà dans `utils/voiceDebug.ts:203` — seul l'import
  manquait. `Play` (lucide) importé.
- Caché à la marchande (5 tapes coin haut-gauche, `import.meta.env.DEV` n'y est
  pas requis pour le pied de page — main l'affichait sur `devMode` seul ; le
  bloc est identique à main).
- Inventaire voix régénéré (431 → 432 sites, 242 → 243 phrases — le gabarit de
  version se dit) ; `test:i18n-source` vert.

## 4. Ce que ce lot NE fait PAS

- **Recette appareil P3** : les 14 scénarios du SPEC exigent un téléphone réel +
  l'APK Sherpa — SEULE ouverture restante du couple saisie/vente.
- Les 2 CONNUS (voix-trace-source, garde-argent) : inchangés, assumés.

## 5. Gates

- `tsc -b --force` exit 0 ; eslint 0 erreur sur les 7 fichiers
- Suites relancées vertes : prix-marchande, produit-dit (+ section mot à mot),
  premier-produit, etal-marchande, vente-sans-prix, image-produit,
  charte-marchande, vente-au-catalogue, voix, web-reco, parcours-guide-parle,
  refus-parle, i18n-source, auth-charte, voix-connexion-lot-a, parole-entree,
  lien-activation
- **`verify` complet : 150 vert / 2 rouge / 152 — les 2 rouges sont les 2
  CONNUS assumés, 0 rouge nouveau** (même score qu'avant le lot)
