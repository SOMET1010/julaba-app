/**
 * SCANNER DES PHRASES VOCALES — module partagé (ESM, sans dépendance hors
 * `typescript`, déjà présent pour `tsc`).
 *
 * POURQUOI UN SCANNER ET PAS UNE LISTE TAPÉE À LA MAIN. L'inventaire de
 * l'étape 0 (docs/langues/INVENTAIRE-VOIX.md) et le garde-fou de couverture
 * (i18n/voice/validators) doivent voir EXACTEMENT les mêmes chaînes : une
 * phrase dite quelque part et absente de l'inventaire est un défaut du lot
 * i18n. En lisant le SOURCE par l'AST (pas par des expressions régulières sur
 * du texte), on attrape `speak(...)`, `dire(...)`, `deps.speak(...)`,
 * `ttsSpeak(...)`, `audioManager.speakAuto(...)`, `dire?.(...)`, `void speak(...)`
 * sous toutes leurs formes, commentaires exclus par construction.
 *
 * Utilisé par :
 *   - scripts/i18n-inventaire.mjs        → génère l'inventaire Markdown ;
 *   - i18n/voice/validators/*.mts         → gates « inventaire à jour » et
 *                                            « aucune phrase en dur dans le
 *                                            périmètre migré ».
 */
import ts from 'typescript';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** Fonctions qui FONT parler (nom du dernier segment de l'appelé). */
export const FONCTIONS_VOCALES = new Set([
  'speak', 'dire', 'direEtRetenir', 'ttsSpeak', 'speakAuto', 'speakClipOrText',
  'direIntro', 'parle', 'parler', 'speakText', 'speakMessage', 'direMessage',
]);

/** Fonctions i18n : un appel dont le 1er argument est une CLÉ, pas une phrase. */
export const FONCTIONS_I18N = new Set(['speakMessage', 'direMessage', 't', 'resoudreMessage', 'renduDuMessage']);

/** Dossiers hors périmètre (tests, outils de dev). */
const EXCLUS = ['.test.', '.spec.', `${sep}components${sep}dev${sep}`, `${sep}__tests__${sep}`];

export function listerSources(racine) {
  const out = [];
  for (const nom of readdirSync(racine)) {
    const chemin = join(racine, nom);
    const st = statSync(chemin);
    if (st.isDirectory()) out.push(...listerSources(chemin));
    else if (/\.(ts|tsx|mts)$/.test(nom) && !EXCLUS.some((e) => chemin.includes(e))) out.push(chemin);
  }
  return out.sort();
}

/** Domaine métier d'un fichier, déduit de son chemin (grille documentée dans l'inventaire). */
export function domaineDe(rel) {
  const r = '/' + rel.replace(/\\/g, '/');
  const base = r.split('/').pop() || '';
  if (/machineEncaissement|grammaireEncaissement|relectureSpontanee|POSCaisse|CaisseContext|fcfa|ChoixUnite|ResumeCaisse/.test(base)) return 'caisse';
  if (/MicroVenteCaisse|vendreVocalUnifie|dialoguesTata|SaisieGuidee|ConfirmationLigne|ligneProvisoire|venteVocale|prixVocal|preselectionVente|localIntent|extraction|vocabulaire|grammaireCorrection/.test(base)) return 'vente';
  if (/intentionsCaisse|statsVente/.test(base)) return 'questions_caisse';
  if (/Credit|credit/.test(base)) return 'credit';
  if (/Stock|stock|Rupture|rupture/.test(base)) return 'stock';
  if (/Depense|depense/.test(base)) return 'depense';
  if (/useVoiceCore|audioManager|offlineVoice|nativeStt|nativeTts|offlineStt|voicePacks|tataVoice|tataUiClips|elevenlabs|localVoiceChoice|InstallerOffline/.test(base)) return 'moteur_vocal';
  if (/loginVoiceScript|onboardingVoix|Login|Welcome|Onboarding|Activation|ChangePassword|PropositionReconnaissance|PinConfirmModal|useWebAuthn|auth/.test(r)) return 'auth';
  if (/Objectif|Fidelite|Tontine|ProtectionSociale|MarchandAlertes|MarchandAccueil|MarchandHome|MarchandProfil|Parametres|BesoinMarchand|MaCooperative|MesCommandes|VentesPassees|MarchandModals|MarchandDepenses|MarcheVirtuel|RecoltesPrevues|SyncEchecs/.test(base)) return 'marchand_autre';
  if (r.includes('/components/producteur/')) return 'producteur';
  if (r.includes('/components/cooperative/')) return 'cooperative';
  if (r.includes('/components/wallet/')) return 'wallet';
  if (r.includes('/components/backoffice/')) return 'backoffice';
  if (r.includes('/components/academy/')) return 'academy';
  if (r.includes('/components/marketplace/')) return 'marketplace';
  if (r.includes('/components/shared/') || r.includes('/components/layout/') || r.includes('/components/ui/')) return 'partage';
  if (r.includes('/contexts/')) return 'contexte';
  if (r.includes('/pages/')) return 'pages';
  if (/accessMode|guidage/.test(base)) return 'guidage';
  return 'autre';
}

/** Fichiers d'ARGENT : tout ce qu'ils disent est critique par construction. */
const FICHIERS_ARGENT = /machineEncaissement|grammaireEncaissement|relectureSpontanee|POSCaisse|CaisseContext|vendreVocalUnifie|fcfa\.ts/;
/** Mots qui trahissent une phrase d'argent, où qu'elle soit. */
const MOTS_ARGENT = /\bfrancs?\b|\bfcfa\b|\bvalide|\bmonnaie\b|\brends?\b|\bmanque\b|\bcompte juste\b|\bencaiss|\bdoit\b|\bre[çc]u\b|\btotal\b|\bcr[ée]dit\b|\bsolde\b|\bmontant\b|\bprix\b|\bpay[ée]/i;

export function estCritiqueArgent(rel, texte) {
  if (FICHIERS_ARGENT.test(rel)) return true;
  return MOTS_ARGENT.test(texte || '');
}

/** Nom court d'une variable de gabarit à partir de l'expression `${…}`. */
export function nomVariable(expr) {
  let e = expr.trim();
  // fr(x), formatF(x), Math.round(x), String(x), Number(x) → x
  for (;;) {
    const m = e.match(/^(?:fr|fmt|formatF|francs|Math\.round|String|Number|Math\.max|Math\.abs)\((.*)\)$/s);
    if (!m) break;
    e = m[1].trim();
  }
  e = e.replace(/\.toLocaleString\([^)]*\)/g, '').replace(/\s*\?\?.*$/s, '').replace(/\s*\|\|.*$/s, '');
  const ids = e.match(/[A-Za-zÀ-ÿ_$][\w$]*/g) || [];
  const derniers = ids.filter((i) => !['this', 'args', 'l', 'fin', 'etat', 'c', 'p', 'r', 'res', 'ligne', 'prix', 'produitPreselectionne', 'propositionProduit', 'refChoisie', 'state', 'item', 'null', 'undefined', 'trim', 'toFixed', 'length'].includes(i));
  const nom = (derniers.length ? derniers[derniers.length - 1] : ids[ids.length - 1]) || 'valeur';
  // Une CONSTANTE (AJOUT_PANIER, DEVISE_PARLEE) garde son nom ; un identifiant ordinaire perd son préfixe `set`.
  if (/^[A-Z0-9_]+$/.test(nom)) return nom;
  return nom.replace(/^set/, '').replace(/^[A-Z]/, (c) => c.toLowerCase());
}

function texteDeNoeud(sf, n) {
  return n.getText(sf);
}

/**
 * Rend une expression « phrase » sous forme de gabarit(s) `{variable}`.
 * Renvoie une liste : un ternaire ou un `||` donnent plusieurs branches.
 */
export function gabaritsDe(sf, node) {
  if (ts.isParenthesizedExpression(node)) return gabaritsDe(sf, node.expression);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return [{ kind: 'literal', texte: node.text, variables: [] }];
  }
  if (ts.isTemplateExpression(node)) {
    let texte = node.head.text;
    const variables = [];
    let composee = false;
    for (const span of node.templateSpans) {
      const expr = span.expression;
      // Un sous-gabarit imbriqué (ternaire dans le template) : on garde une
      // seule forme avec la variable nommée par son expression.
      const nom = nomVariable(texteDeNoeud(sf, expr));
      if (ts.isConditionalExpression(expr) || ts.isTemplateExpression(expr)) composee = true;
      texte += `{${nom}}` + span.literal.text;
      variables.push(nom);
    }
    return [{ kind: composee ? 'template_compose' : 'template', texte, variables }];
  }
  if (ts.isConditionalExpression(node)) {
    return [...gabaritsDe(sf, node.whenTrue), ...gabaritsDe(sf, node.whenFalse)];
  }
  if (ts.isBinaryExpression(node)) {
    const op = node.operatorToken.kind;
    if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken) {
      return [...gabaritsDe(sf, node.left), ...gabaritsDe(sf, node.right)];
    }
    if (op === ts.SyntaxKind.PlusToken) {
      const g = gabaritsDe(sf, node.left);
      const d = gabaritsDe(sf, node.right);
      if (g.length === 1 && d.length === 1 && g[0].kind !== 'dynamique' && d[0].kind !== 'dynamique') {
        return [{ kind: 'template', texte: g[0].texte + d[0].texte, variables: [...g[0].variables, ...d[0].variables] }];
      }
    }
  }
  if (ts.isCallExpression(node)) {
    const callee = node.expression;
    const nom = ts.isPropertyAccessExpression(callee) ? callee.name.text : ts.isIdentifier(callee) ? callee.text : '';
    // t('CLE', …) / speakMessage('CLE', …) : la clé est l'identité, pas la phrase.
    if (FONCTIONS_I18N.has(nom) && node.arguments[0] && (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))) {
      return [{ kind: 'cle_i18n', texte: node.arguments[0].text, variables: [] }];
    }
  }
  return [{ kind: 'dynamique', texte: texteDeNoeud(sf, node).replace(/\s+/g, ' '), variables: [] }];
}

/** L'appel est-il un simple RELAIS (`dire = (t) => speak(t)`) ? */
function estRelais(node, arg) {
  if (!ts.isIdentifier(arg)) return false;
  let p = node.parent;
  while (p) {
    if (ts.isArrowFunction(p) || ts.isFunctionDeclaration(p) || ts.isFunctionExpression(p) || ts.isMethodDeclaration(p)) {
      return p.parameters.some((prm) => ts.isIdentifier(prm.name) && prm.name.text === arg.text);
    }
    p = p.parent;
  }
  return false;
}

/**
 * Scanne un fichier : renvoie la liste des appels vocaux trouvés, chacun avec
 * ses gabarits (branches). `rel` = chemin relatif à `src`.
 */
export function scannerFichier(chemin, rel) {
  const source = readFileSync(chemin, 'utf8');
  const sf = ts.createSourceFile(chemin, source, ts.ScriptTarget.Latest, true, chemin.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const appels = [];
  const visiter = (node) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      let nom = '';
      if (ts.isIdentifier(callee)) nom = callee.text;
      else if (ts.isPropertyAccessExpression(callee)) nom = callee.name.text;
      else if (ts.isNonNullExpression(callee) && ts.isIdentifier(callee.expression)) nom = callee.expression.text;
      if (FONCTIONS_VOCALES.has(nom) && node.arguments.length > 0) {
        const arg0 = node.arguments[0];
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        // speakClipOrText({ clipUrl, text }) : la phrase est dans `text`/`texte`.
        let cible = arg0;
        if (ts.isObjectLiteralExpression(arg0)) {
          const prop = arg0.properties.find((p) => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && /^(text|texte|fallback)$/.test(p.name.text));
          if (prop && ts.isPropertyAssignment(prop)) cible = prop.initializer;
        }
        const relais = estRelais(node, cible);
        const gabarits = relais ? [{ kind: 'relais', texte: texteDeNoeud(sf, cible), variables: [] }] : gabaritsDe(sf, cible);
        appels.push({ fichier: rel, ligne: line + 1, fonction: nom, gabarits });
      }
    }
    ts.forEachChild(node, visiter);
  };
  visiter(sf);
  return appels;
}

/** Scanne tout `src/app` (ou la racine donnée). */
export function scannerTout(racineSrc) {
  const fichiers = listerSources(racineSrc);
  const appels = [];
  for (const f of fichiers) appels.push(...scannerFichier(f, relative(racineSrc, f).replace(/\\/g, '/')));
  return appels;
}

/** Normalisation pour comparer une phrase du source à une entrée du catalogue. */
export function normaliserPhrase(s) {
  return (s || '')
    .replace(/\{[^}]*\}/g, '{}')
    .replace(/\s+/g, ' ')
    .replace(/[’‘]/g, "'")
    .trim();
}
