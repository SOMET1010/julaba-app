// BO-0 / S3 — Escalade de privilèges dans le back-office.
//
// Sonde S3 de l'audit : un admin_national suspendait le super_admin
// (PATCH /users/:id {status:'suspendu'}) et s'attribuait lui-même des
// permissions (PATCH /users/<lui> {boPermissions}). D'autres portes de même
// nature, relevées par l'audit gouvernance, sont fermées dans le même lot :
// DELETE /users/:id ouvert aux 5 rôles BO, PATCH /acteurs/:id en liste noire
// (boPermissions, phone, webauthnCredentials écrits sur n'importe qui), et
// /admin/wallets/:id/bloquer qui suspend n'importe quel compte.
//
// Règles prouvées (consigne BO-0 + J6) :
//  • un rôle ne suspend, ne modifie, ne promeut, ne supprime aucun compte de
//    niveau égal ou supérieur ; seul le super_admin gère les comptes BO ;
//  • personne, hors super_admin, ne s'attribue ni n'attribue de permissions ;
//  • J6 : sur ces routes, la permission BO est vérifiée CÔTÉ SERVEUR
//    (bo_permissions du compte, sinon le défaut de son rôle).

import { HarnaisBO0, CompteTest, monterHarnais } from './bo0-harnais';

describe('BO-0 / S3 — pas d\'escalade de privilèges dans le back-office', () => {
  let h: HarnaisBO0;
  let superAdmin: CompteTest;
  let general: CompteTest;
  let national: CompteTest;
  let national2: CompteTest;
  let operateur: CompteTest;
  let marchand: CompteTest;
  let marchand2: CompteTest;
  let nationalBride: CompteTest;

  const user = async (id: string) =>
    (await h.ds.query(`SELECT status, role, phone, bo_permissions, webauthn_credentials FROM users WHERE id = $1`, [id]))[0];
  const patch = (c: CompteTest, id: string, body: any) =>
    h.api().patch(`/api/v1/users/${id}`).set('Authorization', `Bearer ${c.token}`).send(body);

  beforeAll(async () => {
    h = await monterHarnais();
    superAdmin = await h.mk('+2250799930001', 'super_admin');
    general = await h.mk('+2250799930002', 'admin_general');
    national = await h.mk('+2250799930003', 'admin_national');
    national2 = await h.mk('+2250799930004', 'admin_national');
    operateur = await h.mk('+2250799930005', 'operateur_terrain');
    marchand = await h.mk('+2250799930006', 'marchand');
    marchand2 = await h.mk('+2250799930007', 'marchand');
    // Compte dont le super_admin a restreint les droits à la seule lecture.
    nationalBride = await h.mk('+2250799930008', 'admin_national', { boPermissions: { 'acteurs.read': true } });
    await h.ds.query(
      `INSERT INTO wallets (user_id, solde, solde_bloque) VALUES ($1,0,0),($2,0,0),($3,0,0)`,
      [superAdmin.id, general.id, marchand.id],
    );
  }, 60000);

  afterAll(async () => { if (h) await h.close(); });

  describe('PATCH /users/:id', () => {
    it('S3a — admin_national ne peut pas suspendre le super_admin (sonde S3)', async () => {
      const res = await patch(national, superAdmin.id, { status: 'suspendu' });
      expect(res.status).toBe(403);
      expect((await user(superAdmin.id)).status).toBe('actif');
    });

    it('S3b — admin_national ne peut pas s\'attribuer des permissions (sonde S3)', async () => {
      const res = await patch(national, national.id, { boPermissions: { 'utilisateurs.write': true, 'acteurs.delete': true } });
      expect(res.status).toBe(403);
      expect((await user(national.id)).bo_permissions).toBeNull();
    });

    it('S3c — ni un pair, ni un supérieur, ni un admin inférieur : seul le super_admin gère les admins', async () => {
      const cas: Array<[CompteTest, CompteTest, any]> = [
        [national, national2, { status: 'suspendu' }],        // pair
        [national, general, { phone: '+2250799939999' }],     // supérieur
        [general, superAdmin, { email: 'pirate@example.com' }],
        [general, national, { status: 'suspendu' }],          // admin inférieur
        [general, national, { boPermissions: { 'acteurs.delete': true } }],
      ];
      for (const [acteur, cible, corps] of cas) {
        const res = await patch(acteur, cible.id, corps);
        expect({ acteur: acteur.role, cible: cible.role, status: res.status })
          .toEqual({ acteur: acteur.role, cible: cible.role, status: 403 });
      }
      expect((await user(national2.id)).status).toBe('actif');
      expect((await user(national.id)).status).toBe('actif');
      expect((await user(general.id)).phone).toBe('+2250799930002');
    });

    it('S3d — personne hors super_admin ne promeut un compte', async () => {
      const res = await patch(general, marchand.id, { role: 'super_admin' });
      expect(res.status).toBe(403);
      expect((await user(marchand.id)).role).toBe('marchand');
    });

    it('S3e — un admin ne modifie pas son propre statut', async () => {
      const res = await patch(general, general.id, { status: 'actif', boPermissions: {} });
      expect(res.status).toBe(403);
    });

    it('S3f — le super_admin gère bien les admins', async () => {
      const r1 = await patch(superAdmin, national2.id, { status: 'suspendu' });
      expect(r1.status).toBe(200);
      expect((await user(national2.id)).status).toBe('suspendu');
      const r2 = await patch(superAdmin, national2.id, { status: 'actif', boPermissions: { 'acteurs.read': true } });
      expect(r2.status).toBe(200);
      expect((await user(national2.id)).bo_permissions).toEqual({ 'acteurs.read': true });
    });

    it('S3g — non-régression : admin_national gère toujours un acteur terrain', async () => {
      const r1 = await patch(national, marchand.id, { firstName: 'Awa' });
      expect(r1.status).toBe(200);
      const r2 = await patch(national, marchand.id, { status: 'suspendu' });
      expect(r2.status).toBe(200);
      const r3 = await patch(national, marchand.id, { status: 'actif' });
      expect(r3.status).toBe(200);
      // Et un admin met toujours à jour son propre profil.
      const r4 = await patch(national, national.id, { firstName: 'Moi' });
      expect(r4.status).toBe(200);
    });

    it('S3h — J6 : un compte privé de acteurs.write par le super_admin ne modifie plus un acteur', async () => {
      const res = await patch(nationalBride, marchand.id, { firstName: 'Interdit' });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /users/:id', () => {
    const del = (c: CompteTest, id: string) =>
      h.api().delete(`/api/v1/users/${id}`).set('Authorization', `Bearer ${c.token}`);

    it('S3i — operateur_terrain et admin_national (sans acteurs.delete) ne suppriment personne', async () => {
      for (const c of [operateur, national]) {
        const res = await del(c, marchand2.id);
        expect({ role: c.role, status: res.status }).toEqual({ role: c.role, status: 403 });
      }
      for (const cible of [superAdmin, general]) {
        const res = await del(operateur, cible.id);
        expect(res.status).toBe(403);
      }
      expect((await user(marchand2.id)).status).toBe('actif');
      expect((await user(superAdmin.id)).status).toBe('actif');
    });

    it('S3j — admin_general ne supprime pas un admin ; le super_admin ne se supprime pas lui-même', async () => {
      expect((await del(general, national.id)).status).toBe(403);
      expect((await del(general, superAdmin.id)).status).toBe(403);
      expect((await del(superAdmin, superAdmin.id)).status).toBe(403);
      expect((await user(national.id)).status).toBe('actif');
    });

    it('S3k — suppression autorisée (admin_general sur un acteur) : journalisée avec son auteur', async () => {
      const res = await del(general, marchand2.id);
      expect(res.status).toBe(200);
      expect((await user(marchand2.id)).status).toBe('supprime');
      const logs = await h.ds.query(
        `SELECT user_id FROM audit_logs WHERE entite = 'user' AND entite_id = $1 AND action = 'suppression'`,
        [marchand2.id],
      );
      expect(logs).toHaveLength(1);
      expect(logs[0].user_id).toBe(general.id);
    });
  });

  describe('PATCH /acteurs/:id', () => {
    const patchA = (c: CompteTest, id: string, body: any) =>
      h.api().patch(`/api/v1/acteurs/${id}`).set('Authorization', `Bearer ${c.token}`).send(body);

    it('S3l — admin_general n\'écrit ni permissions, ni téléphone, ni clé WebAuthn sur le super_admin', async () => {
      for (const corps of [
        { boPermissions: { 'utilisateurs.write': true } },
        { phone: '+2250799938888' },
        { webauthnCredentials: [{ credentialId: 'x', publicKey: 'y', counter: 0 }] },
        { firstName: 'Pirate' },
      ]) {
        const res = await patchA(general, superAdmin.id, corps);
        expect(res.status).toBe(403);
      }
      const s = await user(superAdmin.id);
      expect(s.phone).toBe('+2250799930001');
      expect(s.bo_permissions).toBeNull();
      expect(s.webauthn_credentials ?? []).toEqual([]);
    });

    it('S3m — admin_general ne s\'attribue pas de permissions ni de clé WebAuthn par /acteurs', async () => {
      const res = await patchA(general, general.id, { boPermissions: { 'parametres.write': true } });
      expect(res.status).toBe(403);
      const res2 = await patchA(general, marchand.id, { webauthnCredentials: [{ credentialId: 'x', publicKey: 'y', counter: 0 }] });
      expect(res2.status).toBe(403);
      expect((await user(general.id)).bo_permissions).toBeNull();
    });

    it('S3n — non-régression : admin_general modifie toujours le profil d\'un acteur', async () => {
      const res = await patchA(general, marchand.id, { lastName: 'Kone' });
      expect(res.status).toBe(200);
    });
  });

  describe('POST /admin/wallets/:id/bloquer (suspension du compte)', () => {
    const bloquer = (c: CompteTest, id: string) =>
      h.api().post(`/api/v1/admin/wallets/${id}/bloquer`).set('Authorization', `Bearer ${c.token}`).send({ raison: 'sonde' });

    it('S3o — operateur_terrain ou admin_general ne bloquent pas un compte BO', async () => {
      expect((await bloquer(operateur, superAdmin.id)).status).toBe(403);
      expect((await bloquer(general, superAdmin.id)).status).toBe(403);
      expect((await bloquer(operateur, general.id)).status).toBe(403);
      expect((await user(superAdmin.id)).status).toBe('actif');
      expect((await user(general.id)).status).toBe('actif');
    });

    it('S3p — non-régression : un rôle qui a acteurs.suspend bloque un acteur terrain', async () => {
      expect((await bloquer(operateur, marchand.id)).status).toBe(201);
      const deb = await h.api().post(`/api/v1/admin/wallets/${marchand.id}/debloquer`)
        .set('Authorization', `Bearer ${operateur.token}`).send();
      expect(deb.status).toBe(201);
    });
  });
});
