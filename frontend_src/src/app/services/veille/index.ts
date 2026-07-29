/**
 * JÙLABA — Veille 30 jours : point d'entree du module.
 */
export * from './types';
export { VEILLE_SOURCES, getSource, defaultSourceIds } from './sources';
export { DemoVeilleProvider } from './demoProvider';
export { runVeille, VEILLE_VERSION } from './veilleService';
export type { RunVeilleOptions } from './veilleService';
