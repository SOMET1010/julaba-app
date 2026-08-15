// Tests unitaires backend PURS (aucune base requise).
// Distinct de jest-invariants.config.cjs (qui démarre un Postgres jetable).
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/unit/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json', diagnostics: false }],
  },
};
