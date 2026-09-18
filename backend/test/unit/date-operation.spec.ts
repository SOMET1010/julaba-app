/**
 * UNE VENTE HORS-LIGNE APPARTIENT AU JOUR OÙ ELLE A EU LIEU.
 *
 * LE DÉFAUT QU'ON FERME, audit du 18/09/2026. La file hors-ligne mémorisait
 * l'instant de la vente (`ts`) mais ne l'envoyait pas au rejeu : le serveur
 * horodatait à la RÉCEPTION. Une vente de 2 000 F faite à 23h55 sans réseau,
 * remontée à 00h05, basculait sur le jour suivant. Le total global restait
 * juste ; la JOURNÉE de la marchande — celle qu'elle compte le soir en fermant
 * sa caisse — était fausse des deux côtés de minuit.
 *
 * VÉRIFIÉ CONTRE UN VRAI POSTGRES avant d'écrire ce correctif : TypeORM
 * respecte bien une `created_at` fournie face à @CreateDateColumn (écart
 * mesuré : 0 ms), et garde son comportement d'origine quand elle est absente.
 * Sans cette vérification, tout le correctif aurait été décoratif.
 *
 * CE QUE CES BORNES PROTÈGENT. Accepter une date arbitraire d'un client, c'est
 * accepter qu'on antidate une vente : remplir un mois passé, fausser un rapport
 * déjà lu, déplacer de l'argent d'une journée close vers une autre.
 */
import { dateOperationValide, TOLERANCE_FUTUR_MS, ANCIENNETE_MAX_MS } from '../../src/caisse-rest/date-operation';

const MINUTE = 60 * 1000;
const HEURE = 60 * MINUTE;
const JOUR = 24 * HEURE;

describe('La date d’une vente rejouée depuis la file hors-ligne', () => {
  it('accepte le cas qui a motivé le correctif : 23h55 remontée à 00h05', () => {
    const maintenant = Date.parse('2026-09-19T00:05:00Z');
    const venteDeLaVeille = '2026-09-18T23:55:00Z';
    const d = dateOperationValide(venteDeLaVeille, maintenant);
    expect(d).not.toBeNull();
    // Et elle reste bien au 18, pas au 19.
    expect(d!.toISOString().slice(0, 10)).toBe('2026-09-18');
  });

  it('tolère une dérive d’horloge — un téléphone hors réseau dérive', () => {
    const maintenant = Date.now();
    expect(dateOperationValide(new Date(maintenant + 2 * MINUTE).toISOString(), maintenant)).not.toBeNull();
  });

  it('REFUSE le futur au-delà de la tolérance : on n’enregistre pas demain', () => {
    const maintenant = Date.now();
    const trop = new Date(maintenant + TOLERANCE_FUTUR_MS + MINUTE).toISOString();
    expect(dateOperationValide(trop, maintenant)).toBeNull();
  });

  it('REFUSE de réécrire un passé lointain : ce n’est plus un rejeu', () => {
    const maintenant = Date.now();
    const vieux = new Date(maintenant - ANCIENNETE_MAX_MS - JOUR).toISOString();
    expect(dateOperationValide(vieux, maintenant)).toBeNull();
  });

  it('accepte encore une file qui a traîné plusieurs jours', () => {
    const maintenant = Date.now();
    expect(dateOperationValide(new Date(maintenant - 3 * JOUR).toISOString(), maintenant)).not.toBeNull();
  });

  it('illisible, absente ou d’un mauvais type → null, et la vente passe quand même', () => {
    // Refuser la vente serait pire : on perdrait de l'argent RÉEL pour un
    // simple problème d'horodatage. `null` fait retomber sur « maintenant ».
    for (const v of ['pas une date', '', '   ', undefined, null, 12345, {}, []]) {
      expect(dateOperationValide(v)).toBeNull();
    }
  });
});
