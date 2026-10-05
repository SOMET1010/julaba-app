// BO-1 / SEC-10 + SEC-08b — plus aucun mot de passe de compte BO en clair.
//
// Décision de Patrick (03/10/2026) : le mot de passe d'un compte back-office
// part par SMS au téléphone du compte, et SEULEMENT par là. La réponse HTTP ne
// porte que « code envoyé par SMS au 07 •• •• 12 34 » (numéro masqué). Si le SMS
// échoue, l'opération le dit (`SMS_NON_DELIVRE`) et ne retombe JAMAIS sur
// l'affichage du code.
//
// Ce que l'audit avait reproduit (bo-b-gouvernance §2.5) :
//   • création (`/users/backoffice-account`, `/users/backoffice/create`,
//     `/users/admin`, `/users/admin/:id/validate`) : `defaultPassword` /
//     `motDePasseInitial` rendus, et recopiés dans `message` ;
//   • réinitialisation (`/users/:id/admin-reset-password`) : idem ;
//   • SEC-08b : `/auth/reset-user-password`, où l'administrateur TAPE le mot de
//     passe d'un autre compte — il le connaît donc, par construction.
//
// LE CODE EST LU DANS LE SMS INTERCEPTÉ, comme dans sec-2 : c'est le seul
// endroit où il doit exister. La connexion réussie avec ce code prouve que le
// SMS porte bien le vrai secret, pas un leurre.
//
// Numéros réservés à cette suite : +22507999500xx.

import { HarnaisBO0, CompteTest, monterHarnais } from './bo0-harnais';

const MASQUE = (local: string) => `${local.slice(0, 2)} •• •• ${local.slice(6, 8)} ${local.slice(8, 10)}`;

describe('BO-1 / SEC-10 + SEC-08b — le mot de passe d\'un compte BO part par SMS, jamais par la réponse', () => {
  let h: HarnaisBO0;
  let superAdmin: CompteTest;
  let general: CompteTest;
  const sms: { phone: string; message: string }[] = [];
  let smsEchoue = false;

  beforeAll(async () => {
    h = await monterHarnais({
      sms: {
        sendSms: async (phone: string, message: string) => {
          sms.push({ phone, message });
          return smsEchoue ? { success: false, error: 'operateur injoignable (simulé)' } : { success: true };
        },
      },
    });
    superAdmin = await h.mk('+2250799950001', 'super_admin');
    general = await h.mk('+2250799950002', 'admin_general');
    await h.ds.query(
      `DELETE FROM users WHERE phone LIKE '+22507999500%' AND phone NOT IN ('+2250799950001','+2250799950002')`,
    );
  }, 90000);

  afterAll(async () => { if (h) await h.close(); });
  beforeEach(() => { smsEchoue = false; });

  const as = (c: CompteTest, r: any) => r.set('Authorization', `Bearer ${c.token}`);

  /** Le mot de passe tel qu'il part réellement : les 12 caractères qui suivent « mot de passe … : ». */
  function secretDuSms(phone: string): string {
    const recus = sms.filter((s) => s.phone.replace(/\D/g, '').endsWith(phone.replace(/\D/g, '').slice(-10)));
    expect(recus.length).toBeGreaterThan(0);
    const m = recus[recus.length - 1].message.match(/passe[^:]*: ([A-Za-z0-9]{12})(?![A-Za-z0-9])/i);
    expect(m).not.toBeNull();
    return m![1];
  }

  function aucunSecret(body: any, secret: string) {
    const brut = JSON.stringify(body);
    expect(brut).not.toContain(secret);
    expect(brut).not.toMatch(/defaultPassword|motDePasseInitial|"password"/);
  }

  function remiseParSms(body: any, phone: string, envoye = true) {
    const local = '0' + phone.replace(/\D/g, '').slice(-9);
    expect(body.remise).toEqual({ canal: 'sms', smsEnvoye: envoye, telephoneMasque: MASQUE(local) });
    // Le numéro complet ne repart pas non plus dans la réponse de remise.
    expect(JSON.stringify(body.remise)).not.toContain(local.slice(2));
  }

  async function seConnecter(phone: string, password: string) {
    return h.api().post('/api/v1/auth/login').send({ phone, password });
  }

  it('SEC10-a — POST /users/backoffice-account : le mot de passe part par SMS, la réponse ne le contient pas', async () => {
    const phone = '+2250799950011';
    const res = await as(superAdmin, h.api().post('/api/v1/users/backoffice-account'))
      .send({ firstName: 'Awa', lastName: 'Bo1', phone, role: 'admin_national' });
    expect(res.status).toBe(201);
    const secret = secretDuSms(phone);
    aucunSecret(res.body, secret);
    remiseParSms(res.body, phone);
    expect((await seConnecter(phone, secret)).status).toBe(200);
  });

  it('SEC10-b — POST /users/backoffice/create (cible admin) : même règle', async () => {
    const phone = '+2250799950012';
    const res = await as(superAdmin, h.api().post('/api/v1/users/backoffice/create'))
      .send({ firstName: 'Koffi', lastName: 'Bo1', phone, role: 'admin_national', email: 'bo1-b@julaba.test' });
    expect(res.status).toBe(201);
    const secret = secretDuSms(phone);
    aucunSecret(res.body, secret);
    remiseParSms(res.body, phone);
  });

  it('SEC10-c — POST /users/admin (super_admin, création directe) : même règle', async () => {
    const phone = '+2250799950013';
    const res = await as(superAdmin, h.api().post('/api/v1/users/admin'))
      .send({ firstName: 'Mariam', lastName: 'Bo1', phone, email: 'bo1-c@julaba.test', role: 'operateur_terrain' });
    expect(res.status).toBe(201);
    const secret = secretDuSms(phone);
    aucunSecret(res.body, secret);
    remiseParSms(res.body, phone);
  });

  it('SEC10-d — POST /users/admin/:id/validate : la validation remet le code par SMS, pas par la réponse', async () => {
    const phone = '+2250799950014';
    const cree = await as(general, h.api().post('/api/v1/users/admin'))
      .send({ firstName: 'Ibrahim', lastName: 'Bo1', phone, email: 'bo1-d@julaba.test', role: 'operateur_terrain' });
    expect(cree.status).toBe(201);
    expect(cree.body.status).toBe('en_attente_validation');
    const res = await as(superAdmin, h.api().post(`/api/v1/users/admin/${cree.body.id}/validate`)).send({});
    expect(res.status).toBe(201);
    const secret = secretDuSms(phone);
    aucunSecret(res.body, secret);
    remiseParSms(res.body, phone);
    expect((await seConnecter(phone, secret)).status).toBe(200);
  });

  it('SEC10-e — POST /users/:id/admin-reset-password : nouveau code par SMS, l\'ancien cesse de marcher', async () => {
    const cible = await h.mk('+2250799950015', 'admin_national');
    expect((await seConnecter('+2250799950015', '1234')).status).toBe(200);
    const res = await as(superAdmin, h.api().post(`/api/v1/users/${cible.id}/admin-reset-password`)).send({});
    expect(res.status).toBe(200);
    const secret = secretDuSms('+2250799950015');
    aucunSecret(res.body, secret);
    remiseParSms(res.body, '+2250799950015');
    expect(res.body.success).toBe(true);
    expect((await seConnecter('+2250799950015', '1234')).status).toBe(401);
    expect((await seConnecter('+2250799950015', secret)).status).toBe(200);
  });

  it('SEC10-f — SMS en échec à la réinitialisation : SMS_NON_DELIVRE, et toujours aucun code dans la réponse', async () => {
    const cible = await h.mk('+2250799950016', 'operateur_terrain');
    smsEchoue = true;
    const res = await as(superAdmin, h.api().post(`/api/v1/users/${cible.id}/admin-reset-password`)).send({});
    expect(res.status).toBe(200);
    const secret = secretDuSms('+2250799950016');
    aucunSecret(res.body, secret);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('SMS_NON_DELIVRE');
    remiseParSms(res.body, '+2250799950016', false);
  });

  it('SEC10-g — SMS en échec à la création : le compte existe, l\'échec est dit, le code n\'est pas affiché', async () => {
    const phone = '+2250799950017';
    smsEchoue = true;
    const res = await as(superAdmin, h.api().post('/api/v1/users/backoffice-account'))
      .send({ firstName: 'Fatou', lastName: 'Bo1', phone, role: 'operateur_terrain' });
    expect(res.status).toBe(201);
    const secret = secretDuSms(phone);
    aucunSecret(res.body, secret);
    expect(res.body.code).toBe('SMS_NON_DELIVRE');
    remiseParSms(res.body, phone, false);
  });

  it('SEC08b — POST /auth/reset-user-password (mot de passe tapé par l\'admin) n\'existe plus', async () => {
    const cible = await h.mk('+2250799950018', 'marchand');
    const res = await as(superAdmin, h.api().post('/api/v1/auth/reset-user-password'))
      .send({ userId: cible.id, newPassword: 'ChoisiParAdmin1' });
    expect(res.status).toBe(404);
    expect((await seConnecter('+2250799950018', 'ChoisiParAdmin1')).status).toBe(401);
  });
});
