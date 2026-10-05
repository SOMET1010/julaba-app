// BO-0 / S4 — Aucune récupération du super_admin par clé partagée.
//
// La page front `/admin-recovery` (retirée dans ce lot, garde
// frontend_src/scripts/test-recuperation-admin.mjs) envoyait une clé en dur
// (`secretKey`) à trois routes. Ce test prouve que le SERVEUR n'en expose
// aucune : une clé connue de tous ne réinitialise rien. Toute récupération
// future devra passer par une vérification réelle côté serveur.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { HarnaisBO0, monterHarnais } from './bo0-harnais';

describe('BO-0 / S4 — pas de récupération super_admin par clé partagée', () => {
  let h: HarnaisBO0;

  beforeAll(async () => { h = await monterHarnais(); }, 60000);
  afterAll(async () => { if (h) await h.close(); });

  it('S4a — les routes visées par l\'ancienne page n\'existent pas (404)', async () => {
    for (const chemin of ['recover-super-admin', 'reset-super-admin-password', 'test-login']) {
      const res = await h.api().post(`/api/v1/auth/${chemin}`)
        .send({ secretKey: 'cle-quelconque', phone: '+2250700000000', newPassword: 'x' });
      expect({ chemin, status: res.status }).toEqual({ chemin, status: 404 });
    }
  });

  it('S4b — aucun contrôleur serveur ne lit un champ secretKey dans une requête', () => {
    const coupables: string[] = [];
    const parcourir = (d: string) => {
      for (const n of readdirSync(d)) {
        const p = join(d, n);
        if (statSync(p).isDirectory()) { parcourir(p); continue; }
        if (n.endsWith('.ts') && /(body|dto)\.secretKey|@Body\(['"]secretKey/.test(readFileSync(p, 'utf8'))) coupables.push(p);
      }
    };
    parcourir(join(__dirname, '..', '..', 'src'));
    expect(coupables).toEqual([]);
  });
});
