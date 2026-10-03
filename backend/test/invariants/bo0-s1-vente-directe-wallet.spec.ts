// BO-0 / S1 — Vol de wallet par « vente directe ».
//
// Sonde S1 de l'audit écosystème (docs/audit/ecosysteme-2026-10/SONDES.md) :
// un compte quelconque crée une `vente_directe` dont la VICTIME est l'acheteur
// (acheteur_id libre dans le body), puis appelle POST /commandes/:id/paiement,
// qui débitait le wallet de la victime sans aucune action de sa part.
//
// Règle prouvée ici : le seul consentement à un débit Keiwa d'une commande
// que connaît le modèle existant, c'est l'ACHETEUR qui crée lui-même la
// commande avec mode_paiement='keiwa' (cf. K1, keiwa-paiement-commande.spec).
// Une vente directe est créée par le VENDEUR : elle ne porte donc aucun
// consentement de l'acheteur et ne peut jamais débiter son wallet.
//
//  S1a) la création d'une vente directe en keiwa est refusée (400) ;
//  S1b) une vente directe keiwa déjà en base (héritage) ne débite rien :
//       le paiement est refusé (403) et les soldes ne bougent pas ;
//  S1c) non-régression : la vente directe légitime (espèces, acheteur hors
//       compte, celle que crée CommandesProducteurPage) passe toujours.

import { HarnaisBO0, CompteTest, monterHarnais } from './bo0-harnais';

describe('BO-0 / S1 — une vente directe ne débite jamais le wallet d\'un tiers', () => {
  let h: HarnaisBO0;
  let voleur: CompteTest;
  let victime: CompteTest;

  const soldes = async () => {
    const rows = await h.ds.query(
      `SELECT user_id, solde::numeric AS solde FROM wallets WHERE user_id IN ($1,$2)`,
      [voleur.id, victime.id],
    );
    const s = (id: string) => Number(rows.find((r: any) => r.user_id === id)?.solde);
    return { voleur: s(voleur.id), victime: s(victime.id) };
  };

  beforeAll(async () => {
    h = await monterHarnais();
    voleur = await h.mk('+2250799910001', 'producteur');
    victime = await h.mk('+2250799910002', 'marchand');
    await h.ds.query(
      'INSERT INTO wallets (user_id, solde, solde_bloque) VALUES ($1,50000,0),($2,0,0)',
      [victime.id, voleur.id],
    );
  }, 60000);

  afterAll(async () => { if (h) await h.close(); });

  const corpsSonde = () => ({
    type: 'vente_directe', vendeur_id: voleur.id, acheteur_id: victime.id,
    recolte_id: '6f1c2a3e-0000-4000-8000-000000000001', produit: 'Rien', quantite: 1,
    prix_unitaire: 40000, total: 40000, mode_paiement: 'keiwa', statut: 'en_attente',
  });

  it('S1a — la création d\'une vente directe payée en keiwa est refusée', async () => {
    const res = await h.api().post('/api/v1/commandes')
      .set('Authorization', `Bearer ${voleur.token}`).send(corpsSonde());
    expect(res.status).toBe(400);
    expect(await soldes()).toEqual({ voleur: 0, victime: 50000 });
  });

  it('S1b — une vente directe keiwa héritée ne peut pas débiter l\'acheteur', async () => {
    // Ligne posée directement en base : simule une commande créée avant le
    // correctif. Le paiement doit la refuser, pas seulement la création.
    const [cmd] = await h.ds.query(
      `INSERT INTO commandes (acheteur_id, vendeur_id, recolte_id, type, produit, quantite,
         prix_unitaire, total, statut, date_commande, mode_paiement)
       VALUES ($1,$2,$3,'vente_directe','Rien',1,40000,40000,'en_attente',NOW(),'keiwa')
       RETURNING id`,
      [victime.id, voleur.id, '6f1c2a3e-0000-4000-8000-000000000002'],
    );
    const res = await h.api().post(`/api/v1/commandes/${cmd.id}/paiement`)
      .set('Authorization', `Bearer ${voleur.token}`).send();
    expect(res.status).toBe(403);
    expect(await soldes()).toEqual({ voleur: 0, victime: 50000 });
    const tx = await h.ds.query(
      `SELECT COUNT(*)::int AS n FROM wallet_transactions WHERE related_entity_id = $1`, [cmd.id],
    );
    expect(tx[0].n).toBe(0);
    const [apres] = await h.ds.query(`SELECT statut_paiement FROM commandes WHERE id = $1`, [cmd.id]);
    expect(apres.statut_paiement).not.toBe('paye');
  });

  it('S1c — la vente directe légitime (espèces, acheteur hors compte) passe toujours', async () => {
    const res = await h.api().post('/api/v1/commandes')
      .set('Authorization', `Bearer ${voleur.token}`)
      .send({
        type: 'vente_directe', vendeur_id: voleur.id, acheteur_id: '', acheteur_nom: 'Client du marché',
        recolte_id: '6f1c2a3e-0000-4000-8000-000000000003', produit: 'Mangue', quantite: 1,
        prix_unitaire: 1000, total: 1000, statut: 'en_attente',
      });
    expect([200, 201]).toContain(res.status);
    const pay = await h.api().post(`/api/v1/commandes/${res.body.commande.id}/paiement`)
      .set('Authorization', `Bearer ${voleur.token}`).send();
    expect([200, 201]).toContain(pay.status);
    expect(await soldes()).toEqual({ voleur: 0, victime: 50000 });
  });
});
