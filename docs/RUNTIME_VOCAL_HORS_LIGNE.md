# Runtime vocal Julaba — politique hors ligne

## Décision produit

Le parcours marchand vocal de Julaba est conçu pour fonctionner sans connexion Internet. Pendant une vente, l’application ne contacte ni API STT, ni API TTS, ni API de traduction. La voix de référence est **Tata Nanti Lou**, féminine et ivoirienne.

## Chaîne autorisée sur le téléphone

| Étape | Composant local | Règle |
|---|---|---|
| Écoute et transcription française | Sherpa-ONNX Kroko FR dans l’APK | Aucun appel réseau |
| Compréhension de vente | `intentLocal` | Aucun LLM distant |
| Confirmation d’action | `offlineCaisse` + file de synchronisation | La vente est conservée localement puis synchronisée plus tard |
| Réponse vocale fixe | Clips MP3 Tata embarqués | Lecture locale via `audioManager` |
| Réponse dynamique non couverte | Texte visible ; aucun TTS distant | Ne pas feindre une voix locale absente |

Le runtime ne charge plus de manifeste vocal distant, ne joue aucun pack publié depuis un CDN et ne contacte plus le TTS Dioula/Bambara. Les fonctions de préparation de contenus peuvent rester hors de l’application : elles servent à créer des fichiers audio **avant** le build, puis ces fichiers sont embarqués avec l’APK.

## Tata Nanti Lou : stratégie de qualité

Les 137 clips Tata déjà embarqués restent prioritaires. Pour éviter les voix françaises génériques sur les phrases dynamiques, la prochaine livraison doit constituer un pack local plus complet : nombres, montants, unités, produits fréquents, confirmations, corrections et messages d’erreur. Si une phrase n’a pas de clip Tata local, Julaba n’utilise pas une voix cloud à la place.

| Niveau | Contenu | État |
|---|---|---|
| 1 | Clips Tata fixes de navigation et confirmation | Disponible |
| 2 | Clips Tata composables : nombres, francs, quantités, produits | À enregistrer / intégrer |
| 3 | Voix Tata locale générative (entraînement d’un modèle avec consentement) | Piste de recherche, non requise pour le pilote |

## Langues locales

Le français de vente demeure le pack par défaut. Le Dioula et le Bambara doivent être distribués comme des packs séparés : modèle ASR local + clips Tata correspondants. Aucun modèle ou clip linguistique ne sera téléchargé pendant une vente. Un utilisateur peut les installer au préalable sur Wi-Fi, puis les utiliser sans connexion.

## Test de non-régression

`npm run test:offline-voice-runtime` remplace `fetch` par une erreur et vérifie que le manifeste de voix et le TTS Dioula n’émettent aucun appel réseau.
