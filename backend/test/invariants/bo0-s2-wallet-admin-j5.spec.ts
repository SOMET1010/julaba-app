// BO-0 / S2 — Création d'argent par le back-office. Décision J5 (Patrick,
// 03/10/2026) :
//   • seul `super_admin` peut créditer ou débiter un wallet depuis le BO ;
//   • chaque opération est OBLIGATOIREMENT journalisée : auteur, cible,
//     montant, motif, horodatage ;
//   • si l'écriture du journal échoue, l'opération échoue.
//
// Sonde S2 de l'audit : un `operateur_terrain` créditait 1 000 000 F à une
// marchande (201), sans aucune ligne dans audit_logs.
//
// La réinitialisation (`/reinitialiser`) est un débit du solde entier : elle
// suit la même règle.

import { HarnaisBO0, CompteTest, monterHarnais } from './bo0-harnais';

describe('BO-0 / S2 — J5 : argent du back-office réservé au super_admin, journalisé', () => {
  let h: HarnaisBO0;
  let superAdmin: CompteTest;
  let marchande: CompteTest;
  const autresBO: CompteTest[] = [];

  const solde = async () => {
    const [r] = await h.ds.query(`SELECT solde::numeric AS s FROM wallets WHERE user_id = $1`, [marchande.id]);
    return Number(r.s);
  };
  const journal = async () => h.ds.query(
    `SELECT user_id, action, entite, entite_id, details, created_at FROM audit_logs
      WHERE entite = 'wallet' AND entite_id = $1 AND action LIKE 'WALLET_%' ORDER BY created_at`,
    [marchande.id],
  );

  beforeAll(async () => {
    h = await monterHarnais();
    superAdmin = await h.mk('+2250799920001', 'super_admin');
    marchande = await h.mk('+2250799920002', 'marchand');
    let i = 10;
    for (const role of ['admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain']) {
      autresBO.push(await h.mk(`+22507999200${i++}`, role));
    }
    await h.ds.query('INSERT INTO wallets (user_id, solde, solde_bloque) VALUES ($1,5000,0)', [marchande.id]);
  }, 60000);

  afterAll(async () => { if (h) await h.close(); });

  it('S2a — aucun autre rôle BO ne peut créditer, débiter ou réinitialiser', async () => {
    for (const c of autresBO) {
      for (const [chemin, corps] of [
        ['credit', { montant: 1000000, motif: 'sonde' }],
        ['debit', { montant: 1000, motif: 'sonde' }],
        ['reinitialiser', { confirmation: 'CONFIRMER', motif: 'sonde' }],
      ] as const) {
        const res = await h.api().post(`/api/v1/admin/wallets/${marchande.id}/${chemin}`)
          .set('Authorization', `Bearer ${c.token}`).send(corps);
        expect({ role: c.role, chemin, status: res.status }).toEqual({ role: c.role, chemin, status: 403 });
      }
    }
    expect(await solde()).toBe(5000);
    expect(await journal()).toHaveLength(0);
  });

  it('S2b — super_admin : le motif est obligatoire', async () => {
    for (const corps of [{ montant: 100 }, { montant: 100, motif: '   ' }]) {
      const res = await h.api().post(`/api/v1/admin/wallets/${marchande.id}/credit`)
        .set('Authorization', `Bearer ${superAdmin.token}`).send(corps);
      expect(res.status).toBe(400);
    }
    expect(await solde()).toBe(5000);
  });

  it('S2c — super_admin : crédit et débit journalisés (auteur, cible, montant, motif, horodatage)', async () => {
    const avant = Date.now();
    const c = await h.api().post(`/api/v1/admin/wallets/${marchande.id}/credit`)
      .set('Authorization', `Bearer ${superAdmin.token}`).send({ montant: 2500, motif: 'Régularisation ticket 42' });
    expect([200, 201]).toContain(c.status);
    const d = await h.api().post(`/api/v1/admin/wallets/${marchande.id}/debit`)
      .set('Authorization', `Bearer ${superAdmin.token}`).send({ montant: 500, description: 'Erreur de saisie' });
    expect([200, 201]).toContain(d.status);
    expect(await solde()).toBe(7000);

    const lignes = await journal();
    expect(lignes).toHaveLength(2);
    const [credit, debit] = lignes;
    expect(credit).toMatchObject({ user_id: superAdmin.id, action: 'WALLET_CREDIT_ADMIN', entite_id: marchande.id });
    expect(credit.details).toMatchObject({ montant: 2500, motif: 'Régularisation ticket 42', solde_avant: 5000, solde_apres: 7500 });
    expect(debit).toMatchObject({ user_id: superAdmin.id, action: 'WALLET_DEBIT_ADMIN', entite_id: marchande.id });
    expect(debit.details).toMatchObject({ montant: 500, motif: 'Erreur de saisie', solde_avant: 7500, solde_apres: 7000 });
    expect(new Date(credit.created_at).getTime()).toBeGreaterThan(avant - 60_000);
  });

  it('S2d — si le journal ne peut pas être écrit, l\'opération échoue (rien ne bouge)', async () => {
    const txAvant = await h.ds.query(`SELECT COUNT(*)::int AS n FROM wallet_transactions WHERE user_id = $1`, [marchande.id]);
    await h.ds.query(`ALTER TABLE audit_logs RENAME TO audit_logs_indisponible`);
    try {
      const res = await h.api().post(`/api/v1/admin/wallets/${marchande.id}/credit`)
        .set('Authorization', `Bearer ${superAdmin.token}`).send({ montant: 999, motif: 'journal en panne' });
      expect(res.status).toBeGreaterThanOrEqual(500);
    } finally {
      await h.ds.query(`ALTER TABLE audit_logs_indisponible RENAME TO audit_logs`);
    }
    expect(await solde()).toBe(7000);
    const txApres = await h.ds.query(`SELECT COUNT(*)::int AS n FROM wallet_transactions WHERE user_id = $1`, [marchande.id]);
    expect(txApres[0].n).toBe(txAvant[0].n);
  });

  it('S2e — super_admin : la réinitialisation est un débit journalisé', async () => {
    const res = await h.api().post(`/api/v1/admin/wallets/${marchande.id}/reinitialiser`)
      .set('Authorization', `Bearer ${superAdmin.token}`).send({ confirmation: 'CONFIRMER', motif: 'Compte de test' });
    expect([200, 201]).toContain(res.status);
    expect(await solde()).toBe(0);
    const lignes = await journal();
    const reinit = lignes.find((l: any) => l.action === 'WALLET_REINITIALISATION_ADMIN');
    expect(reinit).toBeDefined();
    expect(reinit.user_id).toBe(superAdmin.id);
    expect(reinit.details).toMatchObject({ montant: 7000, motif: 'Compte de test', solde_avant: 7000, solde_apres: 0 });
  });
});
