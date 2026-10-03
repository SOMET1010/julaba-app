// BO-1 / SEC-10 + SEC-08b — remise du mot de passe d'un compte back-office.
//
// Décision de Patrick (03/10/2026) : le canal de remise est le SMS, au
// téléphone du compte. Le mot de passe n'est NI affiché, NI renvoyé au
// navigateur, NI recopié dans `message`. L'interface reçoit seulement
// « code envoyé par SMS au 07 •• •• 12 34 ».
//
// CE QU'ON A REFUSÉ D'ÉCRIRE, comme pour SEC-2 : un repli « on affiche le code
// si le SMS échoue ». En cas d'échec on renvoie `SMS_NON_DELIVRE` ; le
// super_admin relance une réinitialisation (nouveau code, nouveau SMS).

export interface RemiseParSms {
  canal: 'sms';
  smsEnvoye: boolean;
  telephoneMasque: string;
}

/** `+2250701021234` → `07 •• •• 12 34`. Le numéro complet ne repart jamais. */
export function masquerTelephone(phone: string | null | undefined): string {
  const chiffres = String(phone ?? '').replace(/\D/g, '');
  if (chiffres.length < 4) return '•• •• •• •• ••';
  // Numéro ivoirien : 10 chiffres locaux, précédés ou non de 225.
  const local = chiffres.length >= 10 ? chiffres.slice(-10) : chiffres.padStart(10, '•');
  return `${local.slice(0, 2)} •• •• ${local.slice(6, 8)} ${local.slice(8, 10)}`;
}

export function remiseParSms(phone: string | null | undefined, smsEnvoye: boolean): RemiseParSms {
  return { canal: 'sms', smsEnvoye, telephoneMasque: masquerTelephone(phone) };
}

/** Texte d'interface, sans secret. */
export function messageRemise(prefixe: string, remise: RemiseParSms): string {
  return remise.smsEnvoye
    ? `${prefixe} Code envoyé par SMS au ${remise.telephoneMasque}.`
    : `${prefixe} Mais le SMS n'a pas pu être envoyé au ${remise.telephoneMasque} : aucun code n'est affiché. Relancez « Réinitialiser » pour renvoyer un nouveau code.`;
}
