# AUDIT ACTEUR — MARCHAND — 2026-10-05

## 1. Identité et périmètre

- **Rôle** : `marchand` (acteur terrain) — sous-profils grossiste / demi-grossiste / détaillant (`user.sousProfilMarchand`, lu dans `POSCaisse.tsx:77-78`, contraint serveur dans `publications-rest/publications-rest.controller.ts` pour le marché coopératif).
- **Compte de sonde** : Awa Koné +2250700000009 (marchande) — login bloqué par le throttler (voir §4/runtimes).
- **Frontend audité** : `frontend/src/app/components/marchand/` — **62 fichiers** (34 écrans/composants `.tsx` ≈ 15 270 l. + 28 gardes `.mts` ≈ 2 708 l.), dont POSCaisse (1 901 l. — cœur métier), GestionStock (1 399), MarcheVirtuel (1 368), MarchandModals (1 176), MicroVenteCaisse (983), VentesPassees (896), MesCommandes (768), CreditModal (525), ResumeCaisse (520), MarchandDepenses (480), DepenseForm (394), Tontines/Fidelite/ProtectionSociale/MaCooperative/RecoltesPrevues… + `pages/marchand/MesDonnees.tsx` (668) + routes `/marchand/*` (`routes.tsx:67-96`, 30 routes) + contextes `CaisseContext.tsx` (1 052), `StockContext`, `WalletContext` + services `voice-offline/` (24 fichiers dont `grammaireEncaissement.ts`, `offlineCaisse.ts` 527 l.).
- **Backend audité** : `caisse-rest/` (contrôleur 1 054 l. + credits 268 + journee-ouverte/date-operation/stock-restitution/marge-vente), `stocks-rest/` (271), `commandes-rest/` (636) + `commandes/`, `tontines/` (335), `wallets/` (858), `fidelite-rest/` (334), `transactions-rest/` (502), `marches/`, `scores/`, `revenus/`, `bpay/` — ≈ **5 400+ l.** Module `escrow/` = **VIERGE** (un seul `escrow.module.ts`, aucune logique).
- **Lectures préalables** : worklog.md (8 tâches), PROJECT_CONTEXT §1/§8, ACCESSIBILITY_GUIDE §4/5/6, DESIGN_SYSTEM §9, audit précédent 2026-09-28.

## 2. Fonctionnalités observées dans le code

- **Caisse (POSCaisse)** : panier fusionné par ligne (`panierLignes.ts`, garde `test:fusion-panier`), vente au doigt ET à la voix, vente « montant libre » + adoption catalogue maître Odoo, encaissement billets/coupures dessinés, monnaie décomposée, relecture parlée+affichée (machine à états pure `machineEncaissement.ts`), mobile money **déclaratif désactivé** (`CAISSE_MOBILE_MONEY_ACTIF=false`, `POSCaisse.tsx:60`), crédit **gelé** (`CAISSE_CREDIT_ACTIF=false`, `POSCaisse.tsx:53`).
- **Offline** : outbox IndexedDB durable par propriétaire (`offlineCaisse.ts`), clé d'idempotence par vente/dépense (`CaisseContext.tsx:55-58,605`), rejeu 4xx→lettre morte / 5xx→retry CAP 5 / ordre préservé, date d'opération bornée 14 j (`date-operation.ts:26-28`), statut `confirmee|en_attente` opposé (OFF-01, `CaisseContext.tsx:576-640`).
- **Stock** : CRUD produits + ledger `stock_mouvements` append-only (lectures `stocks-rest.controller.ts:79-88`), PATCH idempotent (`stock_operation_idempotency`, :207-219), réconciliation ARG-18 (`reconciliation-stock.ts` : vente toujours passée, stock borné à 0, manquant + `non_reconcilie` journalisés).
- **Argent** : vente transactionnelle unique (FOR UPDATE, idempotence `23505`-safe, `caisse-rest.controller.ts:730-821`), dépense catégories fermées DEP-01/02, fond de caisse journalisé append-only `caisse_fond_journal` (:311-329), fermeture anti-double + écart incident loggé (:534-558), annulation self-service du jour tracée + restitution stock (:217-243), wallets verrouillés + transferts idempotents + `soldeBloque`, tontines sérialisées par verrou tontine + index unique, B-Pay callback à secret + re-check fournisseur + cron 5 min + rollback retrait.
- **Crédit clients** : primitive unique `encaisserCredit`, clé obligatoire sur acompte, journée ouverte exigée DANS la transaction (`credits.controller.ts:93,158,207`).
- **Fidélité** : gain/usage idempotents, événements tracés (`fidelite-rest.controller.ts:122-181,202-241`).
- **Voix** : grammaire d'encaissement « phrase ENTIÈRE ou rien » (`grammaireEncaissement.ts:30-66`), montant reçu **jamais dicté** (décision 20/09), deux formes texte/texteParle (ARG-17, `POSCaisse.tsx:624-631,663`), rupture parlée (`ruptureStock.ts`), haptique différenciée succès/attente/erreur (`POSCaisse.tsx:509-528`).
- **Mes données** (loi 2013-450) : écran présent, suppression de compte avec mot de passe (`MesDonnees.tsx:182`).

## 3. Constats détaillés

### MARCHAND-01 [P1] — Invariants crédit I4/I5/I6 toujours rouges (`it.failing`) : le risque de l'audit 28/09 reste VALABLE à l'invariant, atténué en produit

`docs/invariants/TABLEAU_DE_BORD.md:24-26` (I4/I5/I6 `it.failing`) ; l'UI tire le rideau (`POSCaisse.tsx:53,696-700`) et la chaîne serveur a été repensée (clé obligatoire `credits.controller.ts:196-200`, primitive unique `encaisser-credit.ts`, CAI-09 partagé `journee-ouverte.ts`), mais les gardes d'invariant ne sont pas verts. Impact : toute réactivation du crédit (chantier prévu) sans verdir I4/I5/I6 réouvre le double encaissement ; le gel est une décision de code (constante), pas une protection serveur (PATCH `:id/payer` reste appelable en API directe).

### MARCHAND-02 [P2] — DELETE /stocks/:id supprime PHYSIQUEMENT un produit du catalogue

`stocks-rest.controller.ts:262-270` — `DELETE FROM produits WHERE id=$1 AND marchand_id=$2`, aucune trace, aucun statut ; répond `{success:true}` même si 0 ligne touchée (aucun 404). Contredit PROJECT_CONTEXT §8.6 (« rien n'est jamais supprimé ») pour une donnée liée à l'historique (`stock_mouvements.produit_id`, `details` de ventes). Impact : mouvements orphelins (toutefois tracés `non_reconcilie` par ARG-18, `caisse-rest.controller.ts:787-790`), vente rejouée offline vers produit disparu.

### MARCHAND-03 [P2] — Pas de validation de positivité sur POST/PATCH /stocks

`stocks-rest.controller.ts:153,162` — `Number(body.quantite) || 0` conserve −5 (truthy) ; idem prix/promo ; PATCH idem via `COALESCE($2,stock)`. La rigueur existe ailleurs (`caisse-rest.controller.ts:331-337` `montantValide`, `vente` :645-660). Impact : stock/prix négatifs écrits en base via API directe ; divergence stock/ledger ; inventaire faussé.

### MARCHAND-04 [P2] — Modales maison sans sémantique dialog sur des écrans d'argent

`MarchandModals.tsx:54-90` (BaseModal : pas de `role="dialog"`, `aria-modal`, focus trap, ESC ; fond = fermeture) — utilisée par **FondModale du jour / Modifier le fond / Fermer la journée / Résumé** (exposées :329-1081) via `MarchandAccueilVoice` ; `PinConfirmModal.tsx:102` idem (pas d'`aria-*` du tout) ; `CreditModal.tsx:222+` idem. Violation ACCESSIBILITY_GUIDE §4-2/§5 (Radix Dialog préféré). Impact : clavier/lecteur d'écran perdus sur les gestes fond/clôture ; POSCaisse, elle, est exemplaire (`role="status" aria-live` :986, `aria-label` :780-1037).

### MARCHAND-05 [P2] — Cibles tactiles < 44 px hors caisse, hors garde CI

32 px (`w-8 h-8`) sur les boutons quantité panier et favoris du MarcheVirtuel (`MarcheVirtuel.tsx:877,879,922,728`), retrait membre `Tontines.tsx:316`, réglages `Fidelite.tsx:257`, `ProtectionSociale.tsx:274`, fermeture `PinConfirmModal.tsx:125` ; le garde `test-cible-tactile.mjs:88-108` ne couvre que la barre de recherche caisse + 4 cibles auth. Impact : erreurs de geste au marché (soleil, doigt épais) exactement là où la doctrine §1 cible 44 px.

### MARCHAND-06 [P3] — Couleurs en dur hors caisse : dette MESURÉE et ratchetée, non close

`charteMarchande.test.mts:14-33` — 644 occurrences/125 teintes relevées le 24/09 sur 23 fichiers (338 migrables, 250 variantes Δ<30, 69 étrangères), plafonds par fichier. Exemples vivants : `GestionStock.tsx:1190,1214,1217`, `MarchandDepenses.tsx:50-66`, `ProtectionSociale.tsx:29-30`, `CreditModal.tsx:375,398` (`#1a1206`), `DepenseForm.tsx:310`, `ResumeCaisse.tsx:320-357` (rgba), `AppLayout.tsx:96,128,186` (layout partagé). Impact : unité visuelle des 3 confits, mineur (cliquet anti-régression actif).

### MARCHAND-07 [P3] — Course check-then-update sur la récompense fidélité

`fidelite-rest.controller.ts:225-238` — lecture `points` puis `UPDATE points = points - seuil` SANS `SELECT … FOR UPDATE` (à la différence de wallets/commandes) : deux « utiliser » concurrents peuvent déduire deux fois et passer les points en négatif. Impact : faible (marchand unique), mais incohérence possible de points.

### MARCHAND-08 [P3] — Réouverture d'une journée fermée non journalisée

`caisse-rest.controller.ts:389-397` — la réouverture valide un geste explicite (« il invalide un comptage », :599-600) mais n'écrit que `heure_fermeture = NULL` ; le journal `caisse_fond_journal` ne trace que le fond. Impact : l'écart du soir reste gravé mais l'événement « réouverture » n'a pas d'entrée datée dédiée.

### MARCHAND-09 [P3] — wallets/me/recharge-mobile : montant non borné et non vérifié fini

`wallets.controller.ts:45-46` — `Math.round(NaN)=NaN`, `NaN<200` est faux → passe ; pas de plafond (le plafond 10 M existe dans `wallets.service.ts:128,183` mais recharge n'y passe pas). Le retrait est protégé par `debitWallet` (:180-189) + rollback (:107-119). Impact : 500 probable (colonne int) ou appel fournisseur avec montant aberrant.

### MARCHAND-10 [P3] — POST /caisse/transactions sans idempotence (hors vente)

`caisse-rest.controller.ts:245-287` — accepte `depense|remboursement|ajustement` sans `idempotency_key` (la vente y est refusée, :260-265) ; le front n'utilise jamais cette route (dépense → `/caisse/depense` idempotent). Impact : double écriture possible via API directe/rejeu réseau sur une porte secondaire.

### MARCHAND-11 [P3] — Énumération de comptes par wallets/me/rechercher-destinataire

`wallets.controller.ts:122-143` — tout utilisateur authentifié peut confirmer qu'un numéro existe (prénom/nom renvoyés), sans throttler spécifique (le throttler global s'applique). Nécessaire au métier du transfert, mais surface de reconnaissance de compte.

## 4. Risques et vulnérabilités

| ID | Risque | Catégorie | Criticité | Vecteur |
|---|---|---|---|---|
| MARCHAND-01 | Crédit réactivable côté serveur alors que I4/I5/I6 sont `it.failing` | argent/intégrité | P1 | PATCH direct `/caisse/credits/:id/payer`, `:id/acompte` |
| MARCHAND-02 | Suppression physique catalogue (perte de rattachement historique) | stock/intégrité | P2 | DELETE `/stocks/:id` |
| MARCHAND-03 | Quantité/prix négatifs écrits | stock | P2 | POST/PATCH `/stocks` corps libre |
| MARCHAND-04 | Modales d'argent sans focus trap/aria (fond, clôture, PIN) | a11y | P2 | Clavier/lecteur d'écran sur /marchand |
| MARCHAND-05 | Cibles 32 px sur panier/favoris/PIN | a11y | P2 | Geste au marché |
| MARCHAND-07 | Points fidélité négatifs sous concurrence | intégrité | P3 | POST `/fidelite/utiliser` ×2 |
| MARCHAND-08 | Réouverture de journée sans entrée de journal | argent/audit | P3 | POST `/caisse/session/ouvrir` après fermeture |
| MARCHAND-09 | Recharge montant NaN/non plafonné | argent | P3 | POST `/wallets/me/recharge-mobile` |
| MARCHAND-10 | Porte secondaire POST /caisse/transactions non idempotente | argent | P3 | API directe |
| MARCHAND-11 | Énumération de comptes par téléphone | PII | P3 | POST `/wallets/me/rechercher-destinataire` |

**Catégories vierges** : `escrow` (module vide) ; **aucun PIN traité** dans les modules marchand (PinConfirmModal ne transmet qu'un PIN de session local — aucune journalisation constatée, `rg pin` = zéro occurrence fonctionnelle dans caisse-rest/commandes/tontines/wallets) ; **aucune PII en log** constatée dans les contrôleurs audités (les échos d'écarts n'impriment qu'un `user.id` interne, `caisse-rest.controller.ts:554-557`).

**Runtimes (sondes, lecture seule)** : GET `/caisse/transactions`, `/stocks`, `/wallets/me`, `/tontines/mes-tontines` **sans token → 401** (fail-closed). Login → **429 ThrottlerException persistant** (>5 min de bannissement) : anti-brute-force actif mais sondes IDOR-with-token non réalisables → vérification IDOR faite **statiquement** : scoping `user.id` systématique (caisse :198-199,222,564-567 ; credits :19,137-142 ; stocks :93,124,194,265-268 ; commandes :53-55,193,207,222,319 ; tontines :102-108,181-186 ; wallets :28,35,207 ; fidelite :40-44,220) + 404 non-divulgateur à l'annulation (`caisse-rest.controller.ts:222`).

## 5. Points forts

1. **Vente = une transaction atomique** : verrou FOR UPDATE, idempotence unique `(idempotency_key, user_id)` + rattrapage `23505` (`caisse-rest.controller.ts:730-821`) — exactement l'ADR-001/I1/I2.
2. **Survente : l'ancienne contradiction P0 est TRANCHÉE et cohérente** : la vente passe toujours, le stock est borné à 0, le manquant est journalisé (I3/ARG-18, `reconciliation-stock.ts`) ET **dit à voix haute** à la caisse (décision n°6, `POSCaisse.tsx:476-488` + `ruptureStock.ts`). Le front ne réécrit plus le stock (refetch, :489-496) — fin de la « double autorité ».
3. **Outbox offline de qualité production** : propriétaire obligatoire fail-closed (`offlineCaisse.ts:271-288`), orphelines jamais rejouées/attribuées, lettres mortes atomiques, CAP 5, ventilation par endpoint, date d'opération portée et bornée serveur.
4. **Journée de caisse** : fond journalisé append-only (défaut/correction distingués :443-444), interdiction d'écrire d'argent après clôture partagée caisse **et** crédits (`journee-ouverte.ts`, CAI-09), double fermeture refusée (CAI-10), écart = incident loggé.
5. **Wallets/tontines** : verrous pessimistes, idempotence par clé client, `soldeBloque` respecté, B-Pay callback à secret + double vérification fournisseur + cron de réconciliation 5 min + rollback de retrait.
6. **Voice-first massif** : 42+ gardes CI caisse/voix (`test:machine-encaissement`, `grammaire-encaissement`, `vente-hors-ligne-statut`, `caisse-relecture-affichee`…), relecture « s'entend ET se voit », haptique différenciée, tutoiement gardé (`caisseTutoie.test.mts`).
7. **PII/PIN propres** sur le périmètre ; MesDonnées conforme à l'esprit loi 2013-450.

## 6. Recommandations de correction

1. **MARCHAND-01** : avant toute réactivation, verdir I4/I5/I6 (tests d'invariants réels) ; d'ici là, neutraliser serveur aussi (feature flag env `CREDIT_ACTIF=false` + 403 dans `credits.controller.ts`), pas seulement la constante front.
2. **MARCHAND-02** : remplacer le DELETE dur par `actif=false` (le flag existe déjà : `caisse-rest.controller.ts:763`) + mouvement d'archive ; renvoyer 404 si 0 ligne.
3. **MARCHAND-03** : réutiliser `montantValide`/`nombreSaisi` (caisse-rest) dans `stocks-rest` POST/PATCH ; refuser `quantite<0`, `prix<0`, promo<0.
4. **MARCHAND-04** : migrer BaseModal/PinConfirmModal/CreditModal vers Radix `Dialog` (focus trap, ESC, `aria-modal`, retour focus) — ACCESSIBILITY_GUIDE §5.
5. **MARCHAND-05** : porter les 8 cibles <44 px à `min-h/min-w 44` et ÉTENDRE `test-cible-tactile.mjs` aux écrans marchand (panier MarcheVirtuel, PIN).
6. **MARCHAND-07** : `SELECT … FOR UPDATE` sur la ligne `fidelite_clients` avant décrément (même motif que wallets).
7. **MARCHAND-08** : écrire une entrée `reouverture` dans `caisse_fond_journal` (ou table événements) à la réouverture.
8. **MARCHAND-09** : valider `Number.isFinite(montant)` + plafond 10 M sur recharge/retrait.
9. **MARCHAND-10** : imposer `idempotency_key` sur `POST /caisse/transactions` (motif acompte) ou la fermer.
10. **MARCHAND-11** : throttler dédié + ne renvoyer que le prénom tronqué tant que le transfert n'est pas confirmé.

## 7. Matrice de recette

| Domaine | À vérifier | Critère d'acceptation |
|---|---|---|
| Auth/rôles | routes `/marchand/*` et API sans token | 401 partout (vérifié sur 4 endpoints) |
| Autorisation | vente/stock/commande/tontine d'un AUTRE marchand par id | 403/404, zéro fuite (statique OK, à prouver au token) |
| Argent | vente rejouée (même clé, 3 envois concurrents) | 1 seule écriture, marge/CA inchangés |
| Argent | vente offline 23h55 → synchro 00h05 | rattachée au bon jour (`date_operation` bornée) |
| Clôture | vente/dépense/acompte après fermeture | 409 « rouvre ta journée » ; double fermeture refusée |
| Fond | correction de fond ×2 | 2 lignes `caisse_fond_journal` (declaration/correction) |
| Stock | vente > stock | vente OK, stock=0, `manquant` journalisé, phrase dite |
| Stock | PATCH offline puis rejeu | 1 seule application (`stock_operation_idempotency`) |
| Offline | crash pendant synchro, file mixte 4xx/5xx | 4xx→lettre morte, 5xx→retry, ordre préservé, rien perdu |
| A11y | fond/clôture au clavier seul + lecteur | focus trap + ESC + retour focus (aujourd'hui NON conforme) |
| A11y | boutons panier MarcheVirtuel | ≥44 px mesurés |
| Voix | « encaisse » → relecture → « oui valide » | 1 seule exécution de handlePay, empreinte stable |
| Voix | montant reçu dicté | refusé — saisie billets uniquement |
| Données | MesDonnées / suppression compte | anonymisation, PIN jamais journalisé |

## 8. Tests critiques recommandés

1. Concurrency vente : 3 × `POST /caisse/vente` même `idempotency_key` → 1 transaction, 1 décrément stock.
2. Crash-recovery offline : vente → kill app → sync → kill pendant rejeu → re-sync (clé stable, pas de doublon).
3. Fermeture puis écriture : `POST session/fermer` puis vente, dépense, acompte → 409 systématique (y compris via crédits).
4. Annulation self-service : annulation d'une vente d'hier → 400 ; d'un autre marchand → 404 ; stock rendu + mouvement `annulation` présent.
5. IDOR au token marchande : `PATCH /commandes/:id`, `POST /caisse/credits/:id/acompte`, `GET /tontines/:id` d'autrui → 403/404.
6. Stocks : `POST /stocks {quantite:-5, prix:-10}` → doit être refusé (aujourd'hui accepté).
7. Fidélité : 2 × utiliser concurrents → jamais de points négatifs.
8. Clôture : écart −500 → `ecart=-500` persisté + WARN log ; seconde fermeture → 400.
9. Wallet : retrait B-Pay en échec → solde restauré (rollback) + `bpay_transactions.status=FAILED`.
10. A11y runtime : modale fermeture de journée au clavier seul (Tab/ESC) — doit échouer aujourd'hui (pré-correction MARCHAND-04).

## 9. Synthèse des actions prioritaires

| Priorité | Action | Effort |
|---|---|---|
| P1 | MARCHAND-01 : feature flag serveur crédit + verdir I4/I5/I6 avant réactivation UI | M |
| P2 | MARCHAND-03 : validation positivité stocks-rest | S |
| P2 | MARCHAND-02 : soft-delete produits + 404 | S |
| P2 | MARCHAND-04 : Radix Dialog sur fond/clôture/PIN/crédit | M |
| P2 | MARCHAND-05 : cibles ≥44 px + extension garde CI | S |
| P3 | MARCHAND-07..11 : verrou fidélité, journal réouverture, bornes recharge, idempotence porte secondaire, throttle destinataire | S (chacun) |

## 10. Scores proposés

| Dimension | Score | Justification éclair |
|---|---|---|
| Accessibilité | 72/100 | Caisse exemplaire (ARIA, deux formes, haptique) ; modales maison et cibles 32 px hors garde |
| Sécurité | 80/100 | Scoping IDOR systématique, 401 fail-closed vérifiés, webhook secret, throttler ; stocks non validés |
| Argent/intégrité | 84/100 | Vente/outbox/clôture/wallets remarquables ; I4/I5/I6 rouges, DELETE dur, stocks négatifs |
| Voice-first | 88/100 | Doctrine appliquée au parcours (pas à l'écran), grammaire exacte, rupture parlée, gardes denses |
| Qualité | 76/100 | 28 gardes .mts + doctrine commentée ; dette : écrans secondaires inégaux, escrow vide |
| Global | 80/100 | Cœur métier (caisse) au niveau attendu du pilote espèces |

## 11. Conclusion + statut

Le périmètre MARCHAND a changé de nature depuis l'audit du 28/09 : les trois risques initiaux sont désormais **tranchés dans le code** — la contradiction sur la survente est résolue par une politique unique (vente jamais bloquée, manquant journalisé et dit, stock backend-autoritaire), le replay offline de stock est idempotent bout en bout, et le crédit est gelé en UI avec une chaîne serveur repensée. Les résidus sont des **valses de validation** (stocks libres, recharge) et de **sémantique d'accessibilité hors caisse** (modales maison, cibles 32 px) — sérieux pour des non-lectrices via clavier/lecteur, mais sans impact sur l'argent en conditions nominales. La sonde runtime confirme le fail-closed (401 ×4) et un throttling de login effectif ; les vérifications IDOR au token restent à rejouer en recette (429 empêché l'obtention du jeton).

**Statut : CONFORME SOUS CONDITIONS** — conditions : (1) garder `CAISSE_CREDIT_ACTIF=false` jusqu'à verdissement I4/I5/I6 + neutralisation serveur ; (2) fermer MARCHAND-02/03 avant toute exposition multi-acteurs de `/stocks` ; (3) recette IDOR au token + modales d'argent au clavier (MARCHAND-04) avant prochain pilote terrain.
