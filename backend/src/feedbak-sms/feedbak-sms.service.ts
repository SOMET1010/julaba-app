import { Injectable, Logger } from '@nestjs/common';
import { SmsService } from '../sms/sms.service';
import { FEEDBAK_SMS_TEMPLATES, FEEDBAK_SMS_SUPPORT_NUMBER } from './feedbak-sms.constants';

@Injectable()
export class FeedbakSmsService {
  private readonly logger = new Logger(FeedbakSmsService.name);

  constructor(private readonly smsService: SmsService) {}

  async notifyDossierSoumis(phone: string, prenom: string): Promise<void> {
    const message = FEEDBAK_SMS_TEMPLATES.DOSSIER_SOUMIS(prenom);
    await this.send(phone, message, 'DOSSIER_SOUMIS');
  }

  async notifyDossierValide(phone: string, prenom: string, telephone: string): Promise<void> {
    const message = FEEDBAK_SMS_TEMPLATES.DOSSIER_VALIDE(prenom, telephone);
    await this.send(phone, message, 'DOSSIER_VALIDE');
  }

  async notifyDossierRejete(phone: string, prenom: string, motif: string): Promise<void> {
    const message = FEEDBAK_SMS_TEMPLATES.DOSSIER_REJETE(prenom, motif, FEEDBAK_SMS_SUPPORT_NUMBER);
    await this.send(phone, message, 'DOSSIER_REJETE');
  }

  async notifyComplementRequis(phone: string, prenom: string): Promise<void> {
    const message = FEEDBAK_SMS_TEMPLATES.COMPLEMENT_REQUIS(prenom);
    await this.send(phone, message, 'COMPLEMENT_REQUIS');
  }

  async notifyCompteSuspendu(phone: string, prenom: string): Promise<void> {
    const message = FEEDBAK_SMS_TEMPLATES.COMPTE_SUSPENDU(prenom, FEEDBAK_SMS_SUPPORT_NUMBER);
    await this.send(phone, message, 'COMPTE_SUSPENDU');
  }

  async notifyCompteReactive(phone: string, prenom: string): Promise<void> {
    const message = FEEDBAK_SMS_TEMPLATES.COMPTE_REACTIVE(prenom);
    await this.send(phone, message, 'COMPTE_REACTIVE');
  }

  async notifyMutationZone(phone: string, prenom: string, zone: string): Promise<void> {
    const message = FEEDBAK_SMS_TEMPLATES.MUTATION_ZONE(prenom, zone, FEEDBAK_SMS_SUPPORT_NUMBER);
    await this.send(phone, message, 'MUTATION_ZONE');
  }

  private async send(phone: string, message: string, event: string): Promise<void> {
    try {
      const result = await this.smsService.sendSms(phone, message);
      if (result.success) {
        this.logger.log(`Feedbak_SMS [${event}] envoyé → ${phone}`);
      } else {
        this.logger.warn(`Feedbak_SMS [${event}] échec → ${phone} : ${result.error}`);
      }
    } catch (err) {
      this.logger.error(`Feedbak_SMS [${event}] erreur → ${phone}`, err instanceof Error ? err.stack : String(err));
    }
  }

  async notifyPinIdentificateurCreated(phone: string, prenom: string, pin: string): Promise<void> {
    const message = `Bonjour ${prenom}, ton compte identificateur Jùlaba a été créé. Ton code PIN à 4 chiffres est : ${pin}. Garde-le en sécurité, il te sera demandé pour modifier les fiches acteurs. Tu peux le changer dans Paramètres.`;
    // TODO: brancher l'envoi SMS quand l'API sera configurée
    console.log('[SMS PIN CREATED]', phone, message);
  }

  async notifyPinChanged(phone: string, prenom: string): Promise<void> {
    const message = `Bonjour ${prenom}, ton code PIN Jùlaba a été modifié avec succès. Si tu n'es pas à l'origine de ce changement, contacte immédiatement ton superviseur.`;
    // TODO: brancher l'envoi SMS quand l'API sera configurée
    console.log('[SMS PIN CHANGED]', phone, message);
  }
}
