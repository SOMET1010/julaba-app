# Point bloquant « Installation de Sherpa » — réponse factuelle

11/08/2026. Réponses aux 8 questions d'Alex, établies en inspectant le
projet Android du dépôt (`android/`), le pont JS (`voice-offline/`) et le
composant « Installer ma voix » (`InstallerOffline.tsx`).

## La découverte qui change tout

**Le plugin natif SherpaStt N'EXISTE PAS dans le projet Android.**

Preuves :
- `android/app/src/main/java/com/julaba/app/MainActivity.java` est une
  coquille Capacitor vide (`extends BridgeActivity {}`) — aucun
  `registerPlugin`, aucun fichier Kotlin dans tout `android/`.
- Aucune dépendance `sherpa-onnx` dans `android/app/build.gradle`.
- Aucun modèle `.onnx`, aucun dossier `assets/` de modèle.
- Le pont JS (`nativeStt.ts`) définit le CONTRAT (« à respecter par
  SherpaSttPlugin.kt : isAvailable(), transcribe({pcm, sampleRate}) ») —
  ce fichier Kotlin n'a jamais été écrit.

Conséquence : `isAvailable()` répond « non » partout, y compris sur
l'APK. **Toute la reconnaissance vocale (connexion dictée, vente à la
voix, objectif) est aujourd'hui inopérante sur TOUS les canaux** — le
frontend est prêt et honnête (il propose le clavier en filet), mais le
moteur qu'il attend n'a pas encore d'implémentation native.

## Les 8 réponses

1. **Le moteur Sherpa est-il inclus dans l'APK ?** NON — le plugin natif
   n'existe pas encore (ni moteur, ni pont Kotlin).
2. **Le modèle vocal est-il inclus ?** NON — aucun modèle dans le dépôt.
3. **Quelle est sa taille ?** À arrêter au choix du modèle. Ordre de
   grandeur des modèles français sherpa-onnx quantisés int8 : ~40-75 Mo.
   Le chiffre exact sera mesuré au moment de l'intégration.
4. **Fonctionne-t-il dès le premier lancement sans réseau ?** Aujourd'hui
   NON (aucune reco nulle part). CIBLE (option 1 d'Alex) : OUI, si le
   modèle est embarqué dans l'APK.
5. **Que télécharge exactement « Installer ma voix » ?** RIEN. Depuis le
   retrait de Vosk, `InstallerOffline` ne télécharge plus : il SONDE le
   moteur natif et affiche « prêt » ou « la voix complète vit dans
   l'appli ». Le libellé « installer » est donc trompeur — à renommer
   (« Vérifier ma voix ») ou à supprimer.
6. **Clips, synthèse, reconnaissance : trois installations ?** Trois
   choses distinctes, dont AUCUNE ne s'installe à la demande :
   - clips de Tata (137 + 8) : embarqués dans le bundle web, pré-cachés
     par le service worker (« 137 clips voix pré-cachés » au build) ;
   - synthèse (montants dynamiques) : voix du SYSTÈME (rien à installer) ;
   - reconnaissance : ABSENTE (voir plus haut).
7. **Téléchargement interrompu ?** Sans objet aujourd'hui (rien ne se
   télécharge). Si l'option 2 (téléchargement guidé) était retenue, il
   faudrait reprise + intégrité + espace vérifié — raison de plus pour
   l'option 1.
8. **Espace libre nécessaire ?** À chiffrer avec le modèle retenu :
   APK actuel + modèle (~40-75 Mo) + marge d'extraction.

## Décision recommandée (option 1 d'Alex)

**Modèle essentiel INCLUS dans l'APK.** C'est la seule option compatible
avec « première vente vocale sans réseau et sans étape d'installation »,
et elle supprime toute la complexité de téléchargement (reprise, coût
données, quota). Chantier à ouvrir — livrables :
1. `SherpaSttPlugin.kt` implémentant le contrat du pont JS
   (`isAvailable`, `transcribe(pcm base64, sampleRate)` avec
   rééchantillonnage 16 kHz) ;
2. dépendance `sherpa-onnx` Android + modèle FR int8 dans les assets ;
3. mesure réelle : taille APK, RAM, latence de transcription sur
   téléphone d'entrée de gamme ;
4. recette sur appareils réels (liste d'Alex, décision n°4) : Android
   minimal, micro, oreillette, hors-ligne, fermeture forcée, batterie
   faible, stockage plein.

D'ici là : « Installer ma voix » est retiré de l'onboarding (il ne fait
rien) et la communication ne promet AUCUNE vente vocale — conforme à la
règle « ne promettre que ce que la matrice prouve ».

## Impact sur la matrice de capacités (REPONSE_AUDIT.md §3)

La ligne « Reconnaissance sherpa hors-ligne / APK : attendue, à recetter »
devient : **« ABSENTE — plugin natif à construire »**. La matrice est
corrigée dans ce lot.
