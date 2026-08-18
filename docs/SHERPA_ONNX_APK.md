# Voix hors-ligne APK — sherpa-onnx (implémentation)

18/08/2026. Lève le point bloquant de `REPONSE_SHERPA.md` : le plugin natif
`SherpaSttPlugin` **existe désormais** et implémente le contrat du pont JS
(`voice-offline/nativeStt.ts`). Option retenue : **option 1 d'Alex** — modèle
embarqué dans l'APK, première vente vocale sans réseau et sans installation.

## Ce qui est en place (ce lot)

| Pièce | Fichier | État |
|---|---|---|
| Plugin natif Capacitor | `android/app/src/main/java/com/julaba/app/SherpaSttPlugin.kt` | écrit, **API vérifiée contre l'AAR réel 1.13.5** (javap sur classes.jar : constructeurs, `acceptWaveform`, `inputFinished`, `isReady/decode/getResult`, `release`) |
| Enregistrement du plugin | `MainActivity.java` (`registerPlugin` avant `super.onCreate`) | fait |
| Kotlin dans le build | `android/build.gradle` (kotlin-gradle-plugin 2.0.21) + `app/build.gradle` (`org.jetbrains.kotlin.android`) | fait |
| Dépendance moteur | `app/build.gradle` → `files('libs/sherpa-onnx-1.13.5.aar')` | fait (AAR non commité) |
| Permission micro | `AndroidManifest.xml` : `RECORD_AUDIO` + `MODIFY_AUDIO_SETTINGS` — **était absente** : même avec un moteur, `getUserMedia` aurait échoué sur l'APK | fait |
| Téléchargement AAR + modèle | `android/scripts/installer-voix.sh` (reprise `-C -`, tailles vérifiées à l'octet) | fait |
| Exclusions git | `android/.gitignore` (`*.aar` déjà présent ; + `assets/sherpa-kroko-fr/`) | fait |

## Choix du modèle (données réelles, relevées le 18/08/2026)

**`csukuangfj/sherpa-onnx-streaming-zipformer-fr-kroko-2025-08-06`** (Hugging Face) :

| Fichier | Taille |
|---|---|
| encoder.onnx | 70 092 599 o (~70,1 Mo) |
| decoder.onnx | 617 488 o |
| joiner.onnx | 336 817 o |
| tokens.txt | 5 415 o |
| **Total** | **~71 Mo** — dans la fourchette 40-75 Mo annoncée |

Pourquoi celui-là : **français dédié** (pas multilingue dilué), récent (août 2025),
architecture zipformer maison de sherpa-onnx (chemin le mieux entretenu).
Écartés : zipformer FR 2023 int8 (encoder 126 Mo), variante Kroko fp32 alternative
(155 Mo), NeMo/canary multilingues (plus lourds, fichiers non publiés sur HF).

Moteur : **AAR officiel `sherpa-onnx-1.13.5.aar`** (release GitHub v1.13.5,
~49 Mo, libs natives incluses — URL vérifiée HTTP 200).

## Construire l'APK avec la voix

**Prérequis machine dev** : **JDK 21** (Temurin recommandé). Gradle 8.14
(utilisé par ce projet) est **incompatible avec JDK 25** — vérifié au premier
build réel (voir § Premier build réel). `java -version` doit afficher `21.x`
avant de lancer Gradle.

```bash
# depuis la racine du dépôt : construire le web AVANT le sync Android —
# webDir pointe vers frontend/dist, jamais peuplé sans ce build.
npm run build --workspace frontend_src
npx cap sync android   # copie frontend/dist dans android/app/src/main/assets/public

cd android
./scripts/installer-voix.sh   # pose l'AAR dans app/libs/ + le modèle dans assets/
./gradlew assembleDebug
```

⚠️ **`capacitor.config.ts` (racine)** : `webDir` doit valoir `'frontend/dist'`
(le dossier de sortie réel de Vite — `frontend_src/vite.config.ts` →
`build.outDir: "../frontend/dist"`). Une valeur malformée ou pointant vers
`frontend_src/dist` (jamais peuplé) fait échouer ou vider silencieusement
`npx cap sync` — c'est le blocage levé au premier build réel (ci-dessous).

Sans le script : le build **échoue explicitement** (unresolved `com.k2fsa.sherpa.onnx`)
— voulu, jamais un APK muet silencieux. Sans le modèle dans les assets :
l'APK se construit, `isAvailable()` répond `false`, le frontend garde son filet
clavier (comportement honnête existant).

## Premier build réel (18/08/2026, Aboa Akoun Bernard)

Premier `assembleDebug` hors sandbox — **BUILD SUCCESSFUL**.

| Constat | Détail |
|---|---|
| Blocage levé | `webDir` mal configuré à la racine empêchait `npx cap sync` de trouver le web build → corrigé sur `main` (voir avertissement ci-dessus) |
| JDK | **21 requis** (Temurin) — JDK 25 incompatible avec Gradle 8.14, build en échec |
| APK généré | `android/app/build/outputs/apk/debug/app-debug.apk` |
| Taille | **190 Mo** (debug, ABI non filtrées — cohérent avec ~49 Mo AAR + 71 Mo modèle + web + debug symbols ; alléger via `splits.abi`/AAB reste à décider, cf. § Points d'attention) |
| Modèle | Les 4 fichiers (encoder/decoder/joiner/tokens) bien intégrés dans l'APK |

Reste à faire (livrables 3 et 4 plus haut) : mesures RAM/latence sur appareil,
puis recette des 14 scénarios de la vente vocale + les cas limites (micro,
oreillette, hors-ligne, batterie faible…).

## Ce que ce lot NE fait PAS (limites sandbox — à faire sur machine dev)

1. **Compiler l'APK** : pas de SDK Android dans la sandbox. Le Kotlin est vérifié
   contre l'API réelle de l'AAR (javap), pas compilé. Premier `assembleDebug`
   chez le dev = la vraie validation.
2. **Mesures réelles** (livrable 3 de REPONSE_SHERPA) : taille APK finale,
   RAM, latence de transcription sur téléphone d'entrée de gamme. À relever au
   premier build et à consigner ici.
3. **Recette appareils** (livrable 4, liste d'Alex + SPEC_VENTE_VOCALE §9) :
   Android minimal, micro, oreillette, hors-ligne, fermeture forcée, batterie
   faible, stockage plein — et les 14 scénarios de la vente vocale.

## Points d'attention pour le premier build

- `modelType = "zipformer2"` (export streaming zipformer récent). Si le chargement
  échoue avec une erreur de type de modèle, essayer `"zipformer"` — une seule
  ligne dans `SherpaSttPlugin.kt`.
- L'AAR embarque les libs natives de toutes ABI → l'APK grossit d'~49 Mo + 71 Mo
  de modèle. Pour alléger : `splits { abi { … } }` ou app bundle (AAB) — décision
  à prendre APRÈS la première mesure réelle, pas avant.
- Le chargement du moteur prend quelques secondes au premier appel : il est
  paresseux (jamais au démarrage) et sérialisé (exécuteur mono-thread).
