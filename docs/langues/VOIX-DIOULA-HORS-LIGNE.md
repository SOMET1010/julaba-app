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

> **À LIRE AVANT DE CHERCHER LE DIOULA DANS L'APPLICATION.** Sélectionner
> « Dioula » dans les Réglages **ne fera pas encore parler Tantie en dioula**,
> et c'est VOULU, pas cassé. Le lot B7 a décidé qu'une langue non prête n'est
> plus servie au moteur (`LANGUE_PRETE.dioula = false`, `useLangPref.ts`) :
> une marchande qui lit « en préparation » ne doit pas entendre autre chose.
> Deux choses manquent encore, et aucune n'est de l'ingénierie : le décor
> dioula validé par Manus, et la décision de déclarer la langue prête. Le §7
> les nomme. La preuve que le MODÈLE parle dioula hors ligne, elle, est déjà
> faite : c'est le WAV de l'étape 1.

**5. LA MÉMOIRE et LA LATENCE**, pendant que l'application parle :

```bash
adb shell dumpsys meminfo com.julaba.app | head -20     # TOTAL PSS, en Ko
```

Relever **trois** valeurs : au lancement, après la première phrase dioula
(c'est là que le moteur se charge), après dix phrases. Et chronométrer la
première phrase — le chargement du modèle se paie une fois.

### Le geste qui comptera le plus, le jour où le dioula sera servi

Toujours en mode avion, langue réglée sur dioula, faire une **vente** et aller
jusqu'à la relecture du montant. **Tantie doit annoncer le montant en
FRANÇAIS.** Si elle l'annonce en dioula, **il faut tout arrêter** : le
garde-fou a cédé, et une marchande recevrait un chiffre faux avec autorité. Le
« Rapport de test » doit alors porter des lignes `I18N_FALLBACK` (dyu-ci →
fr-ci) et, le cas échéant, `VOIX_ARGENT_EN_FRANCAIS`.

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
| `frontend_src/src/app/i18n/voice/voixParLocale.test.mts` | la preuve, dans `verify` |

---

## 7. Ce qui reste, et à qui

| Ce qui manque | À qui | Pourquoi ce n'est pas de l'ingénierie |
|---|---|---|
| Le décor dioula validé | **Manus** | `dyu-ci.messages` est un squelette, gelé par le lot B7. Les 56 phrases de travail existent (`texteDyu`) et le test montre exactement quel filtre leur appliquer — mais les poser est une livraison linguistique, pas un refactor. |
| Déclarer le dioula prêt | **Patrick** | `LANGUE_PRETE.dioula = false` (`useLangPref.ts`). Le passer à `true` est une décision produit : c'est dire à une marchande « tu peux choisir cette langue ». |
| Les 110 nombres validés | **deux locutrices ivoiriennes** | C'est le seul verrou entre aujourd'hui et une caisse qui compte en dioula. Tant qu'il tient, l'argent répond en français — et le moteur l'impose. |
| La licence commerciale | **Patrick** | CC-BY-NC-4.0. Voir §3. |
| RAM, latence, mode avion | **un téléphone** | §5. |

Ce lot a livré tout ce qui pouvait l'être sans ces cinq-là : le modèle mesuré
et prouvé parlant, sa conversion reproductible, son installation, son plugin,
son câblage, et la preuve que l'argent ne passera pas.
