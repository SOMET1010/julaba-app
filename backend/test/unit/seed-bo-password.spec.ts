/**
 * Aucun compte d'ADMINISTRATION de démo ne doit pouvoir exister avec un mot de
 * passe connu de tous.
 *
 * LE DÉFAUT QU'ON EMPÊCHE DE REVENIR. Le mot de passe des comptes back-office
 * de démo valait `'123456'`, écrit EN DUR, piloté par aucune variable. Ce
 * dépôt est public et le seed crée des comptes ADMIN_GENERAL : activer
 * SEED_DEMO sur le serveur réel y ouvrait un accès d'administration publié sur
 * GitHub. Pire, remettre le drapeau à "false" n'efface rien — il arrête de
 * créer, il ne supprime pas. Les comptes seraient restés indéfiniment.
 *
 * Ce test tient la règle : pas de variable → pas de compte back-office.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { motDePasseBackOffice, estCompteBackOffice } from '../../src/database/seed-demo.service';

describe('Mot de passe des comptes back-office de démo', () => {
  it('absent de l’environnement → aucun mot de passe, donc aucun compte créé', () => {
    expect(motDePasseBackOffice({} as NodeJS.ProcessEnv)).toBeNull();
  });

  it('chaîne vide ou espaces → traité comme absent, pas comme un mot de passe', () => {
    expect(motDePasseBackOffice({ SEED_DEMO_BO_PASSWORD: '' } as NodeJS.ProcessEnv)).toBeNull();
    expect(motDePasseBackOffice({ SEED_DEMO_BO_PASSWORD: '   ' } as NodeJS.ProcessEnv)).toBeNull();
  });

  it('l’ANCIENNE valeur publiée est refusée, même fournie explicitement', () => {
    // Elle traîne peut-être encore dans une configuration quelque part : elle
    // ne doit pas pouvoir revenir par la petite porte.
    expect(motDePasseBackOffice({ SEED_DEMO_BO_PASSWORD: '123456' } as NodeJS.ProcessEnv)).toBeNull();
  });

  it('une vraie valeur est acceptée et rendue telle quelle', () => {
    expect(
      motDePasseBackOffice({ SEED_DEMO_BO_PASSWORD: 'u7Kd92xQ' } as NodeJS.ProcessEnv),
    ).toBe('u7Kd92xQ');
  });

  it('reconnaît les rôles d’administration, et eux seuls', () => {
    expect(estCompteBackOffice('admin_general')).toBe(true);
    expect(estCompteBackOffice('super_admin')).toBe(true);
    expect(estCompteBackOffice('marchand')).toBe(false);
    expect(estCompteBackOffice('producteur')).toBe(false);
    expect(estCompteBackOffice('institution')).toBe(false);
  });

  it('le mot de passe publié n’est plus écrit en dur dans le fichier de seed', () => {
    // Garde-fou textuel : il attrape une réintroduction même si quelqu'un
    // contourne la fonction ci-dessus.
    const source = readFileSync(
      join(__dirname, '../../src/database/seed-demo.service.ts'),
      'utf8',
    );
    // On cherche une AFFECTATION (`= '123456'`), pas une comparaison
    // (`=== '123456'`) : le code en refuse justement la valeur, et ce refus ne
    // doit pas faire échouer son propre garde-fou.
    const affectations = source
      .split('\n')
      .filter((l) => /[^=!<>]=\s*['"]123456['"]/.test(l));
    expect(affectations).toEqual([]);
  });

  it('render.yaml ne publie aucune valeur pour ce mot de passe', () => {
    const rendu = readFileSync(join(__dirname, '../../../render.yaml'), 'utf8');
    const bloc = rendu.slice(rendu.indexOf('SEED_DEMO_BO_PASSWORD'));
    const lignesSuivantes = bloc.split('\n').slice(0, 3).join('\n');
    expect(lignesSuivantes).toContain('sync: false');
    expect(lignesSuivantes).not.toMatch(/value:/);
  });
});
