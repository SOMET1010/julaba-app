// SCHEMA-PILOTE — LE CHEMIN DE DÉPLOIEMENT DU PILOTE, FIGÉ ET PROUVÉ.
//
// POURQUOI CE FICHIER EXISTE. SCHEMA-01/02/03 décrivent une doctrine de schéma
// MULTIPLE : migrations TypeORM, `DbInitService`, et `synchronize` depuis les
// entités. Ce mécanisme a déjà cassé deux fonctions réellement terrain le même
// jour — B1 (`stock_mouvements.type` absent ⇒ toute annulation de vente
// échouait) puis STK-01 (`stock_operation_idempotency` absente ⇒ TOUTE
// modification de stock échouait). Deux instances en vingt-quatre heures.
//
// Arbitrage de Patrick : l'APK reste bloqué dessus. Pas parce que
// l'architecture n'est pas assez propre, mais parce que la règle de sortie est
// « aucun P0/P1 connu, atteignable par le pilote, ne part au terrain », et que
// pour celui-ci on a une preuve empirique RÉPÉTÉE de conséquence terrain.
//
// Ce lot ne refond pas les migrations. Il rend le mécanisme NON DANGEREUX pour
// cette sortie, en prouvant quatre choses :
//
//   1. un seul chemin construit la base du pilote ;
//   2. tout ce que le code écrit en SQL brut — tables ET COLONNES — existe
//      après ce seul chemin ;
//   3. un second démarrage ne modifie ni ne casse le schéma ;
//   4. le schéma obtenu est figé : le modifier sans rejouer ce gate échoue.
//
// CE QUE LE GARDE-FOU COUVRE, DIT HONNÊTEMENT. Il analyse les `INSERT INTO
// t (cols…)` et `UPDATE t SET col = …` du code vivant : 41 tables, 344
// colonnes. C'est exactement la forme des deux défauts historiques — B1 était
// une colonne d'INSERT, STK-01 une table d'INSERT. Il NE couvre PAS les
// colonnes lues en SELECT avec alias, ni les index. C'est écrit ici pour que
// personne ne lise « exhaustif » comme « total ».

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { computeBootDbFlags } from '../../src/database/schema-flags';

/** Tables écrites par du code vivant mais créées par aucun chemin exécutable. */
const DETTE_CONNUE: Record<string, string> = {
  api_keys: 'SCHEMA-05 — API partenaires, hors parcours pilote (P2)',
  keiwa_config_items: 'SCHEMA-06 — Keiwa, hors parcours pilote (P2)',
};

function fichiersSrc(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (e !== 'migrations') fichiersSrc(p, acc); }
    else if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) acc.push(p);
  }
  return acc;
}

/** Ce que le code ÉCRIT réellement, table par table, colonne par colonne. */
function referencesSqlBrut(): Map<string, Set<string>> {
  const ref = new Map<string, Set<string>>();
  const ajouter = (t: string, c: string) => {
    const k = t.toLowerCase();
    if (!ref.has(k)) ref.set(k, new Set());
    ref.get(k)!.add(c.toLowerCase());
  };
  for (const f of fichiersSrc(join(__dirname, '..', '..', 'src'))) {
    const code = readFileSync(f, 'utf8');
    for (const m of code.matchAll(/INSERT\s+INTO\s+(?:public\.)?([a-z_][a-z0-9_]*)\s*\(([^)]*)\)/gi)) {
      for (const brut of m[2].split(',')) {
        const nom = brut.trim().replace(/["`]/g, '');
        if (/^[a-z_][a-z0-9_]*$/i.test(nom)) ajouter(m[1], nom);
      }
    }
    for (const m of code.matchAll(
      /UPDATE\s+(?:public\.)?([a-z_][a-z0-9_]*)(?:\s+AS\s+\w+)?\s+SET\s+([\s\S]{0,400}?)(?:\bWHERE\b|\bRETURNING\b|`)/gi,
    )) {
      for (const seg of m[2].split(',')) {
        const nom = (seg.split('=')[0] || '').trim().replace(/["`]/g, '');
        if (/^[a-z_][a-z0-9_]*$/i.test(nom)) ajouter(m[1], nom);
      }
    }
  }
  return ref;
}

/** Empreinte du schéma : tables, colonnes, index. Comparable entre deux boots. */
async function empreinteSchema(ds: DataSource): Promise<string> {
  const colonnes = await ds.query(
    `SELECT table_name, column_name, data_type, is_nullable
       FROM information_schema.columns WHERE table_schema = 'public'
      ORDER BY table_name, column_name`,
  );
  const index = await ds.query(
    `SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public'
      ORDER BY tablename, indexname`,
  );
  return JSON.stringify({ colonnes, index });
}

describe('SCHEMA-PILOTE — un seul chemin, prouvé et figé', () => {
  let app: INestApplication;
  let ds: DataSource;
  let dbInit: DbInitService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    ds = app.get(DataSource);
    dbInit = app.get(DbInitService, { strict: false });
    await dbInit.runInit();
  }, 90000);

  afterAll(async () => { if (app) await app.close(); });

  // ── 1. UN SEUL CHEMIN AUTORISÉ ──────────────────────────────────────────

  it('sur base vierge, le chemin autorisé est : entités → synchronize → DbInit', () => {
    // C'est la décision de `schema-flags`, et c'est celle du pilote : une base
    // neuve chez l'hébergeur. Les migrations NE TOURNENT PAS — d'où B1 et
    // STK-01, où une colonne et une table n'existaient que dans une migration.
    expect(computeBootDbFlags(true)).toEqual({ synchronize: 'true', migrationsRun: 'false' });
  });

  it('la base de cette exécution a bien été bâtie par ce chemin, sans migration', async () => {
    const [r] = await ds.query(
      `SELECT count(*)::int AS n FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'migrations'`,
    );
    expect(r.n).toBe(0);
  });

  // ── 2. LE GARDE-FOU AU NIVEAU COLONNE ───────────────────────────────────

  it('toute TABLE écrite en SQL brut existe après ce seul chemin', async () => {
    const ref = referencesSqlBrut();
    expect(ref.size).toBeGreaterThan(30); // le balayage a bien trouvé quelque chose

    const existantes: string[] = (await ds.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    )).map((r: { table_name: string }) => r.table_name.toLowerCase());

    const creeesAuVol = new Set<string>();
    for (const f of fichiersSrc(join(__dirname, '..', '..', 'src'))) {
      for (const m of readFileSync(f, 'utf8')
        .matchAll(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(?:public\.)?([a-z_][a-z0-9_]*)/gi)) {
        creeesAuVol.add(m[1].toLowerCase());
      }
    }

    const manquantes = [...ref.keys()]
      .filter((t) => !existantes.includes(t))
      .filter((t) => !creeesAuVol.has(t))
      .filter((t) => !(t in DETTE_CONNUE))
      .sort();
    expect(manquantes).toEqual([]);
  }, 60000);

  it('toute COLONNE écrite en SQL brut existe — c’était la forme exacte de B1', async () => {
    // B1 : `stock_mouvements.type` n'existait que dans une migration. Sur base
    // vierge, l'INSERT de l'annulation échouait donc à l'exécution, et le seul
    // test qui aurait pu le voir appliquait la migration lui-même. Le garde-fou
    // posé après B1 ne vérifiait que les TABLES : il n'aurait pas revu B1.
    const ref = referencesSqlBrut();
    const lignes = await ds.query(
      `SELECT table_name, column_name FROM information_schema.columns
        WHERE table_schema = 'public'`,
    );
    const reelles = new Map<string, Set<string>>();
    for (const l of lignes as { table_name: string; column_name: string }[]) {
      const t = l.table_name.toLowerCase();
      if (!reelles.has(t)) reelles.set(t, new Set());
      reelles.get(t)!.add(l.column_name.toLowerCase());
    }

    const manquantes: string[] = [];
    for (const [table, colonnes] of ref) {
      if (table in DETTE_CONNUE) continue;
      const presentes = reelles.get(table);
      if (!presentes) continue; // absence de table : couverte par le test précédent
      for (const c of colonnes) if (!presentes.has(c)) manquantes.push(`${table}.${c}`);
    }
    expect(manquantes.sort()).toEqual([]);
  }, 60000);

  // ── 3. UN SECOND DÉMARRAGE NE CHANGE RIEN ───────────────────────────────

  it('rejouer DbInit ne modifie ni ne casse le schéma', async () => {
    const avant = await empreinteSchema(ds);
    await dbInit.runInit();
    await dbInit.runInit();
    const apres = await empreinteSchema(ds);
    // Un `ALTER … ADD COLUMN IF NOT EXISTS` qui ne serait pas idempotent, ou un
    // index recréé différemment, se verrait ici — et se verrait AVANT le terrain.
    expect(apres).toBe(avant);
  }, 90000);

  // ── 4. LE SCHÉMA EST FIGÉ POUR L'APK ────────────────────────────────────

  it('le schéma obtenu correspond à l’empreinte figée du pilote', async () => {
    const chemin = join(__dirname, '..', '..', '..', 'docs', 'schema', 'EMPREINTE-PILOTE.json');
    let figee: { tables: number; colonnes: number; parTable: Record<string, string[]> };
    try {
      figee = JSON.parse(readFileSync(chemin, 'utf8'));
    } catch {
      throw new Error(
        `Empreinte de pilote absente (${chemin}). Lancer : node scripts/schema-pilote.mjs --figer`,
      );
    }

    const lignes = await ds.query(
      `SELECT table_name, column_name FROM information_schema.columns
        WHERE table_schema = 'public' ORDER BY table_name, column_name`,
    );
    const parTable: Record<string, string[]> = {};
    for (const l of lignes as { table_name: string; column_name: string }[]) {
      (parTable[l.table_name] ||= []).push(l.column_name);
    }

    // CE QUE LE GEL COUVRE, ET CE QU'IL NE PEUT PAS COUVRIR.
    //
    // L'empreinte décrit le schéma produit par LE CHEMIN AUTORISÉ. Or certains
    // services posent leur propre table au PREMIER USAGE
    // (`CREATE TABLE IF NOT EXISTS` dans le service : `cron_jobs_config`,
    // `support_config`, `cooperative_besoins`…). C'est la troisième façon de
    // construire le schéma, déjà comptée en SCHEMA-01 — elle n'appartient pas
    // à ce chemin, et rien ne dit si elle s'est déclenchée ou non au moment où
    // ce test tourne.
    //
    // POURQUOI CETTE PRÉCISION EXISTE. La première version comparait le schéma
    // ENTIER. Elle passait quand ce fichier s'exécutait tôt dans la batterie,
    // et échouait quand il s'exécutait après la suite qui touche la
    // configuration des tâches planifiées : la base avait alors 61 tables au
    // lieu de 60. Vert en local, rouge sur le runner, pour une raison qui
    // n'avait rien à voir avec le schéma du pilote — exactement la classe de
    // défaut qu'on a corrigée dans SEED-01, cette fois dans MON test.
    //
    // On compare donc ce dont DbInit est responsable, et on EXIGE que chaque
    // table de l'empreinte soit intacte. Une table posée paresseusement en
    // plus est ignorée ; une table de l'empreinte qui disparaît, ou dont les
    // colonnes bougent, fait échouer. Le gel garde tout son mordant sur ce
    // qu'il gouverne.
    const poseesAuPremierUsage = new Set<string>();
    for (const f of fichiersSrc(join(__dirname, '..', '..', 'src'))) {
      // `src/database/` est EXCLU : DbInit emploie lui aussi
      // `CREATE TABLE IF NOT EXISTS`, et le scanner ici viderait le gel de sa
      // substance en excusant précisément les tables qu'il doit gouverner.
      if (f.includes(`${join('src', 'database')}`)) continue;
      for (const m of readFileSync(f, 'utf8')
        .matchAll(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(?:public\.)?([a-z_][a-z0-9_]*)/gi)) {
        poseesAuPremierUsage.add(m[1].toLowerCase());
      }
    }

    const ecarts: string[] = [];
    for (const t of new Set([...Object.keys(parTable), ...Object.keys(figee.parTable)])) {
      const gelee = figee.parTable[t];
      if (!gelee && poseesAuPremierUsage.has(t.toLowerCase())) continue;
      const a = (gelee ?? []).join(',');
      const b = (parTable[t] ?? []).join(',');
      if (a !== b) ecarts.push(t);
    }
    if (ecarts.length) {
      throw new Error(
        `Le schéma a changé depuis le gel du pilote (${ecarts.length} table(s) : ` +
        `${ecarts.slice(0, 8).join(', ')}${ecarts.length > 8 ? '…' : ''}).\n` +
        `Ce n'est pas forcément une faute — mais il faut REJOUER le gate :\n` +
        `  node scripts/schema-pilote.mjs --figer`,
      );
    }
    expect(ecarts).toEqual([]);
  }, 60000);
});
