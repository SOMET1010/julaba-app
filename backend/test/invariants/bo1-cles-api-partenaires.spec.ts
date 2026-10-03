// BO-1 — Clés API partenaires : plus jamais relisibles (SEC-01 du contre-audit).
//
// Audit bo-b §2.9 : `GET /partner/api-keys` et `PATCH /partner/api-keys/:id`
// renvoyaient la clé COMPLÈTE de chaque partenaire, et l'écran BOApiKeys avait
// un bouton « révéler ». Une clé relisible à volonté n'est plus un secret :
// n'importe quelle session super_admin compromise (ou un XSS dans le BO) les
// emportait toutes.
//
// Règle prouvée : la clé n'est transmise qu'UNE fois, dans la réponse de
// création (c'est le seul moment où on peut la remettre au partenaire).
// Ensuite, liste et modification ne portent qu'un aperçu non exploitable.
// La clé reste valable pour le partenaire (le garde ApiKeyGuard l'accepte).
//
// La table `api_keys` n'existe pas sur base neuve (SCHEMA-05, hors de ce lot) :
// la suite la crée avec le schéma de la migration archivée, puis la retire.
//
// Numéros réservés à cette suite : +22507999520xx.

import { HarnaisBO0, CompteTest, monterHarnais } from './bo0-harnais';

describe('BO-1 — clés API partenaires jamais relisibles', () => {
  let h: HarnaisBO0;
  let superAdmin: CompteTest;
  let marchand: CompteTest;
  let creeeIci = false;

  beforeAll(async () => {
    h = await monterHarnais();
    superAdmin = await h.mk('+2250799952001', 'super_admin');
    marchand = await h.mk('+2250799952002', 'marchand');
    const existe = await h.ds.query(`SELECT to_regclass('public.api_keys') AS t`);
    if (!existe[0]?.t) {
      creeeIci = true;
      await h.ds.query(`
        CREATE TABLE api_keys (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          key TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          partner_type VARCHAR(32) NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT true,
          rate_limit INTEGER NOT NULL DEFAULT 1000,
          usage_count INTEGER NOT NULL DEFAULT 0,
          last_used_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`);
    }
  }, 90000);

  afterAll(async () => {
    if (h && creeeIci) await h.ds.query(`DROP TABLE IF EXISTS api_keys`);
    if (h) await h.close();
  });

  const as = (c: CompteTest, r: any) => r.set('Authorization', `Bearer ${c.token}`);

  it('API-a — la clé est remise une fois à la création, puis ni la liste ni la modification ne la renvoient', async () => {
    const cree = await as(superAdmin, h.api().post('/api/v1/partner/api-keys'))
      .send({ name: 'Banque BO1', partner_type: 'bank' });
    expect(cree.status).toBe(201);
    const cle: string = cree.body.key;
    expect(cle).toMatch(/^jul_pk_/);

    const liste = await as(superAdmin, h.api().get('/api/v1/partner/api-keys'));
    expect(liste.status).toBe(200);
    expect(JSON.stringify(liste.body)).not.toContain(cle.slice(12));
    const ligne = liste.body.find((r: any) => r.id === cree.body.id);
    expect(ligne).toBeDefined();
    expect(ligne.key).toBeUndefined();
    expect(typeof ligne.key_apercu).toBe('string');
    expect(ligne.key_apercu.length).toBeLessThan(16);

    const patch = await as(superAdmin, h.api().patch(`/api/v1/partner/api-keys/${cree.body.id}`))
      .send({ is_active: false });
    expect(patch.status).toBe(200);
    expect(JSON.stringify(patch.body)).not.toContain(cle.slice(12));
    expect(patch.body.key).toBeUndefined();
    await as(superAdmin, h.api().patch(`/api/v1/partner/api-keys/${cree.body.id}`)).send({ is_active: true });
  });

  it('API-b — la clé remise reste valable pour le partenaire', async () => {
    const cree = await as(superAdmin, h.api().post('/api/v1/partner/api-keys'))
      .send({ name: 'Microfinance BO1', partner_type: 'microfinance' });
    const res = await h.api().get(`/api/v1/partner/financial-score/${marchand.id}`).set('x-api-key', cree.body.key);
    expect(res.status).not.toBe(401);
    const sans = await h.api().get(`/api/v1/partner/financial-score/${marchand.id}`).set('x-api-key', 'jul_pk_faux');
    expect(sans.status).toBe(401);
  });
});
