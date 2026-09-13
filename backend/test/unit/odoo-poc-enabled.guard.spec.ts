import { NotFoundException } from '@nestjs/common';
import { OdooPocEnabledGuard } from '../../src/odoo-gateway/odoo-poc-enabled.guard';

describe('OdooPocEnabledGuard', () => {
  const guard = new OdooPocEnabledGuard();
  const original = process.env.ODOO_POC_ENABLED;

  afterEach(() => {
    if (original === undefined) delete process.env.ODOO_POC_ENABLED;
    else process.env.ODOO_POC_ENABLED = original;
  });

  it('bloque (404) quand la variable est absente', () => {
    delete process.env.ODOO_POC_ENABLED;
    expect(() => guard.canActivate({} as never)).toThrow(NotFoundException);
  });

  it("bloque (404) quand la variable vaut autre chose que 'true'", () => {
    process.env.ODOO_POC_ENABLED = 'false';
    expect(() => guard.canActivate({} as never)).toThrow(NotFoundException);
  });

  it("laisse passer quand la variable vaut exactement 'true'", () => {
    process.env.ODOO_POC_ENABLED = 'true';
    expect(guard.canActivate({} as never)).toBe(true);
  });
});
