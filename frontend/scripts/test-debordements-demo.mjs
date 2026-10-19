#!/usr/bin/env node
/**
 * DEUX DÉBORDEMENTS QUI CACHAIENT UNE INFORMATION — démo 12/10/2026.
 *
 * 1. « Mes récoltes » (producteur) : le total « 2550 kg » s'affichait
 *    « 2550 k ». L'unité était collée au nombre dans `value`, que la tuile
 *    coupe d'une ellipse (`whiteSpace: nowrap`). L'unité passe par `suffix`,
 *    qui a sa propre place et passe à la ligne au besoin — et la voix dit
 *    « francs » pour FCFA.
 *
 * 2. Accueil coopérative, résumé d'activité : un cercle gris recouvrait le
 *    mot « Cotisations ». La pastille d'aide fait 16px mais sa zone tactile
 *    est portée à 44px par `padding: 14` en `content-box` — et le fond gris
 *    peignait toute la zone. `backgroundClip: 'content-box'` garde le gris sur
 *    les 16px, la zone tactile reste à 44px.
 *
 * Lancer : npm run test:debordements-demo
 */
import { readFileSync } from 'node:fs';

let echecs = 0;
const ok = (c, quoi) => { console.log(`  ${c ? '✓' : '✗'} ${quoi}`); if (!c) echecs++; };
const lire = (rel) => readFileSync(new URL(`../src/app/${rel}`, import.meta.url), 'utf8');

console.log('\nDébordements : l\'unité et le libellé restent lisibles\n');

const recoltes = lire('components/producteur/MesRecoltesPage.tsx');
ok(!/value=\{`[^`]*\}\s*(kg|FCFA)`\}/.test(recoltes), 'MesRecoltesPage : aucune unité collée dans `value`');
ok(/label="Total"\s*value=\{totalKg\.toLocaleString\('fr-FR'\)\}\s*suffix="kg"/.test(recoltes), 'Total : nombre en value, « kg » en suffix');
ok(/label="Valeur stock"\s*value=\{formatMontant\([^}]*\)\}\s*suffix="FCFA"/.test(recoltes), 'Valeur stock : « FCFA » en suffix');

const resume = lire('components/shared/ScoreResumeCard.tsx');
const pastille = /style=\{\{ boxSizing: 'content-box', padding: 14, margin: -14([^}]*)\}\}/.exec(resume);
ok(!!pastille, 'la pastille d\'aide garde sa zone tactile de 44px (padding 14, margin -14)');
ok(!!pastille && /backgroundClip: 'content-box'/.test(pastille[1]), 'son fond gris est limité aux 16px visibles (backgroundClip content-box)');

console.log(echecs === 0 ? '\n✓ rien ne déborde sur l\'information\n' : `\n✗ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
