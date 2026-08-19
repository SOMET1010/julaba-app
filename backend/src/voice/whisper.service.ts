import { Injectable, Logger, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { VoiceMetricsService } from "./voice-metrics.service";

// ──────────────────────────────────────────────────────────────────────────
// STT Whisper.cpp (offline-first) — moteur recommande pour le francais ivoirien
// et le Dioula (multilingue, robuste au bruit et aux accents non standards).
//
// Whisper.cpp est une reecriture C/C++ sans Python : tourne sur CPU modeste et
// sur Android (JNI). Un seul modele `base` (~142 Mo) couvre FR + Dioula, la ou
// Vosk exigerait deux modeles et reste faible sur le francais africain.
//
// Production :
//   binaire : WHISPER_BIN (ex: /opt/whisper/whisper-cli)
//   modele  : WHISPER_MODEL (ex: /opt/whisper/ggml-base.bin)
//   langue  : WHISPER_LANG (defaut "fr" ; "auto" pour laisser Whisper detecter)
//   https://github.com/ggerganov/whisper.cpp
//
// Defensif : si le binaire/modele manque ou echoue, transcribe() renvoie null
// -> l'appelant retombe sur le cloud (Whisper API), aucune regression.
// Entree : WAV PCM 16 kHz mono (deja envoye par le frontend).
// ──────────────────────────────────────────────────────────────────────────

@Injectable()
export class WhisperService {
  private readonly logger = new Logger(WhisperService.name);

  constructor(private config: ConfigService, @Optional() private metrics?: VoiceMetricsService) {}

  available(): boolean {
    return !!this.config.get<string>("WHISPER_BIN") && !!this.config.get<string>("WHISPER_MODEL");
  }

  async transcribe(wavBuffer: Buffer): Promise<string | null> {
    const bin = this.config.get<string>("WHISPER_BIN");
    const model = this.config.get<string>("WHISPER_MODEL");
    const lang = this.config.get<string>("WHISPER_LANG") || "fr";
    if (!bin || !model) return null;
    if (!wavBuffer || wavBuffer.length < 44) return null;

    const base = join(tmpdir(), `whisper-${process.pid}-${Date.now()}`);
    const wavPath = `${base}.wav`;
    const txtPath = `${base}.wav.txt`; // whisper.cpp -otxt ecrit <input>.txt

    try {
      await fs.writeFile(wavPath, wavBuffer);
    } catch {
      return null;
    }

    const cleanup = async () => {
      await fs.unlink(wavPath).catch(() => undefined);
      await fs.unlink(txtPath).catch(() => undefined);
    };

    const startedAt = Date.now();

    return new Promise<string | null>((resolve) => {
      let settled = false;
      // Un appel a `done()` ne survient qu'apres que le process whisper.cpp a
      // reellement ete lance (bin/modele presents, buffer valide) — c'est
      // donc un vrai appel mesurable, jamais une estimation.
      const done = (val: string | null, errorMessage?: string) => {
        if (settled) return;
        settled = true;
        this.metrics
          ?.record("stt_whisper_local", val !== null, Date.now() - startedAt, errorMessage)
          .catch(() => undefined);
        cleanup().finally(() => resolve(val));
      };

      let child;
      try {
        // -otxt : sortie texte dans <wav>.txt ; -nt : sans horodatage ; -np : sans progression.
        child = spawn(bin, ["-m", model, "-f", wavPath, "-l", lang, "-otxt", "-nt", "-np"], {
          stdio: ["ignore", "ignore", "pipe"],
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.warn(`[STT:WHISPER] spawn impossible (${msg}) — repli`);
        return done(null, `spawn impossible: ${msg}`);
      }

      let stderr = "";
      child.stderr?.on("data", (d) => { stderr += String(d); });
      child.on("error", (e) => {
        this.logger.warn(`[STT:WHISPER] erreur processus (${e.message}) — repli`);
        done(null, `erreur processus: ${e.message}`);
      });
      child.on("close", async (code) => {
        if (code !== 0) {
          this.logger.warn(`[STT:WHISPER] code ${code} ${stderr.slice(0, 120)} — repli`);
          return done(null, `code sortie ${code}: ${stderr.slice(0, 200)}`);
        }
        try {
          const txt = await fs.readFile(txtPath, "utf-8");
          const clean = txt.replace(/\s+/g, " ").trim();
          if (clean) {
            this.logger.log(`[STT:WHISPER] ok (${clean.length} car)`);
            done(clean);
          } else {
            done(null, "sortie vide");
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.warn(`[STT:WHISPER] lecture sortie KO (${msg}) — repli`);
          done(null, `lecture sortie KO: ${msg}`);
        }
      });
    });
  }
}
