// BO-1 — `GET /auth/contacts-recovery-bo` n'expose plus les téléphones des
// super_admin.
//
// Audit bo-b §2.3 : route PUBLIQUE (aucune authentification) appelée par la
// modale « mot de passe oublié » du login BO. Elle rendait l'id, le nom et le
// TÉLÉPHONE des 5 premiers super_admin actifs : la cible idéale d'un
// hameçonnage ou d'une attaque sur le login (le numéro est l'identifiant de
// connexion). Strict nécessaire retenu : le nom, pour savoir qui appeler par
// les canaux internes — ni numéro, ni identifiant interne.
//
// Numéros réservés à cette suite : +22507999510xx.

import { HarnaisBO0, CompteTest, monterHarnais } from './bo0-harnais';

describe('BO-1 — contacts-recovery-bo sans téléphones', () => {
  let h: HarnaisBO0;
  let superAdmin: CompteTest;
  const TEL = '+2250799951001';

  beforeAll(async () => {
    h = await monterHarnais();
    superAdmin = await h.mk(TEL, 'super_admin');
  }, 90000);

  afterAll(async () => { if (h) await h.close(); });

  it('CR-a — sans authentification, la réponse ne contient aucun numéro ni identifiant de super_admin', async () => {
    const res = await h.api().get('/api/v1/auth/contacts-recovery-bo');
    expect(res.status).toBe(200);
    const brut = JSON.stringify(res.body);
    expect(brut).not.toContain(TEL.slice(-8));
    expect(brut).not.toContain(superAdmin.id);
    for (const c of res.body.contacts ?? []) {
      expect(Object.keys(c).sort()).toEqual(['firstName', 'lastName']);
    }
  });

  it('CR-b — la modale garde de quoi orienter : le nom du super_admin', async () => {
    const res = await h.api().get('/api/v1/auth/contacts-recovery-bo');
    expect((res.body.contacts ?? []).some((c: any) => c.lastName === 'super_admin')).toBe(true);
  });
});
