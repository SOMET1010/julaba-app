# AUDIT ACTEUR — MARCHAND — 2026-10-19

> **Mission** : audit statique de première main, 2ᵉ vague par acteur (Task 45-a) — re-vérifier les 11 constats du 05/10, les constats comptables transverses C-xx/M-xx, la fix C-01 du 12/10, le delta git depuis le 05/10, et re-confirmer les preuves bancaires de la caisse POS.
> **Périmètre** : `frontend/src/app/components/marchand/` (55 fichiers : 35 `.tsx` ≈ 15 581 l. + 20 gardes `.mts` ≈ 2 708 l.), `pages/marchand/MesDonnees.tsx` (668), routes `/marchand/*` (`routes.tsx:67-97`, 28 routes + keiwa/support), `contexts/CaisseContext.tsx` (1 068), `WalletContext.tsx` (190), `voice-offline/` (déplacé sous `frontend/src/app/voice-offline/`, `offlineCaisse.ts` 546 l.), `services/machineEncaissement.ts` (301) ; backend `caisse-rest/` (1 053+268+205…), `stocks-rest/` (271), `commandes-rest/`, `tontines/`, `wallets/` (289+577), `bpay/` (208+203), `fidelite-rest/` (292), `transactions-rest/`, `marches/`, `scores/`, `revenus/`.
> **Méthode** : relecture du code réel à `dev@04ae652` (JAMAIS les numéros des audits antérieurs relocalisés par preuve propre), registres (`BUGS.md`, `SEC_BUGS.md`, `DEBT_REPORT.md`, `INCIDENTS.md`), audit marchand 05/10, audit comptable 12/10 (C-01..C-17, M-01..M-09), `git log --since=2026-10-05`. Lecture seule : aucune exécution, aucune modification.
> **Auteur** : agent Z.ai Code Task 45-a — 19/10/2026.

## 1. Identité et périmètre

- **Rôle** : `marchand` — sous-profils grossiste / demi-grossiste / détaillant (`POSCaisse.tsx:91-94` lit `user.sousProfilMarchand`, `estNegoce` change le geste prix/quantité).
- **Frontend** : POSCaisse 1 904 l. (cœur), GestionStock 1 399, MarcheVirtuel 1 412, MarchandModals 1 175, MicroVenteCaisse 987, VentesPassees 896, MesCommandes 780, CreditModal 525, ResumeCaisse 520, MarchandDepenses 480, Tontines/Fidelite/ProtectionSociale/MaCooperative/RecoltesPrevues… + primitives partagées `components/argent/RelectureArgent`/`PinArgent` (adoptées par MaCooperative :4,365).
- **Backend** : `caisse-rest.controller.ts` 1 053 l., `credits.controller.ts` 268, `encaisser-credit.ts` 205, `journee-ouverte.ts` 52, `date-operation.ts`, `stock-restitution.ts`, `marge-vente.ts` ; `stocks-rest.controller.ts` 271 ; `wallets.controller.ts` 289 + `wallets.service.ts` 577 ; `bpay.controller.ts` 208 + `bpay.cron.ts` 203 ; `fidelite-rest.controller.ts` 292 ; `commandes-rest.controller.ts` ; `tontines.service.ts`.
- **Lectures préalables** : AUDIT-ACTEUR-MARCHAND-2026-10-05, AUDIT-COMPTA-ACTEURS-2026-10-12, BUGS/SEC_BUGS/DEBT_REPORT/INCIDENTS, worklog (Tasks 38-44).

### Évolutions depuis le 05/10 (delta git + verdicts)

| Commit | Contenu | Verdict vérifié |
|---|---|---|
| `968c454` (BUG-011) | MarcheVirtuel : verrou synchrone + PIN honnête | ✅ tient — verrou anti double-tap + fermeture refusée pendant l'envoi |
| `e780436`/`4ab3452`/`14662b9` | T7 : échecs ÉCRITS (POSCaisse:552, MesCommandes, DepenseForm) ; Tontines 3 phrases | ✅ tient — toast apparié à la voix |
| `1f44736` (ARG-17) | montants dictés en toutes lettres (MarcheVirtuel, Stocks) | ✅ tient |
| `265062e` (merge main, PIE 07/10) | A1 ComplementEtal, A2 file hors-ligne, A3 « encaisser » | ✅ A1 : `ComplementEtal.tsx` n'importe plus la caisse (1-23) ; A2 : `offlineCaisse.ts:296-306` (armer la relance à l'enfilement) ; A3 : `i18n/voice/locales/fr-ci/intents.ts:68-78` (variantes ASR bornées) |
| `a0d56f5`+`35ae18d` (12/10) | **C-01 réconciliation retraits** | ✅ **FERMÉ** bout en bout (cf. §3) — résidus C-07 (unicité/HMAC) restants |
| `ee0b4a0` | module backend `escrow/` SUPPRIMÉ | ⚠️ aggrave C-16 : le client simule toujours un escrow qui n'a plus de socle |
| `e04fa73` → `04ae652` (13→15/10) | Rapport + Dev Mode retirés puis **réinstallés** | ⚠️ **NOUVEAU P2** : ProfileSwitcher gated `import.meta.env.DEV` (`AppLayout.tsx:195`, `BOLayout.tsx:1362,1449`, `IdentificateurLayout.tsx:82`) mais le bouton 🐞 Rapport **N'EST PAS gated** (`AppLayout.tsx:172-192`) → livré en production sur les 28 routes `/marchand` (montées dans `AppLayout`, `routes.tsx:67`) ; + 3 couleurs en dur (`:186`) |

## 2. Fonctionnalités observées dans le code (état dev@04ae652)

- **Caisse** : vente transactionnelle unique (`caisse-rest.controller.ts:730-821`), relecture parlée+affichée (`POSCaisse.tsx:610-697`), mobile money **et** crédit gelés par constantes (`POSCaisse.tsx:53,60`), sous-profil négoce (`:91-94`), échec écrit T7.
- **Offline** : outbox IndexedDB propriétaire fail-closed (`offlineCaisse.ts:281-284`), clé stable (`CaisseContext.tsx:55-60,621,669`), REPLAY_CAP 5 (`offlineCaisse.ts:30`), 4xx lettre morte / transitoire retry, lettres mortes atomiques (`:193`), statut opposé `confirmee|en_attente` (`CaisseContext.tsx:632-652`), relance armée à l'enfilement (A2).
- **Stock** : PATCH idempotent `stock_operation_idempotency` (`stocks-rest.controller.ts:207-219`), lecture du ledger append-only (`:79-88`), réconciliation ARG-18 (manquant journalisé `caisse-rest.controller.ts:787-806`).
- **Argent Keiwa** : recharge/retrait B-Pay avec **réconciliation complète des retraits** (C-01, cf. §3) ; transfert idempotent à double verrou ordonné (`wallets.service.ts:225-234`) ; keiwa **masqué en pilote** (`config/modulesPilote.ts:74-78`).
- **Fidélité** : gain/usage idempotents, événements tracés ; **Tontines** : verrou `pessimistic_write` (`tontines.service.ts:177`) ; **Commandes** : index unique partiel `ux_wallet_tx_commande_idempotence` (`commandes-rest.controller.ts:298-299`).
- **Voix** : grammaire « phrase ENTIÈRE ou rien » (`grammaireEncaissement.ts`), A3 formes ASR, relecture spontanée deux formes (`POSCaisse.tsx:676-697`), haptique différenciée (`:509-528`).
- **Mes données** (loi 2013-450) : suppression de compte avec mot de passe (`MesDonnees.tsx:148,175-182`).

## 3. Constats détaillés

**MARCHAND-01 [P1] 05/10 → 19/10 — Crédit gelé en UI seulement ; I4/I6 toujours `it.failing` (I5 promu)** — Toujours valable, nuance I5. `POSCaisse.tsx:53` + `VentesPassees.tsx:43-45` (constantes) ; garde de source `creditHorsPilote.test.mts:43-46` ; mais `credits.controller.ts:31-120` (POST création **sans idempotence** ni contrainte unique sur `credits`, pas de flag 403) reste appelable en API directe. Évolution : `blockers.spec.ts:98` I5 promu `it()` vert (ARGENT-4/4b) alors que `:64` (I4) et `:109` (I6) restent `it.failing` — le 05/10 disait « I4/I5/I6 rouges » : à corriger au registre.

**MARCHAND-02 [P2] 05/10 → 19/10 — DELETE /stocks/:id supprime PHYSIQUEMENT** — Toujours valable : `stocks-rest.controller.ts:262-270` (`DELETE FROM produits WHERE id=$1 AND marchand_id=$2`, `{success:true}` même à 0 ligne).

**MARCHAND-03 [P2] 05/10 → 19/10 — Pas de validation de positivité stocks** — Toujours valable : POST `:147-167` (`Number(body.quantite) || 0` conserve −5) ; PATCH `:180,195` passe par `quantiteAEcrire` (`commun/quantite-a-ecrire.ts:30-37`) qui garantit le nombre fini mais **pas la positivité** ; prix/promo idem.

**MARCHAND-04 [P2] 05/10 → 19/10 — Modales maison sans sémantique dialog** — Toujours valable : `BaseModal` (`MarchandModals.tsx:52-89`, aucun `role="dialog"`/`aria-modal`/ESC/focus trap, fond = fermeture) ; `PinConfirmModal.tsx` (0 `role`/`aria`/`onKeyDown` sur tout le fichier) ; `CreditModal.tsx:315` (seul `aria-hidden`). La caisse, elle, reste exemplaire (`role="status"` aria-live).

**MARCHAND-05 [P2] 05/10 → 19/10 — Cibles tactiles 32 px hors caisse** — Toujours valable : `MarcheVirtuel.tsx:772,821,921,923,966` (`w-8 h-8` filtre/favoris/± panier), `Tontines.tsx:338` (retrait membre), `Fidelite.tsx:257`, `ProtectionSociale.tsx:274`, `PinConfirmModal.tsx:125`.

**MARCHAND-06 [P3] 05/10 → 19/10 — Couleurs en dur hors caisse (ratchet)** — Toujours valable, légèrement **aggravé** : garde `charteMarchande.test.mts` (plafonds par fichier, `:52-71`) intact ; mais `04ae652` a ajouté 3 couleurs inline dans **AppLayout** (`:186` `#7A4A24/#F5D6BD/#D9A87A`), fichier **absent de la table PLAFONDS** → hors cliquet, sur un layout partagé par tous les écrans marchand. Exemples 05/10 re-confirmés : `GestionStock.tsx:1190,1214,1217`.

**MARCHAND-07 [P3] 05/10 → 19/10 — Course check-then-update fidélité** — Toujours valable : `fidelite-rest.controller.ts` (route `utiliser`) lit `SELECT id, points` puis `UPDATE points = points - $1` **sans `FOR UPDATE`** (à la différence de wallets `:186-189`) ; deux « utiliser » concurrents passent les points en négatif. L'idempotence par clé ne couvre que le rejeu.

**MARCHAND-08 [P3] 05/10 → 19/10 — Réouverture de journée non journalisée** — Toujours valable : `caisse-rest.controller.ts:389-397` (`heure_fermeture = NULL` sans entrée dédiée dans `caisse_fond_journal`).

**MARCHAND-09 [P3] 05/10 → 19/10 — Recharge/retrait : montant non borné, NaN admis** — Toujours valable **et étendu** : recharge `wallets.controller.ts:46-47` (`Math.round(NaN)=NaN`, `NaN<200` faux → passe, pas de plafond) ; retrait `:107-108` même trou, et les gardes de `debitWallet` (`wallets.service.ts:180-183` `montant<=0`, `>10M`) sont **contournées par NaN** (comparaisons fausses) → `solde - NaN = NaN` persisté. Mitigation pilote : keiwa masqué (`modulesPilote.ts:74-78`) ; en API directe la brèche reste.

**MARCHAND-10 [P3] 05/10 → 19/10 — POST /caisse/transactions sans idempotence (C-05)** — Toujours valable : `caisse-rest.controller.ts:245-287` — `repo.save()` nu `:269-286` pour `depense|remboursement|ajustement`, sans garde de journée fermée, `remboursement/ajustement` hors `caisseTheorique` (`:456-492` ne lit que vente/acompte_credit/reglement_credit/depense). Le front ne l'appelle jamais en écriture.

**MARCHAND-11 [P3] 05/10 → 19/10 — Énumération de comptes par destinataire** — Toujours valable : `wallets.controller.ts:198-219` renvoie id/prénom/nom/téléphone, aucun throttler dédié (global seul, `app.module.ts:73`).

**MARCHAND-12 [P2] NOUVEAU — Instrument de recette en production, non gated** — `AppLayout.tsx:172-192` : bouton 🐞 « Rapport » fixe, visible sur **toutes** les routes marchand (`routes.tsx:67`), **sans** `import.meta.env.DEV` — son propre commentaire (`:170`) dit « À RETIRER QUAND LE PILOTE SERA QUALIFIÉ » ; contraste : le ProfileSwitcher voisin est gated (`:195`). Vecteur bruit/PII du journal de voix (`vlogPartager`) copiable en un tap par une utilisatrice réelle ; hors charte.

**MARCHAND-13 [P3] NOUVEAU — CAI-09 hors transaction pour vente/dépense (TOCTOU)** — `caisse-rest.controller.ts:697` (vente) et `:843` (dépense) appellent `exigerJourneeOuverte` **avant** d'ouvrir la transaction (`:730-732`), via DataSource ; les crédits l'appellent DANS la transaction (`credits.controller.ts:158,207`) — `journee-ouverte.ts:21-24` documente précisément les deux variantes et la fenêtre. Fermeture concurrente entre contrôle et INSERT = argent écrit dans une journée gravée.

## 4. Risques et vulnérabilités

| ID | Risque | Catégorie | Criticité | Vecteur |
|---|---|---|---|---|
| MARCHAND-01 | Crédit réactivable serveur, I4/I6 `it.failing` | argent/intégrité | P1 | POST/PATCH `/caisse/credits*` en direct |
| MARCHAND-02 | Suppression physique catalogue | stock | P2 | DELETE `/stocks/:id` |
| MARCHAND-03 | Stock/prix négatifs écrits | stock | P2 | POST/PATCH `/stocks` |
| MARCHAND-04 | Modales d'argent sans focus trap/aria | a11y | P2 | Clavier/lecteur /marchand |
| MARCHAND-05 | Cibles 32 px (panier, PIN, tontine) | a11y | P2 | Geste au marché |
| MARCHAND-12 | Bouton Rapport en prod, journal copiable | PII/qualité | P2 | Build production, tous écrans |
| MARCHAND-07 | Points fidélité négatifs (course) | intégrité | P3 | POST `/fidelite/utiliser` ×2 |
| MARCHAND-09 | NaN → solde wallet corrompu / recharge aberrante | argent | P3 | API directe, montants non numériques |
| MARCHAND-13 | Écriture d'argent sur journée fermée (fenêtre) | argent/audit | P3 | Fermeture concurrente d'une vente |
| MARCHAND-08/10/11 | Réouverture non journalisée / porte secondaire / énumération | audit/PII | P3 | API directe |

C-07 reste ouvert pour le marchand : `bpay_transactions` sans unicité `pay_token`/`merchant_tx_id` (`db-init.service.ts:667-680`, `BaselineSchema.ts:228-238` : aucune contrainte UNIQUE) et webhook à secret partagé header, sans HMAC (`bpay.controller.ts:28-34`, SEC-022). Catégories vierges : escrow supprimé serveur (C-16 côté client persiste) ; aucune PII en log constatée côté caisse ; PIN jamais journalisé.

## 5. Points forts

1. **La caisse POS reste bancaire et PROUVÉE** : transaction unique + `FOR UPDATE` (`:759-771`), idempotence `(idempotency_key, user_id)` + rattrapage `23505` (`:640-642,810-818`), ledger `stock_mouvements` dans la MÊME transaction (`:797-806`), survente ARG-18 tracée, marge ligne à ligne et perte assumée (`:661-694`), date comptable bornée serveur (`:728,744-748`).
2. **Journée de caisse** : CAI-02/CAI-09 partagés (`journee-ouverte.ts:37-52`), double fermeture refusée CAI-10 (`:534-538`), clôture calculée serveur avec acomptes **et** règlements (`:456-492`), écart = incident loggé (`:551-558`).
3. **Outbox offline production-grade** et maintenant **auto-réveillée** (A2) : propriétaire fail-closed, 4xx lettre morte atomique, cap 5, ordre préservé.
4. **C-01 FERMÉ** (12/10) : retrait = débit avant appel + PENDING_WITHDRAW + statut opérateur vérifié + remboursement à transition unique + webhook + cron + alerte 24 h + front honnête — exactement la prescription de l'audit comptable.
5. **Clicets CI vivants** : charte marchande à plafonds décroissants, garde crédit hors pilote (source), gardes voix/machine, invariants I1/I2/I3/I5 verts contre postgres réel.
6. **Voice-first consolidé** : T7 (échecs écrits), A3 (formes ASR), ARG-17 (montants en lettres), honnêteté du retrait (`WithdrawWalletModal`, 35ae18d), verrou anti double-tap généralisé.

## 6. Recommandations de correction

1. **MARCHAND-01/C-04** : avant réactivation du crédit — flag serveur (403 sur `credits.controller.ts` tant que I4/I6 sont `it.failing`) + idempotence de création (contrainte unique `credits`).
2. **MARCHAND-12** : enrober le bouton Rapport de `import.meta.env.DEV` (une ligne, aligné sur `:195`) — ou variable `VITE_PILOTE_RECETTE`; l'exclure du build APK pilote.
3. **MARCHAND-09** : `Number.isFinite` + plafond 10 M sur recharge **et** retrait (le retrait après C-01 est devenu le chemin critique du wallet).
4. **MARCHAND-13** : passer vente/dépense sous la variante QueryRunner (lecture CAI-09 DANS la transaction, comme les crédits).
5. **C-07** : unicité DB `pay_token`/`merchant_tx_id` + HMAC webhook (chantier transverse déjà listé P1 au 12/10).
6. **MARCHAND-02/03** : soft-delete produits + refus négatifs dans `stocks-rest` (réutiliser `montantValide`).
7. **MARCHAND-04/05** : Radix Dialog sur BaseModal/PinConfirmModal/CreditModal ; cibles ≥ 44 px et extension du garde tactile aux écrans marchand.
8. **C-05/C-06** : condamner ou mettre au niveau `POST /caisse/transactions` ; refuser `PATCH /session/fond` sur journée fermée (ou re-graver l'écart).
9. **C-09** : une seule primitive de solde UI (l'écriture est une, l'affichage est trois).
10. **C-16/C-17** : supprimer l'escrow simulé de `WalletContext.tsx:118-139` et `AppContext.addTransaction` (`:818-880`, 0 appelant).

## 7. Matrice de recette

| Domaine | À vérifier | Critère d'acceptation |
|---|---|---|
| Argent | vente rejouée ×3 même clé (en ligne + hors ligne) | 1 écriture, 1 décrément, marge inchangée |
| Argent | retrait B-Pay : opérateur FAILED / timeout / webhook concurrent | 1 seul remboursement, `REFUNDED`, notif, solde restauré |
| Retrait | retrait PENDING_WITHDRAW > 24 h | alerte ERROR dans les logs + regard humain |
| Clôture | vente après `session/fermer` | 409 « rouvre ta journée » (y compris crédit) |
| Clôture | fermeture concurrente d'une vente en vol | refuse (post-fix MARCHAND-13) |
| Offline | crash pendant synchro, file mixte 4xx/5xx | lettre morte vs retry, ordre, rien perdu |
| Stock | vente > stock | vente OK, manquant journalisé et DIT |
| Stock | POST `/stocks {quantite:-5}` | refusé (aujourd'hui accepté — MARCHAND-03) |
| A11y | fermeture de journée au clavier + lecteur | focus trap + ESC (aujourd'hui NON conforme) |
| Prod | build production : bouton Rapport absent | post-fix MARCHAND-12 |
| IDOR | vente/stock/tontine d'autrui au token marchande | 403/404 (statique OK, à rejouer au jeton) |
| Voix | « dis encaisser » (ASR « en caisser ») | relecture parlée, jamais de paiement sans « oui valide » |

## 8. Tests critiques recommandés

1. Concurrency retrait : webhook + cron + rollback synchrone sur le même `merchant_tx_id` → exactement un `REFUNDED` (transition `WHERE status='PENDING_WITHDRAW'`).
2. NaN : `POST /wallets/me/retrait-mobile {montant:"abc"}` → 400 (aujourd'hui le NaN traverse les gardes).
3. Écriture d'argent pendant fermeture de journée (race MARCHAND-13) → 409.
4. Double `utiliser` fidélité concurrent → jamais de points négatifs (pré-correction : échoue).
5. Crédit : rejeu de POST `/caisse/credits` identique → 1 seule dette (I4, aujourd'hui rouge).
6. TOCTOU fond : `PATCH /session/fond` après fermeture → refus (C-06, aujourd'hui accepté).
7. A11y runtime : modale clôture au clavier seul (pré-correction MARCHAND-04 : échoue).
8. Build prod : snapshot du DOM `/marchand` sans bouton Rapport (garde CI).

## 9. Synthèse des actions prioritaires

| Priorité | Action | Effort |
|---|---|---|
| P1 | MARCHAND-12 : gate `import.meta.env.DEV` sur le bouton Rapport (+ rebuild APK) | S |
| P1 | MARCHAND-01 : flag serveur crédit tant que I4/I6 rouges (avant toute réactivation) | S-M |
| P2 | MARCHAND-09 : validation numérique stricte recharge/retrait | S |
| P2 | MARCHAND-13 : CAI-09 dans la transaction vente/dépense | S |
| P2 | MARCHAND-02/03 : soft-delete + positivité stocks-rest | S |
| P2 | MARCHAND-04/05 : Radix Dialog + cibles 44 px + garde CI étendue | M |
| P3 | C-07 (transverse) : unicité pay_token + HMAC ; C-05/C-06 ; C-09 ; C-16/C-17 ; MARCHAND-07/08/10/11 | S chacun |

## 10. Scores proposés

| Dimension | Score | Justification éclair |
|---|---|---|
| Accessibilité | 73/100 | Caisse exemplaire, T7 écrit désormais partout ; modales maison sans dialog, cibles 32 px, rien n'a bougé hors caisse |
| Sécurité | 81/100 | Scoping IDOR systématique, C-01 réconcilié ; bouton Rapport en prod (MARCHAND-12), NaN wallets, énumération |
| Argent/intégrité | 86/100 | C-01 fermé, I5 promu, caisse toujours bancaire ; restent I4/I6, C-05/C-06, fenêtre TOCTOU MARCHAND-13 |
| Voice-first | 90/100 | A3 + T7 + ARG-17 + retrait honnête : les trous terrain PIE 07/10 fermés et prouvés par gardes |
| Qualité | 77/100 | Gardes denses (20 gardes marchand + creditHorsPilote + voice-offline), ratchet charte ; AppLayout échappe au cliquet |
| Global | 82/100 | Le cœur métier (caisse POS + offline) est au niveau bancaire espéré ; le résiduel est borné, listé, et n'atteint pas l'argent nominal |

## 11. Conclusion + statut

Depuis le 05/10, le périmètre marchand a **progressé sur ses flancs voix et wallet** : les retours terrain PIE 07/10 (stock sans doublon, file hors-ligne auto-réveillée, « encaisser » coupé par l'ASR) sont corrigés et gardés, la réconciliation des retraits mobile money (C-01) est livrée de bout en bout — débit avant appel assumé, statut opérateur exigeant, remboursement à transition unique, webhook + cron + alerte 24 h + messages honnêtes — et l'invariant I5 est promu. Les 11 constats du 05/10 restent **tous valables sans exception** (MARCHAND-06 légèrement aggravé par des couleurs hors cliquet, MARCHAND-09 étendu au retrait via NaN) : aucune régression active, aucune correction des P2/P3 existants non plus. Deux constats nouveaux : l'instrument de recette non gated livré en production (MARCHAND-12) et la fenêtre CAI-09 hors transaction sur vente/dépense (MARCHAND-13). Le pilote espèces de la marchande reste le flux le plus solide de la plateforme ; les conditions du 05/10 tiennent et s'étendent au gating du bouton Rapport.

**Statut : CONFORME SOUS CONDITIONS** — (1) garder `CAISSE_CREDIT_ACTIF=false` jusqu'à verdissement I4/I6 + neutralisation serveur du crédit ; (2) gate le bouton Rapport (`import.meta.env.DEV`) avant le prochain build APK pilote ; (3) fermer MARCHAND-09 (NaN) et MARCHAND-13 (CAI-09 en transaction) avant toute exposition de l'API wallets/caisse au-delà du pilote ; (4) recette IDOR au jeton + modales d'argent au clavier (MARCHAND-04) avant prochain pilote terrain.
