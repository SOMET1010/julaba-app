import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';

// ============================================================
// JULABA — Service SMS via CI ANSUT
// API : POST {baseUrl}/api/message/send  (SMS, Telegram, Email)
//       POST {baseUrl}/api/SendSMS       (SMS direct)
// Auth : username + password dans le body
// ============================================================

export interface AnsutSmsResult {
  success: boolean;
  messageId?: string;
  message?: string;
  error?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Envoyer un SMS OTP via CI ANSUT
   * @param phone  Numéro destinataire (ex: 0701020304 ou 2250701020304)
   * @param text   Contenu du SMS (max 160 caractères)
   */
  async sendSms(phone: string, text: string): Promise<AnsutSmsResult> {
    const baseUrl  = this.config.get<string>('ANSUT_BASE_URL');
    const username = this.config.get<string>('ANSUT_USERNAME');
    const password = this.config.get<string>('ANSUT_PASSWORD');
    const from     = this.config.get<string>('ANSUT_SENDER_ID', 'JULABA');

    if (!baseUrl || !username || !password) {
      this.logger.error('Configuration ANSUT manquante (ANSUT_BASE_URL / ANSUT_USERNAME / ANSUT_PASSWORD)');
      return { success: false, error: 'Service SMS non configuré' };
    }

    // Formater le numéro au format ANSUT : 225XXXXXXXXXX
    const formattedPhone = this.formatPhone(phone);
    if (!formattedPhone) {
      return { success: false, error: `Numéro invalide : ${phone}` };
    }

    // Tronquer si > 160 caractères
    const content = text.length > 160 ? text.substring(0, 160) : text;

    const body = {
      to:       formattedPhone,
      from:     from,
      content:  content,
      username: username,
      password: password,
    };

    this.logger.log(`Envoi SMS ANSUT → ${formattedPhone}`);

    try {
      const response = await fetch(`${baseUrl}/api/message/send`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      const responseText = await response.text();
      this.logger.log(`ANSUT réponse (${response.status}): ${responseText}`);

      let data: any = {};
      try { data = JSON.parse(responseText); } catch (error) { this.logger.error('ANSUT response parse failed', error instanceof Error ? error.stack : String(error)); }

      if (!response.ok) {
        return {
          success: false,
          error: data?.message || data?.error || `Erreur HTTP ${response.status}`,
        };
      }

      this.logger.log(`SMS envoyé avec succès`);
      return {
        success:   true,
        messageId: data?.messageId || data?.id,
        message:   data?.message || 'SMS envoyé',
      };

    } catch (err) {
      this.logger.error('Erreur appel ANSUT:', err);
      return {
        success: false,
        error:   err instanceof Error ? err.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Envoyer un OTP par SMS
   * Génère un code, l'envoie et retourne le code (à stocker en DB)
   */
  async sendOtp(phone: string): Promise<{ success: boolean; error?: string }> {
    const otpLength  = this.config.get<number>('OTP_LENGTH', 6);
    const code       = this.generateOtp(otpLength);
    const message    = `Votre code de vérification JULABA : ${code}. Valable ${this.config.get('OTP_EXPIRES_IN_MINUTES', 10)} minutes.`;

    const result = await this.sendSms(phone, message);

    if (result.success) {
      return { success: true };
    }
    return { success: false, error: result.error };
  }

  // ── Utilitaires privés ──────────────────────────────────────

  private formatPhone(phone: string): string | null {
    let p = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');

    if (p.startsWith('+225')) p = p.slice(1);          // +225... → 225...
    else if (p.startsWith('00225')) p = p.slice(2);    // 00225... → 225...
    else if (p.startsWith('0') && p.length === 10) p = `225${p}`;  // 0701... → 2250701...
    else if (/^\d{8,9}$/.test(p)) p = `2250${p}`;     // 701... → 2250701...

    // Validation finale : doit commencer par 225 et avoir 12 chiffres
    if (/^225\d{9}$/.test(p)) return p;

    this.logger.error(`Format numéro invalide : ${phone} → ${p}`);
    return null;
  }

  private generateOtp(length: number): string {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += String(randomInt(0, 10));
    }
    return code;
  }
}
