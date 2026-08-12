// Configuration Jest dédiée aux TESTS D'INVARIANTS (intégration Postgres).
// Séparée du reste : ces tests bootent l'app Nest complète contre une base
// jetable et sont plus lourds que des tests unitaires.
/** @type {import('jest').Config} */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testMatch: ['<rootDir>/test/invariants/**/*.spec.ts'],
  transform: {
    // ts-jest (tsc) émet emitDecoratorMetadata → l'injection Nest fonctionne.
    // diagnostics:false → on ne bloque pas sur des types manquants (@types/supertest…),
    // sans perdre la métadonnée de décorateurs.
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json', diagnostics: false }],
  },
  setupFiles: ['<rootDir>/test/invariants/env.ts'],
  globalSetup: '<rootDir>/test/invariants/global-setup.ts',
  testTimeout: 60000,
  maxWorkers: 1,
};
