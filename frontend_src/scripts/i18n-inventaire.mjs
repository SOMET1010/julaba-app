#!/usr/bin/env node
/**
 * INVENTAIRE EXHAUSTIF DES PHRASES VOCALES — étape 0 du lot i18n.
 * Lancer : npm run i18n:inventaire   (écrit docs/langues/INVENTAIRE-VOIX.md)
 *
 * RÈGLE DE PATRICK (20/09/2026) : TOUTES les chaînes dites, y compris les
 * intermédiaires — attentes (« Je réfléchis... »), accusés (« C'est fait ! »),
 * erreurs réseau, confirmations locales, connexion, accueil, repli, coupures,
 * unités, `response` d'intentLocal, textes des clips existants. Une chaîne
 * dite quelque part et absente d'ici est un défaut du lot.
 *
 * COMMENT. Deux sources, croisées :
 *   1. les SITES D'APPEL (`speak(...)`, `dire(...)`, `ttsSpeak(...)`…), par
 *      l'AST TypeScript — scripts/lib/inventaireVoix.mjs, le même module que
 *      le garde-fou de couverture ;
 *   2. les CORPUS FIXES : tableaux et fonctions de phrases (clips Tata, script
 *      de connexion, attentes/accusés du moteur, dialogues purs), lus par l'AST
 *      dans une liste de fichiers nommés ci-dessous.
 * Le document est régénéré à chaque exécution ; ne pas l'éditer à la main.
 */
import ts from 'typescript';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scannerTout, domaineDe, estCritiqueArgent, listerSources, CORPUS_FIXES, litterauxDe } from './lib/inventaireVoix.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const SRC = join(ICI, '..', 'src', 'app');
const SORTIE = join(ICI, '..', '..', 'docs', 'langues', 'INVENTAIRE-VOIX.md');

// ── 1. Sites d'appel ────────────────────────────────────────────────────────
const appels = scannerTout(SRC);

// ── 2. Corpus fixes : voir CORPUS_FIXES / litterauxDe dans scripts/lib/inventaireVoix.mjs ──

// ── 3. Intentions et variantes STT existantes (lecture des constantes) ─────
function constantesDe(rel, noms) {
  const chemin = join(SRC, rel);
  const source = readFileSync(chemin, 'utf8');
  const sf = ts.createSourceFile(chemin, source, ts.ScriptTarget.Latest, true);
  const out = {};
  const visiter = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && noms.includes(node.name.text) && node.initializer) {
      const init = node.initializer;
      if (ts.isRegularExpressionLiteral(init)) out[node.name.text] = { type: 'regex', valeur: init.text };
      else if (ts.isArrayLiteralExpression(init)) out[node.name.text] = { type: 'liste', valeur: init.elements.map((e) => ts.isStringLiteral(e) ? e.text : e.getText(sf)) };
      else if (ts.isNewExpression(init) && init.arguments?.[0] && ts.isArrayLiteralExpression(init.arguments[0])) out[node.name.text] = { type: 'liste', valeur: init.arguments[0].elements.map((e) => ts.isStringLiteral(e) ? e.text : e.getText(sf)) };
      else if (ts.isObjectLiteralExpression(init)) {
        const paires = [];
        for (const p of init.properties) {
          if (!ts.isPropertyAssignment(p)) continue;
          const k = ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) ? p.name.text : p.name.getText(sf);
          const v = ts.isStringLiteral(p.initializer) ? p.initializer.text : ts.isNumericLiteral(p.initializer) ? Number(p.initializer.text) : ts.isArrayLiteralExpression(p.initializer) ? p.initializer.elements.map((e) => ts.isStringLiteral(e) ? e.text : e.getText(sf)) : p.initializer.getText(sf);
          paires.push([k, v]);
        }
        out[node.name.text] = { type: 'table', valeur: paires };
      } else if (ts.isAsExpression(init) && ts.isArrayLiteralExpression(init.expression)) {
        out[node.name.text] = { type: 'liste', valeur: init.expression.elements.map((e) => ts.isStringLiteral(e) ? e.text : e.getText(sf)) };
      }
    }
    ts.forEachChild(node, visiter);
  };
  visiter(sf);
  return out;
}

const grammaire = constantesDe('voice-offline/grammaireEncaissement.ts', ['REPONSES_VALIDATION', 'ANNULATION', 'ENCAISSER', 'COMBIEN_DOIT', 'INTENTIONS_ENCAISSEMENT']);
const vocabulaire = constantesDe('voice-offline/vocabulaire.ts', ['INTENTIONS_MAP', 'PRODUITS_FORMES', 'PRODUITS']);
const extraction = constantesDe('voice-offline/extraction.ts', ['UNITES', 'DIZAINES', 'MARQUEURS_AVANT', 'MARQUEURS_APRES', 'MOTS_UNITE']);
const correction = constantesDe('services/grammaireCorrection.ts', ['MOTS_ANNULE', 'MOTS_SUPPRIME', 'MOTS_ENCAISSE', 'MOTS_SUIVANT', 'MOTS_REFUS', 'MOTS_CONFIRME', 'MOTS_TOTAL']);
const questions = constantesDe('services/intentionsCaisse.ts', ['INTERROGATIF']);
const unites = constantesDe('utils/unite.utils.ts', ['GRAPHIES_CANONIQUES', 'UNITES_NEUTRES', 'ABREVIATIONS']);
const unitesConfig = constantesDe('config/unites.ts', ['UNITES_COURANTES']);
const prixVocal = constantesDe('services/prixVocal.ts', ['MEMES_UNITES']);
const devise = constantesDe('config/devise.ts', ['DEVISE_CODE', 'DEVISE_SYMBOLE', 'DEVISE_PARLEE']);
const chiffres = constantesDe('utils/frenchDigits.ts', ['SMALL', 'TENS']);
const bambara = constantesDe('voice-offline/nombresMandingue.ts', ['UNITES', 'TAN', 'MUGAN', 'KEME', 'MILLE', 'BI', 'DOROME', 'CONNECTEUR']);
const choixUnite = constantesDe('components/marchand/ChoixUnite.tsx', ['PHRASES']);

// ── 4. aria-label : lus par un lecteur d'écran seulement ─────────────────────
let nbAria = 0;
for (const f of listerSources(SRC)) {
  const s = readFileSync(f, 'utf8');
  nbAria += (s.match(/aria-label=/g) || []).length;
}

// ── 5. Agrégats ──────────────────────────────────────────────────────────────
const parFichier = new Map();
const parDomaine = new Map();
const natures = { literal: 0, template: 0, template_compose: 0, dynamique: 0, relais: 0, cle_i18n: 0 };
const phrasesDistinctes = new Set();
let critiques = 0;
let dynamiques = 0;
let branches = 0;
for (const a of appels) {
  const dom = domaineDe(a.fichier);
  const f = parFichier.get(a.fichier) || { fichier: a.fichier, domaine: dom, appels: 0, literal: 0, template: 0, dynamique: 0, relais: 0, cle: 0, critiques: 0 };
  f.appels++;
  const d = parDomaine.get(dom) || { domaine: dom, appels: 0, phrases: 0, critiques: 0 };
  d.appels++;
  for (const g of a.gabarits) {
    branches++;
    natures[g.kind] = (natures[g.kind] || 0) + 1;
    if (g.kind === 'literal' || g.kind === 'template' || g.kind === 'template_compose') {
      phrasesDistinctes.add(g.texte);
      d.phrases++;
      if (g.kind !== 'literal') dynamiques++;
      if (estCritiqueArgent(a.fichier, g.texte)) { critiques++; f.critiques++; d.critiques++; }
    }
    if (g.kind === 'literal') f.literal++;
    else if (g.kind === 'template' || g.kind === 'template_compose') f.template++;
    else if (g.kind === 'dynamique') f.dynamique++;
    else if (g.kind === 'relais') f.relais++;
    else if (g.kind === 'cle_i18n') f.cle++;
  }
  parFichier.set(a.fichier, f);
  parDomaine.set(dom, d);
}

const corpus = CORPUS_FIXES.map(([rel, quoi]) => ({ rel, quoi, litteraux: litterauxDe(SRC, rel) }));
const nbCorpus = corpus.reduce((s, c) => s + c.litteraux.length, 0);

// ── 6. Rendu Markdown ────────────────────────────────────────────────────────
const md = [];
const L = (s = '') => md.push(s);
const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, '⏎');
const code = (s) => '`' + String(s).replace(/`/g, 'ˋ') + '`';

L('# Inventaire exhaustif des phrases vocales — JULABA');
L();
L('> **Généré** par `npm run i18n:inventaire` (`frontend_src/scripts/i18n-inventaire.mjs`), lecture du source par l\'AST TypeScript. **Ne pas éditer à la main** : le garde-fou `validateInventaire` compare ce document au source et rougit s\'il est périmé.');
L('>');
L('> Étape 0 du lot i18n — **aucune traduction ici**. On extrait ce que le code dit AUJOURD\'HUI, tel quel (`frActuel`), pour que le catalogue (`src/app/i18n/voice/catalog.ts`) ne repose sur aucune phrase inventée.');
L();
L('## 1. Chiffres clés');
L();
L('| Mesure | Valeur |');
L('|---|---|');
L(`| Sites d'appel vocaux (\`speak\`, \`dire\`, \`direEtRetenir\`, \`ttsSpeak\`, \`speakAuto\`, \`speakClipOrText\`, \`direIntro\`, \`speakMessage\`) | **${appels.length}** |`);
L(`| Branches de phrase à ces sites (un ternaire = deux branches) | ${branches} |`);
L(`| — littéraux (phrase fixe en dur) | ${natures.literal} |`);
L(`| — gabarits (\`\${…}\`, phrase dynamique à variables) | ${natures.template + natures.template_compose} |`);
L(`| — dynamiques (phrase construite ailleurs : \`effet.texte\`, \`phraseLigneAjoutee(…)\`, \`res.message\`…) | ${natures.dynamique} |`);
L(`| — relais (\`dire = (t) => speak(t)\`) | ${natures.relais} |`);
L(`| — clés i18n (\`speakMessage('…')\`, \`t('…')\`) | ${natures.cle_i18n} |`);
L(`| Phrases distinctes aux sites d'appel (littéraux + gabarits) | **${phrasesDistinctes.size}** |`);
L(`| Dont dynamiques (avec variables) | ${dynamiques} |`);
L(`| Dont critiques argent (fichier d'argent ou vocabulaire d'argent) | **${critiques}** |`);
L(`| Phrases des corpus fixes (clips, scripts, dialogues purs, moteur) | **${nbCorpus}** |`);
L(`| Fichiers avec au moins un site d'appel | ${parFichier.size} |`);
L(`| Attributs \`aria-label\` (lecteur d'écran uniquement) | ${nbAria} — **hors parcours vocal**, voir §8 |`);
L();
L('## 2. Par fichier (sites d\'appel)');
L();
L('| Fichier | Domaine | Appels | Littéraux | Gabarits | Dynamiques | Relais | Clés | Critiques argent |');
L('|---|---|---:|---:|---:|---:|---:|---:|---:|');
for (const f of [...parFichier.values()].sort((a, b) => b.appels - a.appels || a.fichier.localeCompare(b.fichier))) {
  L(`| ${code(f.fichier)} | ${f.domaine} | ${f.appels} | ${f.literal} | ${f.template} | ${f.dynamique} | ${f.relais} | ${f.cle} | ${f.critiques} |`);
}
L();
L('## 3. Par domaine');
L();
L('| Domaine | Appels | Phrases (littéraux + gabarits) | Critiques argent |');
L('|---|---:|---:|---:|');
for (const d of [...parDomaine.values()].sort((a, b) => b.appels - a.appels)) L(`| ${d.domaine} | ${d.appels} | ${d.phrases} | ${d.critiques} |`);
L();
L('Grille des domaines : `caisse` (encaissement, monnaie, relecture), `vente` (dictée, vente guidée, repli), `questions_caisse`, `credit`, `stock`, `depense`, `moteur_vocal` (attentes, accusés, erreurs du moteur), `auth` (connexion, accueil, onboarding), `marchand_autre`, `producteur`, `cooperative`, `wallet`, `partage`, `backoffice`, `contexte`, `pages`, `guidage`.');
L();
L('## 4. Liste exhaustive des sites d\'appel');
L();
L('Nature : `literal` = phrase fixe ; `template` = gabarit avec variables `{…}` ; `dynamique` = phrase produite par une fonction (listée dans les corpus §5 quand elle est pure) ; `relais` = passe-plat ; `cle_i18n` = déjà migré vers une clé.');
L();
for (const [fichier, f] of [...parFichier.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  L(`### ${code(fichier)} — ${f.domaine}`);
  L();
  L('| Ligne | Fonction | Nature | Phrase / expression | Variables | Argent |');
  L('|---:|---|---|---|---|:-:|');
  for (const a of appels.filter((x) => x.fichier === fichier)) {
    for (const g of a.gabarits) {
      const crit = (g.kind === 'literal' || g.kind.startsWith('template')) && estCritiqueArgent(fichier, g.texte) ? '€' : '';
      L(`| ${a.ligne} | ${code(a.fonction)} | ${g.kind} | ${esc(g.texte)} | ${g.variables.map(code).join(' ') || ''} | ${crit} |`);
    }
  }
  L();
}
L('## 5. Corpus fixes (phrases qui ne sont pas à un site d\'appel)');
L();
L('Tableaux, records et fonctions de phrases. Ce sont les textes EXACTS du source ; les gabarits gardent leurs variables `{…}`.');
L();
for (const c of corpus) {
  L(`### ${code(c.rel)} — ${c.quoi} (${c.litteraux.length})`);
  L();
  L('| Ligne | Nature | Phrase | Variables |');
  L('|---:|---|---|---|');
  for (const l of c.litteraux) L(`| ${l.ligne} | ${l.kind} | ${esc(l.texte)} | ${l.variables.map(code).join(' ')} |`);
  L();
}
L('## 6. Intentions reconnues et variantes STT existantes');
L();
L('Ce que la marchande peut DIRE aujourd\'hui, tel que le code l\'accepte. Corpus STT — à ne jamais mélanger avec les phrases de Tata (§4-5).');
L();
L('### 6.1 Encaissement — `voice-offline/grammaireEncaissement.ts` (critique argent)');
L();
L(`- Intentions : ${(grammaire.INTENTIONS_ENCAISSEMENT?.valeur || []).map(code).join(', ')}`);
L(`- \`oui_valide\` — LISTE BLANCHE FERMÉE, phrase entière normalisée : ${(grammaire.REPONSES_VALIDATION?.valeur || []).map(code).join(', ')}`);
L(`- \`annuler_validation\` — regex : ${code(grammaire.ANNULATION?.valeur)}`);
L(`- \`encaisser\` — regex : ${code(grammaire.ENCAISSER?.valeur)}`);
L(`- \`combien_doit\` — regex : ${code(grammaire.COMBIEN_DOIT?.valeur)}`);
L();
L('### 6.2 Vente / dépense / questions — `voice-offline/vocabulaire.ts` (`INTENTIONS_MAP`)');
L();
{
  const parIntention = new Map();
  for (const [mot, intention] of vocabulaire.INTENTIONS_MAP?.valeur || []) {
    const l = parIntention.get(intention) || [];
    l.push(mot);
    parIntention.set(intention, l);
  }
  L('| Intention | Mots déclencheurs |');
  L('|---|---|');
  for (const [i, mots] of parIntention) L(`| ${code(i)} | ${mots.map(code).join(', ')} |`);
}
L();
L('### 6.3 Réponses en confirmation de ligne — `services/grammaireCorrection.ts`');
L();
for (const [nom, v] of Object.entries(correction)) L(`- ${code(nom)} : ${(v.valeur || []).map(code).join(', ')}`);
L();
L('### 6.4 Questions « chiffres du jour » — `services/intentionsCaisse.ts`');
L();
L(`- Signal interrogatif : ${code(questions.INTERROGATIF?.valeur)} ; questions : \`ventes_jour\`, \`depenses_jour\`, \`solde_caisse\`, \`benefice_jour\`, \`meilleure_vente\` (motifs dans le source).`);
L();
L('### 6.5 Oui / non du moteur (`hooks/useVoiceCore.ts`, `interpretYesNo`)');
L();
L('- NON (testé d\'abord) : ` non `, ` pas `, ` faux `, ` annule`, ` efface`, ` recommence` ; OUI : ` oui `, ` ouais `, ` voila `, ` voilà `, ` exact `, ` accord `, ` ok `, ` okay `, ` c\'est bon `, ` c\'est ca `, ` c\'est ça `, ` bon `, ` ca `, ` ça ` — inclusion de sous-chaîne, bordée d\'espaces. Sert à confirmer une DÉPENSE dictée (écriture d\'argent) : critique.');
L();
L('### 6.6 Marqueurs syntaxiques du parseur — `voice-offline/extraction.ts`');
L();
L(`- Montant AVANT : ${(extraction.MARQUEURS_AVANT?.valeur || []).map(code).join(', ')} ; montant APRÈS : ${(extraction.MARQUEURS_APRES?.valeur || []).map(code).join(', ')}`);
L(`- Mots d'unité tolérés entre le nombre et le produit : ${(extraction.MOTS_UNITE?.valeur || []).map(code).join(', ')}`);
L();
L('## 7. Lexique du parseur (produits, unités, nombres, monnaie)');
L();
L('### 7.1 Produits — `voice-offline/vocabulaire.ts` (`PRODUITS_FORMES` : forme entendue → identifiant)');
L();
{
  const parProduit = new Map();
  for (const [forme, id] of vocabulaire.PRODUITS_FORMES?.valeur || []) {
    const l = parProduit.get(id) || [];
    l.push(forme);
    parProduit.set(id, l);
  }
  L('| Identifiant (libellé fr actuel) | Formes entendues |');
  L('|---|---|');
  for (const [id, formes] of parProduit) L(`| ${code(id)} | ${formes.map(code).join(', ')} |`);
  L();
  L(`${parProduit.size} produits, ${(vocabulaire.PRODUITS_FORMES?.valeur || []).length} formes. NB : l'identifiant est aujourd'hui le libellé français lui-même — le lexique i18n (\`locales/*/lexicon.ts\`) le découple (\`productId\` stable, formes par langue).`);
}
L();
L('### 7.2 Unités');
L();
L(`- Graphies canoniques (\`utils/unite.utils.ts\`, \`GRAPHIES_CANONIQUES\`) : ${(unites.GRAPHIES_CANONIQUES?.valeur || []).map(([k, v]) => `${code(k)} ← ${Array.isArray(v) ? v.map(code).join(' ') : code(v)}`).join(' ; ')}`);
L(`- Unités neutres (jamais dites) : ${(unites.UNITES_NEUTRES?.valeur || []).map(code).join(', ')} ; abréviations invariables : ${(unites.ABREVIATIONS?.valeur || []).map(code).join(', ')}`);
L(`- Sélecteur tactile (\`config/unites.ts\`) : ${(unitesConfig.UNITES_COURANTES?.valeur || []).map(code).join(', ')}`);
L(`- Mêmes mesures pour le prix (\`services/prixVocal.ts\`, \`MEMES_UNITES\`) : ${(prixVocal.MEMES_UNITES?.valeur || []).map((g) => code(String(g))).join(' ; ')}`);
L(`- Unité DITE (\`components/marchand/ChoixUnite.tsx\`) : ${(choixUnite.PHRASES?.valeur || []).map(([k, v]) => `${code(k)} → « ${v} »`).join(' ; ')}`);
L();
L('### 7.3 Nombres');
L();
L(`- Français, parseur de vente (\`voice-offline/extraction.ts\`) : ${(extraction.UNITES?.valeur || []).length} unités/exceptions + ${(extraction.DIZAINES?.valeur || []).length} dizaines, plus \`cent(s)\`, \`mille\`, \`et\` ; ellipse du marché « mille cinq » = 1 500.`);
L(`- Français, dictée d'un numéro (\`utils/frenchDigits.ts\`) : ${(chiffres.SMALL?.valeur || []).length} petits nombres, ${(chiffres.TENS?.valeur || []).length} dizaines.`);
L(`- Bambara (\`voice-offline/nombresMandingue.ts\`, existant, base annoncée pour le dioula) : unités ${(bambara.UNITES?.valeur || []).map(([k]) => k).join(', ')} ; échelles ${[...(bambara.TAN?.valeur || []), ...(bambara.MUGAN?.valeur || []), ...(bambara.KEME?.valeur || []), ...(bambara.MILLE?.valeur || []), ...(bambara.BI?.valeur || [])].join(', ')} ; monnaie orale ${(bambara.DOROME?.valeur || []).join(', ')} (= 5 F).`);
L();
L('### 7.4 Monnaie — `config/devise.ts`');
L();
L(`- Code ${code(devise.DEVISE_CODE?.valeur)}, symbole affiché ${code(devise.DEVISE_SYMBOLE?.valeur)}, forme DITE ${code(devise.DEVISE_PARLEE?.valeur)} ; coupures dites dans \`utils/fcfa.ts\` (\`direCoupure\`, §5).`);
L();
L('## 8. Ce qui n\'est PAS dans le parcours vocal (et pourquoi)');
L();
L(`- **\`aria-label\` (${nbAria})** : lus par un lecteur d'écran (TalkBack), pas par Tata. La marchande non-lectrice n'utilise pas de lecteur d'écran — l'application parle elle-même. Jugés hors parcours vocal ; ils restent du texte d'interface (rail Manus / design), pas des phrases de Tata.`);
L('- **Toasts** (`toast.success(…)`) et libellés d\'écran : affichés, jamais dits. Hors inventaire vocal.');
L('- **`texteDyu`** de `loginVoiceScript.ts` : traduction dioula de travail, NON validée (le fichier le dit). Elle n\'est ni activée ni reprise : Manus tranche.');
L();
L('## 9. Phrases critiques argent (rappel)');
L();
L('Marquées `€` en §4. Règle : une phrase est critique si elle vit dans un fichier d\'argent (`machineEncaissement`, `grammaireEncaissement`, `relectureSpontanee`, `POSCaisse`, `CaisseContext`, `vendreVocalUnifie`, `fcfa`) ou si elle porte le vocabulaire d\'argent (francs, valide, monnaie, rends, manque, compte juste, encaisse, doit, reçu, total, crédit, solde, montant, prix, payé).');

mkdirSync(dirname(SORTIE), { recursive: true });
writeFileSync(SORTIE, md.join('\n') + '\n', 'utf8');
console.log(`Inventaire écrit : ${SORTIE}`);
console.log(`  sites d'appel : ${appels.length} · phrases distinctes : ${phrasesDistinctes.size} · critiques : ${critiques} · dynamiques : ${dynamiques} · corpus fixes : ${nbCorpus}`);
