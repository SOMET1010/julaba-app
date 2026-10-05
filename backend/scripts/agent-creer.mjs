#!/usr/bin/env node
/**
 * CRÉER UN COMPTE DE SERVICE ET ÉMETTRE SON JETON — AGENT-V1, 05/10/2026.
 *
 * SANS CE SCRIPT, LE LOT A EST INUTILISABLE. Tout était en place — portées,
 * délégation, garde, traçabilité — et il n'existait AUCUN moyen de créer un
 * agent ni d'émettre son jeton. C'était le vrai blocage du parcours de bout
 * en bout, pas les plafonds.
 *
 * POURQUOI UNE LIGNE DE COMMANDE ET PAS UNE ROUTE HTTP. Créer un compte de
 * service est un geste que l'on fait une fois, à la main, par la personne qui
 * tient le serveur. Une route le permettant serait une surface d'attaque
 * permanente pour un besoin ponctuel : qui peut créer un agent peut s'en
 * créer un. Le script exige l'accès à la base et au secret — c'est-à-dire
 * d'être déjà chez soi.
 *
 * LES PLAFONDS VIENNENT DES ARGUMENTS, JAMAIS DU CODE. Décision de Patrick :
 * « le montant doit être choisi à partir des montants réels des transactions,
 * pas inventé dans le code ». Ce script n'en propose aucun par défaut ; sans
 * eux, le compte est créé et l'agent ne peut rien écrire — ce qui est le
 * comportement voulu, pas une panne.
 *
 * LE JETON N'EST IMPRIMÉ QU'UNE FOIS et n'est enregistré nulle part. Il se
 * pose directement là où il sert (secret d'environnement de l'agent), jamais
 * dans un fichier du dépôt ni dans un canal qui l'archive (ALERTE-SEC-01).
 *
 * Usage :
 *   node scripts/agent-creer.mjs --id wa-1 --nom "Agent WhatsApp" \
 *        --portees ventes:ecrire,depenses:ecrire,lecture \
 *        [--plafond-operation 20000] [--plafond-jour 100000] \
 *        [--duree 90d]
 */
import { Client } from 'pg';
import jwt from 'jsonwebtoken';

const PORTEES_AGENT = ['ventes:ecrire', 'depenses:ecrire', 'stock:ecrire', 'lecture'];

const argv = process.argv.slice(2);
const opt = (nom) => { const i = argv.indexOf(`--${nom}`); return i === -1 ? null : argv[i + 1] ?? null; };

const id = opt('id');
const nom = opt('nom') ?? id;
const porteesBrutes = (opt('portees') ?? '').split(',').map((p) => p.trim()).filter(Boolean);
const duree = opt('duree') ?? '90d';
const plafondOperation = opt('plafond-operation');
const plafondJour = opt('plafond-jour');

function mourir(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

if (!id) mourir('--id est requis (identifiant stable de l’agent, ex. wa-1)');
if (porteesBrutes.length === 0) mourir(`--portees est requis. Choix : ${PORTEES_AGENT.join(', ')}`);

// On REFUSE une portée inconnue au lieu de la jeter en silence : un agent créé
// avec une portée mal orthographiée tournerait sans le droit qu'on croit lui
// avoir donné, et personne ne le verrait avant la première écriture refusée.
const inconnues = porteesBrutes.filter((p) => !PORTEES_AGENT.includes(p));
if (inconnues.length > 0) {
  mourir(`portée(s) inconnue(s) : ${inconnues.join(', ')}\n  Choix : ${PORTEES_AGENT.join(', ')}`);
}

const secret = process.env.JWT_SECRET;
if (!secret) mourir('JWT_SECRET absent de l’environnement — le jeton doit être signé du même secret que le serveur');

const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

await client.connect();
try {
  await client.query(
    `INSERT INTO agent_service (id, nom, portees, actif, plafond_par_operation, plafond_par_jour)
     VALUES ($1,$2,$3,true,$4,$5)
     ON CONFLICT (id) DO UPDATE SET
       nom = EXCLUDED.nom, portees = EXCLUDED.portees, actif = true,
       plafond_par_operation = EXCLUDED.plafond_par_operation,
       plafond_par_jour = EXCLUDED.plafond_par_jour,
       revoque_le = NULL`,
    [id, nom, porteesBrutes, plafondOperation ? Number(plafondOperation) : null, plafondJour ? Number(plafondJour) : null],
  );

  // Le jeton ne porte PAS de `sub` : un agent n'est pas un utilisateur, et
  // `JwtStrategy` refuse de toute façon tout jeton marqué `typ: 'agent'`.
  const jeton = jwt.sign({ typ: 'agent', agentId: id, portees: porteesBrutes }, secret, { expiresIn: duree });

  console.log(`\n✅ Agent « ${nom} » (${id}) créé ou mis à jour.`);
  console.log(`   portées : ${porteesBrutes.join(', ')}`);
  console.log(`   plafonds : par opération = ${plafondOperation ?? 'NON DÉFINI'}, par jour = ${plafondJour ?? 'NON DÉFINI'}`);
  if (!plafondOperation || !plafondJour) {
    console.log(`\n⚠️  TANT QUE LES DEUX PLAFONDS NE SONT PAS DÉFINIS, L'AGENT NE PEUT RIEN ÉCRIRE.`);
    console.log(`   La lecture, elle, fonctionne. Relance avec --plafond-operation et --plafond-jour`);
    console.log(`   quand les montants seront arbitrés.`);
  }
  console.log(`\n   JETON (affiché une seule fois, ne le colle dans aucun fichier du dépôt) :\n`);
  console.log(`   ${jeton}\n`);
  console.log(`   Pose-le dans le secret d'environnement de l'agent. Pour le révoquer :`);
  console.log(`   UPDATE agent_service SET actif = false WHERE id = '${id}';\n`);
} finally {
  await client.end();
}
