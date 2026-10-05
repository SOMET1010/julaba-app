# Tantie parle dioula, hors ligne — lot 1

**État au 21/09/2026.** Tout ce qui est marqué « mesuré » l'a été sur machine,
commande à l'appui. Tout ce qui est marqué « à mesurer » ne l'a pas été : il
n'y avait ici ni téléphone ni émulateur, et on ne rapporte pas un chiffre
qu'on n'a pas relevé.

---

## 1. Ce qui est mesuré

| Ce qu'on mesure | Valeur | Comment |
|---|---|---|
| Poids publié (fp32, export optimum) | **114 221 861 o** | téléchargé depuis la release `voix-dyu-mms-v1`, taille relevée octet pour octet — identique à l'annonce |
| Poids adapté à sherpa, avant quantification | 114 222 160 o | `convertir-voix-dyu.py`, étape 1 |
| **Poids embarqué (int8, sherpa)** | **38 329 231 o — 36,6 Mio** | `convertir-voix-dyu.py`, étape 3 |
| Synthèse locale, sans serveur | oui, fp32 **et** int8 | `convertir-voix-dyu.py`, étape 4 : « i ni ce » → 14 592 échantillons à 16 kHz (0,91 s), rms 0,0942, WAV écrit sur disque |
| Nombre de tokens | 32 | `tokens.txt`, dérivé du vocabulaire du checkpoint |

La cible « 30 à 40 Mo après quantification » **n'est plus une cible** : le
fichier existe et pèse 38 329 231 octets. L'APK grossit donc de **~37 Mio**
quand la voix dioula est embarquée, et de **0** quand elle ne l'est pas.

Ce qui **n'a pas** été mesuré, et qu'il ne faut pas lire entre les lignes :
la RAM, la latence de la première phrase, le comportement en mode avion sur
l'appareil. Aucun de ces trois n'est mesurable sans téléphone. Le protocole du
§5 est fait pour que ça prenne cinq minutes.

---

## 2. Deux choses qu'on nous avait dites, et qui se sont révélées fausses

**« sherpa-onnx lit nativement les modèles MMS-TTS. »** C'est vrai des modèles
exportés par le script de sherpa. Ce n'est pas vrai du port publié : il a été
produit par `optimum-cli` **pour un navigateur** (transformers.js). Graphe en
main :

```
entrées  : input_ids, attention_mask        sherpa attend : x, x_length,
sorties  : waveform, spectrogram                            noise_scale,
metadata : AUCUNE                                           length_scale,
                                                            noise_scale_w
```

Et quand les métadonnées manquent, **sherpa ne retombe pas** : la macro
`SHERPA_ONNX_READ_META_DATA` appelle `SHERPA_ONNX_EXIT(-1)`. Donner le fichier
publié tel quel au plugin n'aurait pas produit un silence rattrapable, mais un
**processus tué**. `android/scripts/convertir-voix-dyu.py` existe pour ça.

**Ce que la conversion coûte.** L'export a figé la durée et le bruit dans des
constantes : la voix dioula **n'honore pas le réglage de vitesse**. Le plugin
le sait (`vitesseReglable = false`) et coerce la vitesse à 1.0 plutôt que de
laisser croire que le curseur agit.

---

## 3. La licence, et pourquoi la voix est éteinte par défaut

`facebook/mms-tts-dyu` est publié en **CC-BY-NC-4.0 — non commercial**. C'est
exactement la licence pour laquelle `installer-voix.sh` avait écarté
`vits-mms-fra` au profit de siwis/Piper pour le français. Elle n'a pas changé
d'avis parce que la langue a changé.

Ce qu'elle interdit exactement : **distribuer**. Elle n'interdit pas de
**tester** — et au moment de la distribution, ce modèle sera de toute façon
remplacé par de vrais enregistrements (§5 bis).

Conséquence assumée : **un build ordinaire n'embarque aucune voix dioula.**
Il faut le demander :

```bash
cd android && JULABA_VOIX_DYU=1 ./scripts/installer-voix.sh
```

Distribuer commercialement un APK contenant cette voix est une **décision à
prendre**, pas un effet de bord d'un build. Si elle est prise dans l'autre
sens, la sortie est connue : un modèle MMS réexporté n'y changera rien (c'est
l'amont qui est NC), il faudra une voix dioula sous licence permissive — ou
enregistrée par nous.

---

## 4. L'argent reste en français

**La règle.** Le décor (accueil, encouragements, questions, guidage) peut se
dire en dioula. **Tout ce qui est `critiqueArgent` continue de se dire en
français**, jusqu'à validation humaine des 110 nombres par deux locutrices.
Cela vaut **aussi** dans un build d'essai `JULABA_VOIX_DYU=1` : ce drapeau-là
ne touche pas à l'argent, et `test:voix-dyu-argent` le prouve, inchangé. La
seule exception au monde est le **second** drapeau, `JULABA_DYU_ARGENT=1`, qui
n'existe que pour écouter une voix et jamais pour juger un compte (§5 bis).

**Pourquoi.** Les nombres dioula du corpus sont en DRAFT, et un nombre
mandingue seul est ambigu entre francs et dɔrɔmɛ : « mugan » vaut 20 F ou
100 F. Une Tantie qui annoncerait un montant en dioula dirait un chiffre faux
**avec autorité**, à une femme qui ne peut pas le relire.

**Comment c'est tenu.** Par le moteur, pas par une convention :

1. le runtime i18n refuse déjà de servir une clé `critiqueArgent` depuis une
   locale non validée finance — il replie sur `fr-ci` et le trace ;
2. `voixParLocale.ts` fait suivre la voix à la locale **réellement servie**,
   jamais à la locale demandée. Un message d'argent arrive donc déjà étiqueté
   `fr-ci`, et la voix française suit mécaniquement ;
3. une seconde barrière refuse le contournement : même sur un `MessageVocal`
   fabriqué à la main qui prétendrait venir du dioula, un montant repart en
   français, avec un motif traçable (`argent-non-valide`) ;
4. le test **simule** le dioula de demain — `dyu-ci` peuplé de tout le décor
   de travail du dépôt — et vérifie que la règle tient encore dans ce
   monde-là. La prouver sur le squelette vide d'aujourd'hui ne prouverait
   rien : elle y est vraie par accident ;
5. bonus gratuit : le vocabulaire du modèle MMS dioula ne contient **aucun
   chiffre**. Il ne sait physiquement pas prononcer « 500 ».

**La preuve.** `npm run test:voix-dyu-argent -w frontend_src`, dans `verify` :

```
[A] aujourd'hui — dyu-ci est vide (lot B7), et l'argent est déjà français
[B] demain — dyu-ci peuplé de 56 phrases de décor dioula
  ✓ les 124 clés critiques restent servies par fr-ci
  ✓ mot pour mot le texte français
  ✓ aucune lettre dioula (ɛ ɔ ŋ ɲ) dans une phrase d'argent
[C] les 124 clés critiques partent sur la voix « fr »
[décor] les 56 phrases de décor sont dites en dioula, par la voix dioula
[D] un message d'argent étiqueté « dyu-ci » reste dit en français
```

**Le jour où les nombres seront validés**, ce fichier n'aura pas une ligne à
changer : `voixPeutDireArgent` interroge le moteur, la réponse basculera seule.
Passer une validation de `draft` à `native_validated` est un **acte humain**,
pas une modification de code.

**L'écoute n'est pas dans ce lot.** `dyu-ci.intents` reste vide : tout ce qui
est *entendu* continue d'être traité exactement comme en `fr-ci`. Faire parler
Tantie coûte environ dix fois moins cher que la faire comprendre, et pour une
femme qui ne lit pas, c'est le canal décisif — elle comprend, et elle répond
au doigt.

---

## 5. Le protocole téléphone, en cinq gestes

À faire par quelqu'un qui a un appareil. C'est la seule preuve qui compte.

```bash
# 1. Poser la voix (télécharge 114 Mo, convertit, quantifie, VÉRIFIE qu'elle parle)
pip install onnx onnxruntime
cd android && JULABA_VOIX_DYU=1 ./scripts/installer-voix.sh
#    → attendu : « voix dioula posée (38 329 231 o) »
#    → écouter android/app/src/main/assets/sherpa-tts-dyu/verification-dyu.wav
#      (c'est déjà, sur cette machine, une phrase dioula synthétisée sans serveur)

# 2. Construire et installer
./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk

# 3. LA TAILLE — comparer avec un APK construit SANS JULABA_VOIX_DYU
ls -l app/build/outputs/apk/debug/app-debug.apk
#    → attendu : environ +37 Mio par rapport au même APK sans la voix dioula
```

**4. Mode avion.** Activer le mode avion **avant** d'ouvrir l'application (pas
après : on veut prouver qu'aucun appel réseau n'est nécessaire, pas qu'un
cache existe). Ouvrir l'application, faire une vente, aller jusqu'à la
relecture du montant. **Rien ne doit changer** : tout se dit en français, tout
marche hors ligne, et l'APK ne plante pas alors qu'il porte une voix de plus.

> **À LIRE AVANT DE CHERCHER LE DIOULA DANS L'APPLICATION.** Dans un build
> ORDINAIRE, sélectionner « Dioula » dans les Réglages est impossible : la
> langue est grisée, et c'est VOULU, pas cassé (lot B7 —
> `LANGUE_PRETE.dioula = false`). Dans un build d'ESSAI construit avec
> `JULABA_VOIX_DYU=1`, elle se choisit et Tantie parle dioula. Voir le §5 bis,
> qui est le cœur de ce lot.

**5. LA MÉMOIRE et LA LATENCE**, pendant que l'application parle :

```bash
adb shell dumpsys meminfo com.julaba.app | head -20     # TOTAL PSS, en Ko
```

Relever **trois** valeurs : au lancement, après la première phrase dioula
(c'est là que le moteur se charge), après dix phrases. Et chronométrer la
première phrase — le chargement du modèle se paie une fois.

### Le geste qui compte le plus

**Sur un build `JULABA_VOIX_DYU=1` seul** (le cas normal du pilote) : mode
avion, langue réglée sur dioula, faire une **vente** et aller jusqu'à la
relecture du montant. Le décor doit se dire en dioula — c'est ce qu'on est venu
écouter — et **Tantie doit annoncer le montant en FRANÇAIS**. Si elle l'annonce
en dioula, **il faut tout arrêter** : le garde-fou a cédé, et une marchande
recevrait un chiffre faux avec autorité. Le « Rapport de test » doit porter des
lignes `I18N_FALLBACK` (dyu-ci → fr-ci) et, le cas échéant,
`VOIX_ARGENT_EN_FRANCAIS`.

**Sur un build qui porte AUSSI `JULABA_DYU_ARGENT=1`**, le montant en dioula
est attendu : c'est ce que le drapeau demande. Alors le geste change de sens —
on écoute **comment ça sonne**, on ne vérifie **jamais le compte**. Et le
« Rapport de test » doit porter une ligne `VOIX_ARGENT_EN_DIOULA_DE_TEST` par
montant dit : si elle manque, la dérogation est passée en silence, et c'est
elle qu'il faut réparer. Voir le §5 bis.

---

## 5 bis. Les deux drapeaux de construction — « tester, pas distribuer »

> « Je suis en train de tester une solution, je ne suis pas en train de la
> distribuer. Au moment de la distribution, je vais enregistrer des voix. »
> — Patrick, 22/09/2026

Le lot précédent avait été prudent au mauvais endroit : la licence CC-BY-NC
interdit une **distribution commerciale**, pas un **build d'essai**. Et à la
distribution, ce modèle disparaîtra derrière de vrais enregistrements. D'où
deux interrupteurs, **éteints par défaut**, qui ne changent rien à un build
ordinaire.

| Drapeau | Ce qu'il commande | L'argent |
|---|---|---|
| *(rien)* | le comportement d'aujourd'hui : rien dans l'APK, dioula grisé, `dyu-ci` squelette vide | français |
| `JULABA_VOIX_DYU=1` | **les trois verrous ensemble** : voix MMS dans les assets, « Dioula » sélectionnable, `dyu-ci` peuplée des **56 phrases de travail** du dépôt (`texteDyu`) | **français** |
| `+ JULABA_DYU_ARGENT=1` | **en plus** : les clés `critiqueArgent` qui ont une traduction dioula sont dites en dioula | **dioula — dérogation d'essai** |

```bash
# Un build d'essai complet, du modèle à l'APK
cd android && JULABA_VOIX_DYU=1 ./scripts/installer-voix.sh
JULABA_VOIX_DYU=1 npm run build -w frontend_src && cd android && ./gradlew assembleDebug
```

**Les trois verrous se lèvent ENSEMBLE, et c'est le point.** En lever un seul ne
sert à rien : une voix sans phrases est muette, des phrases sans voix sont
illisibles, une langue non sélectionnable n'est ni l'une ni l'autre. C'est pour
ça qu'il y a UN drapeau et pas trois.

### Pourquoi le garde B7 reste entier

Le lot B7 exige que `dyu-ci` soit un squelette vide et que `LANGUE_PRETE.dioula`
vaille `false`. Ce lot ne le défait pas, parce qu'il précise ce que ce garde
interdit :

> **il interdit de LIVRER une demi-langue — pas de la TESTER.**

Les deux drapeaux sont des `define` de bundler. Ils n'existent dans **aucun
processus Node** : ni `verify`, ni `test:ci`, ni la CI ne les voient. Le train
de tests mesure donc toujours la configuration **livrable**, et il y voit
exactement ce que B7 exige. Une variable lue au runtime aurait fait l'inverse :
elle aurait **désarmé** le garde dans le processus qui l'évalue.

Corollaire assumé : lancer `verify` avec ces variables dans l'environnement ne
change rien, par construction. Ce que les drapeaux commandent est prouvé
autrement — `npm run test:drapeaux-dyu` appelle les mêmes fonctions en leur
passant l'état des drapeaux en argument et compare les **trois états côte à
côte dans un seul processus**.

### Le second drapeau ouvre un chemin qu'on sait FAUX

`JULABA_DYU_ARGENT=1` **sert à juger le SON, jamais le COMPTE. Il ne doit
jamais être allumé dans un build remis à une marchande.** Les nombres dioula du
corpus sont en brouillon, non validés, et un nombre mandingue nu est ambigu
entre francs et dɔrɔmɛ : « mugan » vaut 20 F ou 100 F. Une Tantie qui annonce
un montant en dioula peut dire un chiffre juste à l'oreille et **faux au
compte**.

Il est donc **bruyant**, pour qu'on puisse constater après coup qu'un build
l'avait allumé :

- `vite` l'écrit en clair au moment de la construction ;
- la console du téléphone le redit au démarrage de l'application ;
- **chaque montant réellement dit en dioula** écrit une ligne
  `VOIX_ARGENT_EN_DIOULA_DE_TEST` au « Rapport de test ».

Et ce qu'il ne lève PAS, même allumé :

- **les chiffres (`NUM_0`…`NUM_9`) restent écartés**, nommément — c'est la
  matière même du risque ;
- **les gabarits à variables restent écartés** : un `{montant}` n'entre pas
  dans une phrase dioula par la porte de derrière ;
- **les intentions STT restent vides** : ce lot fait *parler* Tantie, il ne
  change rien à ce qu'elle *entend*, donc rien à la caisse ;
- **la donnée ne ment pas** : les phrases restent étiquetées
  `draft` / `finance: false`. C'est le *build* qui assume de passer outre, pas
  la validation qu'on maquille.

---

## 6. Où c'est

| Fichier | Ce qu'il fait |
|---|---|
| `android/scripts/convertir-voix-dyu.py` | adapte le port ONNX à sherpa, écrit `tokens.txt`, quantifie, **vérifie que ça parle** |
| `android/scripts/installer-voix.sh` | étape 4/4, derrière `JULABA_VOIX_DYU=1` |
| `android/app/src/main/java/com/julaba/app/SherpaTtsPlugin.kt` | un moteur par voix, repli tracé sur le français |
| `frontend_src/src/app/i18n/voice/voixParLocale.ts` | **quelle voix dit quoi** — et pourquoi l'argent reste français |
| `frontend_src/src/app/i18n/voice/renduVoixLocale.ts` | le branchement, sur le point d'extension prévu par `contrat-audio.ts` |
| `frontend_src/src/app/voice-offline/nativeTtsVoix.ts` | le pont JS multilingue, à côté de `nativeTts.ts` qui reste gelé (VOICE-01) |
| `frontend_src/src/app/i18n/voice/voixParLocale.test.mts` | la preuve que l'argent reste français, dans `verify` — **inchangée** |
| `frontend_src/src/app/i18n/voice/drapeauxDeTest.ts` | **les deux drapeaux**, et le raisonnement complet sur le garde B7 |
| `frontend_src/src/app/i18n/voice/locales/dyu-ci/decorDeTest.ts` | le décor construit depuis les seules `texteDyu` du dépôt, et le filtre qui l'écarte |
| `frontend_src/src/app/i18n/voice/drapeauxDyu.test.mts` | les **trois états** côte à côte, dans `verify` |
| `frontend_src/vite.config.ts` | les deux `define`, et l'avertissement à la construction |

---

## 7. Ce qui reste, et à qui

| Ce qui manque | À qui | Pourquoi ce n'est pas de l'ingénierie |
|---|---|---|
| Le décor dioula **validé** | **Manus** | Un build d'essai sert les 56 phrases de travail (`texteDyu`), non validées par une locutrice. Les poser EN DUR dans `dyu-ci.messages` — donc les livrer — est une décision linguistique, pas un refactor. Le filtre qu'il faudra tenir est écrit et prouvé (`decorDeTest.ts`). |
| Déclarer le dioula prêt | **Patrick** | `LANGUE_PRETE.dioula = false` (`useLangPref.ts`) dit ce qui est prêt à être LIVRÉ, et n'a pas bougé. Le passer à `true` est une décision produit : c'est dire à une marchande « tu peux choisir cette langue ». |
| Les 110 nombres validés | **deux locutrices ivoiriennes** | C'est le seul verrou entre aujourd'hui et une caisse qui compte en dioula. Tant qu'il tient, l'argent répond en français — et le moteur l'impose. |
| La licence commerciale | **Patrick** | CC-BY-NC-4.0. Voir §3. |
| RAM, latence, mode avion | **un téléphone** | §5. |

Ce lot a livré tout ce qui pouvait l'être sans ces cinq-là : le modèle mesuré
et prouvé parlant, sa conversion reproductible, son installation, son plugin,
son câblage, et la preuve que l'argent ne passera pas.
