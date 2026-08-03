// ──────────────────────────────────────────────────────────────────────────
// MainActivity de la coquille Julaba — enregistre le plugin natif SherpaStt.
//
// ⚠️ À poser en REMPLACEMENT du MainActivity généré par Capacitor à :
//    android/app/src/main/java/ci/julaba/app/MainActivity.kt
//    (la seule différence avec celui par défaut est l'appel registerPlugin).
// ──────────────────────────────────────────────────────────────────────────
package ci.julaba.app

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Doit être enregistré AVANT super.onCreate (chargement du bridge web).
        registerPlugin(SherpaSttPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
