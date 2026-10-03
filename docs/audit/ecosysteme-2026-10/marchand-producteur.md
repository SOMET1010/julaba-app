# Audit lecture seule : MARCHAND (hors caisse) + PRODUCTEUR

Branche `claude/clever-allen-dnr8by`. Aucune modification du dépôt. Chemins relatifs à `frontend_src/src/app/` (front) ou `backend/src/` (back), sauf mention contraire.
La caisse (POSCaisse, MicroVenteCaisse, ResumeCaisse, VentesPassees, clôture et fond de caisse) relève de RC1 : elle est citée ici, pas auditée.
Sonde exécutée : `scratchpad/marchand-producteur/sonde-producteur.mts` (`npx tsx`, sans réseau ni base de données).
Tests isolés lancés, tous verts : `components/marchand/refusHorsLigneCommande.test.mts`, `components/marchand/gesteAjouterProduit.test.mts`, `services/categorieDepense.test.mts`.

## 1. Tableau de synthèse

| Élément | Statut | Preuve courte | Prochaine action |
|---|---|---|---|
| **Paiement Keiwa de commande** (`POST /commandes/:id/paiement`) | 🔴 | Le vendeur déclenche le débit du wallet de l'acheteur. Ni consentement, ni PIN de l'acheteur, ni vérification « livrée / non annulée » côté serveur (`commandes-rest.controller.ts:190-290`). En `vente_directe`, l'`acheteur_id` est libre et `total` et `statut` sont fixés par le client (l.108, 113-119) | Correctif serveur avant toute ouverture de Keiwa. Ouvrir une ligne au registre |
| **Protection sociale** : cotisation en mode « keiwa » | 🔴 | Débit réel du wallet, sans PIN, sans contrepartie (aucun crédit, aucun organisme), avec une clé d'idempotence générée par le serveur (`protection-sociale.controller.ts:93,99-134`) | Masquer pour le pilote. Exiger PIN + clé client |
| **Tontines** : « Cotiser » | 🔴 (hors pilote) | Un seul toucher débite réellement le wallet, sans PIN ni confirmation (`TontineDetail.tsx:63-71,217` → `tontines.service.ts:213`) | Masquer pour le pilote |
| **Ma coopérative** : « Payer ma cotisation : 25 000 FCFA » | 🔴 (comptable) | Aucun argent ne bouge, mais une entrée `validee` de 25 000 F est écrite dans la trésorerie de la coopérative à chaque toucher. Montant en dur. Le toast « payée avec succès » s'affiche même si le serveur renvoie `{success:false}` (`MaCooperative.tsx:156-165`, `cooperatives-rest.controller.ts:819-842`) | Masquer. Corriger le message |
| **Marché virtuel** : « paiement » | 🟠 | Il affiche « Paiement … effectué avec succès » (carte, mobile money, wallet) alors qu'il ne fait que créer des commandes `en_attente`. Le n° de carte est saisi puis jeté. Un échec partiel suivi d'un nouvel essai crée des doublons (`MarcheVirtuel.tsx:407-456,473-489,549-582`) | Masquer pour le pilote |
| Marché virtuel : signaler | 🟠 | `POST /signalements` : aucune route backend ne correspond (routes.tsv) | Brancher ou retirer |
| **Commandes (marchand)** : onglet de la barre du bas | 🟠 pilote | Hors pilote, mais c'est 1 des 3 onglets (`roleConfig.ts:105`). Il donne accès à confirmer, livrer et « récupérer paiement » (`MesCommandes.tsx:75,193-268,748`) | Arbitrage Patrick : retirer l'onglet |
| Accueil marchand (MarchandAccueilVoice) | ✅ | Données réelles, état « inconnu ≠ 0 » (`MarchandAccueilVoice.tsx:41-78`). Tuiles : stock, dépenses, ventes. Keiwa retiré (l.212) | — |
| Stock / étal (GestionStock) | 🟡 | `/stocks` réel (`stocks-rest.controller.ts:90-145`). Les mouvements tombent sur `[]` en cas d'erreur (`GestionStock.tsx:439-446`). Dettes connues : STK-02, 03, 04 | — |
| Dépenses (cahier + DepenseForm) | 🟡 | Écriture correcte (idempotence, file hors ligne : `CaisseContext.tsx:650-675`). Lecture « faux zéro » : KPI à 0 et « Aucune dépense » si les transactions ne sont pas chargées (`MarchandDepenses.tsx:205-207,457`) | Reprendre la règle ACC-01 sur cet écran |
| Alertes marchand | 🟡 | Calcul local sur le stock. Affiche « Tout va bien, stock bien garni » quand le stock est vide ou non chargé. Une alerte écartée est masquée pour toujours, par id produit (`MarchandAlertes.tsx:176-188`). Lien vers `/marchand/marche` (l.306) | Distinguer vide / non chargé |
| Profil marchand (UniversalProfil) | 🟡 | Expose Academy, Coopérative, Besoin, Tontines, Protection sociale, Fidélité et PIN Keiwa (`UniversalProfil.tsx:633-639,293-363,684`) | Masquer les entrées hors pilote |
| Paramètres | ✅/À DÉFINIR | Sessions et PIN réels (`UniversalParametres.tsx:2,341`) | — |
| Support | 🟠 pilote | Si aucune config n'est en base, l'écran affiche de **faux numéros** (`SupportConfigContext.tsx:59-62`, `misc-rest.controller.ts:166`) | Constater `support_config` en prod avant J0 |
| Fidélité | 🟡 (hors pilote) | Backend réel et idempotent. Montant d'achat déclaratif, non relié à une vente | Masquer |
| Récoltes prévues (marchand) | ✅ (hors pilote) | Lecture seule, réservée aux grossistes (`producteurs-rest.controller.ts:45-50`) | — |
| Keiwa marchand | 🟡 | Plus aucune porte dans le menu, mais route ouverte par URL (`routes.tsx:79-84`) | — |
| **Producteur : création de plantation** | 🟠 | Le front lit `res.id` alors que le back renvoie `{cycle}`. La plantation insérée en tête de liste a des champs indéfinis : id, culture, date invalide (sonde n°1) | Lire `res.cycle` |
| **Producteur : commandes dans le contexte** | 🟠 | Le front lit `data.data` alors que le back renvoie `{commandes, meta}`, donc toujours `[]` (sonde n°2). Le détail d'une récolte ne montre jamais ses commandes | Lire `data.commandes` |
| Producteur : statistiques (accueil) | ✅/🟡 | `GET /producteur/stats` est réel. Le repli client dépend des commandes, qui sont toujours vides | — |
| Producteur : `/producteur/revenus` | 🟠 lien mort | `Stocks.tsx:561`, route absente de `routes.tsx` | Corriger le lien |
| Producteur : `/producteur/stocks`, `/producteur/publier-recolte` | 🟡 orphelins | Routes déclarées, aucun lien dans l'app | Décider |
| `POST /publications/republier` | 🟠 probable | Cast vers `marche_virtuel_type_enum`, absent du schéma de référence (`publications_type_marche_enum`) | Vérifier en prod |
| Backend `/revenus` | ⏳ | Non appelé par le front. Calcule un « revenu » égal à prix × quantité de toutes les récoltes (`revenus.controller.ts:13-19`) | Supprimer ou documenter |

## 2. Accès : menus et portes d'entrée (marchand)

- **Barre du bas et barre latérale** : Accueil, **Commandes**, Moi (`config/roleConfig.ts:102-108`, rendues par `layout/BottomBar.tsx:34-39` et `layout/Sidebar.tsx:59-76`).
- **Garde de route front** : `checkRouteAccess` laisse passer tout `/marchand/*` pour un marchand (`types/constants.ts:152`). Toutes les routes hors pilote sont donc ouvertes par URL.
- **Portes hors pilote atteignables depuis l'interface** :

| Écran hors pilote | Porte d'entrée | Action d'argent possible ? |
|---|---|---|
| Commandes | onglet de la barre du bas ; Tantie (`TantieSagesseModal.tsx:162`) ; `MarcheVirtuel.tsx:1230` ; `MaCooperative.tsx:179` | **Oui** : « récupérer paiement » via `ReceptionPaiementModal`, avec PIN du vendeur seulement (`MesCommandes.tsx:748`) |
| Marché virtuel | Tantie « marché » (`TantieSagesseModal.tsx:159`) ; Alertes « Voir le marché » (`MarchandAlertes.tsx:306`) | **Oui** : création de commandes avec mode keiwa ; faux message de « paiement » |
| Récoltes prévues | `MarcheVirtuel.tsx:707` | Non |
| Academy | Moi, première carte (`UniversalProfil.tsx:633-635`) | Non |
| Ma coopérative + Besoin | Moi (`UniversalProfil.tsx:293,308`) | **Oui (comptable)** : cotisation 25 000 F déclarée « validée » |
| Tontines | Moi (`UniversalProfil.tsx:322`) | **Oui** : création de tontine et cotisation avec débit réel du wallet |
| Protection sociale | Moi (`UniversalProfil.tsx:342`) | **Oui** : débit réel du wallet en mode « keiwa » (`ProtectionSociale.tsx:321`) |
| Fidélité | Moi (`UniversalProfil.tsx:363`) | Remises en points, pas de wallet |
| Keiwa | URL seule. La tuile « Mon argent » a été retirée (`MarchandAccueilVoice.tsx:212-224`) ; le commentaire `UniversalProfil.tsx:275-277` est donc périmé. Le PIN Keiwa reste dans Moi (l.684) | Oui (domaine Keiwa) |

- **Tantie** peut aussi naviguer vers un chemin arbitraire `action.path` (`TantieSagesseModal.tsx:163-165`). Origine de `action.path` : À DÉFINIR.

## 3. Écrans marchand (hors caisse)

### Accueil — `/marchand` → `MarchandHome` → `MarchandAccueilVoice`
- `RoleDashboard` n'est plus utilisé par le marchand (`MarchandHome.tsx:1-17`).
- Le montant vient de `getTodayStats()` + `useLectureHistorique` + `useLectureSessionCaisse`. L'état « illisible ≠ 0 » est géré (`MarchandAccueilVoice.tsx:51-78,268-283`).
- Le résumé, la clôture et le fond (`ResumeModal`, `CloseDayModal`, `EditFondModal`, l.399-422) relèvent de **RC1** : non audités.
- Tuiles :
  - `/marchand/stock`
  - `/marchand/cahier`
  - `/marchand/resume-caisse` (RC1)
- Conséquence : `ScoreResumeCard` et `useScoreJULABA` (liens morts `/marchand/vendre`, `hooks/useScoreJULABA.ts:141,191,215`) ne sont plus atteignables pour le marchand. Ce n'est pas un problème actif.

### Stock / étal — `/marchand/stock` → `GestionStock`
- **Liste** : `StockContext.refreshStocks` → `stocksApi.fetchStocks` → `GET /stocks` (`stocks-rest.controller.ts:90`).
  - Lit `produits` pour le marchand, avec repli sur `stocks`.
  - Cache local servi seulement en cas de coupure réseau ; une erreur HTTP garde la liste en l'état (`StockContext.tsx:92-107`).
- **Modification** : `PATCH /stocks/:id`, idempotente via `stock_operation_idempotency` (`stocks-rest.controller.ts:169-213`). File hors ligne (`StockContext.tsx:141-153`).
- **Mouvements** : `fetch` direct (API-10) vers `/stocks/mouvements` et `/stocks/:id/mouvements`. En cas d'erreur, l'écran montre une liste vide sans le dire (`GestionStock.tsx:439-446`).
- Le PATCH écrit une **quantité absolue** (`stock=COALESCE($2,stock)`) : un réappro rejoué hors ligne après des ventes écrase les décréments. À DÉFINIR (voir STK-04).
- Dettes connues : STK-02, STK-03, STK-04, UNI-01, UNI-03 (`docs/dette/REGISTRE-MAITRE.md`).

### Dépenses — `/marchand/cahier` (MarchandDepenses) et `/marchand/depense` (DepenseForm)
- **Écriture** : `CaisseContext.enregistrerDepense` → `POST /caisse/depense` (`caisse-rest.controller.ts:827`).
  - `idempotency_key` présente et rejouée telle quelle par la file hors ligne.
  - Libellé et catégorie : DEP-01 et DEP-02 fermées.
  - Test `categorieDepense` vert.
- **Lecture** : `AppContext.transactions` filtrées sur les dépenses (`MarchandDepenses.tsx:198-207`).
  - Pas d'état « non lu » : réseau absent ou chargement en cours affichent « 0 F » et « Aucune dépense » (l.457).
  - Les dépenses encore en file hors ligne n'apparaissent pas.
  - 🟡 faux zéro, du même type que celui qu'ACC-01 a corrigé sur l'accueil.

### Alertes — `/marchand/alertes` → `MarchandAlertes`
- Portes : `DepenseForm.tsx:204,325`, `GestionStock.tsx:636`.
- 100 % calcul local sur `useStock()` : rupture, stock bas, péremption, valeur, surstock.
- Liste de réappro partagée vers WhatsApp (`MarchandAlertes.tsx:166-174`).
- 🟡 « Tout va bien… stock bien garni » s'affiche aussi pour un stock vide ou non chargé (l.153-157).
- 🟡 Une alerte écartée (`julaba_alertes_dismissed`, id = `rupture-<produit>`) ne revient jamais, même pour une nouvelle rupture (l.176-188).
- L'alerte « surstock » renvoie vers le marché, hors pilote (l.306).

### Profil — `/marchand/profil` → `UniversalProfil role=marchand`
- Voir le §2. Dans l'ordre d'affichage : Academy (l.633), Mes services (Coopérative, Besoin, Tontines, Protection sociale, Fidélité), Documents (`totalDocuments={0}` en dur, l.785), Support, Mot de passe, PIN Keiwa.
- Sous-profil affiché (l.264-269).

### Paramètres — `/marchand/parametres` → `UniversalParametres role=marchand`
- Préférences et sessions réelles (`auth-api` : `listerSessions`, `revoquerSession`, `supprimerCompte`).
- Rien de démo relevé. Arbitrage pilote : À DÉFINIR (matrice GO).

### Support — `/marchand/support` → `SupportPage` → `SupportContact`
- **Tickets** : `GET /tickets/mes-tickets` (sans `@Roles` à la méthode : l'extracteur s'est trompé, vérifié à `tickets-rest.controller.ts:31-38`) et `POST /tickets`. Réels.
- **Contacts** : `GET /support/config` (`misc-rest.controller.ts:161-172`). S'il n'y a aucune ligne ou en cas d'erreur, le front garde `DEFAULT_CONTACTS` : `+225 27 20 00 00 00`, WhatsApp `0700000000` (`SupportConfigContext.tsx:59-62,97-110`).
  - 🟠 pour le pilote : la question « qui répond au téléphone » (§6) est ouverte. Présence de la config en prod : À DÉFINIR.
- `TicketsContext.marquerLuParBO` appelle un PATCH réservé au BO et avale l'erreur (`TicketsContext.tsx:242`). Sans effet pour la marchande.

### Commandes — `/marchand/commandes` → `MesCommandes` (HORS PILOTE, onglet principal)
- `CommandeContext` → `/commandes`, `/commandes/:id`, `/livrer`, `/paiement`, `/negociation*` (`services/api/commandes-api.ts:126-208`) → `commandes-rest.controller.ts`. Toutes les routes existent.
- Refus hors ligne propre (OFF-03 fermé ; test vert).
- **Argent** : le vendeur encaisse via `recupererPaiement`. La garde « seulement après livraison » n'existe que dans le front (`CommandeContext.tsx:272-274`). Voir 🔴 au §5.

### Marché virtuel — `/marchand/marche` → `MarcheVirtuel` (HORS PILOTE)
- **Publications** : `GET /publications/marche`, cloisonné par sous-profil côté serveur.
  - Grossiste : marché producteur.
  - Demi-grossiste : marché de sa coopérative.
  - Détaillant et sans sous-profil : `[]` (`publications-rest.controller.ts:57-102`). Conforme à `docs/SOUS_PROFILS_MARCHAND.md`.
- **Solde** : `GET /wallets/me` (l.125).
- **PIN** : `POST /auth/pin/verify` (l.476).
- **Négociation** : `POST /commandes/negociation`.
- **Republication** : `POST /publications/republier` (l.362), réservée aux grossistes.
  - 🟠 Le SQL caste vers `'cooperative'::marche_virtuel_type_enum` (`publications-rest.controller.ts:184`). Ce type n'existe que dans une migration archivée (`migrations/_archive/1779100000000-…:11`).
  - Le schéma de référence crée `publications_type_marche_enum` (`migrations/1780200000000-BaselineSchema.ts:114,639`), et le test `test/invariants/stock-reservation.spec.ts:75-77` le confirme.
  - Sur une base créée depuis ce schéma de référence, l'appel tombe en 500. Prod : À DÉFINIR.
- **Signalement** : `POST /signalements` n'existe pas (seul `admin-analytics.controller.ts:133` mentionne des signalements, avec une valeur `[]` en dur) → 🟠, toast « Erreur réseau ».
- **« Paiement »** :
  - `handlePayment` et `handlePinValidation` appellent seulement `createOrdersFromCart`, qui crée des commandes `statut:'en_attente'` (l.562-573).
  - Puis ils disent « Paiement de X F par carte / mobile money / Wallet effectué avec succès » (l.455, 487). Le n° de carte n'est envoyé nulle part (l.139, 435, 1093).
  - 🟠 Mensonge sur l'argent.
  - Une boucle d'achat partiellement échouée affiche « Réessaie » sans annuler ce qui est déjà créé : doublons possibles (l.549-582).
- **Contrôle serveur** : `POST /commandes` ne vérifie ni le prix ni le total au regard de la publication, ni le droit de l'acheteur à acheter cette publication (sous-profil) (`commandes-rest.controller.ts:85-176`).

### Récoltes prévues — `/marchand/recoltes-prevues` (HORS PILOTE)
- `GET /producteurs/recoltes-prevues`, garde « grossiste » côté serveur (`producteurs-rest.controller.ts:45-50`). ✅ lecture seule.
- Les cycles de **tout** rôle sont listés : `cycles-rest` n'a pas de garde de rôle (`cycles-rest.controller.ts:7-39`).

### Coopérative / Besoin — `/marchand/cooperative`, `/marchand/cooperative/besoin` (HORS PILOTE)
- `GET /cooperatives/ma-cooperative`, `POST /cooperatives/rejoindre/:id`, `POST /cooperatives/besoins` : les routes existent.
- `rejoindre` passe `estMembreCooperative=true` dès la demande, alors que le statut est `en_attente` (`cooperatives-rest.controller.ts:844-878`).
- **Cotisation 🔴 (comptable)** :
  - `montant: 25000` en dur (`MaCooperative.tsx:160`).
  - Le serveur insère `cooperative_transactions … 'validee'` et `cotisation_payee=true` sur simple déclaration, sans mouvement d'argent ni idempotence. `!montant` laisse passer un montant négatif (`cooperatives-rest.controller.ts:826-835`).
  - Les erreurs sont renvoyées en 200 `{success:false}`, alors que le front affiche « Cotisation payée avec succès » (l.162).

### Tontines — `/marchand/tontines`, `/marchand/tontines/:id` (HORS PILOTE)
- `GET /tontines/mes-tontines`, `GET /tontines/:id`, `POST /tontines`, `POST /tontines/:id/cotiser`, `POST /wallets/me/rechercher-destinataire`. Les routes existent (`tontines.controller.ts:16-34`).
- `cotiser` est transactionnel et idempotent par cycle (`tontines.service.ts:172-291`), avec débit réel puis redistribution.
- 🔴 pour le pilote : un toucher sans PIN ni confirmation (`TontineDetail.tsx:63-71`). Invariant `backend/test/invariants/tontine-cycle-complet.spec.ts` existant (non lancé : il nécessite Postgres).

### Protection sociale — `/marchand/protection-sociale` (HORS PILOTE)
- `GET` et `POST /protection-sociale/cotisations` (`protection-sociale.controller.ts:50,67`). Adhésions et prestations en `localStorage` (`services/protectionSociale.service.ts:105,123`).
- 🔴 Mode « keiwa » :
  - Il débite `wallet.solde` dans une transaction, mais **aucun crédit en face**. L'argent sort du wallet vers aucun compte : il n'y a pas d'organisme.
  - Pas de PIN.
  - L'« idempotence » repose sur un `randomUUID()` généré par le serveur (l.93) : deux POST rejoués font deux débits. L'index `ux_wallet_tx_cotisation_idempotence` ne protège que contre un double débit d'une même cotisation.
- Invariant `protection-sociale-cotisations.spec.ts` existant (non lancé).

### Fidélité — `/marchand/fidelite` (HORS PILOTE)
- `/fidelite/config|client|gagner|utiliser|evenements` : les routes existent. Idempotence par `idempotency_key` (`fidelite-rest.controller.ts:122-220`).
- La clé est générée à chaque appel (`services/fidelite.service.ts:64-73`) : un nouveau toucher fait un nouveau crédit de points.
- Le montant d'achat est libre, sans lien avec une vente de caisse. 🟡

### Sous-profils
- Le cloisonnement serveur est confirmé pour `/publications/marche`, `/publications/republier` et `/producteurs/recoltes-prevues`.
- Il n'est **pas** appliqué sur `POST /commandes` : une détaillante peut commander une publication par l'API.

## 4. Producteur

### Accès et navigation
- **Barre du bas** : Accueil, Production, Commandes, Moi (`roleConfig.ts:168-175`). Tout le profil producteur est HORS PILOTE.
- **Vérification des liens `/producteur/...`** (tous les MISSING de calls.tsv sont de la navigation, comparée à `routes.tsx:88-107`) :
  - Existent : `production`, `commandes`, `profil`, `declarer-recolte`, `recoltes`, `alertes`, `academy`, `keiwa*`, `parametres`, `support`.
  - 🟠 **`/producteur/revenus`** n'existe pas : `components/producteur/Stocks.tsx:561`. NotFound, ou retour au préfixe.
  - 🟡 **Orphelins**, déclarés mais jamais liés : `/producteur/stocks` (StocksWrapper : Stocks + Revenus, `routes.tsx:95`) et `/producteur/publier-recolte` (`routes.tsx:96`).
  - `/producteur/stats` est un appel d'API réel (`ProducteurContext.tsx:585`), pas une route de navigation.

### Contexte `contexts/ProducteurContext.tsx`
- Chargé seulement pour les rôles producteur et cooperateur (l.700-705).
- `GET /cycles` (l.194) → `cycles-rest.controller.ts:12`, qui renvoie `{cycles}` en snake_case. Mapping géré (l.196-210). ✅
- **`createCycle` 🟠** : le front fait `const cycle = res` (l.238) alors que le back renvoie `{ cycle: row }` (`cycles-rest.controller.ts:38`). Une ligne `{id: undefined, culture: undefined, datePlantation: Invalid Date, quantiteEstimee: NaN}` est insérée en tête de liste jusqu'au prochain `refreshAllData` (sonde n°1, sortie reproduite).
- `GET/POST /recoltes` → `recoltes-rest.controller.ts`. Le POST renvoie `{recolte, ...saved}`, donc `res.id` existe. ✅
- `updateRecolte` (l.404-412) lit `recolte.cycle_id`, `date_recolte` et `prix_unitaire` alors que le back renvoie l'entité en camelCase : ces champs deviennent indéfinis (sonde n°3). Aucun composant ne l'appelle : code mort.
- **`fetchCommandesProducteurData` 🟠** : `data.data || []` (l.650) alors que le back renvoie `{commandes, meta}` (`commandes-rest.controller.ts:79`). La liste est toujours vide (sonde n°2).
  - Conséquences : `RecolteDetailModal.tsx:43-50` n'affiche jamais les commandes liées. En plus, ce composant filtre sur des statuts anglais (`new`, `accepted`, `delivered`) alors que le modèle est en français.
  - Le repli hors ligne de `getStats` (l.604-633) calcule des revenus à 0.
- `GET /producteur/stats` (`producteur-stats.controller.ts:27-77`) : vrai SQL sur `recoltes`, `commandes` et `publications`. ✅ RecolteForm convertit bien en kg (`RecolteForm.tsx:216`).
- `completeCycle` → `PATCH /cycles/:id` (`services/api/cycles-api.ts:92-99`). ✅
- Mise à jour optimiste avec retour arrière (`ProducteurContext.tsx:296-318`).

### Écrans
| Écran | Câblage | Statut |
|---|---|---|
| Accueil (`ProducteurHome` → `RoleDashboard`) | `/producteur/stats`, `/scores/me` (sans `@Roles`, l'extracteur s'est trompé ; erreur → 0 : `RoleDashboard.tsx:148-164`), notifications | ✅/🟡 |
| Production (`ProducteurProduction`) | contexte + `useCommande` | 🟡 (plantation fantôme après création, voir ci-dessus) |
| Commandes (`CommandesProducteurPage`) | `CommandeContext` → `/commandes?…`. Vente directe avec `recolte_id` obligatoire et `acheteur_id:''` (l.584-599). Encaissement keiwa via `ReceptionPaiementModal` (l.2406-2421). Upload Cloudinary direct non signé (l.556) | 🟡 front, 🔴 back (§5) |
| Déclarer récolte (`RecolteForm`) | `createRecolte` → `POST /recoltes` | ✅ |
| Mes récoltes (`MesRecoltesPage`) + `RecolteDetailModal` | contexte | 🟡 (commandes liées toujours vides) |
| Publier (`PublierRecolteModal` / `PublierRecolte`) | `POST /publications`. Upsert `ON CONFLICT (user_id, LOWER(TRIM(produit)))` (`publications-rest.controller.ts:121-139`), index garanti par `db-init.service.ts:694-719`. Republier le même produit **écrase** `quantite_disponible`, même s'il y a des réservations en cours. Photo stockée en data-URL base64 (`PublierRecolte.tsx:104,119`). Notification envoyée à tous les marchands, y compris ceux qui ne voient pas le marché | 🟡 |
| Modifier publication | `PATCH` et `DELETE /publications/:id` | ✅ |
| Stocks (orphelin) | `GET/POST/PATCH/DELETE /stocks` → table `stocks` (producteur), qui est un second modèle de stock à côté de `recoltes.stock_disponible` (STK-03) | 🟡 |
| Revenus (orphelin, dans StocksWrapper) | contexte. Les `Math.random` ne servent qu'au décor (l.44-85). Le backend `/revenus` n'est **jamais appelé** | ⏳ côté back |
| Alertes producteur | calcul local à partir du contexte | ✅ (liens valides) |
| Profil / Paramètres | Universal* ; PIN Keiwa ; liens recoltes et production valides (`UniversalParametres.tsx:820-821`) | ✅ |

### Backend producteur
- `cycles-rest`, `recoltes-rest`, `producteur-rest`, `producteurs-rest`, `publications-rest`, `stocks-rest` et `revenus` sont tous enregistrés (`app.module.ts:102-143`) et protégés par `JwtAuthGuard` au niveau classe.
- **Aucune garde de rôle** sur `/cycles`, `/recoltes` et `/stocks` : tout rôle authentifié peut y écrire ses propres lignes. Ce n'est pas un problème de cloisonnement entre utilisateurs (filtre `user_id`), mais cela pollue « récoltes prévues ».
- **Code mort** : `producteur/cycles/cycles.controller.ts` (avec `POST /cycles/:id/complete`) et `producteur/recoltes/recoltes.controller.ts` ne sont importés dans aucun module enregistré. Ils dupliquent les routes `/cycles` et `/recoltes`.
- `revenus.controller.ts:13-19` : un « revenu » égal à prix × quantité de toutes les récoltes, vendues ou non. Valeur inventée, heureusement non consommée.

## 5. Top problèmes (par gravité)

### 🔴 Argent / sécurité

1. **N'importe quel compte authentifié peut débiter le wallet Keiwa de n'importe quel autre utilisateur** (lecture du code ; non exécuté, la base n'est pas touchable) :
   - **Étape 1** : `POST /commandes` avec `{type:'vente_directe', vendeur_id:<moi>, acheteur_id:<victime>, recolte_id:<uuid quelconque>, quantite:1, prix_unitaire:X, total:X, mode_paiement:'keiwa'}`.
     - Aucune garde de rôle (`commandes-rest.controller.ts:15,85`).
     - `acheteurId` est repris du body (l.108).
     - `recolte_id` n'a pas de FK sur `commandes` (`commande.entity.ts:51-55`). En statut `en_attente` sans publication, il n'est même pas relu (l.150-167).
   - **Étape 2** : `POST /commandes/:id/paiement`.
     - Le seul contrôle est `vendeurId === user.id` (l.211).
     - Aucun contrôle de statut (livrée, non annulée) ni consentement ou PIN de l'acheteur. La garde « après livraison » est seulement côté front (`CommandeContext.tsx:272`).
     - Débit de l'acheteur, crédit du vendeur (l.259-283).
   - L'invariant K1 (`backend/test/invariants/keiwa-paiement-commande.spec.ts`) prouve l'atomicité et l'idempotence, **pas l'autorisation**.
   - Même dans le flux normal, `total` et `statut` sont fixés par le client (l.113-119).
   - **Absent du registre de dette.**
2. **Protection sociale, mode keiwa** : débit sans contrepartie, sans PIN, sans idempotence côté client (`protection-sociale.controller.ts:93-134`). Accessible depuis Moi.
3. **Tontines** : cotisation à débit réel en un toucher, sans PIN ni confirmation (`TontineDetail.tsx:63-71,217`). Accessible depuis Moi.
4. **Cotisation coopérative** : écriture comptable « validée » sans mouvement réel, 25 000 F en dur, répétable, montant négatif accepté, succès affiché sur échec (`MaCooperative.tsx:156-165`, `cooperatives-rest.controller.ts:819-842`).

### 🟠 Cassé / pilote

5. **Onglet « Commandes »** (hors pilote) dans la barre du bas marchande, avec des actions d'argent (`roleConfig.ts:105`). C'est l'arbitrage demandé à Patrick (GO-PILOTE §« Hors pilote »).
6. **Marché virtuel** : « Paiement effectué avec succès » sans paiement, n° de carte collecté puis jeté, doublons après un nouvel essai (`MarcheVirtuel.tsx:407-489,549-582`).
7. **Support** : faux numéros par défaut si `support_config` est vide (`SupportConfigContext.tsx:59-62`).
8. `POST /signalements` inexistant (`MarcheVirtuel.tsx:503`).
9. Producteur : `createCycle` mal lu, et commandes du contexte toujours vides (`ProducteurContext.tsx:238,650`).
10. Lien mort `/producteur/revenus` (`Stocks.tsx:561`).
11. `republier` : cast vers un type enum absent du schéma de référence (`publications-rest.controller.ts:184`).
12. Hors de mon domaine, signalé pour le responsable RC1 (cité, non audité) :
    - `MicroVenteCaisse.tsx:410` navigue vers `/marchand/ventes`, qui n'existe pas (intention vocale « consulter_ventes »).
    - `TantieSagesseModal.tsx:155-156` appelle `closeDay(action.montant || 0)`, soit une clôture vocale à 0.

### 🟡 Partiel

13. Dépenses : faux zéro à la lecture (`MarchandDepenses.tsx:205-207,457`).
14. Alertes : « Tout va bien » quand le stock est vide ou non chargé ; alerte écartée pour toujours (`MarchandAlertes.tsx:153-188`).
15. Mouvements de stock vides sans le dire en cas d'erreur (`GestionStock.tsx:439-446`) ; quantité absolue écrasée au rejeu (À DÉFINIR, voir STK-04).
16. Publications : l'upsert écrase la quantité disponible malgré les réservations ; notification envoyée à tous les marchands.
17. Pas de garde de rôle sur `/cycles`, `/recoltes`, `/stocks` ; contrôleurs morts en double ; `/revenus` inventé et inutilisé.
18. Commentaire périmé `UniversalProfil.tsx:275-277` (« Keiwa vit sur la tuile Mon argent », alors que la tuile a été retirée) ; `Documents` affiche `totalDocuments={0}` en dur.

## 6. À DÉFINIR

- **Masquage hors pilote** (arbitrage Patrick, GO-PILOTE §« Hors pilote ») : onglet Commandes, cartes Academy, Coopérative, Tontines, Protection sociale et Fidélité de Moi, intentions vocales « marché » et « commandes ». Le code ne contient aucun drapeau pilote pour ces écrans (seul `CAISSE_CREDIT_ACTIF` existe).
- **Soldes des wallets des marchandes du pilote** : s'ils sont tous à 0 et sans recharge, le risque n°1 est théorique pendant le pilote. Non vérifiable sans la base de prod.
- **`support_config` en prod** : y a-t-il une ligne avec les vrais numéros ? Non vérifiable sans la base.
- **Type enum `marche_virtuel_type_enum` en prod** : la base de prod vient-elle des migrations archivées ou du schéma de référence ? Non vérifiable.
- **Origine de `action.path`** dans `TantieSagesseModal.tsx:165` (réponse LLM/serveur ?) : liste des destinations possibles.
- **Rejeu d'un PATCH de stock** en quantité absolue après des ventes : comportement voulu ? (Lié à STK-04.)
- **Invariants backend du domaine** (`tontine-cycle-complet`, `fidelite-cycle`, `protection-sociale-cotisations`, `keiwa-paiement-commande`) : non lancés ici, car ils exigent le Postgres partagé.
