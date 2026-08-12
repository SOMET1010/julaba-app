// Configuration + GARDE de la base de test des invariants.
//
// Contrainte d'isolation (imposée) : jamais de risque de pointer vers une base
// de dev ou de prod. La garde refuse de démarrer si NODE_ENV n'est pas "test"
// ou si le nom de base ne contient pas "test".

export const TEST_DB = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 55432),
  user: process.env.DB_USERNAME || 'julaba_user',
  password: process.env.DB_PASSWORD ?? 'test',
  name: process.env.DB_NAME || 'julaba_test',
};

export function assertBaseDeTest(): void {
  if ((process.env.NODE_ENV || '') !== 'test') {
    throw new Error(
      `[invariants] REFUS : NODE_ENV="${process.env.NODE_ENV}" (doit être "test"). Jamais dev/prod.`,
    );
  }
  if (!/test/i.test(TEST_DB.name)) {
    throw new Error(
      `[invariants] REFUS : base "${TEST_DB.name}" n'est pas une base de test ` +
        `(le nom doit contenir "test"). Aucune exécution possible sur dev/prod.`,
    );
  }
}
