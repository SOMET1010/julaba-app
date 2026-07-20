export const FEEDBAK_SMS_TEMPLATES = {
  DOSSIER_SOUMIS: (prenom: string) =>
    `Bonjour ${prenom}, votre enrôlement JULABA est en cours. Réponse sous 48h.`,

  DOSSIER_VALIDE: (prenom: string, telephone: string) =>
    `Compte JULABA activé ${prenom} ! Connectez-vous avec le mot de passe : 0000. Modifiez-le à la première connexion.`,

  DOSSIER_REJETE: (prenom: string, motif: string, support: string) =>
    `Bonjour ${prenom}, votre dossier JULABA est rejeté. Motif : ${motif}. Contactez le support : ${support}.`,

  COMPLEMENT_REQUIS: (prenom: string) =>
    `Bonjour ${prenom}, des documents manquent pour votre dossier JULABA. Contactez votre identificateur.`,

  COMPTE_SUSPENDU: (prenom: string, support: string) =>
    `Compte JULABA suspendu ${prenom}. Contactez le support : ${support}.`,

  COMPTE_REACTIVE: (prenom: string) =>
    `Bonne nouvelle ${prenom} ! Votre compte JULABA est de nouveau actif.`,

  MUTATION_ZONE: (prenom: string, zone: string, support: string) =>
    `Bonjour ${prenom}, vous êtes affecté(e) à la zone ${zone}. Contact support : ${support}.`,
} as const;

export const FEEDBAK_SMS_SUPPORT_NUMBER = process.env.FEEDBAK_SMS_SUPPORT_NUMBER || '+225 00 00 00 00';
