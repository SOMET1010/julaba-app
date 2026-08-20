export const FEEDBAK_SMS_TEMPLATES = {
  DOSSIER_SOUMIS: (prenom: string) =>
    `Bonjour ${prenom}, votre enrôlement JULABA est en cours. Réponse sous 48h.`,

  // Réservé aux comptes créés SANS passer par l'activation P0.0 (ADR-002) —
  // c'est-à-dire dont le mot de passe est réellement la constante '0000'
  // (auto-inscription publique, cf. AuthService.signup). JAMAIS pour un compte
  // enrôlé via create-with-acteur ou le back-office : voir DOSSIER_VALIDE_*
  // ci-dessous pour ces chemins (identifications.controller.ts vérifie lequel
  // s'applique).
  DOSSIER_VALIDE: (prenom: string, telephone: string) =>
    `Compte JULABA activé ${prenom} ! Connectez-vous avec le mot de passe : 0000. Modifiez-le à la première connexion.`,

  // P0.0 (ADR-002) : le dossier est validé administrativement, mais le compte
  // est resté en_attente_activation — aucun mot de passe (encore moins '0000')
  // ne fonctionne. On ne promet jamais un accès qui n'existe pas.
  DOSSIER_VALIDE_ACTIVATION_REQUISE: (prenom: string) =>
    `Bonjour ${prenom}, votre dossier JULABA est validé. Votre compte n'est pas encore activé : contactez votre identificateur pour recevoir un code d'activation et l'utiliser sur votre téléphone.`,

  // P0.0 (ADR-002) : le dossier est validé et le compte a déjà été activé par
  // l'acteur lui-même (il a posé son propre secret) — pas de mot de passe à
  // communiquer, il le connaît déjà.
  DOSSIER_VALIDE_COMPTE_DEJA_ACTIF: (prenom: string) =>
    `Bonjour ${prenom}, votre dossier JULABA est validé. Votre compte est actif, continuez à l'utiliser normalement.`,

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
