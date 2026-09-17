package com.julaba.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    // Enregistrement AVANT super.onCreate (exigence Capacitor pour les plugins
    // locaux) : rend SherpaStt et SherpaTts visibles du pont JS
    // (voice-offline/nativeStt.ts et voice-offline/nativeTts.ts).
    registerPlugin(SherpaSttPlugin.class);
    registerPlugin(SherpaTtsPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
