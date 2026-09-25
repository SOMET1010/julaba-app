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

### Deux réserves, qui sont ton arbitrage — pas le mien

**a) `WLT_01` → `WLT_07` : Keiwa est hors pilote.** Tu l'as consigné toi-même.
Je peux convertir et ranger les 7 fichiers, mais je ne les branche pas dans le
parcours du pilote tant que tu ne le dis pas. Dis-moi : **on les garde de côté,
ou tu rouvres le périmètre Keiwa ?**

**b) Si ces WAV sont générés par une IA, ce n'est pas la voix de Tata.**
`docs/PLAN_PACKS_TATA_LANGUES.md`, § « Principe non négociable » :

> « La voix Tata Nanti Lou est une **voix humaine féminine locale**. Julaba ne
> génère pas une imitation de Tata (…). Les nouveaux audios doivent être
> enregistrés avec l'accord explicite de Tata, validés par elle. »

Trois sorties possibles, et c'est toi qui tranches :

1. **Enregistrement humain** (Tata ou une autre comédienne) → rien à arbitrer.
2. **Voix IA distincte, nommée autrement dans l'appli** → ne viole pas le
   principe, mais ce n'est plus « Tantie Nanti Lou » qui parle. Il faut alors
   décider du nom, et l'écran de bienvenue change.
3. **Clonage de la voix réelle de Tata** → c'est exactement ce que le principe
   interdit. Il faudrait son accord écrit avant, pas après.

Je ne bloque rien et je ne décide pas : je pose la question parce que la règle
a été écrite comme non négociable dans le dépôt, et qu'une fois les clips
diffusés dans un APK, on ne les reprend plus.

---

## 5. Récapitulatif — ce que j'attends de toi

1. **92 fichiers `.wav`** — PCM 16 bits, 24 kHz (ou 44,1/48 kHz), mono,
   −16 LUFS, silences coupés.
2. **Un CSV `fichier,texte_exact_prononce`** — sans lui, rien ne se branche.
3. **Ta réponse sur Keiwa** (les 7 `WLT_`).
4. **Ta réponse sur l'origine de la voix** (humaine / IA distincte / clonage).

Ce que je fais ensuite, sans rien te redemander : conversion en MP3
96 kbps / 24 kHz / mono, dépôt dans `frontend_src/public/voix/tata/`, ajout des
92 entrées dans `services/tataUiClips.ts`, garde de non-régression qui vérifie
que **chaque fichier livré a bien un texte et que chaque texte trouve bien son
fichier** — puis `verify`, puis APK.
