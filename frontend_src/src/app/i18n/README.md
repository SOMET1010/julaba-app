# i18n/ — Internationalisation JULABA

> Adopté par **INIT-020** (28/09/2026). Voir `.ai/TASKS.md` et `.ai/DEBT_REPORT.md` (FRONT-NEW-5).

## 1. Contexte

L'application s'adresse en priorité à des marchandes non-lectrices en Côte
d'Ivoire. `useLangPref` (hook historique) expose déjà trois langues :
`french` / `dioula` / `bambara`. Mais jusqu'à INIT-020, toutes les chaînes
UI étaient hardcodées en français, et `<html lang="fr">` était figé dans
`index.html`.

INIT-020 pose l'infrastructure i18next et migre les écrans prioritaires.
**L'audit AUDIT-001 avait identifié cette absence comme une dette FRONT-NEW-5.**

## 2. Stack

- **[`i18next`](https://www.npmjs.com/package/i18next)** `^23.16` — moteur.
- **[`react-i18next`](https://www.npmjs.com/package/react-i18next)** `^14.1`
  — bindings React (`useTranslation`, `I18nextProvider`).

## 3. Structure

```
src/app/i18n/
├── config.ts              # init i18next + bridge avec useLangPref
├── README.md              # ce fichier
└── locales/
    ├── fr.json            # source de vérité (français)
    ├── dioula.json        # PLACEHOLDER — à traduire par un locuteur natif
    └── bambara.json       # PLACEHOLDER — à traduire par un locuteur natif
```

## 4. Conventions

### 4.1 Codes langue

Les codes langue i18next **sont identiques** aux valeurs `AppLang` de
`useLangPref` : `french` / `dioula` / `bambara`. Pas de mapping `fr` / `dyu`
/ `bm` côté i18next — c'est plus simple, et ça garantit la cohérence avec le
`localStorage` existant (`julaba_lang`).

En revanche, l'attribut `<html lang="…">` utilise les codes ISO 639 :
`fr` / `dyu` / `bm` (cf. `LANG_VERS_HTML` dans `config.ts`). C'est nécessaire
pour les lecteurs d'écran qui s'appuient sur ces codes pour la prononciation.

### 4.2 Clés

- Hiérarchie par écran : `mesDonnees.sectionDonneesTitre`, `welcome.bienvenue`, etc.
- Préfixe `aria*` pour les attributs ARIA (facilite la relecture a11y).
- Préfixe `voix*` pour les chaînes lues par Tata (différentes du texte affiché).
- Préfixe `toast*` pour les notifications sonner.

### 4.3 Interpolation

`escapeValue: false` : React échappe déjà les valeurs interpolées. On utilise
`{{variable}}` pour les paramètres simples.

Pour les mises en forme inline (gras, etc.), on utilise des pseudo-balises
`{{gras}}…{{/gras}}` et un `<Trans>` côté React (cf. `MesDonnees.tsx`).

### 4.4 Fallback

`fallbackLng: 'french'` — si une clé manque dans la langue active, on
retombe sur le français. Conséquence : tant que `dioula.json` et
`bambara.json` sont des PLACEHOLDERS (chaînes françaises non traduites),
l'interface reste 100 % lisible.

## 5. ⚠️ Traductions à finaliser

**Les fichiers `dioula.json` et `bambara.json` sont des PLACEHOLDERS.**

Ils contiennent les chaînes françaises de référence. La traduction doit être
faite par un **locuteur natif** — pas par un outil automatique, parce que :

1. Le vocabulaire métier (caisse, stock, portefeuille Keiwa, NIN, etc.)
   n'a pas toujours d'équivalent direct en bambara/dioula.
2. La doctrine voice-first (Constitution JULABA §1) exige une voix humaine
   authentique — pas une traduction mécanique.
3. Les clips audio de Tata (`public/voix/tata/`) sont déjà enregistrés en
   français par la comédienne de voix ; la cohérence voix/écran doit être
   préservée (le voice-first reste en français tant que les clips
   bambara/dioula ne sont pas enregistrés).

**Processus de traduction** :

1. Locuteur natif traduit chaque clé en respectant le vocabulaire métier.
2. Relecture par un second locuteur (différent).
3. Test avec 3 marchandes pilote de chaque langue.
4. Validation Agent a11y + Agent QA.

## 6. Migration progressive

### 6.1 Écrans migrés (INIT-020)

- ✅ `pages/marchand/MesDonnees.tsx` (~30 chaînes)
- ✅ `components/auth/Welcome.tsx` (~8 chaînes)
- ✅ `components/auth/EntryGate.tsx` (~2 chaînes visibles)

### 6.2 Écrans à migrer (backlog)

- ⏳ `components/auth/LoginPassword.tsx` (1598 LOC — effort L)
- ⏳ `components/marchand/POSCaisse.tsx` (1346 LOC — cœur métier, effort L)
- ⏳ `components/shared/UniversalParametres.tsx` (1014 LOC — effort M)
- ⏳ Le reste des écrans marchand (`MarchandHome`, `VentesPassees`, `GestionStock`, etc.)

**Approche** : migrer un écran à la fois, en partant des plus critiques pour
la marchande (caisse, accueil, paramètres). Chaque migration doit :

1. Extraire les chaînes vers `fr.json` (clé par clé).
2. Recopier les clés dans `dioula.json` et `bambara.json` (placeholder).
3. Remplacer les littéraux par `t('cle')` ou `<Trans i18nKey="cle" />`.
4. Vérifier `npx tsc -b` + `npm run test:jargon` + `npm run test:route-access`.

## 7. Bridge avec `useLangPref`

`useLangPref.setLang(lang)` appelle désormais `appliquerLangueI18n(lang)` qui :

1. `i18n.changeLanguage(lang)` → tous les `useTranslation()` se ré-affichent.
2. `document.documentElement.lang = LANG_VERS_HTML[lang]` → `<html lang="…">`
   dynamique (a11y, lecteurs d'écran).

Au boot, `initI18n()` lit `localStorage.getItem('julaba_lang')` pour
déterminer la langue initiale. Si la valeur est absente/corrompue, on
retombe sur `french`.

## 8. Anti-jargon (`antiJargon.test.mts`)

Le test balaie les chaînes de caractères dans les fichiers `.ts`/`.tsx`.
Les fichiers JSON ne sont **pas** scannés. Conséquence : déplacer une chaîne
vers un JSON ne masque pas le jargon — la chaîne reste vérifiée dans le JSON
à terme (test à étendre). Pour l'instant, la règle :

- Les chaînes doivent rester inclusives (« geste + résultat ») même après
  migration i18next.
- Aucune chaîne contenant `biometrie`, `authentification`, `webauthn`,
  `credential`, `erreur serveur`, `session expiree` ne doit être ajoutée
  au JSON — y compris en placeholder français.

## 9. Liens

- `.ai/ACCESSIBILITY_GUIDE.md` §3 — dette i18n (marquée résolue par INIT-020).
- `.ai/DESIGN_SYSTEM.md` §5 — charte voice-first Tata Nanti Lou.
- `.ai/DEBT_REPORT.md` — FRONT-NEW-5.
- `.ai/TASKS.md` — INIT-020.
- `docs/POLITIQUE-CONFIDENTIALITE.md` — version officielle complète (texte source de MesDonnees).
