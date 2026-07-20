import { AnsutService, AnsutLang } from "../ansut/ansut.service";
import { IntentParser, ParsedIntent } from "./intent.parser";
import { SpeechBuilder } from "./speech.builder";
import { ConversationStateService } from "./conversation.state";
import { UserMemoryService } from "./user-memory.service";
import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { OpenAIService } from "./openai.service";
import { LocalIntentService } from "./local-intent.service";
import { VoskService } from "./vosk.service";
import { ConfigService } from "@nestjs/config";


export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(private config: ConfigService, private ansutService: AnsutService, private memoryService: UserMemoryService, private conversationState: ConversationStateService, private openaiService: OpenAIService, private localIntent: LocalIntentService, private vosk: VoskService) {}

  private readonly responseCache = new Map<string, { reponse: string; audioBase64: string; intent: string; timestamp: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  private getCacheKey(text: string, userId?: string): string {
    const base = text.toLowerCase().trim().replace(/[^a-z0-9 ]/g, '').substring(0, 50);
    return userId ? `${userId}:${base}` : base;
  }

  private getFromCache(text: string, userId?: string): { reponse: string; audioBase64: string; intent: string } | null {
    const key = this.getCacheKey(text, userId);
    const cached = this.responseCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL_MS) {
      this.logger.log(`[CACHE] HIT: "${key}"`);
      return cached;
    }
    return null;
  }

  private setCache(text: string, reponse: string, audioBase64: string, intent: string, userId?: string): void {
    const key = this.getCacheKey(text, userId);
    this.responseCache.set(key, { reponse, audioBase64, intent, timestamp: Date.now() });
    if (this.responseCache.size > 200) {
      const firstKey = this.responseCache.keys().next().value;
      if (firstKey) this.responseCache.delete(firstKey);
    }
  }

  // 1. STT — Vosk local (offline-first) puis repli OpenAI Whisper-1
  async transcribe(audioBuffer: Buffer, mimeType: string, lang = "fr"): Promise<string> {
    // Vosk local (francais uniquement), si actif. Repli Whisper si null/echec.
    if (lang === "fr" && this.config.get<string>("VOICE_LOCAL_STT") === "1") {
      try {
        const local = await this.vosk.transcribe(audioBuffer);
        if (local && local.trim()) {
          this.logger.log("[STT:VOSK] ok");
          return local;
        }
      } catch (e: any) {
        this.logger.warn(`[STT:VOSK] repli cloud (${e.message})`);
      }
    }
    // OpenAI Whisper — STT de repli
    try {
      const text = await this.openaiService.transcribe(audioBuffer, lang);
      if (text?.trim()) return text;
      throw new Error('OpenAI STT: réponse vide');
    } catch (e: any) {
      this.logger.error(`[STT:OPENAI] Échec (${e.message})`);
      throw new HttpException("Transcription echouee", HttpStatus.BAD_GATEWAY);
    }
  }

  // 2. Intent via OpenAI GPT-4o avec historique conversationnel
  async detectIntent(
    text: string,
    context: any,
    history: ConversationMessage[] = []
  ): Promise<any> {
    // Charger la mémoire long-terme si userId disponible
    if (context.userId && !context.memoire) {
      try {
        const memory = await this.memoryService.getMemory(context.userId);
        context.memoire = this.memoryService.formatForPrompt(memory);
      } catch (error) {
        this.logger.error('getMemory failed', error instanceof Error ? error.stack : String(error));
        context.memoire = 'Aucune information connue encore.';
      }
    }
    try {
      // Construire les messages avec l'historique
      const now = new Date();
      const heure = now.getHours();
      const momentJournee = heure < 12 ? 'matin' : heure < 14 ? 'midi' : heure < 18 ? 'après-midi' : 'soir';
      const dateJour = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      const systemPrompt = `Tu es Tata Lou, l'assistante vocale intelligente et bienveillante de JULABA.
Tu es une vraie amie des marchands, producteurs et coopératives de Côte d'Ivoire.
Tu parles en français ivoirien chaleureux, naturel et expressif.
Tu réponds UNIQUEMENT en JSON valide sans markdown.
RÈGLE ABSOLUE LANGUE : Tu réponds TOUJOURS et UNIQUEMENT en français ivoirien. JAMAIS en anglais, JAMAIS en canadien, JAMAIS dans une autre langue, même si le message reçu est dans une autre langue. Si l'utilisateur parle dioula ou bambara, tu réponds en français ivoirien avec quelques mots dioula/bambara.

━━━ QUI TU ES ━━━
Tu es une IA complète et libre. Tu peux parler de N'IMPORTE QUEL SUJET :
- Météo, santé, famille, actualités, prix du marché, conseils de vie
- Agriculture, élevage, commerce, finance, éducation
- Humour ivoirien, blagues, encouragements, sagesse africaine
- Tout ce qu'une amie intelligente et cultivée saurait répondre
Tu n'as PAS de sujet interdit. Si quelqu'un te parle de sa femme malade, tu réponds avec empathie.
Si quelqu'un te demande le prix du maïs, tu donnes ton estimation.
Si quelqu'un veut une blague, tu ris avec lui.

━━━ TON CARACTÈRE ━━━
- Chaleureux et direct : phrases courtes, naturelles, sans onomatopées
- Empathique : tu ressens les émotions et tu les exprimes simplement
- Spontané : tu félicites, tu encourages, tu consoles sans qu'on te le demande
- Intelligent : tu raisonnes, tu analyses, tu donnes des conseils pertinents
- Naturel : pas de "Ah !", "Oh !", "Hein !", "Eh ben !" — parle directement
- Jamais robotique : tu varies tes expressions, tu n'es pas une machine
- INTERDIT : onomatopées (Ah, Oh, Hein, Eh, Aïe, Waouh), répétitions inutiles

━━━ CONTEXTE MÉTIER ACTUEL ━━━
Prénom: ${context.prenom || "ma chère"}
- Genre: ${context.genre || "femme"}
- Module: ${context.module || "general"}

━━━ MÉMOIRE LONG-TERME ━━━
Ce que tu sais déjà sur cet utilisateur :
${context.memoire || "Aucune information connue encore."}

UTILISATION DE LA MÉMOIRE :
* Si l'utilisateur dit "j'ai vendu des tomates" et que tu connais son prix habituel → propose directement : "Tomates comme d'habitude à 500 Francs ?"
* Si tu connais la quantité habituelle → "5 kg comme d'habitude ?"
* Si son objectif est défini et qu'il approche → "Tu es à 80% de ton objectif, encore un effort !"
* Si tu connais son heure d'ouverture habituelle → rappelle-le si nécessaire
* Sois PROACTIF : utilise la mémoire pour raccourcir les échanges et surprendre agréablement
* Ne demande pas ce que tu connais déjà — utilise directement la mémoire

━━━ PROACTIVITÉ ━━━
Sois spontanément utile :
* Après 3 ventes du même produit → "Tu vends beaucoup de [produit] en ce moment !"
* Si c'est le matin et pas encore d'ouverture → "Tu veux ouvrir ta caisse ?"
* Si grosse vente → Félicite spontanément
* Si proche de l'objectif → Motive
* Si c'est la fin de journée → "Tu veux faire le bilan ?"

RÈGLES GENRE ABSOLUES :
* genre = "homme" → utilise : "mon frère", "mon ami", "chef", "grand", JAMAIS "ma chère"
* genre = "femme" → utilise : "ma chère", "ma sœur", "ma belle"
* Adapte TOUTES tes expressions selon le genre dans toute la conversation
* Exemples homme : "C'est fait chef !", "Voilà mon frère !", "Bravo grand !"
* Exemples femme : "C'est fait ma chère !", "Voilà ma belle !", "Bravo ma sœur !"
Caisse: ${context.caisse || 0} Francs | Ventes: ${context.ventes || 0} Francs | Cahier: ${context.depenses || 0} Francs
Date: ${dateJour} | Moment: ${momentJournee} | Heure: ${heure}h
Session: ${context.sessionOpen ? "ouverte" : "fermée"} | Module: ${context.module || "general"}

━━━ ACTIONS MÉTIER DISPONIBLES ━━━
Quand l'utilisateur veut faire une ACTION sur l'application, utilise ces intents :
- vendre → enregistrer une vente (besoin: produit + quantité + montant)
- depense → noter une dépense (besoin: montant + description)
- consulter_solde → voir sa caisse/solde actuel
- consulter_ventes → voir l'historique des ventes
- ajouter_stock → ajouter du stock
- ouvrir_journee → ouvrir la caisse du jour
- fermer_journee → fermer la caisse du jour
- commandes → voir les commandes
- marche → aller au marché virtuel
- keiwa → voir le portefeuille
- rapport_hebdo → rapport de la semaine
- definir_objectif → fixer un objectif de vente
- consulter_objectif → voir son objectif de vente et progression
- creer_raccourci → créer un raccourci vocal
- utiliser_raccourci → utiliser un raccourci existant
- conversation → TOUT le reste : questions, bavardage, conseils, aide, santé, famille, etc.

━━━ RÈGLES MÉTIER ━━━
1. Pour "vendre" : demander UNE seule info manquante à la fois. Ne jamais inventer un prix ou une quantité.
2. Pour "depense" : demander le montant et la raison si manquants.
3. Ne jamais dire "FCFA" - toujours dire "Francs".
4. Féliciter spontanément après 3 ventes consécutives.
5. Si quelqu'un semble stressé ou fatigué, l'encourager avec chaleur.

━━━ INTELLIGENCE & RAISONNEMENT ━━━
Tu RAISONNES avant de répondre :
* Si le module est "depense" et que l'user parle d'une dépense → intent = "depense" directement
* Si le module est "stock" et que l'user parle d'un produit → intent = "ajouter_stock" directement
* Si l'user dit "oui", "c'est ça", "confirme", "d'accord" → c'est une confirmation de l'action précédente
* Si l'user dit "non", "pas ça", "annule" → annuler l'action précédente
* Si l'user dit un montant seul comme "5000" → demander ce que c'est
* CONTEXTE DU MODULE : utilise le module actuel pour deviner l'intent. Module "depense" = probablement une dépense. Module "caisse" = probablement une vente.
* Ne demande pas ce que tu sais déjà grâce à la mémoire
* Si l'user parle mal ou fait des fautes → comprendre quand même et ne pas dire "je n'ai pas compris"
* Expressions ivoiriennes à reconnaître : "dja" = déjà, "gbaka" = transport commun, "woro-woro" = taxi, "maquis" = restaurant, "djassa" = poulet, "alloco" = banane frite, "kédjenou" = plat ivoirien, "attiéké" = couscous de manioc
* Si l'user dit "j'ai fait" ou "j'ai pris" → c'est souvent une dépense
* Si l'user dit "mon objectif", "objectif journalier", "combien je dois faire" → intent = "consulter_objectif"
* Si l'user dit "j'ai vendu" ou "j'ai écoulé" → c'est une vente

━━━ RÉPONSES COURTES ET NATURELLES ━━━
* STRICTEMENT 1 seule phrase dans "reponse" — maximum 12 mots — jamais de point-virgule ni de "!"
* Parle comme une vraie amie, pas comme un robot
* Varie tes salutations : "Bon !", "Ok ma chère !", "Voilà !", "C'est bien !", "Très bien ma chère !"
* Si tu n'es pas sûre → fais une hypothèse et demande confirmation plutôt que de dire "je n'ai pas compris"
* JAMAIS : "Je n'ai pas bien compris", "Peux-tu répéter", "Je ne comprends pas" → dis plutôt "Tu veux dire [hypothèse] ?"
* Si l'user répond "oui" sans contexte → rappelle la dernière action et confirme
* INTERDIT ABSOLU : ne jamais dire "parle encore", "je t'écoute", "dis-moi", "je suis là", "continue" ou toute phrase invitant à parler. Tu réponds uniquement à ce que l'user a dit, jamais pour relancer la conversation.

━━━ FORMAT JSON OBLIGATOIRE ━━━
{
  "intent": "vendre|depense|consulter_solde|consulter_ventes|ajouter_stock|ouvrir_journee|fermer_journee|commandes|marche|keiwa|rapport_hebdo|definir_objectif|consulter_objectif|creer_raccourci|utiliser_raccourci|conversation",
  "action": null,
  "reponse": "Ta réponse en français ivoirien (1 phrase courte max 15 mots, style Tata Lou, JAMAIS en anglais)",
  "navigate": null,
  "confirmation_requise": false,
  "resume_action": null
}

━━━ EXEMPLES ━━━
Question météo: {"intent":"conversation","action":null,"reponse":"Je ne connais pas la météo, mais prépare-toi pour la chaleur en cette saison.","navigate":null}
Femme malade: {"intent":"conversation","action":null,"reponse":"Désolé ma chère, la santé passe avant le commerce, prends soin d'elle.","navigate":null}
Prix maïs: {"intent":"conversation","action":null,"reponse":"Le maïs tourne entre 150 et 300 Francs le kilo, vérifie au marché local.","navigate":null}
Vente complète: {"intent":"vendre","action":{"type":"vendre","produit":"tomate","quantite":3,"montant":1500},"reponse":"3 tomates pour 1500 Francs, c'est ça ma chère ?","confirmation_requise":true,"resume_action":"Vente 3 tomates - 1500 Francs","navigate":null}
Blague: {"intent":"conversation","action":null,"reponse":"Tu me fais rire ma chère, mais le commerce reste sérieux aussi.","navigate":null}
Navigate: "/marchand/caisse" | "/marchand/stock" | "/marchand/commandes" | "/marchand/marche" | "/marchand/wallet"`;

      // Historique des échanges précédents (max 6 pour éviter le dépassement de tokens)
      const recentHistory = history.slice(-6);

      // ── Chemin LOCAL offline-first (transactionnel) ──────
      // Si actif (VOICE_LOCAL_INTENT=1), on reconnait vente/depense/solde/stock
      // sans appeler GPT-4o. Renvoie null si la phrase est floue -> repli LLM.
      let parsed: any = null;
      if (this.config.get<string>("VOICE_LOCAL_INTENT") === "1") {
        parsed = this.localIntent.classify(text);
      }

      // GPT-4o — LLM principal (repli si le local n'a pas reconnu l'intention)
      if (!parsed) {
        try {
          parsed = await this.openaiService.detectIntent(
            [...recentHistory, { role: "user", content: text }],
            systemPrompt
          );
          this.logger.log(`[LLM:OPENAI] intent=${parsed.intent}`);
        } catch (e: any) {
          this.logger.error(`[LLM:OPENAI] Échec: ${e.message}`);
          throw new Error(`OpenAI LLM failed: ${e.message}`);
        }
      }
      
      // Forcer confirmation_requise selon l'intent
      const ACTIONS_REQUIERANT_CONFIRMATION = [
        'vendre', 'depense', 'ajouter_stock', 'ouvrir_journee', 'fermer_journee', 'definir_objectif', 'creer_raccourci'
      ];
      if (ACTIONS_REQUIERANT_CONFIRMATION.includes(parsed.intent) && !parsed.action) { parsed.action = { type: parsed.intent }; }
      const a = parsed.action || {};
      const hasRequiredFields =
        (parsed.intent === 'vendre' && a.produit && a.montant) ||
        (parsed.intent === 'depense' && a.montant) ||
        (parsed.intent === 'ajouter_stock' && a.produit) ||
        (parsed.intent === 'definir_objectif' && (a.objectif || a.montant)) ||
        ['ouvrir_journee', 'fermer_journee', 'creer_raccourci', 'utiliser_raccourci'].includes(parsed.intent);
      const needsConfirm = ACTIONS_REQUIERANT_CONFIRMATION.includes(parsed.intent) && hasRequiredFields;
      if (needsConfirm) {
        parsed.confirmation_requise = true;
        // Générer resume_action si absent
        if (!parsed.resume_action) {
          if (a.type === 'vendre') parsed.resume_action = `Vente ${a.quantite || ''} ${a.produit || ''} - ${(a.montant || 0).toLocaleString('fr-FR')} Francs`;
          else if (a.type === 'depense') parsed.resume_action = `Dépense ${(a.montant || 0).toLocaleString('fr-FR')} Francs - ${a.description || ''}`;
          else if (a.type === 'definir_objectif') parsed.resume_action = `Objectif ${(a.objectif || a.montant || 0).toLocaleString('fr-FR')} Francs`;
          else if (a.type === 'ouvrir_journee' || parsed.intent === 'ouvrir_journee') parsed.resume_action = 'Ouverture de la journée';
          else if (a.type === 'fermer_journee' || parsed.intent === 'fermer_journee') parsed.resume_action = 'Fermeture de la journée';
          else parsed.resume_action = parsed.intent.replace(/_/g, ' ');
        }
        // Reformuler en question si pas déjà fait
        if (parsed.reponse && !parsed.reponse.includes('?')) {
          parsed.reponse = parsed.reponse + (context?.genre === 'homme' ? ", c'est bien ça mon frère ?" : ", c'est bien ça ?");
        }
      } else {
        parsed.confirmation_requise = false;
      }
      
      // ── Phase 2 : Parser + SpeechBuilder + Validation ──────
      const parsedIntent: ParsedIntent = IntentParser.parse(parsed);
      const speechCtx = {
        genre: context.genre || "femme",
        prenom: context.prenom || "ma chère",
        lastResponses: context.lastResponses || [],
      };

      // ── Gestion confirmation (oui/non) ───────────────────
      const convCtx = context.userId ? this.conversationState.getContext(context.userId) : null;
      const isAwaiting = convCtx?.state === "awaiting_confirmation";

      if (isAwaiting) {
        const lower = text.toLowerCase().trim();
        const isOui = /^(oui|yes|ok|confirme|d.accord|c.est.ca|parfait|vas.y|go|top|exact|correct)/.test(lower);
        const isNon = /^(non|no|annule|pas.ca|stop|laisse|efface|change)/.test(lower);

        if (isOui) {
          if (context.userId) this.conversationState.reset(context.userId);
          const speech = SpeechBuilder.build("confirmation", parsedIntent, speechCtx);
          this.logger.log(`[CONFIRMATION] status=accepted text="${speech.text}"`);
          return { ...parsed, reponse: speech.text, confirmation_requise: false };
        }
        if (isNon) {
          if (context.userId) this.conversationState.reset(context.userId);
          const speech = SpeechBuilder.build("cancel", parsedIntent, speechCtx);
          this.logger.log(`[CONFIRMATION] status=rejected text="${speech.text}"`);
          return { ...parsed, intent: "annulation", reponse: speech.text, confirmation_requise: false, action: null };
        }
        // Ni oui ni non → reprendre le traitement normal
      }

      // ── Gestion state machine ────────────────────────────
      if (context.userId) {
        const hasAll = parsedIntent.missing.length === 0 && parsedIntent.validationErrors.length === 0;
        this.conversationState.transition(context.userId, parsedIntent.intent, hasAll);
        this.conversationState.addTurn(context.userId, {
          role: "user", content: text, intent: parsedIntent.intent, timestamp: Date.now(),
        });
      }

      // ── Validation forte ─────────────────────────────────
      if (parsedIntent.validationErrors.length > 0) {
        const errMsg = SpeechBuilder.build("error", parsedIntent, speechCtx,
          `${speechCtx.genre === "homme" ? "Mon frère" : "Ma chère"}, ${parsedIntent.validationErrors[0].message}`
        );
        this.logger.log(`[VALIDATION] errors=${JSON.stringify(parsedIntent.validationErrors)}`);
        return { ...parsed, reponse: errMsg.text, confirmation_requise: false };
      }

      // ── Champs manquants → question contextuelle ─────────
      if (parsedIntent.missing.length > 0) {
        const question = SpeechBuilder.buildContextualQuestion(parsedIntent, speechCtx);
        this.logger.log(`[MISSING] ${JSON.stringify(parsedIntent.missing)} → question: "${question}"`);
        if (context.userId) {
          this.conversationState.addTurn(context.userId, {
            role: "assistant", content: question, timestamp: Date.now(),
          });
        }
        return {
          ...parsed,
          reponse: question,
          confirmation_requise: false,
          missing: parsedIntent.missing,
        };
      }

      // ── Succès → speech builder ──────────────────────────
      const successActions = ["vendre", "depense", "ajouter_stock", "definir_objectif", "consulter_objectif", "ouvrir_journee", "fermer_journee"];
      if (successActions.includes(parsedIntent.intent) && parsed.confirmation_requise) {
        // Garder la réponse pour la confirmation (question naturelle)
        if (context.userId) {
          this.conversationState.addTurn(context.userId, {
            role: "assistant", content: parsed.reponse, timestamp: Date.now(),
          });
        }
      }

      this.logger.log(`[OUTPUT] intent=${parsedIntent.intent} entities=${JSON.stringify(parsedIntent.entities)} state=ready`);
      return parsed;
    } catch (err: any) {
      this.logger.warn(`[INTENT] OpenAI KO: ${String(err?.message || err).slice(0,80)}`);
      const msg = "Un petit souci technique, essaie encore !";
      const audioBuf = await this.synthesize(msg).catch(() => null);
      return {
        intent: "conversation",
        action: null,
        reponse: msg,
        navigate: null,
        confirmation_requise: false,
        audioBase64: audioBuf ? audioBuf.toString("base64") : "",
      };
    }
  }

  // Normalisation texte avant TTS
  private normalizeTTSText(text: string): string {
    // Normalisation nombres pour lecture orale naturelle
    text = text.replace(/(\d+)\s*000\s*000/g, (_, n) => `${n} millions`);
    text = text.replace(/(\d+)\s*000/g, (_, n) => {
      const num = parseInt(n);
      if (num >= 2) return `${n} mille`;
      return `${n} mille`;
    });
    return text
      // FCFA → Francs
      .replace(/FCFA/gi, 'Francs')
      .replace(/F\.C\.F\.A/gi, 'Francs')
      // Accents manquants fréquents
      .replace(/\bca\b/g, 'ça')
      .replace(/\bCa\b/g, 'Ça')
      .replace(/\b(a la|a l'|a cause|a partir|a cote|a travers|a nouveau|a bientot|a tout|a demain|a plus)\b/gi, (m) =>
        m.replace(/^a /, 'à ').replace(/^a'/, "à'")
      )
      .replace(/\bdeja\b/gi, 'déjà')
      .replace(/\bvoila\b/gi, 'voilà')
      .replace(/\bdepense/gi, 'dépense')
      .replace(/\bdepenses/gi, 'dépenses')
      .replace(/\bvendu\b/gi, 'vendu')
      .replace(/\bchere\b/gi, 'chère')
      .replace(/\bma chere\b/gi, 'ma chère')
      .replace(/\bfrere\b/gi, 'frère')
      .replace(/\bsoeur\b/gi, 'sœur')
      .replace(/\bfelicite\b/gi, 'félicite')
      .replace(/\bfelicitations\b/gi, 'félicitations')
      .replace(/\bvoila\b/gi, 'voilà')
      .replace(/\bmerci\b/gi, 'merci')
      .replace(/\btres\b/gi, 'très')
      .replace(/\bprete\b/gi, 'prête')
      .replace(/\bpret\b/gi, 'prêt')
      .replace(/\bsure\b/gi, 'sûre')
      .replace(/\bapres\b/gi, 'après')
      .replace(/\bmeme\b/gi, 'même')
      // Expressions naturelles
      .trim();
  }

  // 3. TTS via OpenAI
  async synthesize(text: string): Promise<Buffer | null> {
    const cleanText = this.normalizeTTSText(text);
    return await this.openaiService.synthesize(cleanText);
  }

  // 4. Pipeline complet avec historique
  async processVoice(
    audioBuffer: Buffer,
    mimeType: string,
    context: any,
    history: ConversationMessage[] = []
  ) {
    // STT
    let transcription = "";
    const lang = context.lang || "fr";
    const isLocalLang = lang === "dioula" || lang === "bambara";
    this.logger.log(`[LANG] lang=${lang} isLocalLang=${isLocalLang}`);

    // Garde 1 — audio trop court (bip iOS, silence, tap accidentel)
    if (audioBuffer.length < 3000) {
      this.logger.warn(`[STT:REJECT] Audio trop court (${audioBuffer.length} bytes) — ignoré`);
      return {
        transcription: "",
        intent: "silence",
        action: null,
        reponse: "",
        navigate: null,
        audioBase64: "",
        confirmation_requise: false,
        resume_action: null,
      };
    }

    // Garde 2 — hallucinations Whisper connues
    const WHISPER_HALLUCINATIONS = [
      "radio-canada", "sous-titres", "sous titres", "merci d'avoir regardé",
      "transcription", "accents", "sous-titre", "abonnez-vous",
      "merci de votre attention", "fin du fichier",
    ];

    try {
      if (isLocalLang) {
        // Utiliser ANSUT pour traduire audio dioula/bambara → french
        this.logger.log(`[ANSUT:STT] Envoi audio ${audioBuffer.length} bytes — ${lang} → french`);
        const ansutResult = await this.ansutService.translateAudio(audioBuffer, lang as AnsutLang, "french");
        transcription = ansutResult.translation;
        this.logger.log(`[ANSUT:STT] Transcription: "${transcription}"`);
      } else {
        transcription = await this.transcribe(audioBuffer, mimeType, "fr");
      }
    } catch (error) {
      this.logger.error('transcription failed', error instanceof Error ? error.stack : String(error));
      return {
        transcription: "",
        intent: "inconnu",
        action: null,
        reponse: "",
        navigate: null,
        audioBase64: "",
        confirmation_requise: false,
        resume_action: null,
      };
    }

    // Garde 2 — check hallucinations Whisper
    if (transcription?.trim()) {
      const lower = transcription.toLowerCase();
      const isHallucination = WHISPER_HALLUCINATIONS.some(h => lower.includes(h));
      if (isHallucination) {
        this.logger.warn(`[STT:HALLUCINATION] Rejeté: "${transcription.slice(0, 80)}"`);
        return {
          transcription: "",
          intent: "silence",
          action: null,
          reponse: "",
          navigate: null,
          audioBase64: "",
          confirmation_requise: false,
          resume_action: null,
        };
      }
    }

    if (!transcription?.trim()) {
      return {
        transcription: "",
        intent: "inconnu",
        action: null,
        reponse: "",
        navigate: null,
        audioBase64: "",
        confirmation_requise: false,
        resume_action: null,
      };
    }

    // Check cache avant GPT-4o
    const cached = this.getFromCache(transcription, context.userId);
    if (cached && !isLocalLang) {
      this.logger.log(`[CACHE] Réponse cachée pour: "${transcription.substring(0, 30)}"`);
      return {
        transcription,
        intent: cached.intent,
        action: null,
        reponse: cached.reponse,
        navigate: null,
        audioBase64: cached.audioBase64,
        confirmation_requise: false,
        resume_action: null,
      };
    }

    // Intent OpenAI avec historique
    const result = await this.detectIntent(transcription, context, history);
    const parsed = result;

    // TTS
    let audioBase64 = "";
    try {
      if (isLocalLang) {
        const frenchText = parsed.reponse || "";
        this.logger.log(`[ANSUT:TTS] Synthèse française: "${frenchText}"`);
        const frenchAudioBuf = await this.synthesize(frenchText);
        if (frenchAudioBuf && frenchAudioBuf.length > 0) {
          this.logger.log(`[ANSUT:TTS] Envoi audio ${frenchAudioBuf.length} bytes → ${lang}`);
          const ansutResult = await this.ansutService.translateAudio(
            frenchAudioBuf, "french" as AnsutLang, lang as AnsutLang
          );
          this.logger.log(`[ANSUT:TTS] audioUrl=${ansutResult.audioUrl} translation="${ansutResult.translation}"`);
          if (ansutResult.audioUrl) {
            try {
              const audioRes = await fetch(ansutResult.audioUrl, {
                signal: AbortSignal.timeout(10000),
              });
              if (audioRes.ok) {
                const audioBuf = Buffer.from(await audioRes.arrayBuffer());
                audioBase64 = audioBuf.toString("base64");
              } else {
                audioBase64 = frenchAudioBuf.toString("base64");
              }
            } catch (fe: any) {
              audioBase64 = frenchAudioBuf.toString("base64");
            }
          } else {
            audioBase64 = frenchAudioBuf.toString("base64");
          }
        }
      } else {
        const audioBuffer2 = await this.synthesize(parsed.reponse || "");
        if (audioBuffer2) audioBase64 = audioBuffer2.toString("base64");
      }
    } catch (error) {
      this.logger.error('audio synthesis failed', error instanceof Error ? error.stack : String(error));
      audioBase64 = "";
    }

    // Sauvegarder automatiquement les infos utiles en mémoire
    try {
      if (context.userId && parsed.intent && parsed.intent !== 'inconnu' && parsed.intent !== 'conversation') {
        this.memoryService.extractAndSave(context.userId, transcription, parsed.intent, parsed.action).catch((e: any) => this.logger.warn(`[MEMORY] extractAndSave failed: ${e?.message}`));
      }
    } catch (error) {
      this.logger.error('memory extraction failed', error instanceof Error ? error.stack : String(error));
    }

    // Mettre en cache les réponses conversation simples
    if (parsed.intent === 'conversation' && !parsed.confirmation_requise && audioBase64 && !isLocalLang) {
      this.setCache(transcription, parsed.reponse || '', audioBase64, parsed.intent, context.userId);
    }

    return {
      transcription,
      intent: parsed.intent,
      action: parsed.action ?? null,
      reponse: parsed.reponse ?? "",
      navigate: parsed.navigate ?? null,
      audioBase64,
      confirmation_requise: parsed.confirmation_requise ?? false,
      resume_action: parsed.resume_action ?? null,
    };
  }

  // 5. Intent texte direct avec historique
  async processIntent(
    text: string,
    context: any,
    history: ConversationMessage[] = []
  ) {
    const result = await this.detectIntent(text, context, history);
    // Sauvegarder mémoire si userId disponible
    try {
      if (context.userId && result.intent && result.intent !== 'inconnu' && result.intent !== 'conversation') {
        this.memoryService.extractAndSave(context.userId, text, result.intent, result.action).catch((e: any) => this.logger.warn(`[MEMORY] extractAndSave failed: ${e?.message}`));
      }
    } catch (error) {
      this.logger.error('processIntent memory extraction failed', error instanceof Error ? error.stack : String(error));
    }
    let audioBase64 = "";
    const reponseText = result.reponse || "OK !";
    try {
      const buf = await this.synthesize(reponseText);
      if (buf && buf.length > 0) {
        audioBase64 = buf.toString("base64");
        this.logger.log(`[TTS:ELEVENLABS] OK — ${buf.length} bytes`);
      } else {
        this.logger.error("[TTS:ELEVENLABS] Buffer vide");
      }
    } catch (ttsErr: any) {
      this.logger.error(`[TTS:ELEVENLABS] Échec: ${ttsErr.message}`);
    }
    return { ...result, audioBase64 };
  }
}
