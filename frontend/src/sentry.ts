
import * as Sentry from "@sentry/react";

export function initSentry() {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: "https://42c2ada351e108de4bd1a2e6c13697e6@o4511079112835072.ingest.de.sentry.io/4511079194951760",
      environment: "production",
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.05,
      replaysOnErrorSampleRate: 1.0,
      beforeSend(event) {
        // Ne pas envoyer les erreurs reseau normales
        if (event.exception?.values?.[0]?.type === "NetworkError") return null;
        return event;
      },
    });
  }
}

export { Sentry };
