// Appels HTTP réels vers les fournisseurs TTS cloud — extraits d'openai.service.ts
// pour être partagés entre le chemin de synthèse (OpenAIService.synthesize) et
// le bouton "Tester" du back-office (VoiceConfigService.testSynthesize), sans
// dupliquer la logique ni créer de dépendance circulaire entre les deux
// services. Fonctions pures : pas d'accès à la config/DB ici, les appelants
// fournissent la clé et les paramètres déjà résolus (env var OU base
// déchiffrée, indifféremment).

export async function synthesizeElevenLabs(text: string, apiKey: string, voiceId: string): Promise<Buffer> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    signal: AbortSignal.timeout(20000),
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: {
        stability: 0.65,
        similarity_boost: 0.80,
        style: 0.25,
        use_speaker_boost: true,
      },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs TTS HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Échappement minimal pour insérer `text` dans un élément SSML (Azure Speech
// exige du XML bien formé — un texte contenant "&"/"<" casserait la requête).
function escapeSsml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Azure AI Speech — synthèse REST (endpoint régional + clé d'abonnement).
// HYPOTHÈSE À VÉRIFIER avec la vraie clé du porteur produit avant activation
// prod (documentée aussi dans la PR) : `voiceName` couvre indifféremment une
// voix standard Azure (ex. "fr-FR-DeniseNeural") et le nom de déploiement
// d'une voix clonée entraînée dans Speech Studio (Custom Neural Voice) — les
// deux s'utilisent de la même façon comme attribut `name` de `<voice>` en
// SSML sur l'endpoint régional standard. Si le porteur a un endpoint CUSTOM
// dédié pour sa voix clonée (fourni par Speech Studio après déploiement, de
// la forme `https://<région>.voice.speech.microsoft.com/cognitiveservices/v1`
// avec un Endpoint ID), il faudra ajouter un champ "endpointId" et router
// vers cet endpoint au lieu du domaine régional générique ci-dessous — non
// implémenté ici faute de confirmation.
export async function synthesizeAzureSpeech(
  text: string,
  apiKey: string,
  region: string,
  voiceName: string,
): Promise<Buffer> {
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const ssml =
    `<speak version="1.0" xml:lang="fr-FR">` +
    `<voice xml:lang="fr-FR" name="${escapeSsml(voiceName)}">${escapeSsml(text)}</voice>` +
    `</speak>`;
  const res = await fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(20000),
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Type': 'application/ssml+xml',
      // MP3 : même famille de format binaire que le chemin ElevenLabs actuel
      // (contrat de sortie inchangé pour le reste du pipeline — le frontend
      // détecte déjà WAV/MP3 par en-tête binaire, voir services/elevenlabs.ts).
      'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
      'User-Agent': 'julaba-backend',
    },
    body: ssml,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Azure Speech TTS HTTP ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
  }
  return Buffer.from(await res.arrayBuffer());
}
