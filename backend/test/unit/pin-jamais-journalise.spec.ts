// SEC-01 / SEC-02 — UN SECRET N'ENTRE JAMAIS DANS UN JOURNAL.
//
// Le code créait le PIN d'un identificateur puis faisait :
//
//   console.log('[SMS PIN CREATED]', phone, message)
//
// où `message` contenait le PIN à 4 chiffres EN CLAIR. Et ce n'était pas du
// code mort : `auth.controller.ts` appelle bien `notifyPinIdentificateurCreated`
// à la création d'un compte identificateur. Le PIN et le téléphone partaient
// donc dans les journaux du serveur — conservés, consultables par quiconque a
// accès au tableau de bord d'hébergement.
//
// Deuxième défaut dans les deux mêmes lignes : le SMS n'était JAMAIS ENVOYÉ.
// Un `console.log` remplaçait l'envoi, sous un TODO périmé — alors que le
// fichier possède déjà un `send()` qui passe par le vrai `SmsService`, et que
// neuf autres notifications l'utilisent. L'identificateur ne recevait donc
// jamais son code.
//
// Ce test tient les deux : le message part par le service d'envoi, et le PIN
// n'apparaît dans AUCUNE sortie de journal.

import { Logger } from '@nestjs/common';
import { FeedbakSmsService } from '../../src/feedbak-sms/feedbak-sms.service';

describe('SEC-01 — le PIN part par SMS et n’entre dans aucun journal', () => {
  const PIN = '4713';
  const PHONE = '+2250700001234';

  let envoyes: Array<{ phone: string; text: string }>;
  let journal: string[];
  let service: FeedbakSmsService;
  let espions: Array<{ restore: () => void }>;

  beforeEach(() => {
    envoyes = [];
    journal = [];

    const smsService = {
      sendSms: async (phone: string, text: string) => {
        envoyes.push({ phone, text });
        return { success: true };
      },
    };
    service = new FeedbakSmsService(smsService as any);

    // On capture TOUT ce qui pourrait porter un secret : la console et le
    // logger Nest. Un test qui ne surveillerait que `console.log` laisserait
    // passer un `logger.debug` demain.
    const capture = (...args: unknown[]) => { journal.push(args.map(String).join(' ')); };
    espions = [
      ...(['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => {
        const spy = jest.spyOn(console, m).mockImplementation(capture);
        return { restore: () => spy.mockRestore() };
      }),
      ...(['log', 'warn', 'error', 'debug', 'verbose'] as const).map((m) => {
        const spy = jest.spyOn(Logger.prototype, m).mockImplementation(capture as never);
        return { restore: () => spy.mockRestore() };
      }),
    ];
  });

  afterEach(() => { espions.forEach((e) => e.restore()); });

  it('le message part réellement par le service SMS, avec le PIN dedans', async () => {
    await service.notifyPinIdentificateurCreated(PHONE, 'Awa', PIN);

    expect(envoyes).toHaveLength(1);
    expect(envoyes[0].phone).toBe(PHONE);
    // Le PIN doit être dans le SMS — c'est tout l'objet du message.
    expect(envoyes[0].text).toContain(PIN);
  });

  it('le PIN n’apparaît dans AUCUNE sortie de journal', async () => {
    await service.notifyPinIdentificateurCreated(PHONE, 'Awa', PIN);

    const tout = journal.join('\n');
    expect(tout).not.toContain(PIN);
    // Ni le corps du message, qui le contient.
    expect(tout).not.toContain('code PIN à 4 chiffres est');
  });

  it('même quand l’envoi ÉCHOUE, le PIN ne fuit pas dans le journal d’erreur', async () => {
    const enPanne = {
      sendSms: async () => { throw new Error('ANSUT injoignable'); },
    };
    const s = new FeedbakSmsService(enPanne as any);
    await s.notifyPinIdentificateurCreated(PHONE, 'Awa', PIN);

    const tout = journal.join('\n');
    expect(tout).not.toContain(PIN);
  });

  it('la notification de CHANGEMENT de PIN part aussi par SMS', async () => {
    // Elle ne porte aucun secret, mais elle était elle aussi bloquée sur un
    // console.log : l'identificateur n'était jamais averti qu'on avait changé
    // son code — précisément l'alerte qui compte en cas de compromission.
    await service.notifyPinChanged(PHONE, 'Awa');
    expect(envoyes).toHaveLength(1);
    expect(envoyes[0].text).toContain('modifié');
  });
});

// ── GARDE-FOU DURABLE ────────────────────────────────────────────────────────
//
// Le test ci-dessus attrape la fuite par le COMPORTEMENT, et c'est le seul qui
// le pouvait : le PIN n'était pas écrit littéralement dans l'appel fautif, il
// était dans une variable construite une ligne plus haut. Une recherche
// statique de `${pin}` dans un `console.log` n'aurait rien vu.
//
// Ce garde-fou complète : dans les trois modules qui manipulent des
// identifiants — authentification, SMS, notifications de compte — on n'écrit
// pas dans la console. Le `Logger` de Nest y est la seule voie, et les
// méthodes de ces modules ne lui passent que des événements et des numéros,
// jamais un corps de message. Zéro appel aujourd'hui : la règle ne rattrape
// aucune dette existante, elle empêche la prochaine.
describe('SEC-01 — aucun appel console dans les modules qui touchent des identifiants', () => {
  const MODULES_SENSIBLES = ['auth', 'sms', 'feedbak-sms'];

  it('ni console.log, ni console.error, ni aucun autre', () => {
    const { readdirSync, readFileSync, statSync } = require('node:fs') as typeof import('node:fs');
    const { join } = require('node:path') as typeof import('node:path');

    const fichiers = (dir: string, acc: string[] = []): string[] => {
      for (const e of readdirSync(dir)) {
        const p = join(dir, e);
        if (statSync(p).isDirectory()) fichiers(p, acc);
        else if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) acc.push(p);
      }
      return acc;
    };

    const fautifs: string[] = [];
    for (const module of MODULES_SENSIBLES) {
      const racine = join(__dirname, '..', '..', 'src', module);
      for (const f of fichiers(racine)) {
        readFileSync(f, 'utf8').split('\n').forEach((ligne, i) => {
          // Un appel, pas une mention en commentaire.
          if (/^\s*console\.\w+\(/.test(ligne)) {
            fautifs.push(`${f.split('/src/')[1]}:${i + 1}`);
          }
        });
      }
    }

    expect(fautifs).toEqual([]);
  });
});
