# ÉTAT DE LA CAISSE — recensement du 23/09/2026

Arbre recensé : `72a79ea`.

**Pourquoi ce document existe.** Cinq défauts de caisse ont été fermés coup sur
coup (CAI-08, CAI-02→CAI-09, BO-01, STK-01/02, CAI-07, CAI-10+CAI-11). Patrick,
le 23/09 : « on risque sinon de travailler sur des dettes devenues obsolètes ».
Ce n'est pas une copie du backlog : **chaque ligne ci-dessous a été revérifiée
contre le code de `72a79ea`**, et trois se sont révélées fausses.

**Ce qu'il ne fait pas.** Il ne ferme rien. Documenter une dette ne la ferme
pas ; seul un correctif prouvé le fait.

---

## 1. Ce que le recensement a CORRIGÉ

Trois lignes du backlog ne disaient pas la vérité du code. C'est le résultat le
plus utile de ce passage — et il valide la crainte de Patrick.

| Id | Ce que le backlog affirmait | Ce que le code dit | Preuve |
|---|---|---|---|
| CAI-04 | OUVERT — « demande `--figer-perimetre` » | **Déjà fermé le 22/09.** `etatCatalogueCaisse.ts` était au noyau (87 fichiers) dès ce commit | `git show c2a5e49:ci/PERIMETRE-ARGENT.json` → présent |
| CAI-05 | OUVERT — « demande `--figer-gardes` » | **Déjà fermé le 22/09**, même commit. L'empreinte porte les deux assertions, le garde dit « aucune assertion retirée » | `ci/EMPREINTE-GARDES.json`, entrée `caisseCharte` |
| CAI-07c | « `setTranscript` n'est **JAMAIS** remis à `''` » | **FAUX.** Il l'est deux fois : `reset()` l.542 et `startRecording()` l.941 | `grep -nE "setTranscript" useVoiceCore.ts` → 8 lignes |

**La cause de l'erreur CAI-07c est méthodologique et mérite d'être retenue :**
la mesure d'origine filtrait les lignes contenant `//` pour écarter les
commentaires. Les deux lignes qui vident `transcript` portent un commentaire en
fin de ligne. **Un filtre qui écarte des lignes de code au motif qu'elles
contiennent un commentaire produit une mesure fausse, et elle se présente avec
l'autorité d'un comptage.**

---

## 2. Défauts ENCORE OUVERTS sur la caisse — vérifiés un par un

| Id | Défaut | Vérification du 23/09 | Ce qui le débloque |
|---|---|---|---|
| **STK-03** | **Les tuiles ne nomment pas le bon produit.** 37 tuiles en dur pour 198 références au catalogue maître. « Igname » n'est ni Kponan, ni Bêtê-Bêtê, ni Florido, ni Krenglè — quatre variétés, quatre prix | `catalogue-produits.ts` : **37** noms ; `catalogue-maitre-julaba.v1.json` : **198** références | Arbitrage de Patrick : quelles variétés montrer, et comment (recherche ? familles ?) |
| **CAI-06** | Le catalogue servi depuis le cache du téléphone est modélisé (état `memoire`) **mais jamais montré** : une liste périmée est présentée comme à jour | `etatCatalogueCaisse.ts` définit `memoire` (l.35/58/63) ; seul `CaisseContext.tsx` l'importe ; **aucun composant marchand ne le lit** | Rien — travail direct, pas d'arbitrage |
| **DEP-03** | « Dernier taxe mairie : — » : le motif est collé après « Dernier » sans accord | `DepenseForm.tsx:340` — `Dernier {description.toLowerCase()} :` | Arbitrage de formulation (accorder ? reformuler sans adjectif ?) |
| **CAI-07c** | `transcript` n'est vidé qu'au DÉBUT du cycle suivant, jamais à la FIN du cycle en cours : une vente déjà au panier laisse « J'ai compris : … » affiché | Énoncé corrigé ci-dessus. Depuis CAI-07, ce bandeau est au moins SEUL à l'écran | Patrick, 23/09 : « je ne rouvrirais pas CAI-07c maintenant » |
| **MAR-VTE-001** | « Son clip Tata Nanti Lou n'est pas encore enregistré » s'affiche à la marchande | `useVoiceCore.ts:355` — la ligne existe toujours | **Desserrer VOICE-01** = décision de Patrick, jamais d'un agent |
| **ACC-05** | `playClip` jette son résultat : un clip absent de l'APK se résout en `failed` et nous parvient comme « joué » — le texte ne rattraperait pas | `services/audioManager.ts`, **figé par VOICE-01** contre `3917bb7` | Idem : desserrer VOICE-01 |

---

## 3. Ce qui a été fermé, et qui ne doit plus être rouvert

CAI-02, CAI-08, CAI-09 (a/b/c/d), CAI-07 (a/b), CAI-10, CAI-11, DEP-02, STK-01,
STK-02, BO-01, HIS-01. Chacun porte sa preuve d'exécution dans
`BACKLOG-PARCOURS.md` — rouge cité avant, vert cité après.

---

## 4. Lecture d'ensemble

Sur six dettes réellement ouvertes, **une seule est du travail direct** (CAI-06).
Les cinq autres attendent Patrick :

- **deux attendent un desserrage de VOICE-01** (MAR-VTE-001, ACC-05) — et c'est
  la même clé pour les deux ;
- **deux attendent un arbitrage de formulation ou de produit** (STK-03, DEP-03) ;
- **une est explicitement mise en attente** par Patrick (CAI-07c).

**STK-03 est la seule qui coûte de l'argent réel** : quatre variétés d'igname à
quatre prix derrière une seule tuile, c'est le prix de la marchande qui se
décide sur un nom approximatif. Les autres coûtent de la compréhension, pas des
francs.

---

*Méthode : aucune ligne n'a été reprise du backlog sans être revérifiée contre
le code de `72a79ea`. Les trois corrections du §1 sont le produit de cette
règle.*
