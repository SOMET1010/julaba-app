/**
 * A11Y-002 — le harnais axe-core : le DOM RÉELLEMENT RENDU est audité, pas
 * une maquette.
 * Lancer : npm run test:a11y-axe   (tsx, jsdom)
 *
 * CE QU'ON FERME. Depuis l'audit voice-first du 29/10 (P2-2), aucun test
 * a11y automatisé n'existait : une régression d'accessibilité (un bouton qui
 * perd son nom accessible, un contraste cassé, un landmark manquant) ne
 * se voyait qu'en recette terrain — c'est-à-dire trop tard, sur le téléphone
 * d'une marchande qui ne peut pas lire l'écran pour compenser.
 *
 * CE QUE CE BANC FAIT. Il monte des composants RÉELS (pas des fixtures) dans
 * jsdom sous la PILE COMPLÈTE des providers de App.tsx (l'ordre exact du
 * rendu de production), puis injecte axe-core dans ce DOM et lui demande ses
 * violations. Une violation = un défaut d'usage, pas une question de style.
 *
 * POURQUOI JSDOM ET PAS UN NAVIGATEUR. Pas d'Android dans cet environnement
 * (le rang 4 du plan de correction attend un appareil réel pour la preuve
 * Maestro). jsdom couvre les règles STRUCTURELLES d'axe : noms accessibles,
 * rôles ARIA, landmarks, ordre des titres, aria-* invalides… Treize règles
 * passent sur la BottomBar au moment où ce banc naît. Ce qu'il NE couvre PAS :
 * color-contrast (besoin du canvas réel — axe le rend « incomplete », pas
 * « violation » ; le contraste se juge au terrain, rang 4) et le comportement
 * du lecteur d'écran (VoiceOver/TalkBack : recette, rang 7).
 *
 * POURQUOI LA PILE COMPLÈTE. Le hors-ligne est la doctrine : sans backend,
 * les providers catchent eux-mêmes l'absence de réseau (« checkSession
 * réseau KO (hors-ligne?) ») — c'est leur comportement prouvé, pas un mock.
 * Aucun appel HTTP n'est stubbé : s'ils poussaient un rejet non géré, le
 * banc planterait — et ce serait un vrai défaut à corriger.
 *
 * LES ASSETS BINAIRES. tsx ne sait pas charger .png/.webp — un hook de
 * module (module.registerHooks) interpose un stub pour ces seuls formats.
 * Le build Vite, lui, continue de les traiter normalement : ce hook ne vit
 * que dans ce banc.
 *
 * AJOUTER UN COMPOSANT = AJOUTER UN CAS dans `cas`, rien d'autre. Chaque
 * nouveau composant qui entre ici doit sortir 0 violation — sinon on répare
 * le composant AVANT de l'inscrire, et on le dit dans le message du commit.
 */
import { registerHooks } from "node:module";

// ── Stub des assets binaires — AVANT tout import de composant ────────────────
registerHooks({
  resolve(spec, ctx, next) {
    if (/\.(png|jpe?g|webp|svg|gif|ico)$/i.test(spec)) {
      return { shortCircuit: true, url: "data:text/javascript,export default %22stub-asset%22" };
    }
    return next(spec, ctx);
  },
});

import { JSDOM, VirtualConsole } from "jsdom";

// Les warnings « Not implemented: HTMLCanvasElement.getContext » sont ATTENDUS :
// c'est le mécanisme même qui rend color-contrast « incomplete » en jsdom
// (voir l'en-tête). On les absorbe sans les laisser ressembler à un plantage.
const consoleVirtuel = new VirtualConsole();
let erreursJsdomInattendues = 0;
consoleVirtuel.on("jsdomError", (e: Error) => {
  if (/Not implemented/.test(e.message)) return;
  erreursJsdomInattendues++;
  console.error(`  ⚠ jsdom: ${e.message.slice(0, 160)}`);
});

const dom = new JSDOM("<!doctype html><html lang='fr'><body></body></html>", {
  url: "https://julaba.local/marchand/accueil",
  virtualConsole: consoleVirtuel,
  pretendToBeVisual: true,
});
Object.defineProperties(globalThis, {
  window: { configurable: true, value: dom.window },
  document: { configurable: true, value: dom.window.document },
  navigator: { configurable: true, value: dom.window.navigator },
  HTMLElement: { configurable: true, value: dom.window.HTMLElement },
  SVGElement: { configurable: true, value: dom.window.SVGElement },
  Element: { configurable: true, value: dom.window.Element },
  Node: { configurable: true, value: dom.window.Node },
  getComputedStyle: { configurable: true, value: dom.window.getComputedStyle },
  localStorage: { configurable: true, value: dom.window.localStorage },
  sessionStorage: { configurable: true, value: dom.window.sessionStorage },
  matchMedia: {
    configurable: true,
    value: (q: string) => ({
      matches: false, media: q, onchange: null, dispatchEvent: () => false,
      addEventListener: () => {}, removeEventListener: () => {},
      addListener: () => {}, removeListener: () => {},
    }),
  },
});
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ── Les imports réels — après les globals et le stub d'assets ───────────────
const React = await import("react");
const { render, act } = await import("@testing-library/react");
const { MemoryRouter } = await import("react-router");

const { ThemeProvider } = await import("../contexts/ThemeContext.tsx");
const { ModalProvider } = await import("../contexts/ModalContext.tsx");
const { AppProvider } = await import("../contexts/AppContext.tsx");
const { UserProvider } = await import("../contexts/UserContext.tsx");
const { NotificationsProvider } = await import("../contexts/NotificationsContext.tsx");
const { AuditProvider } = await import("../contexts/AuditContext.tsx");
const { WalletProvider } = await import("../contexts/WalletContext.tsx");
const { CommandeProvider } = await import("../contexts/CommandeContext.tsx");
const { StockProviderInner } = await import("../contexts/StockContext.tsx");
const { CaisseProvider } = await import("../contexts/CaisseContext.tsx");
const { CooperativeProvider } = await import("../contexts/CooperativeContext.tsx");
const { InstitutionProvider } = await import("../contexts/InstitutionContext.tsx");
const { BackOfficeProvider } = await import("../contexts/BackOfficeContext.tsx");
const { SupportConfigProvider } = await import("../contexts/SupportConfigContext.tsx");
const { TicketsProvider } = await import("../contexts/TicketsContext.tsx");
const { InstitutionAccessProvider } = await import("../contexts/InstitutionAccessContext.tsx");
const { ProducteurProvider } = await import("../contexts/ProducteurContext.tsx");
const { BottomBar } = await import("../components/layout/BottomBar.tsx");
const { Sidebar } = await import("../components/layout/Sidebar.tsx");

// La PILE EXACTE de App.tsx (ordre du rendu de production), par réduction —
// l'imbrication à la main est une fabrique d'erreurs de parenthèses.
const Providers = [
  ThemeProvider, ModalProvider, AppProvider, UserProvider, NotificationsProvider,
  AuditProvider, WalletProvider, CommandeProvider, CaisseProvider,
  StockProviderInner, CooperativeProvider, InstitutionProvider, BackOfficeProvider,
  SupportConfigProvider, TicketsProvider, InstitutionAccessProvider, ProducteurProvider,
];
type AvecEnfants = { children: React.ReactNode };
const pile: React.ComponentType<AvecEnfants> = Providers.reduceRight(
  (acc: React.ComponentType<AvecEnfants>, P: React.ComponentType<AvecEnfants>) =>
    (props: AvecEnfants) => React.createElement(P, null, React.createElement(acc, props)),
  (props: AvecEnfants) => props.children,
);

// ── Les cas — AJOUTER ICI un composant = l'inscrire au harnais ──────────────
type Cas = {
  nom: string;
  chemin: string;
  element: () => React.ReactElement;
};

const cas: Cas[] = [
  // La BottomBar est la navigation permanente de la marchande sur mobile :
  // 5 boutons + le bouton Tata. Deux états réels : Tata visible (accueil)
  // et Tata masqué (caisse — VOIX-03, un seul micro).
  {
    nom: "BottomBar marchand — accueil (Tata visible)",
    chemin: "/marchand/accueil",
    element: () => React.createElement(BottomBar, { role: "marchand" }),
  },
  {
    nom: "BottomBar marchand — caisse (Tata masqué)",
    chemin: "/marchand/caisse",
    element: () => React.createElement(BottomBar, { role: "marchand" }),
  },
  // La Sidebar est la même navigation sur grand écran : tous les liens des
  // rôles y vivent. Deux rôles réels pour verrouiller les deux tables
  // d'items (marchand, producteur).
  {
    nom: "Sidebar marchand — accueil",
    chemin: "/marchand/accueil",
    element: () => React.createElement(Sidebar, { role: "marchand" }),
  },
  {
    nom: "Sidebar producteur — accueil",
    chemin: "/producteur/accueil",
    element: () => React.createElement(Sidebar, { role: "producteur" }),
  },
];

// ── axe-core injecté DANS le jsdom ───────────────────────────────────────────
const { createRequire } = await import("node:module");
const req = createRequire(import.meta.url);
const { readFileSync } = await import("node:fs");
const sourceAxe = readFileSync(req.resolve("axe-core/axe.min.js"), "utf8");
// Le paquet est UMD : évalué dans le contexte du window jsdom, il s'y installe
// comme window.axe — exactement comme dans un navigateur.
dom.window.eval(sourceAxe);

type AxeResultat = {
  violations: Array<{ id: string; impact: string | null; help: string; nodes: Array<{ target: string[] }> }>;
  incomplete: Array<{ id: string; nodes: Array<unknown> }>;
  passes: Array<{ id: string }>;
};

async function courirAxe(): Promise<AxeResultat> {
  // resultTypes limite le volume retourné : les violations (ce qui échoue) et
  // les incomplete (ce que jsdom ne peut pas juger) — les passes sont comptées.
  const brut = await dom.window.eval(`(async () => {
    const r = await window.axe.run(document.body, { resultTypes: ['violations', 'incomplete'] });
    return {
      violations: r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map(n => ({ target: n.target })) })),
      incomplete: r.incomplete.map(v => ({ id: v.id, nodes: v.nodes })),
      passes: r.passes.map(p => ({ id: p.id })),
    };
  })()`) as AxeResultat;
  return brut;
}

// ── Le banc ──────────────────────────────────────────────────────────────────
let failures = 0;
const ok = (c: boolean, label: string) => {
  if (c) console.log(`  ✓ ${label}`);
  else { failures++; console.error(`  ✗ ${label}`); }
};

console.log("\nA11Y-002 — axe-core sur le DOM réellement rendu\n");

for (const c of cas) {
  console.log(`\n· ${c.nom} (${c.chemin})`);
  let montage: ReturnType<typeof render> | null = null;
  try {
    // @testing-library/react enrobe render dans act lui-même — pas besoin
    // d'act ici, et l'affectation doit rester VISIBLE de TypeScript
    // (l'analyse de flux ne suit pas les affectations dans un callback).
    montage = render(
      React.createElement(
        MemoryRouter,
        { initialEntries: [c.chemin] },
        React.createElement(pile, null, c.element()),
      ),
    );
    // Laisse les effets asynchrones (checkSession offline-first, etc.) finir
    // — le DOM audité doit être celui d'APRÈS le premier rendu stabilisé.
    await new Promise((r) => setTimeout(r, 300));

    const html = document.body.innerHTML.length;
    ok(html > 200, `le composant rend du DOM réel (${html} caractères)`);

    const res = await courirAxe();
    const detail = res.violations
      .map((v) => `${v.id}${v.impact ? ` [${v.impact}]` : ""} ×${v.nodes.length} (${v.help})`)
      .join(", ");
    ok(res.violations.length === 0,
       res.violations.length === 0
         ? `0 violation axe — ${res.passes.length} règles passent${res.incomplete.length ? `, ${res.incomplete.length} incomplete (jsdom, ex: color-contrast)` : ""}`
         : `${res.violations.length} VIOLATION(S) axe : ${detail}`);

    if (res.violations.length > 0) {
      for (const v of res.violations) {
        for (const n of v.nodes) console.error(`      ${v.id} → ${n.target.join(" ")}`);
      }
    }
  } catch (e) {
    failures++;
    console.error(`  ✗ ERREUR DE MONTAGE : ${(e as Error).message.slice(0, 300)}`);
  } finally {
    // Déterminisme : chaque cas part d'un body vide. Les timers des providers
    // sont démontés avec l'arbre (unmount), comme en navigation réelle.
    montage?.unmount();
    document.body.innerHTML = "";
  }
}

ok(erreursJsdomInattendues === 0, "aucune erreur jsdom inattendue pendant l'audit");

console.log(failures === 0
  ? "\n✅ axe-core : le rendu réel est propre sur tous les cas inscrits\n"
  : `\n❌ ${failures} échec(s) — une régression a11y s'est glissée : répare avant de pousser.\n`);
process.exit(failures === 0 ? 0 : 1);
