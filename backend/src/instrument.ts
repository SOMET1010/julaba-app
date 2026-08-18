// Sentry OPTIONNEL — ne s'active que si SENTRY_DSN est posé dans l'environnement.
//
// Historique : l'init inconditionnelle cassait le démarrage Docker (peer
// dependency require-in-the-middle). On ne charge donc @sentry/node QUE sur
// demande explicite (DSN présent), sous try/catch : un échec d'installation ou
// d'init ne doit JAMAIS empêcher le serveur de démarrer — sans DSN ou en cas
// d'échec, l'export redevient le no-op historique et l'appli vit sa vie.
type SentryLike = {
  init: (opts?: unknown) => void;
  captureException: (e: unknown) => void;
  captureMessage: (m: string) => void;
};

const noop: SentryLike = {
  init: () => {},
  captureException: (_e: unknown) => {},
  captureMessage: (_m: string) => {},
};

function chargerSentry(): SentryLike {
  if (!process.env.SENTRY_DSN) return noop;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sentry = require('@sentry/node') as SentryLike;
    sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      // Erreurs uniquement — pas de tracing (quota gratuit préservé).
      tracesSampleRate: 0,
    });
    return sentry;
  } catch (e: unknown) {
    // eslint-disable-next-line no-console
    console.warn(
      '[SENTRY] init impossible — serveur démarré sans télémétrie : ' +
        (e instanceof Error ? e.message : String(e)),
    );
    return noop;
  }
}

export const Sentry: SentryLike = chargerSentry();
