# Recherche — langues locales dans Sherpa-ONNX pour Julaba

Consultée le 10 septembre 2026 avant toute modification de l’application.

## Constats vérifiés

| Sujet | Conclusion | Source |
|---|---|---|
| Modèle français actuel | Les variantes Kroko Sherpa-ONNX incluent le français, mais pas le Bambara ni le Dioula. | [Collection Kroko INT8](https://huggingface.co/hudaiapa88/sherpa-stt-onnx) |
| Modèle multilingue | Sherpa-ONNX prend officiellement en charge Omnilingual ASR, dont les variantes 300M et 1B. | [Documentation Sherpa Omnilingual](https://k2-fsa.github.io/sherpa/onnx/omnilingual-asr/models.html) |
| Empreinte du modèle | `omniASR_CTC_300M` INT8 fournit une couverture de plus de 1 600 langues et représente environ 348 Mo après extraction. | [Documentation Sherpa Omnilingual](https://k2-fsa.github.io/sherpa/onnx/omnilingual-asr/models.html) |
| Type d’inférence | Le modèle Omnilingual est un modèle CTC de reconnaissance **hors ligne**, distinct du transducteur streaming Kroko employé pour le français. | [Exemple C officiel Sherpa-ONNX](https://github.com/k2-fsa/sherpa-onnx/blob/master/c-api-examples/omnilingual-asr-ctc-c-api.c) |

## Conséquence pour Julaba

Le français reste le moteur Kroko compact déjà embarqué. Le Dioula, le Bambara et les autres langues ne doivent pas être ajoutés à ce même pack : ils doivent constituer un **pack Omnilingual optionnel**, téléchargé en Wi-Fi et chargé via un `OfflineRecognizer` séparé. Cette décision évite de transformer l’APK de base en une application trop lourde et préserve la reconnaissance française de vente déjà opérationnelle.

## Références

1. [Sherpa-ONNX — modèles Omnilingual](https://k2-fsa.github.io/sherpa/onnx/omnilingual-asr/models.html)
2. [Sherpa-ONNX — exemple C Omnilingual ASR](https://github.com/k2-fsa/sherpa-onnx/blob/master/c-api-examples/omnilingual-asr-ctc-c-api.c)
3. [Collection Kroko ONNX INT8](https://huggingface.co/hudaiapa88/sherpa-stt-onnx)
