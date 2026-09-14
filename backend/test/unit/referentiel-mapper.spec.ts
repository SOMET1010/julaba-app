import {
  CHAMPS_REFERENTIEL,
  OdooReferentielRecord,
  categorieDe,
  estReferenceMaitre,
  versReferenceMaitre,
} from '../../src/odoo-gateway/referentiel-mapper';

/**
 * Référentiel maître Odoo → JULABA. Test PUR (aucune base, aucun réseau).
 *
 * Le cœur de ce fichier est une ABSENCE : aucun prix ne doit pouvoir
 * traverser cette frontière. C'est ce qui rend structurellement impossible
 * qu'un produit maître à 0 devienne un article à 0 F en caisse — pas un
 * garde-fou qu'on pourrait oublier d'appeler, une absence de champ.
 */

function odoo(surcharge: Partial<OdooReferentielRecord> = {}): OdooReferentielRecord {
  return {
    id: 42,
    name: 'Igname Kponan',
    default_code: 'VIV-TUB-001',
    categ_id: [7, 'JULABA / Tubercules et racines / Ignames'],
    active: true,
    is_storable: true,
    ...surcharge,
  };
}

describe('referentiel-mapper — projection d\'une référence maître', () => {
  it('projette identité, catégorie et référence stable', () => {
    expect(versReferenceMaitre(odoo())).toEqual({
      defaultCode: 'VIV-TUB-001',
      nom: 'Igname Kponan',
      categorie: 'JULABA / Tubercules et racines / Ignames',
      odooProductId: 42,
      actif: true,
    });
  });

  it('NE TRANSPORTE AUCUN PRIX — même si Odoo en renvoie un', () => {
    // Le référentiel maître est seedé à list_price = 0, mais un jour
    // quelqu'un pourrait poser un prix dans Odoo. Ce test verrouille le fait
    // qu'il ne traverserait pas : le prix d'une marchande lui appartient, et
    // un prix commun à toutes n'existe pas dans ce modèle.
    const avecPrix = { ...odoo(), list_price: 15000, standard_price: 9000 } as OdooReferentielRecord;
    const projete = versReferenceMaitre(avecPrix) as Record<string, unknown>;
    expect(Object.keys(projete).sort()).toEqual(
      ['actif', 'categorie', 'defaultCode', 'nom', 'odooProductId'],
    );
    expect(JSON.stringify(projete)).not.toContain('15000');
  });

  it('ne demande à Odoo aucun champ de prix', () => {
    expect(CHAMPS_REFERENTIEL).toEqual(
      expect.arrayContaining(['id', 'name', 'default_code', 'categ_id', 'active', 'is_storable']),
    );
    expect(CHAMPS_REFERENTIEL).not.toContain('list_price');
    expect(CHAMPS_REFERENTIEL).not.toContain('standard_price');
    expect(CHAMPS_REFERENTIEL).not.toContain('qty_available');
  });

  it('extrait le chemin de catégorie, ou null quand il manque', () => {
    expect(categorieDe(odoo())).toBe('JULABA / Tubercules et racines / Ignames');
    expect(categorieDe(odoo({ categ_id: false }))).toBeNull();
    expect(categorieDe(odoo({ categ_id: undefined }))).toBeNull();
    expect(versReferenceMaitre(odoo({ categ_id: false })).categorie).toBeNull();
  });

  it('considère actif un enregistrement sans champ `active`', () => {
    // Odoo ne renvoie les archivés que si on les demande (active_test) : un
    // enregistrement présent dans une lecture ordinaire EST actif. Ici, le
    // silence dit quelque chose — contrairement à is_storable.
    expect(versReferenceMaitre(odoo({ active: undefined })).actif).toBe(true);
    expect(versReferenceMaitre(odoo({ active: false })).actif).toBe(false);
  });

  it('coupe les espaces autour de la référence', () => {
    expect(versReferenceMaitre(odoo({ default_code: '  VIV-TUB-001  ' })).defaultCode).toBe('VIV-TUB-001');
  });
});

describe('referentiel-mapper — ce qui n\'entre pas au référentiel', () => {
  it('écarte un produit sans référence stable', () => {
    // Sans default_code, une ligne ne peut être ni retrouvée au
    // rafraîchissement suivant, ni adoptée, ni reliée à un produit marchand.
    expect(estReferenceMaitre(odoo({ default_code: false }))).toBe(false);
    expect(estReferenceMaitre(odoo({ default_code: '' }))).toBe(false);
    expect(estReferenceMaitre(odoo({ default_code: '   ' }))).toBe(false);
    expect(estReferenceMaitre(odoo({ default_code: undefined }))).toBe(false);
  });

  it('écarte un produit technique de module — le cas réel de Tips', () => {
    // Valeurs MESURÉES sur l'instance Odoo 19 : Tips porte sale_ok=true et
    // is_storable=false. Même critère que estArticleCatalogue.
    const tips = odoo({ id: 1, name: 'Tips', default_code: 'TIPS', is_storable: false });
    expect(estReferenceMaitre(tips)).toBe(false);
  });

  it('écarte quand is_storable n\'a pas été demandé — le silence n\'autorise rien', () => {
    expect(estReferenceMaitre(odoo({ is_storable: undefined }))).toBe(false);
  });

  it('refuse de projeter un enregistrement hors référentiel, en le nommant', () => {
    expect(() => versReferenceMaitre(odoo({ is_storable: false }))).toThrow(/hors référentiel maître/);
    expect(() => versReferenceMaitre(odoo({ default_code: false }))).toThrow(/Igname Kponan/);
  });
});
