import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type BpayProvider = 'WAVE_CI' | 'MTN_CI' | 'MOOV_CI' | 'OM_CI';

const PROVIDER_MAP: Record<string, BpayProvider> = {
  WAVE:   'WAVE_CI',
  MTN:    'MTN_CI',
  MOOV:   'MOOV_CI',
  ORANGE: 'OM_CI',
};

@Injectable()
export class BpayService {
  private readonly logger = new Logger(BpayService.name);
  private readonly baseUrl: string;
  private readonly email: string;
  private readonly password: string;
  private readonly referenceCl: string;
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private config: ConfigService) {
    this.baseUrl     = config.get<string>('BPAY_BASE_URL') || 'https://b-pay.co/service';
    this.email       = config.get<string>('BPAY_EMAIL')    || '';
    this.password    = config.get<string>('BPAY_PASSWORD') || '';
    this.referenceCl = config.get<string>('BPAY_REFERENCE_CL') || '';
  }

  // ── Obtenir un token valide (avec cache) ──────────────────
  async getToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken;
    }
    const res = await fetch(`${this.baseUrl}/api/v1/oauth/login`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: this.email, password: this.password }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      this.logger.error(`[BPAY] auth ${res.status}: ${errBody}`);
      throw new Error(`BPAY auth failed: ${res.status}`);
    }
    const data = await res.json() as any;
    if (!data?.authorisation?.token) throw new Error('BPAY auth: token absent dans la réponse');
    this.cachedToken    = data.authorisation.token;
    this.tokenExpiresAt = Date.now() + 50 * 60 * 1000; // 50 min
    this.logger.log('[BPAY] Token renouvelé');
    return this.cachedToken!;
  }

  // ── Initier un paiement (recharge wallet) ─────────────────
  async initierPaiement(params: {
    provider: string;
    montant: number;
    telephone: string;
    notifyUrl: string;
    merchantTransactionId: string;
    successUrl?: string;
    failedUrl?: string;
  }): Promise<{ payToken: string; paymentUrl: string; status: string }> {
    const token = await this.getToken();
    const bpayProvider = PROVIDER_MAP[params.provider] || params.provider;
    const requestBody = JSON.stringify({
      currency:                'XOF',
      payment_method:          bpayProvider,
      amount:                  params.montant,
      merchant_transaction_id: params.merchantTransactionId,
      success_url:             params.successUrl || 'https://julaba.online/pay/success',
      failed_url:              params.failedUrl  || 'https://julaba.online/pay/error',
      notify_url:              params.notifyUrl,
      telephone:               params.telephone,
      reference_cl:            this.referenceCl,
    });
    const res = await fetch(`${this.baseUrl}/api/v1/paiement`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: requestBody,
    });
    if (!res.ok) {
      const errBody = await res.text();
      this.logger.error(`[BPAY] paiement provider=${params.provider} montant=${params.montant} merchantTxId=${params.merchantTransactionId}`);
      this.logger.error(`[BPAY] paiement ${res.status} body: ${errBody}`);
      throw new Error(`BPAY paiement failed: ${res.status}`);
    }
    const data = await res.json() as any;
    if (!data?.data?.pay_token) throw new Error('BPAY paiement: pay_token absent dans la réponse');
    this.logger.log(`[BPAY] Paiement initié: ${bpayProvider} ${params.montant} FCFA`);
    return {
      payToken:   data.data.pay_token,
      paymentUrl: data.data?.payment_url || '',
      status:     data.data?.status      || 'INITIATED',
    };
  }

  // ── Vérifier le statut d'un paiement ─────────────────────
  async verifierStatut(payToken: string): Promise<{ statut: string; message: string }> {
    const token = await this.getToken();
    const res = await fetch(`${this.baseUrl}/api/v1/check-status/${payToken}`, {
      signal: AbortSignal.timeout(10000),
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) {
      const errBody = await res.text();
      this.logger.error(`[BPAY] check-status ${res.status}: ${errBody}`);
      throw new Error(`BPAY check-status failed: ${res.status}`);
    }
    const data = await res.json() as any;
    return { statut: data.status || data.statut || '', message: data.message || '' };
  }

  // ── Retrait vers Mobile Money (cashin) ───────────────────
  async retraitVersMobileMoney(params: {
    provider: string;
    montant: number;
    telephone: string;
    notifyUrl: string;
    merchantTransactionId: string;
  }): Promise<{ partnerTransactionId: string; status: string }> {
    const token = await this.getToken();
    const bpayProvider = PROVIDER_MAP[params.provider] || params.provider;
    const res = await fetch(`${this.baseUrl}/api/v1/collect/cashin`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        payment_method:          bpayProvider,
        merchant_transaction_id: params.merchantTransactionId,
        amount:                  params.montant,
        telephone:               params.telephone,
        notify_url:              params.notifyUrl,
        reference_cl:            this.referenceCl,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      this.logger.error(`[BPAY] cashin ${res.status}: ${errBody}`);
      throw new Error(`BPAY cashin failed: ${res.status}`);
    }
    const data = await res.json() as any;
    this.logger.log(`[BPAY] Retrait initié: ${bpayProvider} ${params.montant} FCFA`);
    return {
      partnerTransactionId: data.partner_transaction_id || '',
      status:               data.status || 'SUCCESSFULL',
    };
  }
}
