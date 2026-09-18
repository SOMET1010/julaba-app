/**
 * Le verrou du code secret ne doit JAMAIS murer une marchande dehors.
 *
 * LE DÉFAUT QU'ON EMPÊCHE DE REVENIR : au 9ᵉ code raté, le serveur posait
 * `lockedUntil = maintenant + 100 ans`. Définitif, levable seulement par un
 * identificateur de la même zone. Une marchande qui hésite sur son code un jour
 * de marché perdait sa caisse — son argent, ses ventes, ses crédits — sans
 * aucun recours sur place.
 *
 * Ces tests tiennent les deux bouts : assez de frein pour qu'un téléphone volé
 * ne cède pas, assez de souplesse pour qu'une hésitation ne coûte pas une
 * journée de marché.
 */
import {
  attenteApresEchecs,
  essaisAvantAttente,
  attenteEnClair,
  estVerrouHeriteSansFin,
  HORIZON_MAX_MS,
} from '../../src/auth/verrou-pin';

const MINUTE = 60 * 1000;

describe('L’échelle d’attente du code secret', () => {
  it('laisse le droit d’hésiter : rien ne bloque avant le 3ᵉ échec', () => {
    expect(attenteApresEchecs(0)).toBe(0);
    expect(attenteApresEchecs(1)).toBe(0);
    expect(attenteApresEchecs(2)).toBe(0);
  });

  it('monte par paliers de 3, et plafonne à une heure', () => {
    expect(attenteApresEchecs(3)).toBe(5 * MINUTE);
    expect(attenteApresEchecs(6)).toBe(15 * MINUTE);
    expect(attenteApresEchecs(9)).toBe(60 * MINUTE);
    expect(attenteApresEchecs(12)).toBe(60 * MINUTE);
    expect(attenteApresEchecs(300)).toBe(60 * MINUTE);
  });

  it('entre deux paliers, elle réessaie tout de suite', () => {
    for (const n of [4, 5, 7, 8, 10, 11]) expect(attenteApresEchecs(n)).toBe(0);
  });

  it('N’EST JAMAIS DÉFINITIF — c’est tout l’objet de ce correctif', () => {
    // Une seule valeur infinie ici, et une marchande perd sa caisse pour de bon.
    for (let echecs = 0; echecs <= 1000; echecs++) {
      const attente = attenteApresEchecs(echecs);
      expect(Number.isFinite(attente)).toBe(true);
      expect(attente).toBeLessThanOrEqual(60 * MINUTE);
    }
  });

  it('annonce combien d’essais restent avant la prochaine attente', () => {
    // Rien ne prévenait : on tombait dans le palier sans le voir venir.
    expect(essaisAvantAttente(0)).toBe(3);
    expect(essaisAvantAttente(1)).toBe(2);
    expect(essaisAvantAttente(2)).toBe(1);
    expect(essaisAvantAttente(3)).toBe(3); // le palier vient de tomber, on repart
    expect(essaisAvantAttente(4)).toBe(2);
  });

  it('dit l’attente comme à quelqu’un qui n’a pas de montre', () => {
    expect(attenteEnClair(5 * MINUTE)).toBe('5 minutes');
    expect(attenteEnClair(MINUTE)).toBe('1 minute');
    expect(attenteEnClair(60 * MINUTE)).toBe('1 heure');
    expect(attenteEnClair(0)).toBe('');
  });

  describe('Les comptes murés par l’ancienne politique', () => {
    it('un verrou de 100 ans est reconnu comme hérité, donc à lever', () => {
      const dans100Ans = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);
      expect(estVerrouHeriteSansFin(dans100Ans)).toBe(true);
    });

    it('une attente NORMALE de la nouvelle échelle n’est pas levée par erreur', () => {
      // Sinon le verrou ne servirait plus à rien : il se lèverait tout seul.
      expect(estVerrouHeriteSansFin(new Date(Date.now() + 5 * MINUTE))).toBe(false);
      expect(estVerrouHeriteSansFin(new Date(Date.now() + 60 * MINUTE))).toBe(false);
      expect(estVerrouHeriteSansFin(new Date(Date.now() + HORIZON_MAX_MS - 1000))).toBe(false);
    });

    it('aucun verrou du tout : rien à lever', () => {
      expect(estVerrouHeriteSansFin(null)).toBe(false);
    });
  });

  it('le frein reste réel pour un téléphone volé', () => {
    // 10 000 codes possibles. Après les deux premiers paliers, chaque série de
    // 3 essais coûte une heure : ~72 essais par jour. On vérifie l'ordre de
    // grandeur, pas une valeur exacte — c'est lui qui justifie le compromis.
    const essaisParJour = (24 / 1) * 3;
    const joursPourToutEssayer = 10000 / essaisParJour;
    expect(essaisParJour).toBe(72);
    expect(joursPourToutEssayer).toBeGreaterThan(130);
  });
});
