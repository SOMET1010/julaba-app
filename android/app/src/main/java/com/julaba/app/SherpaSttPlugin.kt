package com.julaba.app

import android.util.Base64
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.k2fsa.sherpa.onnx.FeatureConfig
import com.k2fsa.sherpa.onnx.OnlineModelConfig
import com.k2fsa.sherpa.onnx.OnlineRecognizer
import com.k2fsa.sherpa.onnx.OnlineRecognizerConfig
import com.k2fsa.sherpa.onnx.OnlineTransducerModelConfig
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.Executors

/**
 * SherpaStt — reconnaissance vocale HORS-LIGNE (sherpa-onnx) pour l'APK.
 *
 * Implémente le contrat canonique du pont JS (voice-offline/nativeStt.ts) :
 *   - isAvailable(): { available: boolean }
 *   - transcribe({ pcm, sampleRate }): { text: string }
 *       pcm : base64 d'un Float32Array little-endian (échantillons mono bruts)
 *       sampleRate : fréquence d'origine — on rééchantillonne ici vers 16 kHz.
 *
 * Modèle : zipformer streaming FRANÇAIS « Kroko » (sherpa-onnx, 2025-08-06),
 * ~71 Mo, EMBARQUÉ dans les assets de l'APK (décision « option 1 » de
 * docs/REPONSE_SHERPA.md : première vente vocale sans réseau, sans étape
 * d'installation). Les fichiers sont posés par android/scripts/installer-voix.sh
 * dans assets/sherpa-kroko-fr/ — s'ils manquent, isAvailable() répond false et
 * le frontend garde son filet clavier (aucun crash).
 *
 * Threading : le moteur natif n'est pas conçu pour des appels concurrents →
 * un exécuteur mono-thread sérialise chargement et transcriptions. Le
 * chargement (~quelques secondes sur entrée de gamme) est paresseux : déclenché
 * au premier isAvailable()/transcribe(), jamais au démarrage de l'app.
 */
@CapacitorPlugin(name = "SherpaStt")
class SherpaSttPlugin : Plugin() {

  companion object {
    private const val ASSET_DIR = "sherpa-kroko-fr"
    private const val TARGET_SAMPLE_RATE = 16000
  }

  private val executor = Executors.newSingleThreadExecutor()

  // null = pas encore tenté ; sinon résultat du chargement (recognizer ou échec).
  @Volatile private var recognizer: OnlineRecognizer? = null
  @Volatile private var loadFailed = false

  /** Charge le moteur si nécessaire. À appeler UNIQUEMENT depuis l'exécuteur. */
  private fun ensureLoaded(): OnlineRecognizer? {
    recognizer?.let { return it }
    if (loadFailed) return null
    return try {
      val assets = context.assets
      // Les 4 fichiers du modèle doivent être présents dans les assets.
      val requis = listOf("encoder.onnx", "decoder.onnx", "joiner.onnx", "tokens.txt")
      val presents = (assets.list(ASSET_DIR) ?: emptyArray()).toSet()
      if (!presents.containsAll(requis)) {
        loadFailed = true
        return null
      }
      val config = OnlineRecognizerConfig(
        featConfig = FeatureConfig(sampleRate = TARGET_SAMPLE_RATE, featureDim = 80),
        modelConfig = OnlineModelConfig(
          transducer = OnlineTransducerModelConfig(
            encoder = "$ASSET_DIR/encoder.onnx",
            decoder = "$ASSET_DIR/decoder.onnx",
            joiner = "$ASSET_DIR/joiner.onnx",
          ),
          tokens = "$ASSET_DIR/tokens.txt",
          numThreads = 2,
          // Export zipformer streaming récent (Kroko 2025) → « zipformer2 ».
          modelType = "zipformer2",
        ),
        // Pas de détection de fin de parole ici : le JS envoie un enregistrement
        // complet (one-shot), la segmentation vit côté interface.
        enableEndpoint = false,
      )
      // Appel positionnel (constructeur vérifié dans l'AAR 1.13.5 :
      // OnlineRecognizer(AssetManager, OnlineRecognizerConfig)).
      val r = OnlineRecognizer(assets, config)
      recognizer = r
      r
    } catch (t: Throwable) {
      android.util.Log.e("SherpaStt", "chargement du moteur échoué", t)
      loadFailed = true
      null
    }
  }

  @PluginMethod
  fun isAvailable(call: PluginCall) {
    executor.execute {
      val ok = ensureLoaded() != null
      val ret = JSObject()
      ret.put("available", ok)
      call.resolve(ret)
    }
  }

  @PluginMethod
  fun transcribe(call: PluginCall) {
    val pcmB64 = call.getString("pcm")
    val sampleRate = call.getInt("sampleRate") ?: 0
    if (pcmB64.isNullOrEmpty() || sampleRate <= 0) {
      call.reject("pcm (base64 Float32 LE) et sampleRate sont requis")
      return
    }
    executor.execute {
      val r = ensureLoaded()
      if (r == null) {
        call.reject("Moteur vocal indisponible (modèle absent ou chargement échoué)")
        return@execute
      }
      try {
        val samples = decodeFloat32LittleEndian(pcmB64)
        val a16k = if (sampleRate == TARGET_SAMPLE_RATE) samples
                   else resampleLinear(samples, sampleRate, TARGET_SAMPLE_RATE)

        val stream = r.createStream()
        try {
          stream.acceptWaveform(a16k, TARGET_SAMPLE_RATE)
          // Queue de silence : pousse les derniers phonèmes hors du contexte
          // du modèle streaming (sinon la fin de phrase est parfois tronquée).
          stream.acceptWaveform(FloatArray(TARGET_SAMPLE_RATE / 2), TARGET_SAMPLE_RATE)
          stream.inputFinished()
          while (r.isReady(stream)) r.decode(stream)
          val text = r.getResult(stream).text
          val ret = JSObject()
          ret.put("text", text)
          call.resolve(ret)
        } finally {
          stream.release()
        }
      } catch (t: Throwable) {
        android.util.Log.e("SherpaStt", "transcription échouée", t)
        call.reject("Transcription échouée : ${t.message}")
      }
    }
  }

  override fun handleOnDestroy() {
    executor.execute {
      try { recognizer?.release() } catch (_: Throwable) { /* déjà libéré */ }
      recognizer = null
    }
    executor.shutdown()
    super.handleOnDestroy()
  }

  /** base64 → FloatArray (Float32 little-endian, cf. float32ToBase64LittleEndian côté JS). */
  private fun decodeFloat32LittleEndian(b64: String): FloatArray {
    val bytes = Base64.decode(b64, Base64.DEFAULT)
    val buf = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
    val out = FloatArray(bytes.size / 4)
    buf.asFloatBuffer().get(out)
    return out
  }

  /**
   * Rééchantillonnage linéaire mono (suffisant pour de la parole 48/44,1 → 16 kHz ;
   * le navigateur a déjà appliqué son filtre anti-repliement à la capture).
   */
  private fun resampleLinear(input: FloatArray, from: Int, to: Int): FloatArray {
    if (input.isEmpty() || from == to) return input
    val outLen = ((input.size.toLong() * to) / from).toInt().coerceAtLeast(1)
    val out = FloatArray(outLen)
    val ratio = (from.toDouble()) / to
    for (i in 0 until outLen) {
      val pos = i * ratio
      val i0 = pos.toInt().coerceAtMost(input.size - 1)
      val i1 = (i0 + 1).coerceAtMost(input.size - 1)
      val frac = (pos - i0).toFloat()
      out[i] = input[i0] * (1f - frac) + input[i1] * frac
    }
    return out
  }
}
