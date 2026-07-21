import {
  HttpCode, Logger,
  Controller, Post, Get, UploadedFile, UseInterceptors,
  Body, UseGuards, HttpException, HttpStatus
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { VoiceService, ConversationMessage } from "./voice.service";
import { OpenAIService } from "./openai.service";
import { PiperService } from "./piper.service";
import { TtsRequestDto } from "./dto/tts-request.dto";
import { Throttle } from "@nestjs/throttler";

// Bornes d'entree pour limiter le cout des API payantes (LLM, STT, TTS).
const MAX_TEXT_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 20;
const MAX_HISTORY_MESSAGE_LENGTH = 2000;

// Plafonne l'historique transmis aux services : au plus MAX_HISTORY_MESSAGES
// messages recents, chaque contenu tronque a MAX_HISTORY_MESSAGE_LENGTH.
function boundHistory(history: any): ConversationMessage[] {
  if (!Array.isArray(history)) return [];
  return history.slice(-MAX_HISTORY_MESSAGES).map((m: any) => {
    if (m && typeof m.content === "string" && m.content.length > MAX_HISTORY_MESSAGE_LENGTH) {
      return { ...m, content: m.content.slice(0, MAX_HISTORY_MESSAGE_LENGTH) };
    }
    return m;
  });
}

// ── VOICE CONTROLLER ─────────────────────────────────────────────

@Controller("voice")
export class VoiceController {
  private readonly logger = new Logger(VoiceController.name);

  constructor(
    private voiceService: VoiceService,
  ) {}

  @Throttle({ voice: { limit: 60, ttl: 60000 } })
  @Post("process")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor("audio", { limits: { fileSize: 10 * 1024 * 1024 } }))
  async processVoice(
    @UploadedFile() file: Express.Multer.File,
    @Body("context") contextStr: string,
    @Body("history") historyStr: string
  ) {
    if (!file) throw new HttpException("Audio requis", HttpStatus.BAD_REQUEST);
    let context: any = {};
    let history: ConversationMessage[] = [];
    if (contextStr) {
      try {
        context = JSON.parse(contextStr);
      } catch {
        throw new HttpException("Payload JSON invalide", HttpStatus.BAD_REQUEST);
      }
    }
    if (historyStr) {
      try {
        history = JSON.parse(historyStr);
      } catch {
        throw new HttpException("Payload JSON invalide", HttpStatus.BAD_REQUEST);
      }
    }
    history = boundHistory(history);
    return this.voiceService.processVoice(file.buffer, file.mimetype, context, history);
  }

  @Post("intent-fast")
  @Throttle({ voice: { limit: 60, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  async intentFast(@Body() body: any) {
    const t0 = Date.now();
    // Pas d'appel externe ici (regex locale), mais on borne pour eviter un texte demesure.
    const text: string = (typeof body?.text === "string" ? body.text : "").slice(0, MAX_TEXT_LENGTH);
    let intent = "conversation";
    const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (/vendu|vend(re|s)?|ecoule|cede|livre/.test(lower)) intent = "vendre";
    else if (/depens|paye|sorti|achete|pris|gbaka|woro|maquis|transport|repas|loyer|tontine|sante|telephone|famille/.test(lower)) intent = "depense";
    else if (/stock|ajoute|recu|livraison/.test(lower)) intent = "ajouter_stock";
    else if (/caisse|solde|combien.*franc/.test(lower)) intent = "consulter_solde";
    else if (/ventes|histori|bilan|rapport|resume/.test(lower)) intent = "consulter_ventes";
    else if (/ouvr|commence|demarre|debut/.test(lower)) intent = "ouvrir_journee";
    else if (/ferm|termin|clotur|fin.*journ/.test(lower)) intent = "fermer_journee";
    else if (/march|boutique|annonce/.test(lower)) intent = "marche";
    else if (/keiwa|wallet|portefeuill|retrait/.test(lower)) intent = "keiwa";
    else if (/objectif|cible|but|viser/.test(lower)) intent = "definir_objectif";
    const latency = Date.now() - t0;
    this.logger.log(`[TIMING] intent_fast=${latency}ms intent=${intent}`);
    return { intent, latency_ms: latency };
  }

  @Post("intent")
  @Throttle({ voice: { limit: 60, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  async processIntent(
    @Body("text") text: string,
    @Body("context") contextStr: any,
    @Body("history") historyStr: any,
  ) {
    if (!text) throw new HttpException("Texte requis", HttpStatus.BAD_REQUEST);
    if (text.length > MAX_TEXT_LENGTH) throw new HttpException("Texte trop long", HttpStatus.BAD_REQUEST);
    let context = contextStr || {};
    let history: ConversationMessage[] = historyStr || [];
    if (typeof contextStr === "string") {
      try {
        context = JSON.parse(contextStr);
      } catch {
        throw new HttpException("Payload JSON invalide", HttpStatus.BAD_REQUEST);
      }
    }
    if (typeof historyStr === "string") {
      try {
        history = JSON.parse(historyStr);
      } catch {
        throw new HttpException("Payload JSON invalide", HttpStatus.BAD_REQUEST);
      }
    }
    history = boundHistory(history);
    return this.voiceService.processIntent(text, context, history);
  }
}

// ── TTS CONTROLLER - ElevenLabs (route /tts/openai conservee par historique) ──

@Controller("tts")
export class TtsController {
  private readonly logger = new Logger(TtsController.name);

  constructor(
    private openaiService: OpenAIService,
    private piperService: PiperService,
  ) {}

  // Point de contrôle PUBLIC (à ouvrir dans un navigateur) : teste RÉELLEMENT
  // Piper et dit quel moteur de voix est actif. Sert à vérifier le déploiement.
  @Get("status")
  @HttpCode(200)
  async ttsStatus() {
    const piperConfigured = this.piperService.available();
    let piperWorks = false;
    try {
      const buf = await this.piperService.synthesize("Test.");
      piperWorks = !!buf && buf.length > 44;
    } catch { piperWorks = false; }
    // Cloud (ElevenLabs) COUPÉ PAR DÉFAUT (choix produit : souveraineté, zéro coût).
    // Ne s'active que si quelqu'un pose explicitement TTS_ENABLE_CLOUD=true.
    const cloudEnabled = process.env.TTS_ENABLE_CLOUD === "true";
    const moteur = piperWorks ? "piper" : (cloudEnabled ? "elevenlabs (cloud)" : "navigateur (gratuit)");
    return {
      piperConfigured,   // les variables PIPER_BIN/PIPER_VOICE sont-elles posées ?
      piperWorks,        // Piper synthétise-t-il vraiment de l'audio ?
      cloudEnabled,      // le cloud payant est-il autorisé ? (faux = jamais d'ElevenLabs)
      moteurActif: moteur,
    };
  }

  @Throttle({ voice: { limit: 60, ttl: 60000 } })
  @Post("openai")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async openaiTTS(@Body() dto: TtsRequestDto) {
    // 1) PIPER d'abord : auto-hébergé, GRATUIT à l'usage, souverain (voix ivoirienne).
    //    Dès que PIPER_BIN + PIPER_VOICE sont configurés, aucun appel cloud payant.
    const piperBuf = await this.piperService.synthesize(dto.text);
    if (piperBuf) {
      this.logger.log(`[TTS] ${piperBuf.length} bytes (piper)`);
      return { success: true, audio: piperBuf.toString("base64"), engine: "piper" };
    }
    // 2) ElevenLabs : COUPÉ PAR DÉFAUT (décision : zéro ElevenLabs, souveraineté).
    //    Ne s'active QUE si quelqu'un pose explicitement TTS_ENABLE_CLOUD=true.
    if (process.env.TTS_ENABLE_CLOUD === "true") {
      const buf = await this.openaiService.synthesize(dto.text);
      if (buf) {
        this.logger.log(`[TTS] ${buf.length} bytes (elevenlabs)`);
        return { success: true, audio: buf.toString("base64"), engine: "elevenlabs" };
      }
    }
    // 3) Aucun audio serveur : le frontend parle avec la voix intégrée du
    //    navigateur (gratuite, hors-ligne) — l'assistante n'est jamais muette.
    return { success: false, error: "TTS indisponible" };
  }
}
