# Prompt pour l'agent de génération vocale — JÙLABA

**Version de référence : `d19d3f2`** · 25/09/2026
À copier-coller tel quel. Joindre `docs/voix/LOT-A-ENREGISTRER.csv`.

---

Tu génères la voix française de JÙLABA, une application de caisse pour des
marchandes de vivrier en Côte d'Ivoire **dont beaucoup ne savent pas lire**.
Tout ce qui compte dans cette application se dit à voix haute. Un message qui
ne sort pas est un message qui n'existe pas.

## 1. Ce que tu produis

**89 fichiers `.wav`**, un par ligne du CSV joint (`LOT-A-ENREGISTRER.csv`).

Le CSV a trois colonnes : `fichier`, `texte_a_enregistrer`, `origine`.
Le nom du fichier est donné — ne le change pas. Le texte est donné — ne le
reformule pas, ne le corrige pas, n'ajoute ni ne retire un mot.

| Famille | Fichiers | Contenu |
|---|---|---|
| `auth-02` → `auth-37` | 36 | accueil, connexion, code, biométrie |
| `core-wait-01` → `07` | 7 | phrases d'attente |
| `core-ack-01` → `07` | 7 | accusés de réception |
| `core-err-01` → `04` | 4 | incompréhension, silence, choix |
| `core-sys-01` → `02` | 2 | moteur vocal |
| `num-0` → `num-9` | 10 | **les dix chiffres** |
| `vente-*`, `stk-*`, `dep-*`, `crd-*`, `wlt-*`, `dash-*` | 23 | phrases fixes d'écran |

**Les dix chiffres sont les plus importants du lot.** Zéro, Un, Deux … Neuf :
dix clips d'une seconde qui se recombinent pour dire n'importe quel montant.
Ce sont eux qui font qu'une marchande qui ne lit pas entend son argent dans une
vraie voix plutôt qu'en synthèse. Soigne-les autant que les phrases longues :
articulation nette, même niveau, aucune traîne à la fin.

## 2. Format technique

| Caractéristique | Valeur |
|---|---|
| Conteneur | `.wav` PCM |
| Profondeur | **16 bits** (24 bits accepté) |
| Échantillonnage | **24 000 Hz** |
| Canaux | **mono** |
| Niveau | **−16 LUFS** intégré, crête **≤ −1 dBTP** |
| Silences | coupés en tête et en queue, **≤ 100 ms** |

Ces valeurs sont mesurées sur les 137 clips humains déjà embarqués dans
l'application, pas recopiées d'une documentation. Les nouveaux fichiers vont
s'enchaîner avec eux dans la même phrase : un écart de niveau ou un silence
résiduel s'entend immédiatement.

**Si ton moteur ne sort pas du 24 kHz** : livre en 44 100 ou 48 000 Hz, la
conversion est faite ensuite. **Ne monte jamais** un fichier de 16 kHz vers
24 kHz — on n'invente pas de l'aigu qui n'a pas été enregistré.

Dis-moi ce que chaque moteur a **réellement** produit, plutôt que de l'annoncer
d'avance.

## 3. La voix

**Une voix féminine ivoirienne, chaleureuse, posée.** Le registre est celui
d'une aînée du marché qui explique à une plus jeune : tutoiement, phrases
courtes, aucune condescendance, aucun jargon.

**Débit ralenti d'environ 10 %** par rapport à un débit de lecture normal. Les
137 clips existants le sont — c'est une application utilisée dans le bruit d'un
marché, par des personnes qui n'ont pas l'habitude qu'une machine leur parle.

### Ce que cette voix n'est pas

**Ce n'est pas un clonage de la voix réelle de Tantie Nanti Lou.** Le dépôt
porte une règle écrite comme non négociable : la voix de Tantie Nanti Lou est
une voix humaine locale, et « Julaba ne génère pas une imitation de Tata ».
Patrick a tranché le 25/09/2026 : **une voix IA distincte**, qui ne prend aucun
échantillon de la comédienne comme référence.

**Cette voix ne se présente jamais.** Aucune des 89 phrases ne dit « Moi,
c'est… » — c'est vérifié, et c'est pour ça que `auth-01` (« Bonjour ma fille.
Moi, c'est Tantie Nanti Lou ») **ne fait pas partie du lot**. Ne la génère pas.
Une voix qui ne se présente pas n'usurpe aucune identité.

Si un texte du CSV te semblait nommer le personnage, **arrête-toi et signale-le**
au lieu de générer.

## 4. Le livrable qui conditionne tout : le CSV des textes

Avec les 89 `.wav`, livre un CSV à deux colonnes :

```csv
fichier,texte_exact_prononce
auth-02.wav,"Eh, ma fille ! Te voilà. On continue, non ?"
num-0.wav,"Zéro"
```

**Pourquoi c'est le point bloquant.** L'application ne choisit pas un clip par
son nom de fichier : elle compare le **texte** qu'elle s'apprête à dire au texte
du clip, après normalisation (minuscules, accents retirés, ponctuation retirée,
espaces compactés). Un seul mot en plus ou en moins, et le clip **n'est jamais
joué** — pas d'erreur, pas de trace, juste la voix de synthèse à la place.
C'est silencieux, et c'est le piège.

Si le moteur a prononcé autre chose que le texte demandé (mot avalé, liaison,
reformulation), **c'est ce qui a été réellement prononcé** qu'il faut écrire
dans ce CSV. Ne recopie pas la colonne d'entrée par facilité.

## 5. Ce que tu ne fais pas

- **Ne génère pas `auth-01`** (§ 3).
- **Ne génère aucune phrase contenant une variable** entre accolades —
  `{montant}`, `{produit}`, `{quantité}`. Elles se composent au moment de
  parler et ne peuvent pas être un clip unique. Elles sont sorties du lot et
  listées à part dans `LOT-PHRASES-DYNAMIQUES.csv` ; elles feront l'objet d'un
  autre travail, avec des fragments et les dix chiffres.
- **Ne reformule aucun texte**, même si une tournure te paraît maladroite.
  Signale-le, ne le corrige pas.
- **Ne renomme aucun fichier.**

## 6. Les 7 fichiers `wlt-*`

Ils concernent le portefeuille Mobile Money / Keiwa, **consigné hors pilote**.
Génère-les quand même : ils seront convertis et rangés, mais branchés dans
aucun parcours tant que le périmètre n'est pas rouvert. Ce n'est pas du travail
perdu, c'est du travail en avance.

## 7. Ce que tu renvoies

1. Les **89 fichiers `.wav`**.
2. Le **CSV `fichier,texte_exact_prononce`**.
3. Une **note courte** disant : quel moteur, quel échantillonnage et quelle
   profondeur ont réellement été produits, quel niveau mesuré, et la liste des
   fichiers sur lesquels tu as un doute (prononciation, coupure, texte qui ne
   correspond pas).

Ce dernier point vaut autant que les fichiers. Un doute signalé coûte une
minute ; un doute gardé pour toi coûte un passage en studio.
