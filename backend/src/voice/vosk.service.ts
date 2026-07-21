import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

// ──────────────────────────────────────────────────────────────────────────
// STT Vosk (offline-first) — remplace Whisper pour le francais, sur CPU.
//
// Le paquet natif `vosk` et un modele (dossier) sont requis en production :
//   npm i vosk
//   modele : vosk-model-small-fr-0.22 (ou plus grand), dossier pointe par
//   la variable d'environnement VOSK_MODEL_PATH.
//
// Chargement paresseux et defensif : si le paquet ou le modele est absent,
// le service se declare indisponible et transcribe() renvoie null -> l'appelant
// retombe proprement sur Whisper (aucune regression).
//
// Le frontend envoie deja du WAV PCM 16 kHz mono (useVoiceCore convertToWav),
// on parse l'entete WAV et on donne les echantillons bruts au recognizer.
// ──────────────────────────────────────────────────────────────────────────

interface WavData {
  sampleRate: number;
  channels: number;
  bits: number;
  data: Buffer;
}

export function parseWav(buf: Buffer): WavData | null {
  if (buf.length < 44) return null;
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") return null;
  let offset = 12;
  let sampleRate = 16000, channels = 1, bits = 16;
  let data: Buffer | null = null;
  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === "fmt ") {
      channels = buf.readUInt16LE(body + 2);
      sampleRate = buf.readUInt32LE(body + 4);
      bits = buf.readUInt16LE(body + 14);
    } else if (id === "data") {
      data = buf.subarray(body, Math.min(body + size, buf.length));
    }
    offset = body + size + (size % 2);
  }
  return data ? { sampleRate, channels, bits, data } : null;
}

@Injectable()
export class VoskService {
  private readonly logger = new Logger(VoskService.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private vosk: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private model: any = null;
  private tried = false;
  private ready = false;

  constructor(private config: ConfigService) {}

  /** Charge le paquet natif et le modele une seule fois. Silencieux si absent. */
  private load(): boolean {
    if (this.tried) return this.ready;
    this.tried = true;
    const modelPath = this.config.get<string>("VOSK_MODEL_PATH");
    if (!modelPath) {
      this.logger.warn("[STT:VOSK] VOSK_MODEL_PATH non defini — Vosk desactive");
      return false;
    }
    try {
      // require dynamique : n'echoue pas le build si le paquet n'est pas installe.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const vosk = require("vosk");
      vosk.setLogLevel(-1);
      this.model = new vosk.Model(modelPath);
      this.vosk = vosk;
      this.ready = true;
      this.logger.log(`[STT:VOSK] modele charge (${modelPath})`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`[STT:VOSK] indisponible (${msg}) — repli Whisper`);
      this.ready = false;
    }
    return this.ready;
  }

  available(): boolean {
    return this.load();
  }

  /**
   * Transcrit un WAV PCM 16 bits. Renvoie le texte, "" si silence, ou null si
   * Vosk est indisponible / entree invalide (-> l'appelant retombe sur Whisper).
   */
  async transcribe(wavBuffer: Buffer): Promise<string | null> {
    if (!this.load()) return null;
    const wav = parseWav(wavBuffer);
    if (!wav || wav.data.length === 0) {
      this.logger.warn("[STT:VOSK] WAV illisible — repli");
      return null;
    }
    if (wav.channels !== 1 || wav.bits !== 16) {
      this.logger.warn(`[STT:VOSK] format non gere (ch=${wav.channels}, bits=${wav.bits}) — repli`);
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rec: any = null;
    try {
      rec = new this.vosk.Recognizer({ model: this.model, sampleRate: wav.sampleRate });
      rec.acceptWaveform(wav.data);
      const res = rec.finalResult();
      return res && typeof res.text === "string" ? res.text : "";
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`[STT:VOSK] echec reconnaissance (${msg}) — repli`);
      return null;
    } finally {
      if (rec && typeof rec.free === "function") rec.free();
    }
  }
}
