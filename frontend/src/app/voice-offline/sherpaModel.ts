// ──────────────────────────────────────────────────────────────────────────
// sherpaModel.ts — Modèle FR + config du moteur sherpa-onnx (STT streaming WASM).
//
// Le RUNTIME (glue Emscripten + wasm, ~19 Mo) est vendored par
// scripts/install-sherpa-stt.sh dans public/voix/sherpa/ (déployé avec l'appli,
// jamais versionné en dur dans le repo).
// Le MODÈLE français (~128 Mo int8) est, lui, téléchargé À L'INSTALLATION
// (consentement explicite de la marchande, cf. InstallerOffline) depuis
// HuggingFace puis persisté dans la Cache API → recharge hors-ligne instantanée.
//
// ⚠️ Le runtime officiel est compilé avec pthreads → il exige une origine
// « cross-origin isolated » (headers COOP + COEP, voir install-sherpa-stt.sh).
// Sans ça, offlineStt.ts bascule automatiquement sur Vosk (repli garanti).
// ──────────────────────────────────────────────────────────────────────────

export const SHERPA_SAMPLE_RATE = 16000;

/** Dossier public où le runtime est déposé (scripts/install-sherpa-stt.sh). */
export const SHERPA_WASM_BASE = '/voix/sherpa';

/** Glue API (définit `createOnlineRecognizer` en global navigateur). */
export const SHERPA_API_JS = `${SHERPA_WASM_BASE}/sherpa-onnx-asr.js`;
/** Glue Emscripten (instancie le module WASM + les workers pthreads). */
export const SHERPA_RUNTIME_GLUE_JS = `${SHERPA_WASM_BASE}/sherpa-onnx-wasm-main-asr.js`;

/** Chemins du modèle dans la FS virtuelle Emscripten (lus par le recognizer). */
export const SHERPA_FS = {
  encoder: '/model-encoder.onnx',
  decoder: '/model-decoder.onnx',
  joiner: '/model-joiner.onnx',
  tokens: '/model-tokens.txt',
} as const;

export interface SherpaModelFile {
  /** Chemin d'écriture dans la FS virtuelle Emscripten (unique → pas de collision). */
  fsPath: string;
  /** Source du téléchargement (HuggingFace, CORS ouvert). */
  url: string;
  /** Taille en octets (progression UI + choix int8/fp32). */
  size: number;
}

const HF = 'https://huggingface.co/shaojieli/sherpa-onnx-streaming-zipformer-fr-2023-04-14/resolve/main';

/**
 * Modèle streaming zipformer FR (transducer), variante int8 — officiel
 * sherpa-onnx (repo shaojieli/sherpa-onnx-streaming-zipformer-fr-2023-04-14).
 * Tailles vérifiées (août 2026) : encoder 126,6 Mo + decoder 1,3 Mo + joiner
 * 0,26 Mo + tokens 4,8 Ko ≈ 128 Mo au total.
 */
export const SHERPA_MODEL_FILES: SherpaModelFile[] = [
  {
    fsPath: SHERPA_FS.encoder,
    url: `${HF}/encoder-epoch-29-avg-9-with-averaged-model.int8.onnx`,
    size: 126655903,
  },
  {
    fsPath: SHERPA_FS.decoder,
    url: `${HF}/decoder-epoch-29-avg-9-with-averaged-model.int8.onnx`,
    size: 1307157,
  },
  {
    fsPath: SHERPA_FS.joiner,
    url: `${HF}/joiner-epoch-29-avg-9-with-averaged-model.int8.onnx`,
    size: 259572,
  },
  {
    fsPath: SHERPA_FS.tokens,
    url: `${HF}/tokens.txt`,
    size: 4819,
  },
];

/** Taille totale arrondie en Mo (affichage InstallerOffline). */
export const SHERPA_TOTAL_MO = Math.round(
  SHERPA_MODEL_FILES.reduce((s, f) => s + f.size, 0) / (1024 * 1024),
);

/**
 * Mêmes fichiers, présentés pour le PLUGIN NATIF Android (SherpaSttPlugin) :
 * noms courts attendus dans filesDir/sherpa-stt/ (encoder.onnx, decoder.onnx,
 * joiner.onnx, tokens.txt). URLs et tailles identiques au moteur WASM.
 */
// Ordre lié à SHERPA_MODEL_FILES (encoder, decoder, joiner, tokens) — si cet
// ordre change, adapter les noms ci-dessous (le plugin les attend ainsi).
export const SHERPA_NATIVE_FILES: { name: string; url: string; size: number }[] = [
  { name: 'encoder.onnx', url: SHERPA_MODEL_FILES[0].url, size: SHERPA_MODEL_FILES[0].size },
  { name: 'decoder.onnx', url: SHERPA_MODEL_FILES[1].url, size: SHERPA_MODEL_FILES[1].size },
  { name: 'joiner.onnx', url: SHERPA_MODEL_FILES[2].url, size: SHERPA_MODEL_FILES[2].size },
  { name: 'tokens.txt', url: SHERPA_MODEL_FILES[3].url, size: SHERPA_MODEL_FILES[3].size },
];

/**
 * Config du OnlineRecognizer (streaming zipformer transducer).
 * Mêmes champs que les defaults du glue officiel — on ne change que les chemins
 * FS, le provider WASM et le modelingUnit « bpe » (tokens.txt = BPE, 502 tokens).
 */
export function buildSherpaOnlineConfig(): Record<string, unknown> {
  return {
    featConfig: { sampleRate: SHERPA_SAMPLE_RATE, featureDim: 80 },
    modelConfig: {
      transducer: {
        encoder: SHERPA_FS.encoder,
        decoder: SHERPA_FS.decoder,
        joiner: SHERPA_FS.joiner,
      },
      paraformer: { encoder: '', decoder: '' },
      zipformer2Ctc: { model: '' },
      nemoCtc: { model: '' },
      toneCtc: { model: '' },
      tokens: SHERPA_FS.tokens,
      numThreads: 1,
      provider: 'wasm',
      debug: 0,
      modelType: '',
      modelingUnit: 'bpe',
      bpeVocab: '',
    },
    decodingMethod: 'greedy_search',
    maxActivePaths: 4,
    enableEndpoint: 1,
    rule1MinTrailingSilence: 2.4,
    rule2MinTrailingSilence: 1.2,
    rule3MinUtteranceLength: 20,
    hotwordsFile: '',
    hotwordsScore: 1.5,
    ctcFstDecoderConfig: { graph: '', maxActive: 3000 },
    ruleFsts: '',
    ruleFars: '',
  };
}
