import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// ──────────────────────────────────────────────────────────────────────────
// TTS Piper (offline-first) — remplace ElevenLabs, sur CPU.
//
// Piper est un moteur TTS neuronal leger qui tourne en local. La voix cible est
// "Tata Lou" (fine-tunee ivoirienne), atout d'identite et de souverainete.
//
// Production :
//   - binaire piper (PIPER_BIN, ex: /opt/piper/piper)
//   - modele de voix .onnx + .onnx.json (PIPER_VOICE, ex: /opt/piper/tata-lou.onnx)
//   https://github.com/rhasspy/piper
//
// Defensif : si le binaire ou la voix manque, synthesize() renvoie null ->
// l'appelant retombe sur ElevenLabs (aucune regression). Sortie : WAV (Buffer).
// ──────────────────────────────────────────────────────────────────────────

@Injectable()
export class PiperService {
  private readonly logger = new Logger(PiperService.name);

  constructor(private config: ConfigService) {}

  available(): boolean {
    return !!this.config.get<string>("PIPER_BIN") && !!this.config.get<string>("PIPER_VOICE");
  }

  /** Synthetise `text` en WAV via Piper. Renvoie null si indisponible/echec. */
  async synthesize(text: string): Promise<Buffer | null> {
    const bin = this.config.get<string>("PIPER_BIN");
    const voice = this.config.get<string>("PIPER_VOICE");
    if (!bin || !voice) return null;
    if (!text || !text.trim()) return null;

    const outFile = join(tmpdir(), `piper-${process.pid}-${Date.now()}.wav`);

    return new Promise<Buffer | null>((resolve) => {
      let settled = false;
      const done = (val: Buffer | null) => { if (!settled) { settled = true; resolve(val); } };

      let child;
      try {
        child = spawn(bin, ["--model", voice, "--output_file", outFile], { stdio: ["pipe", "ignore", "pipe"] });
      } catch (e) {
        this.logger.warn(`[TTS:PIPER] spawn impossible (${e instanceof Error ? e.message : e}) — repli`);
        return done(null);
      }

      let stderr = "";
      child.stderr?.on("data", (d) => { stderr += String(d); });
      child.on("error", (e) => {
        this.logger.warn(`[TTS:PIPER] erreur processus (${e.message}) — repli`);
        done(null);
      });
      child.on("close", async (code) => {
        if (code !== 0) {
          this.logger.warn(`[TTS:PIPER] code ${code} ${stderr.slice(0, 120)} — repli`);
          return done(null);
        }
        try {
          const buf = await fs.readFile(outFile);
          await fs.unlink(outFile).catch(() => undefined);
          if (buf.length > 44) {
            this.logger.log(`[TTS:PIPER] OK - ${buf.length} bytes`);
            done(buf);
          } else {
            done(null);
          }
        } catch (e) {
          this.logger.warn(`[TTS:PIPER] lecture sortie KO (${e instanceof Error ? e.message : e}) — repli`);
          done(null);
        }
      });

      try {
        child.stdin?.write(text + "\n");
        child.stdin?.end();
      } catch {
        done(null);
      }
    });
  }
}
