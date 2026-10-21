// Le frontend utilise Tailwind CSS 4 UNIQUEMENT via le plugin Vite
// (@tailwindcss/vite, voir vite.config.ts) : aucun plugin PostCSS n'est requis.
//
// Ce fichier vide COURT-CIRCURTE la remontée de Vite vers le postcss.config.mjs
// de la racine du dépôt (template sandbox : plugins: ["@tailwindcss/postcss"]).
// Ce paquet n'est pas installé ici → sans ce garde-fou, Vite échoue avec
// « Invalid PostCSS Plugin found at: plugins[0] » sur chaque CSS.
export default { plugins: [] };
