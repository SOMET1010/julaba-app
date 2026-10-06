/**
 * AUTH-07 (audit UI auth 05/10/2026) — anti-énumération côté serveur.
 *
 * LE DÉFAUT QU'ON EMPÊCHE DE REVENIR. La route /auth/check-phone répond
 * « existe / n'existe pas » : c'est le parcours produit (le numéro inconnu a
 * son écran /non-enregistre). Mais rien n'empêchait de SONDER la route :
 * la durée de réponse et une voie rapide (appel malformé) trahissaient ce
 * que le corps dit déjà. Et les numéros de recette ANSUT, actifs en prod
 * (décision métier), n'étaient journalisés nulle part côté serveur.
 *
 * CE QUE LA GARDE VÉRIFIE :
 *   1. le module anti-enumeration.ts existe, porte la liste miroir ANSUT
 *      et l'échéance uniforme (plancher + gigue) ;
 *   2. check-phone (service) répond à l'échéance uniforme et logue les
 *      numéros de recette, numéro MASQUÉ ;
 *   3. plus aucune voie rapide dans le contrôleur : tout passe par le
 *      service ;
 *   4. les listes frontend (LoginPassword) et backend sont des MIROIRS
 *      exacts — une liste divergente fait qu'on logue un numéro que
 *      l'écran accepte, ou l'inverse ;
 *   5. la liste SERVEUR AUTORITAIRE (AUTH-07-sous-dette) : AUTH_TELEPHONES_TEST
 *      est lue, filtrée (10 chiffres), et le démarrage dit quelle liste
 *      écoute (source + taille, jamais les numéros) ; un .env présent doit
 *      être ALIGNÉ sur le miroir (dev) ;
 *   6. l'escalation frontend documente le FAIT côté serveur.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const lire = (rel) => readFileSync(join(ICI, '..', rel), 'utf8');
const lireBackend = (rel) => readFileSync(join(ICI, '..', '..', 'backend', rel), 'utf8');

let echecs = 0;
const verifier = (quoi, ok, pourquoi) => {
  if (ok) { console.log(`  ✓ ${quoi}`); return; }
  echecs++;
  console.log(`  ✗ ${quoi}`);
  if (pourquoi) console.log(`      ${pourquoi}`);
};

// On cherche du CODE, pas les commentaires qui racontent l'incident.
const sansCommentaires = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !l.trim().startsWith('//'))
  .join('\n');

console.log('\ncheck-phone : le temps ne dit rien, la recette ANSUT se voit');

const moduleAnt = 'backend/src/auth/anti-enumeration.ts';
const moduleExiste = existsSync(join(ICI, '..', '..', moduleAnt));
verifier('le module backend/src/auth/anti-enumeration.ts existe', moduleExiste);

if (moduleExiste) {
  const antBrut = lireBackend('src/auth/anti-enumeration.ts');
  const ant = sansCommentaires(antBrut);
  verifier(
    'l\'échéance uniforme est porte (plancher + gigue indépendants du résultat)',
    /PLANCHER_MS/.test(ant) && /GIGUE?_MS/.test(ant) && /export async function repondreAEcheanceUniforme/.test(ant),
    'sans échéance, la durée de réponse reste une fuite de timing.',
  );
  verifier(
    'la liste ANSUT vit côté serveur (estTelephoneTest exporté)',
    /export function estTelephoneTest/.test(ant),
    'le backend doit reconnaître les numéros de recette pour les loguer.',
  );

  // 5. La liste AUTORITAIRE par environnement (AUTH-07-sous-dette).
  verifier(
    'la liste autoritaire se charge de l\'ENV (AUTH_TELEPHONES_TEST)',
    /export function chargerTelephonesTest/.test(ant) && /AUTH_TELEPHONES_TEST/.test(ant),
    'sans env autoritaire, la liste recette se tient à deux mains dans le code.',
  );
  verifier(
    'l\'ENV est filtrée : seuls les numéros à 10 chiffres entrent dans la liste',
    /length === 10/.test(ant),
    'un morceau malformé de la variable ne doit pas devenir un numéro logué.',
  );
  verifier(
    'estTelephoneTest interroge la liste CHARGÉE (env ou repli), pas un Set figé',
    /chargeeSiBesoin\(\)\.liste\.has\(local\)/.test(ant),
  );

  // 4. Miroir exact des deux listes (frontend LoginPassword ↔ backend module).
  // On extrait les numéros UNIQUEMENT dans le bloc de DÉCLARATION du Set —
  // les écrans contiennent d'autres numéros à 10 chiffres (support, démo)
  // hors liste, et le nom de la liste peut être mentionné dans un commentaire.
  const blocListe = (texte, nom) => {
    const declaration = texte.match(new RegExp(`${nom}\\s*=\\s*new Set[^(]*\\(`));
    if (!declaration) return new Set();
    const debut = declaration.index;
    const fin = texte.indexOf(']);', debut);
    const bloc = fin === -1 ? texte.slice(debut) : texte.slice(debut, fin);
    const trouve = bloc.match(/'[0-9]{10}'/g) || [];
    return new Set(trouve.map((n) => n.slice(1, -1)));
  };
  const listeFront = blocListe(lire('src/app/components/auth/LoginPassword.tsx'), 'TEST_PHONES');
  const listeBack = blocListe(antBrut, 'TELEPHONES_TEST_CODE');
  const miroir = listeFront.size > 0
    && listeFront.size === listeBack.size
    && [...listeFront].every((n) => listeBack.has(n));
  verifier(
    `les listes TEST_PHONES frontend et backend sont des miroirs exacts (${listeFront.size} numéros)`,
    miroir,
    'une liste divergente logue un numéro que l\'écran accepte, ou l\'inverse. MAINTENIR LES DEUX.',
  );

  const service = sansCommentaires(lireBackend('src/auth/auth.service.ts'));
  const checkPhone = service.slice(service.indexOf('async checkPhone'));
  verifier(
    'check-phone répond à l\'échéance uniforme (service)',
    /repondreAEcheanceUniforme\(debut\)/.test(checkPhone),
    'le findOne seul laisserait hit et miss se distinguer au chrono.',
  );
  verifier(
    'check-phone logue les accès TEST_PHONE',
    /estTelephoneTest\(phone\)/.test(checkPhone),
    'les accès recette en prod doivent se compter côté serveur.',
  );
  verifier(
    'le log check-phone MASQUE le numéro (jamais le numéro complet)',
    !/\$\{phone\}/.test(checkPhone),
    'un numéro complet dans un journal rouvre la fuite PII qu\'on vient de fermer.',
  );
  const loginBloc = service.slice(service.indexOf('async login('), service.indexOf('async checkPhone'));
  verifier(
    'login logue aussi les accès TEST_PHONE',
    /estTelephoneTest\(loginDto\.phone\)/.test(loginBloc),
    'la connexion est le premier accès d\'un compte de recette.',
  );

  // 5bis. Le démarrage dit quelle liste écoute (jamais les numéros eux-mêmes).
  verifier(
    'le démarrage journalise la source et la taille de la liste active',
    /sourceListeTelephonesTest/.test(service) && /tailleListeTelephonesTest/.test(service) && /onModuleInit/.test(service),
    'sans ce journal, on ne sait pas quel environnement logue quoi.',
  );
  verifier(
    'le journal de démarrage ne cite AUCUN numéro',
    !/TEST_PHONES actifs[^\n]*[0-9]{10}/.test(service),
    'la PII recette ne va pas non plus dans le journal de boot.',
  );

  // 5ter. Un .env présent doit être ALIGNÉ sur le miroir (en dev, l'env fait foi).
  const cheminEnv = join(ICI, '..', '..', 'backend', '.env');
  if (existsSync(cheminEnv)) {
    const envBrut = readFileSync(cheminEnv, 'utf8');
    const ligne = envBrut.split('\n').find((l) => l.startsWith('AUTH_TELEPHONES_TEST='));
    if (ligne) {
      const envListe = new Set(
        ligne.slice('AUTH_TELEPHONES_TEST='.length)
          .split(/[;,\s]+/)
          .map((m) => m.replace(/\D/g, ''))
          .filter((m) => m.length === 10),
      );
      const aligne = listeFront.size > 0
        && envListe.size === listeFront.size
        && [...listeFront].every((n) => envListe.has(n));
      verifier(
        `backend/.env AUTH_TELEPHONES_TEST aligné sur le miroir (${envListe.size} numéros)`,
        aligne,
        'en dev l\'env fait foi : divergent, il fait taire la journalisation d\'un numéro que l\'écran accepte.',
      );
    } else {
      verifier(
        'backend/.env présent : AUTH_TELEPHONES_TEST déclaré (liste autoritaire explicite)',
        false,
        'repli code acceptable, mais un .env explicite verrouille l\'environnement.',
      );
    }
  }
}

const controleur = sansCommentaires(lireBackend('src/auth/auth.controller.ts'));
const controleurCheck = controleur.slice(controleur.indexOf('async checkPhone'), controleur.indexOf('async checkPhone') + 700);
verifier(
  'plus aucune voie rapide dans le contrôleur (tout passe par le service)',
  !/return\s*\{\s*exists:\s*false\s*\}/.test(controleurCheck),
  'un retour immédiat serait un chemin de réponse plus court, donc une fuite.',
);

const loginEcran = lire('src/app/components/auth/LoginPassword.tsx');
verifier(
  'l\'escalation frontend documente le FAIT côté serveur',
  /FAIT côté serveur le 05\/10\/2026 \(AUTH-07/.test(loginEcran),
  'l\'écran doit dire où la protection vit désormais, sinon on la croira encore attendue.',
);

if (echecs > 0) {
  console.log('\n✗ anti-énumération check-phone — échec');
  process.exit(1);
}
console.log('\n✓ check-phone : échéance uniforme, recette ANSUT loguée masquée, listes miroirs');
