package com.julaba.app

import android.util.Base64
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.k2fsa.sherpa.onnx.OfflineTts
import com.k2fsa.sherpa.onnx.OfflineTtsConfig
import com.k2fsa.sherpa.onnx.OfflineTtsModelConfig
import com.k2fsa.sherpa.onnx.OfflineTtsVitsModelConfig
import java.io.ByteArrayOutputStream
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.Executors
import kotlin.math.roundToInt

/**
 * SherpaTts — synthèse vocale HORS-LIGNE (sherpa-onnx) pour l'APK.
 *
 * POURQUOI CE PLUGIN EXISTE.
 * Dans la WebView Android, `window.speechSynthesis` ne produit AUCUN son : seuls
 * les clips enregistrés s'entendent. Or un clip ne peut pas dire un MONTANT, qui
 * change à chaque vente. Une marchande qui ne lit pas n'a donc aujourd'hui aucun
 * moyen d'entendre ce qu'elle a gagné. C'est ce trou-là que ce plugin bouche, et
 * rien d'autre : les phrases fixes restent servies par les clips, qui sont la
 * vraie voix de Tata.
 *
 * Contrat du pont JS (voice-offline/nativeTts.ts) :
 *   - isAvailable(): { available: boolean }
 *   - synthesize({ text, speed? }): { wav: string, sampleRate: number }
 *       wav : base64 d'un fichier WAV PCM 16 bits mono, directement jouable par
 *             une balise <audio>. On rend un WAV et non du PCM brut EXPRÈS :
 *             le lecteur de clips du produit (audioManager) sait déjà le jouer,
 *             l'arrêter et l'annuler proprement. Une seule chaîne audio dans
 *             l'application, pas deux (Constitution, principe 1).
 *
 * Modèle : vits-piper-fr_FR-siwis-medium, EMBARQUÉ dans les assets.
 * Licence CC-BY 4.0 — usage commercial permis, attribution requise. C'est la
 * raison pour laquelle ce n'est PAS vits-mms-fra, dont l'amont
 * (facebook/mms-tts) est en CC-BY-NC : non commercial, donc inembarquable ici.
 *
 * Les fichiers sont posés par android/scripts/installer-voix.sh et ne sont
 * jamais commités. S'ils manquent, isAvailable() répond false et l'application
 * garde son comportement actuel — aucun crash, aucune régression.
 *
 * Threading : comme pour SherpaStt, le moteur natif n'aime pas les appels
 * concurrents → un exécuteur mono-thread sérialise chargement et synthèses. Le
 * chargement est paresseux : au premier appel, jamais au démarrage de l'app.
 */
@CapacitorPlugin(name = "SherpaTts")
class SherpaTtsPlugin : Plugin() {

  companion object {
    private const val ASSET_DIR = "sherpa-tts-fr"
    private const val MODELE = "$ASSET_DIR/model.onnx"
    private const val TOKENS = "$ASSET_DIR/tokens.txt"

    /**
     * Données de phonétisation espeak-ng. Sans elles, un modèle Piper est muet.
     *
     * ATTENTION, PIÈGE COÛTEUX — relevé sur appareil réel le 17/09/2026 :
     * ce chemin NE PEUT PAS rester dans les assets. Le modèle et les tokens,
     * eux, se lisent très bien par l'AssetManager (le natif de sherpa sait le
     * faire). Mais espeak-ng ouvre ses fichiers avec les appels système
     * ordinaires : les assets d'un APK ne sont pas de vrais fichiers sur le
     * disque, il ne voit RIEN. Le moteur échoue alors au chargement,
     * isAvailable() répond false, et l'application retombe en silence — sans
     * la moindre erreur visible.
     *
     * On recopie donc ce dossier une fois dans le stockage interne de l'app,
     * et on passe le chemin RÉEL à sherpa.
     */
    private const val NOM_DONNEES = "espeak-ng-data"
    private const val ASSET_DONNEES = "$ASSET_DIR/$NOM_DONNEES"

    /** Bornes de vitesse : en dessous c'est traînant, au-dessus c'est inintelligible. */
    private const val VITESSE_MIN = 0.5f
    private const val VITESSE_MAX = 2.0f
  }

  private val executor = Executors.newSingleThreadExecutor()

  @Volatile private var tts: OfflineTts? = null
  @Volatile private var loadFailed = false

  /** Charge le moteur si nécessaire. À appeler UNIQUEMENT depuis l'exécuteur. */
  private fun ensureLoaded(): OfflineTts? {
    tts?.let { return it }
    if (loadFailed) return null
    return try {
      val assets = context.assets
      // Les deux fichiers du modèle doivent être présents. On ne vérifie pas
      // espeak-ng-data fichier par fichier (des centaines) : sa seule présence
      // en tant que dossier suffit, sherpa dira le reste à l'ouverture.
      val presents = (assets.list(ASSET_DIR) ?: emptyArray()).toSet()
      if (!presents.contains("model.onnx") || !presents.contains("tokens.txt")) {
        android.util.Log.w("SherpaTts", "modèle absent des assets — synthèse désactivée")
        loadFailed = true
        return null
      }
      val cheminDonnees = preparerDonneesPhonetisation()
      if (cheminDonnees == null) {
        android.util.Log.w("SherpaTts", "phonétisation indisponible — synthèse désactivée")
        loadFailed = true
        return null
      }
      val config = OfflineTtsConfig(
        model = OfflineTtsModelConfig(
          vits = OfflineTtsVitsModelConfig(
            model = MODELE,
            tokens = TOKENS,
            dataDir = cheminDonnees,
          ),
          numThreads = 2,
          debug = false,
          provider = "cpu",
        ),
        // Une phrase à la fois : le découpage en morceaux vit côté JS, qui sait
        // ce qu'est une phrase pour une marchande (un montant, une consigne).
        maxNumSentences = 1,
      )
      val moteur = OfflineTts(assets, config)
      tts = moteur
      moteur
    } catch (t: Throwable) {
      android.util.Log.e("SherpaTts", "chargement du moteur de synthèse échoué", t)
      loadFailed = true
      null
    }
  }

  /**
   * Recopie les données de phonétisation des assets vers le stockage interne,
   * une seule fois, et rend le chemin RÉEL — ou null si la copie a échoué.
   *
   * Idempotent : au deuxième lancement, le dossier est déjà là et on ne recopie
   * rien. Le témoin de fin de copie est écrit EN DERNIER : une copie
   * interrompue (batterie, arrêt forcé) ne sera donc jamais prise pour une
   * copie complète — elle sera refaite.
   */
  private fun preparerDonneesPhonetisation(): String? {
    return try {
      val destination = File(context.filesDir, NOM_DONNEES)
      val temoin = File(context.filesDir, "$NOM_DONNEES.complet")
      if (temoin.exists() && destination.isDirectory) return destination.absolutePath

      destination.deleteRecursively()
      copierDossierAsset(ASSET_DONNEES, destination)
      temoin.writeText("ok")
      android.util.Log.i("SherpaTts", "phonétisation posée dans ${destination.absolutePath}")
      destination.absolutePath
    } catch (t: Throwable) {
      android.util.Log.e("SherpaTts", "recopie de la phonétisation échouée", t)
      null
    }
  }

  /** Copie récursive d'un dossier d'assets vers un dossier réel. */
  private fun copierDossierAsset(chemin: String, destination: File) {
    val entrees = context.assets.list(chemin) ?: emptyArray()
    if (entrees.isEmpty()) {
      // Pas d'entrées = c'est un FICHIER, pas un dossier.
      destination.parentFile?.mkdirs()
      context.assets.open(chemin).use { entree ->
        destination.outputStream().use { sortie -> entree.copyTo(sortie) }
      }
      return
    }
    destination.mkdirs()
    for (nom in entrees) {
      copierDossierAsset("$chemin/$nom", File(destination, nom))
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
  fun synthesize(call: PluginCall) {
    val texte = call.getString("text")
    if (texte.isNullOrBlank()) {
      call.reject("text est requis")
      return
    }
    val vitesse = (call.getFloat("speed") ?: 1.0f).coerceIn(VITESSE_MIN, VITESSE_MAX)
    executor.execute {
      val moteur = ensureLoaded()
      if (moteur == null) {
        call.reject("Synthèse indisponible (modèle absent ou chargement échoué)")
        return@execute
      }
      try {
        val audio = moteur.generate(text = texte, sid = 0, speed = vitesse)
        val wav = encoderWav(audio.samples, audio.sampleRate)
        val ret = JSObject()
        ret.put("wav", Base64.encodeToString(wav, Base64.NO_WRAP))
        ret.put("sampleRate", audio.sampleRate)
        call.resolve(ret)
      } catch (t: Throwable) {
        android.util.Log.e("SherpaTts", "synthèse échouée", t)
        call.reject("Synthèse échouée : ${t.message}")
      }
    }
  }

  override fun handleOnDestroy() {
    executor.execute {
      try { tts?.release() } catch (_: Throwable) { /* déjà libéré */ }
      tts = null
    }
    executor.shutdown()
    super.handleOnDestroy()
  }

  /**
   * FloatArray [-1,1] → fichier WAV PCM 16 bits mono, en mémoire.
   *
   * Écrit à la main plutôt que via une dépendance : l'en-tête WAV canonique fait
   * 44 octets et ne bouge pas depuis 1991. Les échantillons sont bornés avant
   * conversion — un modèle peut dépasser légèrement 1.0, et sans borne le
   * dépassement d'entier produit un craquement au lieu d'une saturation douce.
   */
  private fun encoderWav(samples: FloatArray, sampleRate: Int): ByteArray {
    val octetsDonnees = samples.size * 2
    val sortie = ByteArrayOutputStream(44 + octetsDonnees)

    val entete = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN)
    entete.put("RIFF".toByteArray(Charsets.US_ASCII))
    entete.putInt(36 + octetsDonnees)          // taille du fichier - 8
    entete.put("WAVE".toByteArray(Charsets.US_ASCII))
    entete.put("fmt ".toByteArray(Charsets.US_ASCII))
    entete.putInt(16)                          // taille du bloc fmt (PCM)
    entete.putShort(1)                         // format 1 = PCM entier
    entete.putShort(1)                         // 1 canal (mono)
    entete.putInt(sampleRate)
    entete.putInt(sampleRate * 2)              // octets par seconde
    entete.putShort(2)                         // alignement de bloc
    entete.putShort(16)                        // bits par échantillon
    entete.put("data".toByteArray(Charsets.US_ASCII))
    entete.putInt(octetsDonnees)
    sortie.write(entete.array())

    val donnees = ByteBuffer.allocate(octetsDonnees).order(ByteOrder.LITTLE_ENDIAN)
    for (s in samples) {
      val borne = s.coerceIn(-1f, 1f)
      donnees.putShort((borne * 32767f).roundToInt().toShort())
    }
    sortie.write(donnees.array())

    return sortie.toByteArray()
  }
}
