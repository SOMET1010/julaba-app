# Audit UI Julàba — version vérifiée sur le code

Date : 2026-08-17 · Périmètre : `frontend_src/src/app/*` sur `main`.
Complémentaire de `docs/AUDIT_UX.md` (gouvernance parcours) : ce document-ci
porte sur le **système visuel, la santé du code UI et la dette de refactoring**,
avec **preuves réelles** (`fichier:ligne`, comptages), et sépare franchement :

- **[CODE-VÉRIFIÉ]** — mesuré dans le dépôt (chiffre ou `fichier:ligne`).
- **[LIVE]** — nécessite la PWA (SW désenregistré + caches vidés + 360-412 px,
  comptes démo Adjoua/Bénito) ; c'est le job de l'agent-navigateur, pas du code.

> Deux pré-audits « texte seul » ont été écartés : l'un inventait des faits
> (noms de composants, « plus gros fichier »), l'autre était honnête mais sans
> aucune preuve. Ce document ne garde que le vérifiable.

---

## A. Synthèse — les problèmes qui coûtent le plus

1. **[CODE-VÉRIFIÉ] Dette de système visuel massive.** **4468 couleurs hex
   littérales** contre **487 usages de tokens** `var(--…)` → ~90 % des couleurs
   sont en dur. Le vert de marque `#1D9E75` est répété **22 fois** sans token.
   → tout refactoring visuel est aujourd'hui risqué (pas de source unique).
2. **[CODE-VÉRIFIÉ] Fichiers-écrans démesurés.** **110 fichiers `.tsx` > 400
   lignes**. Les vrais monstres ne sont PAS la caisse mais l'identificateur/BO :
   `FicheIdentificationDynamiqueBO.tsx` **6537 l.**, `FicheIdentificationDynamique.tsx`
   **5648 l.**, `BOZones` 2537, `MarcheHub` 2493, `CommandesProducteurPage` 2429.
   `GestionStock.tsx` = 1434 l. avec **251 blocs `style={{ }}` inline**.
3. **[LIVE] Densité de texte pour des non-lectrices.** À prouver à l'écran :
   fiche produit / rapport hebdo / ventes passées présentent-ils du texte long
   là où image + voix + un gros montant suffiraient ? (le code confirme des
   écrans riches ; le ressenti se mesure en live).
4. **[LIVE] Parcours vente/création en trop d'étapes.** À chronométrer en gestes
   (silence vs voix) sur la PWA — non estimable honnêtement depuis le code.
5. **[LIVE] Accessibilité visuelle.** Contraste du `#1D9E75` sur blanc ≈ 3:1
   (OK grosses formes, limite pour du texte), cibles < 44 px, focus/aria — à
   vérifier à l'écran.

## B. Solide — à NE PAS casser (preuve code)

| Brique | Preuve | Non-régression |
|---|---|---|
| **Marge honnête** (coût inconnu → « — », jamais le prix entier) | `services/margeVente.ts` + `test:marge` | garder `test:marge` vert |
| **Vente annulée exclue du jour** | `getTodayStats` (AppContext), `venteComptee` (statsVente) | garder les tests stats |
| **Suppression annoncée après confirmation réelle** | `GestionStock.deleteItem` (#139) + modale portail `z-[210]` | garder le portail + l'attente serveur |
| **Voix pervasive** (pas un vernis) | **68 fichiers** consomment `guidageVocal/speak` ; ex. `VentesPassees` énonce la vente (`:82`) et l'annulation (`:66`) | garder les appels au focus/action |
| **Offline-first** | file durable `voice-offline/offlineCaisse` (enfiler/synchroniser) | aucun faux succès ; garder la file |
| **État vide honnête** | fiche produit : « Aucune vente enregistrée pour ce produit » (#144) | généraliser, ne pas régresser |
| **Filet de non-régression** | `npm run test:ci` (chaîne `tsx *.test.mts`) + invariants backend + gate TS | tout lot passe ces 3 checks |

## C. Constats par axe

### Axe 4 — Système visuel · [CODE-VÉRIFIÉ] · gravité HAUTE
- **4468 hex littéraux / 487 tokens** (tout `frontend_src`). `#1D9E75` ×22.
- Styles inline systémiques : `GestionStock.tsx` = 251 `style={{}}` ; idem
  `VentesPassees` (couleurs en dur `P='#AF5B23'`, `'#F0FAF5'`, `'#1D9E75'`…).
- Tokens existants sous-exploités (`--encre`, `--trait`, `--papier` présents mais
  minoritaires).
- **Reco** : `theme/tokens.css` étendu (`--col-marque`=#1D9E75, `--col-danger`,
  `--radius-*`, couleurs de rôle) ; migration progressive des littéraux.

### Axe 10 — Santé du code · [CODE-VÉRIFIÉ] · gravité HAUTE
- **110 fichiers > 400 l.** ; priorité aux **> 2000 l.** (identificateur/BO) autant
  qu'à `GestionStock`.
- `GestionStock` mélange liste + détail + création + réappro + suppression dans
  un seul fichier de 1434 l. → **extraire** `StockHome`, `StockItemCard`,
  `ProductCreate`, `ProductReplenishModal`, `ProductDetail`, `ProductDeleteConfirm`.

### Axe 9 — Dette de démo · [CODE-VÉRIFIÉ] · gravité BASSE (bonne nouvelle)
- Les `slice(0,3)`/`Math.random` du dépôt sont **légitimes** (id de toast, confettis
  de quiz, « 3 premiers tickets », aperçu notifs) — **pas** de fausses données.
- Le mock stock (mouvements) est **déjà retiré** (#144). Reste `mockBO.ts` référencé
  en commentaire (`types/julaba.types.ts:626`) → à vérifier, mineur.
- Accents : dette résiduelle surtout backoffice ; cf. `docs/AUDIT_ACCENTS_UI.md`.

### Axe 1 — Navigation · [CODE-VÉRIFIÉ partiel]
- Barre basse réelle = `components/layout/BottomBar.tsx` (+ `Navigation.tsx`,
  `AppLayout.tsx`). Le header de rôle explicite (« Marchande — Caisse ») est
  **à confirmer** écran par écran [LIVE].
- Routage : **aucun `<Route path=>`** classique — routes config-based ; le
  regroupement par rôle (`/marchande/*`…) est une **reco**, à cadrer sur le vrai
  routeur, pas un constat.

### Axes 2, 3, 5, 6, 7, 8 — [LIVE]
Gestes chronométrés, densité ressentie, états chargement/vide/hors-ligne à
l'écran, contrastes réels, cibles 44 px, clavier virtuel masquant le « Valider »,
bouton micro flottant, lisibilité du rôle/sous-profil : **à prouver sur la PWA**
(voir checklist F). Le code ne peut pas trancher ces points honnêtement.

## D. Plan de refactoring — 3 lots (calé sur le réel)

**Lot 1 — correctifs rapides sans risque (2-4 j).** Zéro changement de nav.
- Bandeau hors-ligne permanent (compteur d'attente) · états vides honnêtes
  généralisés · header de rôle · passe accents (D1) · décaler le bouton micro
  des zones d'action basses. → `test:ci` vert à chaque pas.

**Lot 2 — design system + tokenisation (2-3 sem). LE cœur.**
- `theme/tokens.css` (couleurs de marque/rôle, radius, ombres) ; migrer les
  **4468 littéraux** par vagues.
- Composants partagés `ds/` : `Button`, `IconButton`, `Card`, `Badge`, `Sheet`
  (bottom-sheet unifié + `aria-modal`/focus), `RoleHeader`, `Skeleton`.
- Chaque composant partagé → un test de rendu dans la chaîne `.test.mts`.
- Périmètre = **tout le produit** (110 fichiers), pas seulement la caisse.

**Lot 3 — restructurations profondes (3-4 sem). Risque + élevé.**
- Éclater `GestionStock` (6 modules ci-dessus), **puis** attaquer les fichiers
  > 2000 l. (identificateur/BO).
- Routage par domaine (guards de rôle) — à cadrer sur le routeur réel.
- Méthode : extraire d'abord une fonction **pure + test** (ex. calcul déjà isolé
  dans `margeVente`/`mouvementsStock`/`jourLocal`), puis brancher. Jamais un gros
  déplacement sans `test:ci` + gate TS verts.

## E. À NE PAS faire
- Remplacer le **pavé numérique** de caisse par un clavier alphanumérique.
- Refondre la palette **sans** intégrer la voix (le visuel n'est pas le seul canal).
- Importer un **design system tiers** (MUI/Ant) : poids + perte de contrôle du
  contraste/mobile, conflit avec l'existant.
- **Supprimer les données de démo** : les garder comme fixtures, juste les
  **étiqueter** « démo ».
- Toucher aux **stocks/ventes réels** hors parcours d'audit maîtrisés (annulation
  en session). **Argent gelé.**

## F. Checklist LIVE (pour l'agent-navigateur — la seule vraie preuve)
Protocole : SW désenregistré + caches vidés + hard reload · 360-412 px · Adjoua
`07 25 25 25 25`/`0000` (marchande), Bénito `09 60 60 60 60`/`0000` (producteur).
Lecture seule ; annuler toute vente de test ; ne rien supprimer qu'on n'a pas créé.

1. Vente espèces : chronométrer en **gestes** (silence vs voix), capturer chaque écran.
2. Marge inconnue → afficher « — » (jamais 0/prix entier) sur une fiche sans coût.
3. Hors-ligne : vente sans réseau → file + message d'attente + resync, **aucun faux succès**.
4. États vides : stock vide / pas de vente hier / pas de marge → phrase honnête, pas de tableau vide.
5. Contrastes + cibles ≥ 44 px (fermer `×`, badges source, sous-nav).
6. Clavier virtuel : le bouton « Valider » reste-t-il visible ?
7. Bouton micro flottant : masque-t-il une action basse en 360 px ?
8. Rôle/sous-profil : sait-on toujours « où on est » (Marchande/Productrice, grossiste/détaillant) ?
9. Erreurs caisse : sont-elles **dites** (pas seulement un toast) ?
