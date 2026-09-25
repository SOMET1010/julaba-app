# Livrer des fichiers audio à JULABA — la fiche technique

**25/09/2026.** Réponse à : « si je dois te fournir les fichiers WAV, donne-moi
les caractéristiques pour qu'ils puissent être utilisés dans ton code ».

Tout ce qui suit est **mesuré sur les 137 clips déjà en place**, pas recopié
d'une documentation. Là où la doc et les fichiers se contredisent, c'est dit.

---

## 1. Le format du master que tu me livres

| Caractéristique | Valeur | Pourquoi celle-là |
|---|---|---|
| Conteneur | `.wav` (PCM non compressé) | c'est le master : on ne compresse qu'une fois, à la fin |
| Profondeur | **16 bits** | suffisant pour de la parole ; 24 bits accepté aussi |
| Échantillonnage | **24 000 Hz** | c'est EXACTEMENT celui des 137 clips existants |
| Canaux | **mono** | les 137 clips sont mono ; du stéréo serait replié, sans gain |
| Niveau | **−16 LUFS intégré**, crête **≤ −1 dBTP** | valeur de post-production des 137 clips |
| Silences | coupés en tête et en queue, **≤ 100 ms** | sinon un enchaînement de deux clips fait un trou |

**Si ton outil ne sort pas du 24 kHz** : livre en 44 100 ou 48 000 Hz, je
ré-échantillonne à la conversion. Ne monte JAMAIS un fichier de 16 kHz vers
24 kHz — on n'invente pas de l'aigu qui n'a pas été enregistré.

### Ce que j'ai mesuré

```
frontend_src/public/voix/tata/*.mp3   137 fichiers
  MPEG-2 layer III · 96 kbps · 24 kHz · mono · ID3v2.4
  5,6 Mo au total · 42 ko en moyenne (~3,6 s) · le plus long 11,7 s

frontend_src/public/voix/fr-CI/prototype/*.mp3   15 fichiers
  MPEG-1 layer III · 96 kbps · 48 kHz · mono
  (parcours prototype, PAS le parcours marchande — ne pas s'en inspirer)
```

> **Contradiction relevée.** `docs/PLAN_PACKS_TATA_LANGUES.md` annonce
> « MP3 mono **44,1 kHz** ». Les fichiers réels sont à **24 kHz**. Ce sont les
> fichiers qui font foi — c'est eux qu'on entend. La doc sera corrigée.

---

## 2. Ce qui part dans l'APK n'est pas du WAV

Tu me livres du WAV, **l'application embarque du MP3**. Deux raisons mesurées,
pas une préférence :

1. **Le pré-cache hors-ligne ne ramasse que les `.mp3`.**
   `frontend_src/vite.config.ts:113` liste le dossier des clips en filtrant
   `f.endsWith(".mp3")`. Un `.wav` déposé là serait servi en ligne, mais
   **absent du pré-cache du service worker** : muet chez une marchande sans
   réseau — c'est-à-dire le cas normal.

2. **Le poids.** Du WAV 24 kHz / 16 bits / mono pèse 48 ko par seconde. Sur la
   durée moyenne mesurée (3,6 s), ça fait **173 ko par clip contre 42 ko**.
   Pour les 92 fichiers de ta nomenclature : **≈ 16 Mo au lieu de ≈ 3,9 Mo**
   embarqués dans l'APK.

**Conversion que j'applique** (identique aux 137 existants) :

```sh
ffmpeg -i AUTH_01.wav -ac 1 -ar 24000 -codec:a libmp3lame -b:a 96k auth-01.mp3
```

Le WAV reste le master : le jour où on change de débit ou de format, on repart
des WAV, pas des MP3.

---

## 3. LE POINT BLOQUANT : il me faut le texte, pas seulement le son

C'est la chose la plus importante de cette fiche.

L'application **ne choisit pas un clip par son nom de fichier**. Elle compare le
TEXTE qu'elle s'apprête à dire au texte enregistré dans le clip
(`services/tataUiClips.ts`). La normalisation appliquée est :

```
minuscules → accents retirés → ponctuation retirée → espaces compactés
```

Concrètement, ces trois écritures sont équivalentes pour le code :

```
« C'est bon, non ? »   →   c est bon non
C'EST BON NON          →   c est bon non
C'est bon non.         →   c est bon non
```

Mais **un seul mot en plus ou en moins, et le clip n'est jamais joué** — on
n'entendra que la voix de synthèse, sans aucun message d'erreur. C'est
silencieux, et c'est le piège.

### Donc, avec les WAV, livre-moi un fichier texte

Un CSV à deux colonnes suffit — une ligne par fichier :

```csv
fichier,texte_exact_prononce
AUTH_01.wav,"Bonjour ma fille. Moi, c'est Tantie Nanti Lou. Viens, je vais te montrer."
AUTH_02.wav,"Eh, ma fille ! Te voilà. On continue ?"
```

Le texte doit être **ce qui a été réellement prononcé**, mot pour mot. Si la
comédienne (ou l'outil) a dit « Viens, je vais te montrer **comment on fait** »
alors que le tableau disait « Viens, je vais te montrer », c'est la phrase
prononcée qu'il me faut. Sans ce fichier, je ne peux brancher aucun clip.

---

## 3 bis. Le nom du personnage : « Tantie Nanti Lou »

**Mis à jour le 25/09/2026** — remonté par l'agent de génération, vérifié et
corrigé dans le dépôt.

Le personnage s'appelle **« Tantie Nanti Lou »**. Pas « Tata ».

Ce n'est pas un arbitrage neuf : Patrick l'a tranché le **20/09/2026** et la
décision est écrite dans `services/loginVoiceScript.ts` — « Il remplace *Tata
Nanti Lou*, qui ne doit plus apparaître à l'écran ni dans une phrase dite. »

Quatre entrées du catalogue ne l'avaient pas appliquée : `AUTH_01`, `AUTH_009`,
`CORE_017`, `INTRO_ACCUEIL` — dont les deux toutes premières phrases qu'une
marchande entend. Deux d'entre elles **contredisaient leur propre source
déclarée** (`loginVoiceScript.ts:32` et `PropositionReconnaissance.tsx:114`
disaient déjà « Tantie »). C'est corrigé, et une garde de non-régression le
tient désormais (`npm run test:nom-personnage`, dans `verify`).

**Pourquoi ça vaut d'y revenir avant d'enregistrer.** La sélection du clip se
fait sur le texte normalisé — minuscules, sans accents, sans ponctuation.
`tata` et `tantie` n'y sont pas la même chaîne :

```
« Bonjour ma fille. Moi, c'est Tata Nanti Lou. »    → ... c est tata nanti lou
« Bonjour ma fille. Moi, c'est Tantie Nanti Lou. »  → ... c est tantie nanti lou
```

Un clip enregistré sur l'une ne serait **jamais** joué pour l'autre. Sans
erreur, sans trace. 92 clips à refaire en studio pour un mot.

**Une seule exception, déjà consignée** : le clip d'accueil `AKWABA_ACCUEIL`
enregistré dit encore « Tata ». Son texte, lui, dit « Tantie ». L'écart est
assumé et écrit dans le catalogue — le clip est marqué RÉENREGISTREMENT REQUIS.
On ne réaligne pas un texte sur un son périmé.

> **Effet de bord utile.** C'est ce désaccord qui empêchait `AUTH_01` d'être
> pré-rempli dans `TEXTES-PRE-REMPLI-GEMINI.csv` : le document de français de
> marché écrivait « Tantie », le catalogue écrivait « Tata », l'appariement par
> texte exact échouait. Corrigé, le CSV passe de 93 à **94 lignes remplies**.

---

## 4. Ta nomenclature — ce que j'en fais

Tu annonces 92 fichiers :

| Préfixe | Nombre | Périmètre |
|---|---|---|
| `AUTH_01` → `AUTH_37` | 37 | accueil, connexion, PIN, biométrie |
| `CORE_WAIT_01` → `07` | 7 | phrases d'attente (`useVoiceCore`) |
| `CORE_ACK_01` → `07` | 7 | validations, accusés de réception |
| `VENTE_01` → `VENTE_20` | 20 | vente vocale et caisse POS |
| `STK_01` → `STK_07` | 7 | stock vivrier et alertes |
| `DEP_01` → `DEP_03` | 3 | dépenses |
| `CRD_01` → `CRD_04` | 4 | cahier de crédit client |
| `WLT_01` → `WLT_07` | 7 | Wave / Mobile Money / Keiwa |
| **Total** | **92** | |

Cette nomenclature est **meilleure que l'existante** (`ui-001.mp3` …
`ui-137.mp3`, qui ne dit rien de ce qu'on entend). Je la garde.

Ce que je change à la conversion, et seulement ça : **minuscules et tirets** —
`AUTH_01.wav` → `auth-01.mp3`. Raison : les 137 fichiers actuels sont en
minuscules, et l'assemblage de l'APK recopie ce dossier tel quel vers
`android/app/src/main/assets/` où la casse compte. Une seule convention.

Le pré-cache les prendra automatiquement : il balaie le dossier, il n'y a
aucune liste à tenir à jour.

### Il manque 16 phrases — dont les dix chiffres

`services/loginVoiceScript.ts` contient **67 phrases**, pas 51. La nomenclature
annoncée en reprend trois familles sur six :

| Famille du script | Dans ta liste | Nombre |
|---|---|---|
| `AUTH_01` → `AUTH_37` | ✅ | 37 |
| `CORE_WAIT_01` → `07` | ✅ | 7 |
| `CORE_ACK_01` → `07` | ✅ | 7 |
| **`NUM_0` → `NUM_9`** | ❌ **absent** | **10** |
| **`CORE_ERR_01` → `04`** | ❌ **absent** | **4** |
| **`CORE_SYS_01` → `02`** | ❌ **absent** | **2** |

**Les dix chiffres sont les plus rentables du lot.** Zéro, Un, Deux … Neuf :
dix clips courts qui se recombinent pour dire n'importe quel montant, n'importe
quelle quantité, n'importe quel code. Ce sont eux qui font qu'une marchande qui
ne lit pas entend son argent dans une vraie voix plutôt qu'en synthèse. Dix
fichiers d'une seconde.

**Et `CORE_ERR_01` est précisément la phrase que le banc a trouvée muette :**

```
CORE_ERR_01  Non compris   « Je n'ai pas bien compris. Redis-moi ça autrement, s'il te plaît. »
CORE_ERR_02  Rien entendu  « Je n'ai rien entendu. Réessaie, parle un peu plus fort. »
CORE_ERR_03  Choix ambigu  « Dis oui pour valider, ou non pour annuler. »
CORE_ERR_04  Rappel écran  « Touche Oui ou Non à l'écran, s'il te plaît. »
CORE_SYS_01  Préparation   « Je prépare ta voix, un petit instant. »
CORE_SYS_02  Erreur réseau « Je n'ai pas réussi à préparer ta voix. Vérifie le réseau et réessaie. »
```

Je propose donc **108 fichiers au lieu de 92** — ta nomenclature inchangée,
plus `num-0` → `num-9`, `core-err-01` → `04`, `core-sys-01` → `02`. Les seize
phrases sont déjà écrites dans le script, mot pour mot : rien à rédiger.

### Les deux réserves sont levées — décisions de Patrick, 25/09/2026

**a) Keiwa (`WLT_01` → `WLT_07`) : on les met de côté, hors pilote.**
Je les convertis et je les range avec les autres. Je ne les branche dans aucun
parcours tant que le périmètre Keiwa n'est pas rouvert. Génère-les.

**b) L'origine de la voix : une voix IA distincte, qui n'est pas Tata.**
Pas de clonage de la voix réelle. Les ~95 phrases déjà couvertes par les clips
humains ne sont pas touchées : la voix IA ne sert que là où l'application parle
aujourd'hui en synthèse robotique.

---

## 4 bis. Ce que « distincte » veut dire concrètement — mesuré

La décision soulève une question qui n'est pas évidente : si la voix IA est un
AUTRE personnage, alors **deux voix cohabitent dans l'application**. J'ai mesuré
où, plutôt que de le supposer.

### Sur 48 fichiers qui font parler l'appli, 9 mélangeraient les deux voix

```
27 fichiers  uniquement des clips enregistrés  (voix humaine)
12 fichiers  uniquement de la synthèse         (voix IA)
 9 fichiers  LES DEUX, à la suite
```

Et ces neuf-là ne sont pas anodins. Les deux plus gênants :

```
hooks/useVoiceCore.ts    « J'ai compris »                         → voix humaine
                         « D'accord, j'annule. Pas de souci. »    → voix IA
   deux voix dans la MÊME conversation de vente vocale

DepenseForm.tsx          « Dépense enregistrée »                  → voix humaine
                         « Attention, le montant est élevé. »     → voix IA
   l'avertissement sur l'argent serait dit par la voix la moins familière
```

### Mais UNE SEULE phrase du lot se présente

C'est ce qui rend le problème petit. Sur les **67 phrases du script à
enregistrer, une seule prononce le nom** :

```
AUTH_01  « Bonjour ma fille. Moi, c'est Tantie Nanti Lou. Viens, je vais te montrer. »
```

Sur l'ensemble du catalogue (525 entrées), elles sont **cinq** : `AUTH_01`,
`AUTH_009`, `AKWABA_ACCUEIL`, `INTRO_ACCUEIL`, `CORE_017`. Rien d'autre ne dit
qui parle.

### Ce que je propose — et ce qui reste à trancher

**Une voix qui ne se présente jamais n'usurpe aucune identité.** Le principe
interdit de faire passer une IA pour Tata. Il n'oblige pas à inventer un second
prénom : il suffit que la voix IA ne dise jamais « Moi, c'est… ».

Concrètement : **`AUTH_01` reste réservée à la voix humaine**, et les 107 autres
fichiers peuvent être générés sans qu'aucune présentation ait lieu. La marchande
entend une voix d'assistance, pas un deuxième personnage qui se nomme.

**Pour l'agent, en attendant** : génère les 107 autres, **saute `AUTH_01`**.
Si Patrick préfère donner un nom à la seconde voix, seules ces cinq phrases
changeront — pas le lot.

> **Ce qui reste ouvert et qui appartient à Patrick** : faut-il donner un nom à
> la seconde voix, ou la laisser sans nom ? Ma recommandation est : sans nom.
> Tant que ce n'est pas tranché, `AUTH_01` n'est pas générée.

## 5. Récapitulatif — ce que j'attends de toi

1. **107 fichiers `.wav`** — les 92 annoncés, moins `AUTH_01` (voix humaine),
   plus les 16 manquants (`NUM_0`→`9`, `CORE_ERR_01`→`04`, `CORE_SYS_01`→`02`).
   PCM 16 bits, 24 kHz (ou 44,1/48 kHz), mono, −16 LUFS, silences coupés.
2. **Un CSV `fichier,texte_exact_prononce`** — sans lui, rien ne se branche.
   Le personnage s'appelle **« Tantie Nanti Lou »** (§ 3 bis).
3. ~~Ta réponse sur Keiwa~~ — tranché : hors pilote, on génère et on range.
4. ~~Ta réponse sur l'origine de la voix~~ — tranché : voix IA distincte,
   pas de clonage. Reste à dire si elle porte un nom (§ 4 bis).

Ce que je fais ensuite, sans rien te redemander : conversion en MP3
96 kbps / 24 kHz / mono, dépôt dans `frontend_src/public/voix/tata/`, ajout des
92 entrées dans `services/tataUiClips.ts`, garde de non-régression qui vérifie
que **chaque fichier livré a bien un texte et que chaque texte trouve bien son
fichier** — puis `verify`, puis APK.
