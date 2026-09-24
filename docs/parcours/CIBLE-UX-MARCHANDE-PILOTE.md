# Cible UX — parcours marchande, pilote

**Mesuré le 24/09. Aucun code modifié, aucune route touchée, aucun fichier fusionné.**

Priorité posée par Patrick : **séparer → unifier → réduire**.
Les autres surfaces — back-office, producteur, coopérative, institution,
identificateur — sont traitées comme des **produits séparés**. Elles ne sont ni
analysées ni refondues ici.

---

## 0. Une correction de diagnostic, preuve à l'appui

Le soupçon de départ était : « rien que dans la vente, des écrans Manus et des
écrans legacy cohabitent ».

**La mesure dit l'inverse.** Les cinq composants suspectés forment **une seule
arborescence, avec un seul point d'entrée** :

```
POSCaisse                    ← la SEULE destination (route /marchand/caisse)
 ├── MicroVenteCaisse         importé par POSCaisse
 │    └── SaisieGuidee        importé par MicroVenteCaisse
 │         └── ConfirmationLigne   importé par SaisieGuidee
 └── ChoixUnite               importé par POSCaisse

MarchandHome                 ← destination /marchand
 └── MarchandAccueilVoice     importé par MarchandHome, et par lui seul
```

Chaque composant n'a **qu'un seul parent**. Aucun n'est monté deux fois. Aucun
nom de fichier n'est dupliqué entre familles (vérifié sur les 243 composants).

**Il n'y a donc pas d'écrans concurrents dans la vente.** Le désordre ressenti
est réel, mais il ne vient pas de là.

### D'où vient alors le sentiment de cohabitation

De trois vagues de construction encore visibles dans la même arborescence :

| Vague | Composants | Ce que c'est |
|---|---|---|
| **24/07** | `POSCaisse` (1613 lignes, 55 commits), `MarchandAccueilVoice` | la couche d'origine |
| **17/08** | `SaisieGuidee`, `ConfirmationLigne` | la saisie guidée |
| **20/09** | `MicroVenteCaisse`, `ChoixUnite` | la vente à la voix |

`POSCaisse` porte **1613 lignes et 55 commits** : c'est là que les trois vagues
se superposent. Ce n'est pas une cohabitation d'écrans, c'est une **sédimentation
dans un seul fichier**.

Et une cohabitation a déjà été fermée, proprement : `MarchandHome` documente
qu'il y avait **deux accueils** (« vue simple » et « vue avancée Kassa ») avec
une bascule, unifiés depuis sur l'accueil simple.

---

## 1. Le vrai chiffre

**26 destinations** sont déclarées sous `/marchand` :

```
caisse · cahier · depense · stock · marche · recoltes-prevues · profil
ventes-passees · resume-caisse · commandes · alertes · parametres
cooperative · cooperative/besoin · tontines · tontines/:id
protection-sociale · fidelite · academy · support
keiwa · keiwa/transfert · keiwa/paiements · keiwa/banque
keiwa/carte · keiwa/historique
```

Plus `/setup-marchand` et `/pay/:marchandId`.

**C'est ça, la collection de modules.** Une marchande qui ne lit pas ne
choisit pas entre vingt-six portes : elle en pousse une.

---

## 2. Classement des cinq composants de la vente

| Écran actuel | Rôle réel | Cible | Pilote |
|---|---|---|---|
| **POSCaisse** | Destination unique de la vente. Route `/marchand/caisse`. 1613 lignes où trois vagues se superposent. | Reste **la** surface de vente. | **GARDER** |
| **MicroVenteCaisse** | Composant interne de POSCaisse : la vente à la voix. Un seul parent. | Reste interne. Rien à séparer. | **INTÉGRÉ** |
| **SaisieGuidee** | Composant interne de MicroVenteCaisse : la ligne de vente quand il manque une information. | Reste interne. | **INTÉGRÉ** |
| **ConfirmationLigne** | Composant interne de SaisieGuidee : le « j'ai compris, confirme ». | Reste interne. | **INTÉGRÉ** |
| **ChoixUnite** | Composant interne de POSCaisse : lever l'ambiguïté d'unité. | Reste interne. | **INTÉGRÉ** |
| **MarchandAccueilVoice** | **Est** l'accueil : `MarchandHome` ne fait que le rendre, sans rien ajouter. | Un intermédiaire à un seul appel — à examiner hors pilote, sans urgence. | **GARDER** |

**Aucun doublon UX à supprimer dans la vente.** Le classement demandé ne
produit pas de troisième colonne : elle est vide, et c'est une bonne nouvelle.

---

## 3. Le parcours pilote — 7 destinations

Règle : la marchande comprend **ouvrir → vendre → encaisser**, pas une
collection de modules.

| # | Destination | Rôle réel | Pourquoi elle y est |
|---|---|---|---|
| 1 | `/marchand` | **Ouvrir.** Accueil, voix d'abord. | C'est là qu'elle arrive et qu'on lui parle. |
| 2 | `caisse` | **Vendre et encaisser.** | Le geste du métier. Encaisser y vit déjà, ce n'est pas une destination à part. |
| 3 | `stock` | **Son étal.** | Elle pose ses produits, elle corrige ses prix. |
| 4 | `depense` | **Ce qui sort.** | Sans elle, le bilan du soir est faux. |
| 5 | `resume-caisse` | **Combien j'ai fait aujourd'hui.** | La question qu'elle pose tous les soirs. |
| 6 | `commandes` | **Les crédits et les clientes.** | L'argent qu'on lui doit. |
| 7 | `parametres` | **Langue, voix, sortie.** | La porte de secours, toujours accessible. |

### Hors pilote — retirées du menu, PAS du code

| Destination | Pourquoi hors pilote |
|---|---|
| `cahier`, `ventes-passees` | Recouvrent `resume-caisse` pour une non-lectrice : trois portes pour « mes chiffres ». **À unifier plus tard**, pas à supprimer. |
| `keiwa` + ses 5 sous-routes | Un produit financier entier dans le menu de la caisse. **6 destinations sur 26** à lui seul. |
| `tontines`, `protection-sociale`, `fidelite`, `academy` | Services, pas la caisse. Chacun peut devenir une surface séparée. |
| `cooperative`, `cooperative/besoin` | Relève de la surface coopérative, déjà séparée. |
| `marche`, `recoltes-prevues` | Marché virtuel et amont agricole : un autre métier. |
| `alertes`, `support`, `profil` | Utiles, jamais un premier geste. Accessibles depuis `parametres` ou l'accueil. |

**26 → 7.** Rien n'est supprimé : les routes restent, le code reste. Seul le
**menu** de la marchande pilote se réduit.

---

## 4. Ce que ce document ne fait pas

- Il ne fusionne aucun fichier.
- Il ne modifie aucune route.
- Il ne touche pas au chemin d'argent.
- Il ne traite ni le back-office, ni le producteur, ni la coopérative, ni
  l'institution, ni l'identificateur.

## 5. Ce qui reste à décider — arbitrages de Patrick

1. **Le menu du pilote est-il un réglage ou une construction ?** Masquer 19
   destinations pour le marchand pilote peut se faire par un drapeau, ou par un
   menu écrit en dur. Le premier est réversible, le second est plus clair.
   **À DÉFINIR.**
2. **`cahier`, `ventes-passees`, `resume-caisse`** : trois portes pour ses
   chiffres. Laquelle survit ? **À DÉFINIR.**
3. **`POSCaisse`, 1613 lignes.** Le découper ne change rien pour la marchande,
   mais change tout pour la suite du travail. Est-ce un chantier qu'on ouvre ?
   **À DÉFINIR.**
