import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { execSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export type AnsutLang = "french" | "dioula" | "bambara";

@Injectable()
export class AnsutService {
  private readonly logger = new Logger(AnsutService.name);
  private readonly baseUrl: string;

  constructor(private config: ConfigService) {
    this.baseUrl = config.get("ANSUT_BASE_URL") || "https://ansut-test.lafricamobile.com";
  }

  private convertToWav16k(inputBuffer: Buffer): Buffer {
    const tmpIn = join(tmpdir(), `ansut_in_${Date.now()}.mp3`);
    const tmpOut = join(tmpdir(), `ansut_out_${Date.now()}.wav`);
    try {
      writeFileSync(tmpIn, inputBuffer);
      execSync(`ffmpeg -i ${tmpIn} -ar 16000 -ac 1 -y ${tmpOut} 2>/dev/null`, { timeout: 10000 });
      return readFileSync(tmpOut);
    } finally {
      try { unlinkSync(tmpIn); } catch (error) { this.logger.error('tmp input cleanup failed', error instanceof Error ? error.stack : String(error)); }
      try { unlinkSync(tmpOut); } catch (error) { this.logger.error('tmp output cleanup failed', error instanceof Error ? error.stack : String(error)); }
    }
  }

  async translateAudio(audioBuffer: Buffer, fromLang: AnsutLang, toLang: AnsutLang): Promise<{
    translation: string;
    audioUrl: string;
  }> {
    try {
      let audioToSend = audioBuffer;
      let filename = "audio.mp3";
      try {
        audioToSend = this.convertToWav16k(audioBuffer);
        filename = "audio.wav";
        this.logger.log(`[ANSUT] WAV converti: ${audioBuffer.length} → ${audioToSend.length} bytes`);
      } catch (e: any) {
        this.logger.warn(`[ANSUT] Conversion échouée: ${e.message}`);
      }
      const fd = new FormData();
      const mime = filename.endsWith(".wav") ? "audio/wav" : "audio/mpeg";
      const blob = new Blob([audioToSend as unknown as BlobPart], { type: mime });
      fd.append("audio", blob, filename);
      const res = await fetch(
        `${this.baseUrl}/translate-audio?from_lang=${fromLang}&to_lang=${toLang}`,
        { method: "POST", body: fd }
      );
      const data = await res.json() as any;
      return {
        translation: data.translation || "",
        audioUrl: data.path_to_audio ? (data.path_to_audio.startsWith("http") ? data.path_to_audio : `${this.baseUrl}${data.path_to_audio}`) : "",
      };
    } catch (e: any) {
      this.logger.error("ANSUT translateAudio error:", e.message);
      return { translation: "", audioUrl: "" };
    }
  }

  async translateText(text: string, fromLang: AnsutLang, toLang: AnsutLang): Promise<{
    translation: string;
    audioUrl: string;
  }> {
    if (fromLang === toLang) return { translation: text, audioUrl: "" };
    this.logger.warn("ANSUT /translate-text non disponible, texte original conserve");
    return { translation: text, audioUrl: "" };
  }

  async textToSpeechLocal(text: string, targetLang: AnsutLang): Promise<{
    audioBase64: string;
    translatedText: string;
    method: string;
  }> {
    if (targetLang === "french") {
      return { audioBase64: "", translatedText: text, method: "elevenlabs" };
    }
    this.logger.warn("ANSUT TTS local non disponible, fallback ElevenLabs");
    return { audioBase64: "", translatedText: text, method: "elevenlabs" };
  }

  async synthesizeSpeech(text: string, lang: string): Promise<Buffer> {
    this.logger.warn(`ANSUT /synthesize non disponible pour lang=${lang}, fallback ElevenLabs`);
    return Buffer.alloc(0);
  }
}
