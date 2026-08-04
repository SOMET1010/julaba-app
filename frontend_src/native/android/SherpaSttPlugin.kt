package ci.julaba.app

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Pont Capacitor -> moteur sherpa-onnx NATIF pour la transcription vocale
 * hors-ligne de Julaba (APK Android).
 *
 * Contrat JS (voir frontend_src/src/app/voice-offline/nativeStt.ts) :
 *   - isAvailable(): { available: boolean }
 *   - transcribe({ pcm, sampleRate }): { text: string }
 *       pcm        : base64 d'un Float32Array little-endian (échantillons bruts)
 *       sampleRate : fréquence d'origine. On rééchantillonne vers 16 kHz ici.
 */
@CapacitorPlugin(name = "SherpaStt")
class SherpaSttPlugin : Plugin() {

    private var recognizer: Any? = null // com.k2fsa.sherpa.onnx.OnlineRecognizer
    private var ready = false

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        call.resolve(
            mapOf(
                "available" to ready
            )
        )
    }

    @PluginMethod
    fun transcribe(call: PluginCall) {
        if (!ready) {
            call.resolve(mapOf("text" to ""))
            return
        }

        val pcmB64 = call.getString("pcm") ?: ""
        val sampleRate = call.getInt("sampleRate") ?: 16000

        if (pcmB64.isEmpty()) {
            call.resolve(mapOf("text" to ""))
            return
        }

        try {
            val bytes = android.util.Base64.decode(pcmB64, android.util.Base64.DEFAULT)
            // Float32Array little-endian -> FloatArray
            val n = bytes.size / 4
            val samples = FloatArray(n)
            for (i in 0 until n) {
                val offset = i * 4
                val bits = (bytes[offset].toInt() and 0xFF) or
                    ((bytes[offset + 1].toInt() and 0xFF) shl 8) or
                    ((bytes[offset + 2].toInt() and 0xFF) shl 16) or
                    ((bytes[offset + 3].toInt() and 0xFF) shl 24)
                samples[i] = Float.fromBits(bits)
            }

            // ⚠️ API sherpa-onnx dépend de la version (voir docs/ROUTE-B-BUILD-ANDROID.md).
            // Les noms ci-dessous reflètent la doc officielle mais doivent être alignés
            // sur la version d'AAR réellement intégrée. Non compilé dans ce dépôt.
            val recognize = recognizer as? OnlineRecognizerShim
            val text = recognize?.transcribe(samples, sampleRate) ?: ""

            call.resolve(mapOf("text" to text))
        } catch (e: Exception) {
            call.resolve(mapOf("text" to ""))
        }
    }
}

/**
 * Shim minimal pour isoler l'API sherpa-onnx et permettre l'alignement version.
 * À compléter avec l'API réelle : OnlineRecognizerConfig, OnlineTransducerModelConfig,
 * acceptWaveform(samples, sampleRate) / getResult().text.
 */
interface OnlineRecognizerShim {
    fun transcribe(samples: FloatArray, sampleRate: Int): String
}