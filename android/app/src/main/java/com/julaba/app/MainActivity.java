package com.julaba.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    // Enregistrement AVANT super.onCreate (exigence Capacitor pour les plugins
    // locaux) : rend SherpaStt visible du pont JS (voice-offline/nativeStt.ts).
    registerPlugin(SherpaSttPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
