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

  // P0.0 (ADR-002) : dossier validé, compte encore en_attente_activation.
  async notifyDossierValideActivationRequise(phone: string, prenom: string): Promise<void> {
    const message = FEEDBAK_SMS_TEMPLATES.DOSSIER_VALIDE_ACTIVATION_REQUISE(prenom);
    await this.send(phone, message, 'DOSSIER_VALIDE_ACTIVATION_REQUISE');
  }

  // P0.0 (ADR-002) : dossier validé, compte déjà activé par l'acteur lui-même.
  async notifyDossierValideCompteDejaActif(phone: string, prenom: string): Promise<void> {
    const message = FEEDBAK_SMS_TEMPLATES.DOSSIER_VALIDE_COMPTE_DEJA_ACTIF(prenom);
    await this.send(phone, message, 'DOSSIER_VALIDE_COMPTE_DEJA_ACTIF');
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

  // `send` RÉPOND MAINTENANT si le message est parti.
  //
  // Elle renvoyait `void` : chaque appelant supposait l'envoi réussi. Pour une
  // notification d'information c'est sans conséquence. Pour un SMS qui porte le
  // SEUL exemplaire d'un code d'accès, non : depuis SEC-2, l'administrateur
  // doit pouvoir lire « le code a changé mais le SMS n'est pas passé » au lieu
  // de croire la personne joignable. Elle n'en devient pas bloquante pour
  // autant — un échec reste journalisé, jamais lancé.
  //
  // Les appelants existants ignorent la valeur de retour : leur comportement
  // est inchangé.
  private async send(phone: string, message: string, event: string): Promise<boolean> {
    try {
      const result = await this.smsService.sendSms(phone, message);
      if (result.success) {
        this.logger.log(`Feedbak_SMS [${event}] envoyé → ${phone}`);
        return true;
      }
      this.logger.warn(`Feedbak_SMS [${event}] échec → ${phone} : ${result.error}`);
      return false;
    } catch (err) {
      this.logger.error(`Feedbak_SMS [${event}] erreur → ${phone}`, err instanceof Error ? err.stack : String(err));
      return false;
    }
  }

  // ── UN SECRET N'ENTRE JAMAIS DANS UN JOURNAL — corrigé le 19/09/2026 ──────
  //
  // Ces deux méthodes journalisaient le message COMPLET, PIN à 4 chiffres en
  // clair compris, avec le numéro de téléphone. Et ce n'était pas du code mort :
  // `auth.controller.ts` appelle bien `notifyPinIdentificateurCreated` à la
  // création d'un compte identificateur. Le code d'accès partait donc dans les
  // journaux du serveur — conservés, consultables par quiconque a accès au
  // tableau de bord d'hébergement. Un code d'accès dans un journal n'est plus
  // un code d'accès.
  //
  // Deuxième défaut dans les deux mêmes lignes : LE SMS N'ÉTAIT JAMAIS ENVOYÉ.
  // La trace REMPLAÇAIT l'envoi, sous un TODO périmé — alors que `send()`
  // existe juste au-dessus, passe par le vrai `SmsService`, ne journalise QUE
  // l'événement et le numéro (jamais le corps du message), et que neuf autres
  // notifications de ce fichier l'utilisent déjà. L'identificateur ne recevait
  // donc jamais son code.
  //
  // Les deux passent désormais par `send()`, comme tout le reste.

  async notifyPinIdentificateurCreated(phone: string, prenom: string, pin: string): Promise<boolean> {
    const message = `Bonjour ${prenom}, ton compte identificateur Jùlaba a été créé. Ton code PIN à 4 chiffres est : ${pin}. Garde-le en sécurité, il te sera demandé pour modifier les fiches acteurs. Tu peux le changer dans Paramètres.`;
    return this.send(phone, message, 'PIN_IDENTIFICATEUR_CREE');
  }

  // SEC-2 : le SMS de réinitialisation. Depuis la suppression de
  // `pin-decrypted`, c'est le SEUL exemplaire du nouveau code — d'où le retour
  // booléen, que l'appelant traduit en `SMS_NON_DELIVRE`.
  async notifyPinIdentificateurReset(phone: string, prenom: string, pin: string): Promise<boolean> {
    const message = `Bonjour ${prenom}, ton code PIN Jùlaba a été réinitialisé. Ton nouveau code à 4 chiffres est : ${pin}. L'ancien ne fonctionne plus. Si tu n'as rien demandé, contacte immédiatement ton superviseur.`;
    return this.send(phone, message, 'PIN_IDENTIFICATEUR_RESET');
  }

  async notifyPinChanged(phone: string, prenom: string): Promise<void> {
    // Aucun secret ici, mais elle était bloquée de la même façon :
    // l'identificateur n'était jamais averti qu'on avait changé son code —
    // précisément l'alerte qui compte en cas de compromission.
    const message = `Bonjour ${prenom}, ton code PIN Jùlaba a été modifié avec succès. Si tu n'es pas à l'origine de ce changement, contacte immédiatement ton superviseur.`;
    await this.send(phone, message, 'PIN_CHANGE');
  }
}
