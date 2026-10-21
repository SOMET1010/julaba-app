/**
 * JÙLABA — Mode Production
 * DEV_MODE est définitivement désactivé.
 * Ce fichier est conservé uniquement pour la compatibilité des imports.
 */

export const DEV_MODE = false;

export const DEV_CONFIG = {
  skipApiCalls: false,
  skipAutoLoad: false,
  skipRealtime: false,
  skipNotifications: false,
  showDevBadge: false,
  verboseLogs: false,
};

// No-op en production
export const devLog = (_context: string, _message: string, _data?: any): void => {};
