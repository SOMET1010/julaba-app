// ──────────────────────────────────────────────────────────────────────────
// Plugin Capacitor « SherpaStt » — pont NATIF entre le site Julaba et le moteur
// vocal sherpa-onnx embarqué dans l'APK (Route B).
//
// ⚠️ Ce fichier n'est PAS compilé dans ce dépôt (pas de kit Android ici). Il est
//    prêt à être posé dans le projet Android généré par Capacitor, puis compilé
//    dans un atelier Android. Voir docs/ROUTE-B-BUILD-ANDROID.md pour les étapes.
//
// Emplacement cible dans le projet Android :
//   android/app/src/main/java/ci/julaba/app/SherpaSttPlugin.kt
//
// Dépendances (fournies par l'AAR sherpa-onnx, cf. doc) :
//   - libsherpa-onnx-jni.so (ABI arm64-v8a, armeabi-v7a)
//   - classes com.k2fsa.sherpa.onnx.*
//
// Le modèle français (encoder/decoder/joiner/tokens) est placé dans
//   android/app/src/main/assets/sherpa/…  (voir la doc)
// ──────────────────────────────────────────────────────────────────────────
package ci.julaba.app

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

@CapacitorPlugin(name = "SherpaStt")
class SherpaSttPlugin : Plugin() {

    // Un seul recognizer partagé (le chargement du modèle est coûteux).
    private var recognizer: OnlineRecognizer? = null

    // Dossier des fichiers modèle DANS les assets de l'APK. Adapter aux noms
    // réels du modèle français choisi (voir la doc de build).
    private val base = "sherpa"

    override fun load() {
        try {
            recognizer = buildRecognizer()
        } catch (e: Throwable) {
            // On ne fait pas planter l'appli : le pont signalera « indisponible »
            // et le site retombera sur son repli.
            recognizer = null
        }
    }

    private fun buildRecognizer(): OnlineRecognizer {
        val model = OnlineModelConfig(
            transducer = OnlineTransducerModelConfig(
                encoder = "$base/encoder.onnx",
                decoder = "$base/decoder.onnx",
                joiner = "$base/joiner.onnx",
            ),
            tokens = "$base/tokens.txt",
            numThreads = 2,
            modelType = "zipformer",
        )
        val config = OnlineRecognizerConfig(
            featConfig = FeatureConfig(sampleRate = 16000, featureDim = 80),
            modelConfig = model,
            // Découpage automatique de fin de phrase désactivé : on transcrit un
            // clip déjà borné (la marchande a fini de parler).
            enableEndpoint = false,
            decodingMethod = "greedy_search",
        )
        // assets() : sherpa-onnx lit les fichiers directement depuis l'APK.
        return OnlineRecognizer(assetManager = context.assets, config = config)
    }

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val ret = JSObject()
        ret.put("available", recognizer != null)
        call.resolve(ret)
    }

    @PluginMethod
    fun transcribe(call: PluginCall) {
        val rec = recognizer
        if (rec == null) { call.reject("moteur Sherpa non chargé"); return }

        val b64 = call.getString("pcm")
        if (b64 == null) { call.reject("pcm manquant"); return }
        val sampleRate = call.getInt("sampleRate") ?: 16000

        // base64 → octets → Float32 (little-endian, comme encodé côté JS).
        val bytes = Base64.decode(b64, Base64.DEFAULT)
        val fb = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN).asFloatBuffer()
        val samples = FloatArray(fb.remaining())
        fb.get(samples)

        try {
            val stream = rec.createStream()
            stream.acceptWaveform(samples, sampleRate)
            // Un peu de silence en fin pour vider les derniers cadres.
            stream.acceptWaveform(FloatArray(sampleRate / 2), sampleRate)
            stream.inputFinished()
            while (rec.isReady(stream)) rec.decode(stream)
            val text = rec.getResult(stream).text
            stream.release()

            val ret = JSObject()
            ret.put("text", text)
            call.resolve(ret)
        } catch (e: Throwable) {
            call.reject("échec transcription: ${e.message}", e)
        }
    }
}
