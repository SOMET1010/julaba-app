// Sentry désactivé temporairement - peer dependency require-in-the-middle conflit Docker
// Backlog: réactiver après fix Dockerfile npm install propre
export const Sentry = {
  init: () => {},
  captureException: (_e: unknown) => {},
  captureMessage: (_m: string) => {},
};
