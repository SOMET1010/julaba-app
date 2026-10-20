# RAPPORT DÉTAILLÉ — CORRECTIONS & MODIFICATIONS DE LA CAMPAGNE (20/10/2026)

| | |
|---|---|
| date | 20/10/2026 |
| déclencheur | Patrick : « Fais un rapport détaillé de toutes corrections ou modifications apportées avec preuves et détails » |
| dépôt | `github.com/SOMET1010/julaba-app`, branche `dev` |
| état vérifié à chaud | local = **origin/dev = `b94b7b3`** (fetch re-fait, `git status` propre) |
| méthode | chaque affirmation porte : SHA de commit, `fichier:ligne` relu dans le HEAD actuel, ou sortie de commande re-jouée aujourd'hui dans ce sandbox |
| verdict | **18 commits le 20/10 en 4 lots + 2 builds APK success — verify 150 vert / 2 rouge CONNUS / 152, tsc exit 0, eslint 0 erreur — 0 rouge non-documenté** |

---

## 1. VUE CHRONOLOGIQUE — LES 4 LOTS DU 20/10

| Lot | Demande de Patrick | Commits | Heures |
|---|---|---|---|
| **A — audit + fixes initiaux** | « Assis-toi que la saisie des produits fonctionne, et la vente à la voix — audit complet » | `e3e3a63`, `0fea799`, `9225682` | 01:00–01:32 |
| **B — Task 47 (suite audit)** | « Continue les corrections » | `82c7471`, `2ba6c01`, `f3d42a7`, `ab6da32`, `3c4bc40` | 02:15–02:21 |
| **C — Task 47-bis (fin des rouges hérités)** | « Passe a la suite des corrections » | `0337d34`, `a0342b2`, `fecf826`, `9e72227`, `0f2358a`, `d0bae2c` | 08:27 |
| **D — Task 48 (« corrige tout »)** | « Vas-y corrigé tout » | `2dc7454`, `1aa133c`, `1bef119`, `b94b7b3` | 08:55 |
| **APK** | « vas-y » (réponse à « relancer le build ? ») | runs GitHub Actions sur `c7d23c1` (19/10 21:45) **et `b94b7b3` (20/10 08:56)** | success ×2 |

---

## 2. DÉTAIL PAR CORRECTION (preuves `fichier:ligne` dans le HEAD actuel)

### Lot A — l'audit et ses deux premiers correctifs

1. **`e3e3a63`** — `fix(caisse): le marchand crée son produit au nom libre depuis « Autre article »` : la caisse tactile n'enfermait plus la marchande dans le catalogue pré-enregistré.
2. **`0fea799`** — `fix(voix): la ligne confirmée survit à la coupure de l'app (reprise §3)` : une vente dictée puis confirmée n'est plus perdue si l'app est tuée entre la confirmation et l'enregistrement.
3. **`9225682`** — `docs(audit): saisie et vente des produits à la voix — audit consolidé 20/10` : le document-mère (`AUDIT-VENTE-SAISIE-VOIX-2026-10-20.md`), avec ses points ouverts §5.

### Lot B — Task 47 « Continue les corrections »

4. **`82c7471`** — la dictée WEB préserve le nom libre comme l'APK (STK-25) : « ajoute dix kassos » était entendu sur APK et jeté sur web.
5. **`2ba6c01`** — le nom du produit se DICTE dans le parcours guidé : nouveau `BoutonDireNom.tsx`, relecture vocale du nom transcrit (STOCK_059), refus dits (STOCK_060/061), STOCK_046 migré.
6. **`f3d42a7`** — les phrases restées en dur rejoignent le catalogue i18n : STOCK_062 + WALLET_009 ; inventaire régénéré 430 sites / 241 phrases — 3 échecs hérités de `test:i18n-source` fermés.
7. **`ab6da32`** — gardes recalées sur le code actuel (rouges hérités du 19/10) : vente-sans-prix, caisse-micro, CAT-01 — gardes RENFORCÉES (le nom libre n'écrase jamais un nom de SON catalogue).
8. **`3c4bc40`** — registres (audit §5.3 fermé + COMMIT_LOG + worklog 47).

### Lot C — Task 47-bis « Passe a la suite des corrections » (les 5 rouges hérités)

9. **`0337d34` — R1, banc (pas le produit)** : `refusHorsLigneCommande.test.mts` extrait le VRAI source de `MesCommandes.tsx` par eval ; le toast sonner du source (`MesCommandes.tsx:22` import, `:191,194,208` usage) manquait au scope → `ReferenceError: toast is not defined`. Correctif : espion `toast` dans le banc (preuve : `refusHorsLigneCommande.test.mts:116-118`) + 3 nouvelles assertions d'ÉCRIT (B4-1/2/3) : l'écran écrit la même phrase qu'il dit (T7). **La garde ressort plus forte qu'avant le rouge.**
10. **`a0342b2` — R2, garde recalée sur la décision en vigueur** : `accueilHonnete.test.mts` portait encore la décision du 24/09 (tuile « Mon argent » retirée) alors que l'arbitrage du 06/10 (§8.3 d'AUDIT-UX-ROLES-2026-10-06, preuve `.ai/COMMIT_LOG.md:41`) l'a RESTAURÉE. Assertions inversées via le code ACTIF (lire() filtre les commentaires) : preuves `accueilHonnete.test.mts:158-159` et `MarchandAccueilVoice.tsx:225` (tuile présente, `navigate('/marchand/keiwa')`).
11. **`fecf826` — R3, VRAI BUG PRODUIT (écran muet)** : l'écran de connexion disait « Tu es en train d'effacer le numéro hein ! » — texte porté par AUCUN clip (`direEntreeTexte` retrouve la clé PAR LE TEXTE → écran muet sans erreur), canal voix machine, et il NOMMAIT « numéro » (violait la règle lot A : un effacement ne nomme ni chiffre, ni numéro, ni code). Correctif : `LoginPassword.tsx:1047-1049` — `void parle('C\'est effacé net.')`, mot pour mot le clip `login-24.mp3` / AUTH_24 (dioula « A josila. », cf. commentaire `LoginPassword.tsx:1039-1046`). INVENTAIRE-VOIX régénéré (430→431 sites, 241→242 phrases), `test:i18n-source` revenu vert.
12. **`9e72227` — R4, plancher recalé 40→38** : `modulesPilote.test.mts:133` (`ok(argent.length >= 38, …)`). Le 19/10, IDENTIFICATEUR-16 (commit `b91f6a8`) a RETIRÉ ses 6 routes keiwa de l'espace identificateur — DÉCISION, pas érosion. Les autres assertions de la section [5] restent vertes (toutes couvertes par MODULES_HORS_PILOTE, rien supprimé). Le plancher continue de traquer l'érosion silencieuse.
13. **`0f2358a` — CONNUS aménagé** : `test:i18n-empreintes-argent` RETIRÉ de la liste CONNUS de `verify-tout.mjs` — redevu vert de première main (relance exit 0 à dev@3c4bc40), l'empreinte s'était réalignée aux lots voix du 19-20/10. Règle VER-01 : « la liste CONNUS doit maigrir, pas dormir ». Preuve : `verify-tout.mjs:62-65` — il ne reste que 2 CONNUS.
14. **`d0bae2c` — registres** : `AUDIT-CORRECTIONS-ROUGES-2026-10-20.md` (constat par constat R1–R5) + COMMIT_LOG + worklog 47-bis. Inclut la correction méthodologique : l'audit consolidé citait « test:prix-de-la-marchande » — le script réel est `test:prix-marchande`, déjà vert (la dette C-C1 y était documentée).

### Lot D — Task 48 « Vas-y corrigé tout »

15. **`2dc7454` — C-C1 FERMÉE (décision Patrick, 20/10)** : les 38 entrées du catalogue statique portaient `prixAchat/prixVente` jamais énoncés par une marchande. Re-vérification AVANT de toucher : plus AUCUNE lecture active (`prixDeLaMarchande` pose les champs à `''` depuis STK-02 ; repli de `SaisieGuidee` mort ; `POSCaisse`/`CaisseContext` lisent les prix de SES produits). Correctif : interface `ProduitCatalogue` sans prix, 38 entrées vidées, commentaire doctrinal (preuve : `catalogue-produits.ts:20-27`). La garde `prixDeLaMarchande` [5] recalée en **verrouillage INVERSE** : elle interdit désormais TOUT prix dans le fichier (elle les exigeait encore — Patrick a tranché).
16. **`1aa133c` — la correction vocale mot à mot (« non, pas kasso, gombo »)** : défaut mesuré par probe tsx — le nom libre retenait « Non pas kasso » (la réfutation ET le mot réfuté entraient dans le nom : le champ se remplaçait par sa propre erreur). Règle implémentée dans `produitDit.ts:210` (`nomLibreDicte(texte, nomRefute?)`) : `MOTS_REFUTATION` (`produitDit.ts:284`) sortent TOUJOURS ; le nom réfuté sort SI ET SEULEMENT SI la phrase le réfute ; élisions ouvertes (« c'est » → c + est). Wiring : `AjoutProduitGuide` passe `nomActuel={nom}` → `BoutonDireNom` (web + Sherpa). Le banc `produitDit.test.mts` exécute LA LECTURE DU COMPOSANT (pas une fiction). Cas verrouillés : « non, pas kasso, kako »+Kasso → Kako ; « non c'est kako » → Kako ; « gombo » reste gombo ; « non » seul → null (STOCK_046 : le champ ne bouge pas) ; « ajoute dix kassos » → Kassos inchangé.
17. **`1bef119` — le bouton « 🐞 Rapport de test » est de retour (arbitrage Patrick)** : restauré verbatim de `main@24b40b3` (le contenu que `c7d23c1` portait et que l'autre session avait retiré de l'historique dev). Pied de page OUTILS en `devMode` (5 tapes coin haut-gauche, caché à la marchande) : « Revoir le tutoriel », « By Icône Solution », version cliquable (elle SE DIT), bouton Rapport via `vlogPartager`. Preuves : `LoginPassword.tsx:122` (import — `vlogPartager` existait déjà dans `utils/voiceDebug.ts:203`, seul l'import manquait) et `LoginPassword.tsx:1541-1553` (le bouton). Inventaire voix régénéré : **431→432 sites** (preuve : `docs/langues/INVENTAIRE-VOIX.md` §Chiffres clés : 432 sites, 449 branches, dont 200 littéraux).
18. **`b94b7b3` — registres** : `LOT-48-CORRECT-TOUT-2026-10-20.md` + COMMIT_LOG + worklog 48.

---

## 3. PREUVES DE NON-RÉGRESSION (gates re-jouées aujourd'hui, sur `b94b7b3`)

| Gate | Résultat | Preuve |
|---|---|---|
| `npx tsc -b --force` (frontend) | **EXIT 0** | re-joué à chaud aujourd'hui |
| `npx eslint` sur les 11 fichiers touchés | **0 erreur** (11 warnings préexistants), exit 0 | re-joué à chaud aujourd'hui |
| Suites ciblées (lots C+D : 17 suites) | vertes | prix-marchande, produit-dit, premier-produit, etal-marchande, vente-sans-prix, image-produit, charte-marchande, vente-au-catalogue, voix, web-reco, parcours-guide-parle, refus-parle, i18n-source, auth-charte, voix-connexion-lot-a, parole-entree, lien-activation |
| `verify-tout` complet | **150 vert / 2 rouge / 152** (~106 s) | re-joué À CHAUD aujourd'hui + traces du jour : `/home/z/verify-lot.log` (08:25) et `/home/z/verify-lot2.log` (08:53) |
| Trajectoire | matin (Task 47) : 146 vert / 6 rouge → **150 / 2 / 152** après 47-bis, stable après le lot D | worklog 47/47-bis/48 |

Les 2 rouges restants sont les **2 CONNUS assumés et documentés** (`verify-tout.mjs:62-65`) :
1. `test:voix-trace-source` — VOICE-01 : 4 empreintes figées, refigeage réservé à Patrick ;
2. `test:garde-argent` — état de référence 4 entrés / 14 perdues.

**0 rouge non-documenté. 1 préoccupation = 1 commit ; ajout explicite par fichier ; messages via `git commit -F`.**

---

## 4. APK — PREUVE PAR L'API GITHUB (workflow `apk.yml`, construction à la demande)

| Élément | Preuve |
|---|---|
| Run APK sur `b94b7b3` | « APK pilote — construction à la demande », branche dev, **completed / success**, créé 2026-10-20T08:56:52Z |
| Job | « Construire l'APK de debug » — success, 2026-10-20T08:56:56Z → 08:59:24Z (~2 min 28) |
| Release `pilote-latest` | assets **`julaba-b94b7b3.apk`** (272 979 241 o) et **`julaba-latest.apk`** (même taille, même instant — l'alias latest pointe sur ce build), créés 2026-10-20T08:59:04Z |
| Historique | run précédent sur `c7d23c1` : success, 19/10 21:45 (asset `julaba-c7d23c1.apk` toujours dans la release) |

L'APK embarque donc TOUTE la campagne : C-C1, mot à mot, bouton Rapport, effacement réparé, dictée du nom, etc.

---

## 5. CE QUI RESTE OUVERT (assumé, documenté)

1. **Recette appareil P3** — les 14 scénarios du SPEC (`SPEC_VENTE_VOCALE.md:161-173`) exigent un téléphone réel + l'APK Sherpa. C'est la SEULE ouverture du couple saisie/vente. L'APK est prêt dans la release ; la recette attend le téléphone.
2. **2 CONNUS** (voir §3) — inchangés, assumés.
3. Note historique : le run APK du 19/10 sur `c7d23c1` avait embarqué le bouton Rapport AVANT son retrait de l'historique dev par la session parallèle ; depuis `1bef119` il est de retour sur dev ET dans l'APK du 20/10.

## 6. ARCHIVES DU DOSSIER

- `.ai/AUDITS/AUDIT-VENTE-SAISIE-VOIX-2026-10-20.md` (audit consolidé — commit `9225682`)
- `.ai/AUDITS/AUDIT-CORRECTIONS-ROUGES-2026-10-20.md` (R1–R5 — commit `d0bae2c`)
- `.ai/AUDITS/LOT-48-CORRECT-TOUT-2026-10-20.md` (lot D — commit `b94b7b3`)
- `.ai/COMMIT_LOG.md` (entrées détaillées par lot, avec batteries de preuves)
- `worklog.md` (Tasks 47, 47-bis, 48)
- Ce rapport : `.ai/AUDITS/RAPPORT-DETAILLE-CORRECTIONS-2026-10-20.md`
