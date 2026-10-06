// =====================================================================
//  JULABA -- Types de paiement unifies
//  Source unique de verite pour tous les composants (terrain + BO)
// =====================================================================

import {
  Wallet,
  Smartphone,
  Banknote,
  CreditCard,
  QrCode,
} from 'lucide-react';

// ── Modes de paiement principaux ────────────────────────────────────

export type PaymentMethodId = 'keiwa' | 'mobile_money' | 'cash' | 'card' | 'qr_code';

export type MobileOperatorId = 'orange' | 'mtn' | 'moov' | 'wave';

export interface PaymentMethodConfig {
  id: PaymentMethodId;
  label: string;
  sublabel: string;
  icon: typeof Wallet;
  color: string;
  bgColor: string;
  borderColor: string;
}

export interface MobileOperatorConfig {
  id: MobileOperatorId;
  name: string;
  color: string;
  textColor: string;
}

// ── Configuration centralisee ───────────────────────────────────────

export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'keiwa',
    label: 'Julaba Keiwa',
    sublabel: 'Paiement depuis votre portefeuille',
    icon: Wallet,
    color: '#16A34A',
    bgColor: '#F0FDF4',
    borderColor: '#22C55E',
  },
  {
    id: 'mobile_money',
    label: 'Mobile Money',
    sublabel: 'Orange, MTN, Moov, Wave',
    icon: Smartphone,
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  {
    id: 'cash',
    label: 'Especes',
    sublabel: 'Paiement a la livraison',
    icon: Banknote,
    color: '#C46210',
    bgColor: '#FFF7ED',
    borderColor: '#C46210',
  },
  {
    id: 'card',
    label: 'Carte bancaire',
    sublabel: 'Visa, Mastercard',
    icon: CreditCard,
    color: '#2563EB',
    bgColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  {
    id: 'qr_code',
    label: 'QR Code',
    sublabel: 'Scanner pour payer',
    icon: QrCode,
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    borderColor: '#8B5CF6',
  },
];

export const MOBILE_OPERATORS: MobileOperatorConfig[] = [
  { id: 'orange', name: 'Orange Money', color: '#FF6600', textColor: '#FFFFFF' },
  { id: 'mtn', name: 'MTN Money', color: '#FFCC00', textColor: '#000000' },
  { id: 'moov', name: 'Moov Money', color: '#009FE3', textColor: '#FFFFFF' },
  { id: 'wave', name: 'Wave', color: '#00D9A5', textColor: '#FFFFFF' },
];

// ── Helpers ─────────────────────────────────────────────────────────

export function getPaymentMethod(id: PaymentMethodId | string): PaymentMethodConfig {
  return PAYMENT_METHODS.find(m => m.id === id) || PAYMENT_METHODS[2]; // fallback cash
}

export function getMobileOperator(id: MobileOperatorId | string): MobileOperatorConfig {
  return MOBILE_OPERATORS.find(o => o.id === id) || MOBILE_OPERATORS[0];
}

/**
 * Label lisible pour l'affichage (historique, BO, etc.)
 * Ex: 'mobile_money' + 'orange' => 'Orange Money'
 * Ex: 'keiwa' => 'Julaba Keiwa'
 */
export function getPaymentLabel(methodId: string, operatorId?: string): string {
  if (methodId === 'mobile_money' && operatorId) {
    const op = MOBILE_OPERATORS.find(o => o.id === operatorId);
    return op ? op.name : 'Mobile Money';
  }
  const method = PAYMENT_METHODS.find(m => m.id === methodId);
  return method ? method.label : methodId;
}

/**
 * Formate le mode_paiement pour envoi API
 * Si mobile_money + operateur => "mobile_money:orange"
 * Sinon => "keiwa", "cash", etc.
 */
export function formatPaymentForAPI(methodId?: PaymentMethodId | string, operatorId?: MobileOperatorId): string {
  if (!methodId) return '';
  if (methodId === 'mobile_money' && operatorId) {
    return `mobile_money:${operatorId}`;
  }
  return methodId;
}

/**
 * Parse un mode_paiement depuis l'API
 * "mobile_money:orange" => { method: 'mobile_money', operator: 'orange' }
 * "keiwa" => { method: 'keiwa' }
 */
export function parsePaymentFromAPI(raw: string): { method: PaymentMethodId; operator?: MobileOperatorId } {
  if (!raw) return { method: 'cash' };
  if (raw.startsWith('mobile_money:')) {
    const parts = raw.split(':');
    return { method: 'mobile_money', operator: parts[1] as MobileOperatorId };
  }
  // Handle legacy operator-only values
  const legacyOp = MOBILE_OPERATORS.find(o => o.id === raw);
  if (legacyOp) {
    return { method: 'mobile_money', operator: legacyOp.id };
  }
  return { method: raw as PaymentMethodId };
}