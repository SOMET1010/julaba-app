#!/usr/bin/env node
/**
 * AUDIT DE DONNÉES — le facteur de conversion par produit.
 *
 * Question posée : « quels produits utilisent sac, panier, tas, quels facteurs
 * sont plausibles, et combien de lignes seraient impactées par une migration ? »
 *
 * Ce script NE DÉCIDE RIEN et NE CORRIGE RIEN. Il mesure, et il nomme
 * explicitement ce qu'il ne peut pas savoir.
 *
 * LECTURE SEULE, GARANTIE PAR POSTGRESQL, PAS PAR UN COMMENTAIRE :
 * la session est passée en `TRANSACTION READ ONLY` et le script VÉRIFIE que le
 * réglage a bien pris avant d'exécuter la moindre requête. Tout INSERT/UPDATE/
 * DELETE/ALTER échouerait donc côté serveur (code 25006), y compris une faute
 * de frappe de notre part. C'est ce qui le rend exécutable sur la production.
 *
 * Usage :
 *   DB_HOST=… DB_PORT=… DB_USERNAME=… DB_PASSWORD=… DB_NAME=… \
 *     node backend/scripts/audit-facteur-recoltes.cjs
 *   (ajouter DB_SSL=true pour une base managée type Render)
 *   --sql   affiche chaque requête avant de l'exécuter (auditabilité)
 */
const { Client } = require('pg');

const AFFICHER_SQL = process.argv.includes('--sql');

// ── La table de facteurs AUDITÉE ────────────────────────────────────────────
// Recopie de RecolteForm.tsx:169-175. Elle est GLOBALE : le même « panier »
// vaut 10 kg pour la tomate et pour l'igname. C'est précisément l'objet de
// l'audit. Un test unitaire (facteurs-sans-derive.spec.ts) échoue si cette
// recopie s'écarte de l'écran.
const FACTEURS = {
  kg: 1,
  tonne: 1000,
  sac: 100,
  tas: 50,
  cagette: 20,
  panier: 10,
  botte: 0.5,
};

// Vocabulaire d'unités partagé par les écrans de STOCK
// (frontend_src/src/app/config/unites.ts). Volontairement distinct : c'est la
// divergence entre les deux listes qui est mesurée en section 3.
const UNITES_COURANTES = ['kg', 'sac', 'tonne', 'tas', 'régimes', 'carton', 'L', 'pièce'];

const t = (s) => `\n\x1b[1m${s}\x1b[0m`;
const sousTitre = (s) => `  \x1b[2m${s}\x1b[0m`;

function tableau(lignes, colonnes) {
  if (!lignes.length) return '    (aucune ligne)';
  const l = colonnes.map((c) => Math.max(c.length, ...lignes.map((r) => String(r[c] ?? '').length)));
  const sep = (g, m, d) => '    ' + g + l.map((n) => '─'.repeat(n + 2)).join(m) + d;
  const ligne = (vals) => '    │ ' + vals.map((v, i) => String(v ?? '').padEnd(l[i])).join(' │ ') + ' │';
  return [
    sep('┌', '┬', '┐'),
    ligne(colonnes),
    sep('├', '┼', '┤'),
    ...lignes.map((r) => ligne(colonnes.map((c) => r[c]))),
    sep('└', '┴', '┘'),
  ].join('\n');
}

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 55432),
    user: process.env.DB_USERNAME || 'julaba_user',
    password: process.env.DB_PASSWORD ?? 'test',
    database: process.env.DB_NAME || 'julaba_test',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();

  // ── LE VERROU DE LECTURE SEULE, PUIS SA VÉRIFICATION ──────────────────────
  await client.query('SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY');
  const { rows: [v] } = await client.query('SHOW default_transaction_read_only');
  if (v.default_transaction_read_only !== 'on') {
    console.error("  ✗ REFUS : la session n'est pas en lecture seule — on n'auditera pas une base qu'on pourrait écrire.");
    process.exit(1);
  }
  // Le réglage annoncé ne suffit pas : on le MET À L'ÉPREUVE. Une écriture
  // volontairement vide (`WHERE false`, zéro ligne concernée) doit être refusée
  // par le serveur avec 25006. Si elle PASSE, c'est que la session n'est pas
  // protégée et on s'arrête avant d'avoir lu quoi que ce soit.
  let refusee = false;
  try {
    await client.query('UPDATE recoltes SET unite = unite WHERE false');
  } catch (e) {
    refusee = e.code === '25006';
    if (!refusee) throw e;
  }
  if (!refusee) {
    console.error('  ✗ REFUS : une écriture a été ACCEPTÉE en lecture seule. On n’audite pas une base qu’on peut abîmer.');
    process.exit(1);
  }
  console.log('\x1b[32m  ✓ lecture seule ÉPROUVÉE : une écriture vide a été refusée par le serveur (25006)\x1b[0m');

  const q = async (sql, params = []) => {
    if (AFFICHER_SQL) console.log(`\x1b[2m${sql.trim()}\x1b[0m`);
    return (await client.query(sql, params)).rows;
  };
  const colonneExiste = async (table, colonne) =>
    (await q(
      `SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
      [table, colonne],
    )).length > 0;

  console.log(`\x1b[1m\nAUDIT — facteur de conversion par produit\x1b[0m`);
  console.log(sousTitre(`base : ${client.database} @ ${client.host}:${client.port}`));

  // ═══ 1. La colonne qui ne dit rien ════════════════════════════════════════
  console.log(t('[1/6] `recoltes.unite` porte-t-elle une information ?'));
  const u = await q(
    `SELECT count(*)::int AS lignes,
            count(DISTINCT unite)::int AS valeurs_distinctes,
            coalesce(string_agg(DISTINCT unite, ', '), '—') AS valeurs
       FROM recoltes`,
  );
  console.log(tableau(u, ['lignes', 'valeurs_distinctes', 'valeurs']));
  if (u[0].lignes === 0) {
    console.log(sousTitre('base vide sur ce périmètre — rien à conclure.'));
  } else if (u[0].valeurs_distinctes <= 1) {
    console.log(
      `  \x1b[31m→ CONSTANTE : une seule valeur sur ${u[0].lignes} lignes. La colonne ne\x1b[0m\n` +
      `  \x1b[31m  distingue AUCUNE récolte. L'unité choisie par le producteur n'a jamais\x1b[0m\n` +
      `  \x1b[31m  été enregistrée (RecolteForm.tsx écrivait \`unite: 'kg'\` en dur).\x1b[0m`,
    );
  } else {
    console.log(`  → plusieurs valeurs présentes : à expliquer, ce n'est pas ce que le code produit.`);
  }

  // ═══ 2. Peut-on RETROUVER le facteur par le calcul ? ══════════════════════
  console.log(t('[2/6] Le facteur est-il déductible a posteriori de `quantite` ?'));
  console.log(sousTitre('quantite = quantiteSaisie × facteur. On cherche quels facteurs'));
  console.log(sousTitre('restent compatibles avec la valeur stockée.'));
  const compat = await q(
    `WITH r AS (SELECT quantite::numeric AS qte FROM recoltes WHERE quantite IS NOT NULL)
     SELECT count(*)::int AS lignes,
            count(*) FILTER (WHERE qte = round(qte))::int AS compatibles_kg,
            count(*) FILTER (WHERE qte > 0 AND mod(qte, 1000) = 0)::int AS compatibles_tonne,
            count(*) FILTER (WHERE qte > 0 AND mod(qte, 100)  = 0)::int AS compatibles_sac,
            count(*) FILTER (WHERE qte > 0 AND mod(qte, 50)   = 0)::int AS compatibles_tas,
            count(*) FILTER (WHERE qte > 0 AND mod(qte, 20)   = 0)::int AS compatibles_cagette,
            count(*) FILTER (WHERE qte > 0 AND mod(qte, 10)   = 0)::int AS compatibles_panier,
            count(*) FILTER (WHERE qte > 0 AND mod(qte, 0.5)  = 0)::int AS compatibles_botte
       FROM r`,
  );
  console.log(tableau(compat, Object.keys(compat[0] || {})));
  const n = compat[0]?.lignes ?? 0;
  if (n > 0) {
    // Le facteur « kg » vaut 1 : quantite = quantiteSaisie. L'hypothèse « elle a
    // tapé N kilos à P FCFA/kg » est donc arithmétiquement cohérente avec
    // N'IMPORTE QUELLE ligne. Aucune ligne n'est départageable.
    const indeterminables = await q(
      `SELECT count(*)::int AS n FROM recoltes
        WHERE quantite IS NOT NULL AND quantite::numeric = round(quantite::numeric)`,
    );
    console.log(
      `  \x1b[31m→ INDÉTERMINABLE par construction : le facteur « kg » vaut 1, donc\x1b[0m\n` +
      `  \x1b[31m  l'hypothèse « elle a tapé N kilos » est compatible avec ${indeterminables[0].n}/${n} lignes.\x1b[0m\n` +
      `  \x1b[31m  Aucune inférence ne départage. Ce n'est pas un signal faible : il n'y a\x1b[0m\n` +
      `  \x1b[31m  PAS de signal. La donnée n'existe pas, elle ne se reconstitue pas.\x1b[0m`,
    );
  }

  // ═══ 3. Les lignes SUSPECTES (volume), pas « déterminées » ════════════════
  console.log(t('[3/6] Volume réellement concerné, par produit'));
  console.log(sousTitre('`suspectes` = quantité ronde ET ≥ 500 kg : une saisie peu plausible'));
  console.log(sousTitre('au kilo près à la main. SUSPICION, jamais conclusion.'));
  const parProduit = await q(
    `SELECT produit,
            count(*)::int AS lignes,
            min(quantite)::numeric AS qte_min,
            max(quantite)::numeric AS qte_max,
            round(sum(quantite)::numeric, 1) AS qte_totale_kg,
            count(*) FILTER (WHERE quantite >= 500 AND mod(quantite::numeric, 10) = 0)::int AS suspectes,
            count(*) FILTER (WHERE mod(quantite::numeric, 1) <> 0)::int AS a_decimale
       FROM recoltes
      GROUP BY produit
      ORDER BY count(*) DESC, produit
      LIMIT 40`,
  );
  console.log(tableau(parProduit, ['produit', 'lignes', 'qte_min', 'qte_max', 'qte_totale_kg', 'suspectes', 'a_decimale']));

  // ═══ 4. LÀ où l'unité du producteur EST enregistrée ═══════════════════════
  console.log(t('[4/6] `stocks` — l’unité y est, elle, RÉELLEMENT choisie et conservée'));
  console.log(sousTitre('écran producteur/Stocks.tsx + coopérative : SelectWithAutre sur'));
  console.log(sousTitre('UNITES_COURANTES, saisie libre comprise. C’est la seule source'));
  console.log(sousTitre('de vérité existante sur « quel produit se compte en quoi ».'));
  const parUnite = await q(
    `SELECT coalesce(nullif(trim(unite), ''), '(vide)') AS unite,
            count(*)::int AS lignes,
            count(DISTINCT produit)::int AS produits_distincts,
            left(string_agg(DISTINCT produit, ', ' ORDER BY produit), 70) AS exemples
       FROM stocks
      GROUP BY 1
      ORDER BY count(*) DESC`,
  );
  const avecVerdict = parUnite.map((r) => ({
    ...r,
    facteur_connu: Object.prototype.hasOwnProperty.call(FACTEURS, String(r.unite).toLowerCase())
      ? `oui (×${FACTEURS[String(r.unite).toLowerCase()]})`
      : 'AUCUN',
  }));
  console.log(tableau(avecVerdict, ['unite', 'lignes', 'produits_distincts', 'facteur_connu', 'exemples']));
  const sansFacteur = avecVerdict.filter((r) => r.facteur_connu === 'AUCUN');
  if (sansFacteur.length) {
    console.log(
      `  \x1b[33m→ ${sansFacteur.length} unité(s) en usage n'ont AUCUN facteur défini : ` +
      `${sansFacteur.map((r) => r.unite).join(', ')}\x1b[0m`,
    );
  }

  // ═══ 5. Même mesure côté marchande ════════════════════════════════════════
  console.log(t('[5/6] `produits` — unités du stock marchand'));
  const parUniteProduits = await q(
    `SELECT coalesce(nullif(trim(unite), ''), '(vide)') AS unite,
            count(*)::int AS lignes,
            count(DISTINCT nom)::int AS produits_distincts
       FROM produits
      GROUP BY 1
      ORDER BY count(*) DESC
      LIMIT 30`,
  );
  console.log(tableau(parUniteProduits.map((r) => ({
    ...r,
    facteur_connu: Object.prototype.hasOwnProperty.call(FACTEURS, String(r.unite).toLowerCase())
      ? `oui (×${FACTEURS[String(r.unite).toLowerCase()]})` : 'AUCUN',
    dans_vocabulaire: UNITES_COURANTES.includes(String(r.unite)) ? 'oui' : 'non (saisie libre)',
  })), ['unite', 'lignes', 'produits_distincts', 'facteur_connu', 'dans_vocabulaire']));

  // ═══ 6. L'audit redevient-il possible ? (après le lot risque #1) ══════════
  console.log(t('[6/6] La saisie brute est-elle désormais enregistrée ?'));
  const posees = await colonneExiste('recoltes', 'quantite_saisie');
  if (!posees) {
    console.log(
      `  \x1b[33m→ colonnes \`quantite_saisie\` / \`unite_saisie\` / \`facteur_saisie\` ABSENTES.\x1b[0m\n` +
      `  \x1b[33m  Le lot « risque #1 » n'est pas déployé sur cette base. Tant qu'il ne l'est\x1b[0m\n` +
      `  \x1b[33m  pas, aucune nouvelle récolte n'alimente l'audit : il restera vide.\x1b[0m`,
    );
  } else {
    const brut = await q(
      `SELECT count(*)::int AS lignes,
              count(unite_saisie)::int AS avec_unite_saisie,
              coalesce(string_agg(DISTINCT unite_saisie, ', '), '—') AS unites_reelles
         FROM recoltes`,
    );
    console.log(tableau(brut, ['lignes', 'avec_unite_saisie', 'unites_reelles']));
    const parUniteReelle = await q(
      `SELECT unite_saisie AS unite, facteur_saisie AS facteur,
              count(*)::int AS lignes,
              count(DISTINCT produit)::int AS produits,
              left(string_agg(DISTINCT produit, ', ' ORDER BY produit), 60) AS exemples
         FROM recoltes
        WHERE unite_saisie IS NOT NULL
        GROUP BY 1, 2
        ORDER BY count(*) DESC`,
    );
    if (parUniteReelle.length) {
      console.log(sousTitre('LA RÉPONSE à « quel produit se déclare en quoi » commence ici :'));
      console.log(tableau(parUniteReelle, ['unite', 'facteur', 'lignes', 'produits', 'exemples']));
    } else {
      console.log(sousTitre('colonnes présentes mais encore vides : aucune récolte depuis le déploiement.'));
    }
  }

  console.log(t('CE QUE CET AUDIT NE PEUT PAS DIRE'));
  console.log(
    '    • Si « 1 panier = 10 kg » est juste pour l’igname : c’est de l’agronomie\n' +
    '      et du terrain, pas de la donnée. Le dépôt ne porte qu’une source — les\n' +
    '      `hint` de RecolteForm, écrits une fois, jamais confrontés à une pesée.\n' +
    '    • Quel produit se récoltait en sacs AVANT ce lot : la donnée n’a jamais\n' +
    '      été écrite (section 1 et 2). Elle est perdue, définitivement.\n',
  );

  await client.end();
}

main().catch((e) => {
  console.error(`\x1b[31m  ✗ ${e.message}\x1b[0m`);
  process.exit(1);
});
