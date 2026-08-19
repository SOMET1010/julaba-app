// Garde-fou anti-doublon — CONSTITUTION.md §1/§4/§5 : « une fonctionnalité =
// une implémentation », « pas de code mort ».
//
// Contexte (audit) : le commit 1415bdb a introduit DEUX implémentations en
// parallèle pour les raccourcis vocaux et le rapport hebdo vocal :
//   - backend/src/caisse-rest/{raccourcis,rapport-hebdo}.controller.ts
//     → montés dans CaisseRestModule (mounté dans AppModule), c'est CETTE
//       version que le frontend consomme réellement en prod (RaccourcisModal,
//       RapportHebdoModal, RaccourcisProvider, RapportHebdoProvider).
//   - backend/src/raccourcis/ et backend/src/rapport/ → jamais montés dans
//     AppModule, strictement moins complets (pas de PATCH, suppression dure
//     au lieu d'un soft-delete `actif=false`, table `wallet_transactions` au
//     lieu de `caisse_transactions`, texte de synthèse statique au lieu de
//     GPT-4o, appel ElevenLabs dupliqué au lieu du service partagé
//     OpenAIService.synthesize qui a le repli Piper).
//
// Décision : supprimer le doublon mort plutôt que le monter (le monter aurait
// fait cohabiter deux contrôleurs sur `/raccourcis` et sur `/rapport/hebdo`
// dans deux modules différents — Nest ne lève pas d'erreur au démarrage dans
// ce cas, il enregistre juste une route qui ne sera jamais atteinte : un bug
// silencieux, pas un crash). Ce test verrouille la suppression : si quelqu'un
// recrée un second module raccourcis/rapport sans le monter (ou en dupliquant
// une route déjà servie par CaisseRestModule), la CI doit le signaler.
import { existsSync } from 'fs';
import { join } from 'path';
import { readFileSync } from 'fs';

const SRC = join(__dirname, '..', '..', 'src');

describe('Pas de doublon raccourcis/rapport (CONSTITUTION.md §1, §4, §5)', () => {
  it('le module raccourcis autonome mort (backend/src/raccourcis/) a été supprimé', () => {
    expect(existsSync(join(SRC, 'raccourcis'))).toBe(false);
  });

  it('le module rapport autonome mort (backend/src/rapport/) a été supprimé', () => {
    expect(existsSync(join(SRC, 'rapport'))).toBe(false);
  });

  it('AppModule ne référence aucun de ces deux modules morts', () => {
    const appModuleSrc = readFileSync(join(SRC, 'app.module.ts'), 'utf8');
    expect(appModuleSrc).not.toMatch(/from ['"]\.\/raccourcis\/raccourcis\.module['"]/);
    expect(appModuleSrc).not.toMatch(/from ['"]\.\/rapport\/rapport\.module['"]/);
  });

  it('CaisseRestModule reste l\'unique source de vérité pour /raccourcis et /rapport/hebdo', () => {
    const caisseRestModuleSrc = readFileSync(join(SRC, 'caisse-rest', 'caisse-rest.module.ts'), 'utf8');
    expect(caisseRestModuleSrc).toMatch(/RaccourcisController/);
    expect(caisseRestModuleSrc).toMatch(/RapportHebdoController/);
  });
});
