package com.julaba.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * RoutageAudio — le chemin du son entre le téléphone et l'oreillette Bluetooth.
 *
 * POURQUOI CE PLUGIN EXISTE.
 * Une marchande au marché a les mains pleines : des tomates, de la monnaie, un
 * sac. Le téléphone est au fond du pagne. Même quand elle réussit à appuyer sur
 * le micro, la voix de Tantie sort du haut-parleur, dans le bruit : elle ne
 * l'entend pas. Et le micro qui écoute est celui du téléphone, pas celui qui
 * est près de sa bouche. Ce plugin, et rien d'autre, corrige ces deux chemins.
 *
 * CE QU'IL NE FAIT PAS : il ne décide de rien. La décision (quel mode, quand
 * ouvrir, quand replier) vit côté JS dans un module PUR et testé —
 * `services/routageAudio/decisionRoutage.ts`. Ici, on exécute et on rapporte.
 * Il ne touche ni à l'encaissement, ni au stock, ni à la file hors ligne.
 *
 * ── LES DEUX VOIES, ET POURQUOI IL EN FAUT DEUX ───────────────────────────
 * A2DP : SORTIE seulement, bonne qualité. Android la pose TOUT SEUL dès qu'une
 *        oreillette média est connectée — il n'y a rien à faire pour elle, et
 *        c'est pour ça qu'aucune méthode ici ne s'en occupe. On se contente de
 *        RAPPORTER sa présence (`oreilletteSortieMedia`), pour que le JS sache
 *        qu'une oreillette mono, sans A2DP, n'entendra Tantie que si le canal
 *        téléphonique est ouvert.
 * SCO  : voie TÉLÉPHONIQUE, bidirectionnelle — la SEULE qui apporte le MICRO de
 *        l'oreillette. C'est elle qu'ouvrent `ouvrirCanalMicro` et que rend
 *        `fermerCanalMicro`.
 *
 * ── DEUX ÂGES D'ANDROID, DEUX MÉCANIQUES ──────────────────────────────────
 * À partir d'Android 12 (API 31), `setCommunicationDevice()` est la voie propre
 * et elle répond TOUT DE SUITE : on sait sur-le-champ si le canal est pris.
 * En dessous (le projet descend à minSdk 24), il faut passer par
 * `startBluetoothSco()`, qui est déprécié mais reste le seul chemin : il est
 * ASYNCHRONE, la confirmation arrive par diffusion système quelques centaines
 * de millisecondes plus tard. C'est pourquoi `ouvrirCanalMicro` peut répondre
 * « pas encore » sans que ce soit un échec : l'évènement `routageChange`
 * confirmera, et le JS attend cette confirmation avant d'ouvrir le micro pour
 * ne pas perdre le début de la phrase.
 *
 * ── LE REPLI EST LA RÈGLE, PAS L'EXCEPTION ────────────────────────────────
 * Toute méthode avale ses erreurs et rend un état cohérent. Si l'oreillette
 * disparaît, `AudioDeviceCallback` le dit immédiatement au JS, qui rend le
 * canal. Le pire qui puisse arriver à la marchande est d'entendre Tantie par le
 * haut-parleur — c'est-à-dire l'état d'aujourd'hui. Jamais de silence, jamais
 * de blocage, jamais de vente perdue.
 *
 * AUCUNE PERMISSION NOUVELLE. `MODIFY_AUDIO_SETTINGS` est déjà au manifeste et
 * suffit. `BLUETOOTH_CONNECT` n'est PAS demandée : ce plugin ne parle jamais au
 * `BluetoothAdapter`, il ne lit que les appareils audio exposés par
 * `AudioManager`. Le seul effet est que le nom de l'oreillette peut être
 * générique sur Android 12+ — un nom sert au rapport de terrain, pas au
 * routage. On n'élargit pas une permission pour du confort d'étiquette.
 */
@CapacitorPlugin(name = "RoutageAudio")
class RoutageAudioPlugin : Plugin() {

  companion object {
    private const val TAG = "RoutageAudio"
    private const val EVENEMENT = "routageChange"
  }

  private var audio: AudioManager? = null
  private val mainHandler = Handler(Looper.getMainLooper())

  /** Mode audio d'avant notre intervention, à restaurer à la fermeture. */
  private var modeAvant: Int? = null

  /** Vrai entre `ouvrirCanalMicro` et `fermerCanalMicro` (intention, pas état réel). */
  @Volatile private var canalDemande = false

  private var rappelAppareils: AudioDeviceCallback? = null
  private var recepteurSco: BroadcastReceiver? = null

  override fun load() {
    audio = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
    ecouterAppareils()
    ecouterCanalSco()
  }

  // ── Méthodes du pont ────────────────────────────────────────────────────

  /** Ce qu'Android voit, sans interprétation. Ne rejette jamais. */
  @PluginMethod
  fun etat(call: PluginCall) {
    call.resolve(etatJson())
  }

  /**
   * Ouvre le canal micro Bluetooth. Rend `canalMicroActif = true` seulement si
   * Android l'a CONFIRMÉ. Un `false` n'est pas forcément un échec : sur les
   * Android d'avant la 12, la confirmation arrive par `routageChange`.
   */
  @PluginMethod
  @Suppress("DEPRECATION") // startBluetoothSco/isBluetoothScoOn : seul chemin sous Android 12
  fun ouvrirCanalMicro(call: PluginCall) {
    val am = audio
    if (am == null) {
      call.resolve(etatJson())
      return
    }
    canalDemande = true
    try {
      if (modeAvant == null) modeAvant = am.mode
      // Mode « communication » : c'est lui qui autorise la voie téléphonique
      // et qui empêche le son de repartir vers le haut-parleur principal.
      am.mode = AudioManager.MODE_IN_COMMUNICATION
      am.isSpeakerphoneOn = false

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val cible = am.availableCommunicationDevices.firstOrNull {
          it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO
        }
        if (cible == null) {
          // Plus d'oreillette : on ne laisse surtout pas le mode communication
          // en place, sinon la sortie resterait coincée en qualité téléphone.
          rendreAudio()
          call.resolve(etatJson())
          return
        }
        val pris = am.setCommunicationDevice(cible)
        if (!pris) rendreAudio()
      } else {
        am.startBluetoothSco()
        am.isBluetoothScoOn = true
      }
    } catch (t: Throwable) {
      android.util.Log.w(TAG, "ouverture du canal micro impossible", t)
      rendreAudio()
    }
    call.resolve(etatJson())
    notifier()
  }

  /** Rend le canal et remet l'audio du téléphone. Idempotent, ne rejette jamais. */
  @PluginMethod
  fun fermerCanalMicro(call: PluginCall) {
    rendreAudio()
    call.resolve(etatJson())
    notifier()
  }

  // ── Interne ─────────────────────────────────────────────────────────────

  /**
   * Remet tout dans l'état d'avant : canal rendu, mode restauré. Appelée aussi
   * bien sur demande du JS que sur un échec — c'est LE chemin de repli, et il
   * doit rester le plus bête possible pour ne jamais échouer lui-même.
   */
  @Suppress("DEPRECATION") // stopBluetoothSco/isBluetoothScoOn : seul chemin sous Android 12
  private fun rendreAudio() {
    canalDemande = false
    val am = audio ?: return
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        am.clearCommunicationDevice()
      } else {
        am.isBluetoothScoOn = false
        am.stopBluetoothSco()
      }
    } catch (t: Throwable) {
      android.util.Log.w(TAG, "fermeture du canal micro : ignorée", t)
    }
    try {
      modeAvant?.let { am.mode = it }
      modeAvant = null
    } catch (t: Throwable) {
      android.util.Log.w(TAG, "restauration du mode audio : ignorée", t)
    }
  }

  /** Y a-t-il une oreillette capable d'apporter son MICRO (voie SCO) ? */
  private fun oreilletteAvecMicro(am: AudioManager): Boolean = try {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      am.availableCommunicationDevices.any { it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO }
    } else {
      am.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
        .any { it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO }
    }
  } catch (t: Throwable) {
    false
  }

  /** Y a-t-il une oreillette capable de recevoir du MÉDIA (voie A2DP) ? */
  private fun oreilletteAvecMedia(am: AudioManager): Boolean = try {
    am.getDevices(AudioManager.GET_DEVICES_OUTPUTS).any {
      it.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP ||
        (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
          it.type == AudioDeviceInfo.TYPE_BLE_HEADSET)
    }
  } catch (t: Throwable) {
    false
  }

  /** Le canal micro est-il RÉELLEMENT actif, d'après Android ? */
  @Suppress("DEPRECATION") // isBluetoothScoOn : seule lecture possible sous Android 12
  private fun canalActif(am: AudioManager): Boolean = try {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      am.communicationDevice?.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO
    } else {
      am.isBluetoothScoOn
    }
  } catch (t: Throwable) {
    false
  }

  /** Nom lisible, pour le rapport de terrain. Générique si Android le masque. */
  private fun nomOreillette(am: AudioManager): String? = try {
    am.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
      .firstOrNull {
        it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
          it.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP
      }
      ?.productName
      ?.toString()
  } catch (t: Throwable) {
    null
  }

  private fun etatJson(): JSObject {
    val ret = JSObject()
    val am = audio
    if (am == null) {
      ret.put("oreilletteConnectee", false)
      ret.put("oreilletteSortieMedia", false)
      ret.put("canalMicroActif", false)
      return ret
    }
    val micro = oreilletteAvecMicro(am)
    val media = oreilletteAvecMedia(am)
    ret.put("oreilletteConnectee", micro || media)
    ret.put("oreilletteSortieMedia", media)
    ret.put("canalMicroActif", canalActif(am))
    nomOreillette(am)?.let { ret.put("nom", it) }
    return ret
  }

  private fun notifier() {
    try {
      notifyListeners(EVENEMENT, etatJson())
    } catch (t: Throwable) {
      android.util.Log.w(TAG, "notification du routage ignorée", t)
    }
  }

  /**
   * Branchement / débranchement d'une oreillette. C'est CE rappel qui porte le
   * cas « l'oreillette tombe en pleine vente » : le JS l'apprend dans la
   * seconde et rend le canal, au lieu de découvrir le problème au prochain
   * appui sur le micro — c'est-à-dire trop tard, la vente est déjà en cours.
   */
  private fun ecouterAppareils() {
    val am = audio ?: return
    val rappel = object : AudioDeviceCallback() {
      override fun onAudioDevicesAdded(ajoutes: Array<out AudioDeviceInfo>?) = notifier()
      override fun onAudioDevicesRemoved(retires: Array<out AudioDeviceInfo>?) {
        // Si l'appareil qui portait notre canal s'en va, on rend TOUT DE SUITE :
        // laisser un chemin audio pointé sur un appareil absent, c'est du
        // silence pour la marchande.
        if (canalDemande && !oreilletteAvecMicro(am)) rendreAudio()
        notifier()
      }
    }
    try {
      am.registerAudioDeviceCallback(rappel, mainHandler)
      rappelAppareils = rappel
    } catch (t: Throwable) {
      android.util.Log.w(TAG, "écoute des appareils audio indisponible", t)
    }
  }

  /**
   * Confirmation d'ouverture du canal sur les Android d'avant la 12, où
   * `startBluetoothSco()` est asynchrone. Sans cette diffusion, le JS
   * attendrait son délai complet à chaque phrase pour rien.
   */
  private fun ecouterCanalSco() {
    val recepteur = object : BroadcastReceiver() {
      override fun onReceive(ctx: Context?, intent: Intent?) {
        val etat = intent?.getIntExtra(
          AudioManager.EXTRA_SCO_AUDIO_STATE,
          AudioManager.SCO_AUDIO_STATE_ERROR,
        ) ?: return
        if (etat == AudioManager.SCO_AUDIO_STATE_ERROR ||
          etat == AudioManager.SCO_AUDIO_STATE_DISCONNECTED
        ) {
          // Le canal est tombé (erreur, ou oreillette partie) : on ne reste pas
          // en mode communication, sinon la sortie resterait en qualité
          // téléphone alors qu'il n'y a plus personne au bout.
          if (canalDemande && !oreilletteAvecMicro(audio ?: return)) rendreAudio()
        }
        notifier()
      }
    }
    val filtre = IntentFilter(AudioManager.ACTION_SCO_AUDIO_STATE_UPDATED)
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        context.registerReceiver(recepteur, filtre, Context.RECEIVER_NOT_EXPORTED)
      } else {
        context.registerReceiver(recepteur, filtre)
      }
      recepteurSco = recepteur
    } catch (t: Throwable) {
      android.util.Log.w(TAG, "écoute du canal SCO indisponible", t)
    }
  }

  override fun handleOnDestroy() {
    // On ne laisse JAMAIS le téléphone en mode communication derrière nous :
    // ce serait un micro et un haut-parleur détournés pour toutes les autres
    // applications de la marchande.
    rendreAudio()
    try {
      rappelAppareils?.let { audio?.unregisterAudioDeviceCallback(it) }
    } catch (t: Throwable) {
      android.util.Log.w(TAG, "désabonnement des appareils ignoré", t)
    }
    rappelAppareils = null
    try {
      recepteurSco?.let { context.unregisterReceiver(it) }
    } catch (t: Throwable) {
      android.util.Log.w(TAG, "désabonnement du canal SCO ignoré", t)
    }
    recepteurSco = null
    super.handleOnDestroy()
  }
}
