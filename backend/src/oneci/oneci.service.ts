import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const BASE = 'https://api-rnpp.verif.ci/api/v1';
@Injectable()
export class OneciService {
  private token: string | null = null;
  private tokenExpiry = 0;
  constructor(private config: ConfigService) {}
  private async getToken(): Promise<string> {
    const now = Date.now();
    if (this.token && now < this.tokenExpiry) return this.token as string;
    const apiKey = this.config.get<string>('ONECI_API_KEY');
    const secretKey = this.config.get<string>('ONECI_SECRET_KEY');
    if (!apiKey || !secretKey) throw new HttpException('Configuration ONECI manquante', HttpStatus.INTERNAL_SERVER_ERROR);
    const res = await fetch(BASE + '/authenticate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey, secretKey }) });
    const data = await res.json();
    const tok = data.bearerToken || data.token || data.access_token || data.accessToken;
    if (!tok) throw new HttpException('Token ONECI introuvable', HttpStatus.BAD_GATEWAY);
    this.token = tok; this.tokenExpiry = now + 50 * 60 * 1000; return tok;
  }
  async lookupByNni(nni: string): Promise<any> {
    const token = await this.getToken();
    const fd = new FormData();
    fd.append('FIRST_NAME', ''); fd.append('LAST_NAME', ''); fd.append('BIRTH_DATE', ''); fd.append('GENDER', '');
    const res = await fetch(BASE + '/oneci/persons/' + nni + '/match', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd });
    if (res.status === 401 || res.status === 403) throw new HttpException("NNI introuvable", HttpStatus.NOT_FOUND);
    if (res.status === 404) throw new HttpException('NNI introuvable', HttpStatus.NOT_FOUND);
    if (!res.ok) throw new HttpException('Erreur ONECI', HttpStatus.BAD_GATEWAY);
    const data = await res.json();
    const allErrors = Array.isArray(data) && data.every((a: any) => a.ErrorCode === '1' || a.ErrorCode === 1);
    if (allErrors) return { found: true, nni, firstName: null, lastName: null, birthDate: null, gender: null, nationality: 'Ivoirienne', sandboxMode: true, raw: data };
    return { found: true, nni: data.NNI || data.nni || nni, firstName: data.FIRST_NAME || data.firstName || null, lastName: data.LAST_NAME || data.lastName || null, birthDate: data.BIRTH_DATE || data.birthDate || null, gender: data.GENDER || data.gender || null, nationality: data.NATIONALITY || 'Ivoirienne', raw: data };
  }
  async getQuota(): Promise<any> {
    const token = await this.getToken();
    const res = await fetch(BASE + '/subscription/remaining-requests', { headers: { Authorization: 'Bearer ' + token } });
    return res.json();
  }
}
