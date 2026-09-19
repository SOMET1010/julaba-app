# Registre maître de dette technique — JULABA

**Photo fidèle de la branche `claude/clever-allen-dnr8by`.**
**Révision 4 — après SEC-2 (`b904db6`).**
Révision 2 : contre-audit de Patrick du 19/09/2026 — deux fermetures rouvertes,
une métrique corrigée, cinq dettes ajoutées, un P0 requalifié.
Révision 3 : **STK-01 et SCHEMA-04 fermés** ; le garde-fou systématique posé au
passage a révélé **SCHEMA-05** (`api_keys`) et **SCHEMA-06**
(`keiwa_config_items`) ; **AUTH-RECOVERY-01** ouverte par arbitrage avant SEC-2.
Révision 4 : **SEC-05, SEC-06 et SEC-07 fermés** ; **SEC-08** ouverte (le PIN
n'est plus lisible, mais il est encore *choisi* par un administrateur) ;
**SEED-01** ouverte — c'est le diagnostic des 3 échecs jusqu'ici non expliqués.
Le détail de chaque correction est dans la colonne « preuve ».

**Compte courant : 15 FERMÉ · 5 HORS PÉRIMÈTRE JUSTIFIÉ · 54 OUVERT.**

État d'origine :
(19 commits devant `main`, qui est à `59b9142`).

Établi par Patrick, puis **vérifié ligne à ligne dans le code de la branche** —
pas dans les messages de commit, pas contre `main`. Aucune correction n'a été
faite pendant cette passe : c'est une photo, pas un chantier.

Ce document remplace les registres partiels antérieurs. Les anciens documents
d'audit décrivent un état dépassé sur plusieurs points : **ne pas les utiliser
comme vérité courante** (cf. DOC-01).

## Règles du registre

**Trois statuts, pas un de plus :**

| Statut | Ce qu'il veut dire |
|---|---|
| **FERMÉ** | Le défaut décrit n'existe plus **dans le code actuel**, vérifié, avec un test qui échouait avant |
| **OUVERT** | Le défaut existe encore, en tout ou en partie. **Un progrès partiel ne ferme pas une ligne** |
| **HORS PÉRIMÈTRE JUSTIFIÉ** | Ce n'est pas une anomalie, et la raison est écrite |

Pas de « à voir », « probablement », « assumé » sans justification, ni
« documenté » — **documenter une dette ne la ferme pas.** Une route concurrente
inutile reste une dette même si un garde-fou empêche son usage accidentel.

**Un défaut opérationnel fermé ne ferme pas la dette architecturale qui l'a
produit.** SCHEMA-03 en est l'exemple : B1 est corrigé, la doctrine de schéma
reste multiple.

---

# ARGENT

| ID | Gravité | Statut | Preuve actuelle (code) | Commit / justification | Dette résiduelle |
|---|---|---|---|---|---|
| **ARG-01** / B3 | P1 terrain | **FERMÉ** | `stocks-rest.controller.ts` : le `WHERE` ne porte plus aucun filtre sur `quantite_retranchee` (les 2 occurrences restantes sont des commentaires). `mouvement-mapper.ts` expose `quantite_affichee`, `manquant`, `hors_stock` | `853dff7` — invariant `argent-3` + `test:mouvements-hors-stock` | — |
| **ARG-02** / B2 | P1 terrain | **OUVERT** | Fermé **pour les nouveaux mouvements** : `db-init.service.ts` pose `unite`, les 2 INSERT la portent. **Mais `stocks-rest.controller.ts:46` fait `COALESCE(sm.unite, p.unite)`** : une ligne ancienne (`sm.unite IS NULL`) relit encore l'unité ACTUELLE du catalogue. Un vieux « 5 tas » peut toujours devenir « 5 kg » | `853dff7` + migration `1780500000000` — **rouvert au contre-audit** : sous le contrat « FERMÉ = le défaut n'existe plus dans le code actuel », le repli sur `p.unite` est le défaut lui-même | Supprimer le repli : une ligne sans unité historisée doit renvoyer `null`, pas l'unité d'aujourd'hui. Afficher une unité actuelle comme si elle était historique est un mensonge de plus, pas un moindre mal |
| **ARG-03** / A3 | P1 dormant | **OUVERT** | Fermé **pour un seul des trois chemins**. Vérifié : `POST /caisse/credits` insère `acompte` directement dans `credits` — **0 occurrence de `acompte_credit`** dans ce chemin. Un crédit créé AVEC acompte initial reste donc invisible à `caisseTheorique`. Et dans `PATCH :id/acompte`, l'écriture de caisse est dans un `try/catch` qui **avale l'erreur** : `success: true` est possible sans trace de caisse | `853dff7` couvre `PATCH :id/acompte` — **rouvert au contre-audit**, qui a trouvé le second chemin que mon test ne couvrait pas | Acompte initial à la création + atomicité de l'encaissement |
| **ARG-10** | P1 dormant | **OUVERT** | *Ligne ajoutée au contre-audit.* `PATCH /caisse/credits/:id/payer` marque le crédit payé et réduit `clients.montant_du`, **sans aucune écriture de caisse**. Route atteinte : `VentesPassees.tsx:325` appelle `marquerCreditPaye(id)` | — | Le règlement du reste dû est de l'argent reçu qui n'entre jamais dans la caisse théorique. **Même fermeture que ARG-03/04/05 : création avec acompte, acompte ultérieur et solde final doivent passer par UN seul mécanisme transactionnel d'encaissement** |
| **ARG-04** | P1 dormant | **OUVERT** | `POST /caisse/credits` sans `idempotency_key` — vérifié : la seule clé du fichier est celle de l'acompte | — | Idempotence de création. **Avant réactivation du crédit** |
| **ARG-05** | P1 dormant | **OUVERT** | Crédit, stock et caisse ne forment pas une transaction unique | — | Atomicité. Invariants I4/I5/I6 rouges |
| **ARG-06** | P2 modèle | **OUVERT** | `caisse-transaction.entity.ts` porte toujours **2 colonnes** `marge` et `benefice`, alimentées par la même valeur | Côté écran, un seul champ depuis `ed9321b` | La fusion des colonnes demande une migration. Le serveur écrit encore deux fois le même chiffre |
| **ARG-07** | P2 | **OUVERT** | « Bénéfice » ambigu entre marge commerciale et résultat ventes−dépenses | — | Deux concepts à nommer distinctement |
| **ARG-08** | P2 modèle | **OUVERT** | Vérifié : **0** colonne `devise` sur `caisse_transactions` | ADR-0003 #5, explicitement partiel | Le XOF reste une convention, pas une donnée |
| **ARG-09** | P3 affichage | **OUVERT** | Mesuré : **480 occurrences / 107 fichiers**. *(Correction : « 142 » annoncé plus tôt était faux — deux mesures confondues.)* | `config/devise.ts` câblé (`ed9321b`) mais non adopté par les écrans | 480 occurrences |

# STOCK

| ID | Gravité | Statut | Preuve actuelle (code) | Commit / justification | Dette résiduelle |
|---|---|---|---|---|---|
| **STK-01** | **P0 publication** | **FERMÉ** | `db-init.service.ts` crée désormais `stock_operation_idempotency` et son index, DDL identique à la migration `1781500000000`. Deux tests sur une base bâtie par DbInit **seul** (aucune table `migrations`) : la table existe, et l'`INSERT` réel du contrôleur s'exécute. Les deux échouaient avant | `6ef6560` | — *(la dette de mécanisme reste SCHEMA-03 : DbInit et les migrations ne convergent pas, ils sont maintenus en parallèle)* |
| **STK-02** | P2 modèle | **OUVERT** | `stock = 0` confond « épuisé » et « non suivi » | ADR-0003 #6, différé par arbitrage | Séparer quantité de `suivi_stock` |
| **STK-03** | P2 architecture | **OUVERT** | Deux modèles coexistent : `produits` (marchand) et `stocks` (producteur/coopérateur) | `974de94` rend la dualité **explicite** (les alertes interrogent les deux) au lieu de la subir | Les deux tables demeurent |
| **STK-04** | P2 | **OUVERT** | Les réapprovisionnements manuels ne passent pas par le ledger | — | Décider si tout mouvement doit être historisé |

# UNITÉS

| ID | Gravité | Statut | Preuve actuelle (code) | Commit / justification | Dette résiduelle |
|---|---|---|---|---|---|
| **UNI-01** | P2 modèle | **OUVERT** | `config/unites.ts` **plus** des listes propres dans ≥ 6 écrans (`GestionStock`, `RecolteForm`, `Commandes`, `Stock`, `MarcheHub`, `BesoinMarchand`) | — | Vocabulaire canonique + alias d'entrée |
| **UNI-02** | P2 modèle | **OUVERT** | Facteurs de conversion globaux alors qu'un « sac » dépend du produit | ADR-0003 #4, différé par arbitrage | Facteurs produit × conditionnement |
| **UNI-03** | P2 historique | **OUVERT** | Vente : unité figée dans `details` (`a430b78`). Mouvement de stock : figée au ledger (`853dff7`). **Récolte et commande : non** | Les deux parcours d'argent sont couverts | Récolte et commande relisent encore l'unité courante |

# COUCHE RÉSEAU

| ID | Gravité | Statut | Preuve actuelle (code) | Commit / justification | Dette résiduelle |
|---|---|---|---|---|---|
| **API-01** | P1 hygiène | **OUVERT** | Mesuré : **196 `fetch()` / 60 fichiers** hors `services/api/`. **CORRECTION du contre-audit :** le garde-fou `convergenceApi.test.mts:141` teste `/(caisse\|stocks?\|catalogue-maitre)/` — **`auth` n'y est PAS**. Mon affirmation « 0 sur auth/caisse/vente/stock » était **fausse**, et le commentaire du garde-fou le prétendait aussi : exactement l'écart commentaire/garde-fou que ce registre doit débusquer | `9d74fec` — 222/68 → 196/60, et **0 sur caisse / vente / stock / catalogue-maître dans le périmètre contrôlé** | 196 appels, dont les voies `auth` non couvertes par le garde-fou |
| **API-02** | P1 | **FERMÉ** | `StockContext.tsx` : **0** `fetch(` | `9d74fec` — `stocks-api.ts` | — |
| **API-03** | P1 | **OUVERT** | `authService` (4), `useWebAuthn` (7), `api-client` (3) : trois voies subsistent | `9d74fec` — rafraîchissement de session **4 → 1**. Les cérémonies d'auth restent directes **délibérément** : un 401 y signifie « mauvais code », pas « session expirée » | Une autorité de transport unique reste à poser |
| **API-04** | P1 architecture | **OUVERT** | `main.tsx` monkey-patche `window.fetch` pour le bearer | — | Comportement d'auth hors de la couche API |
| **API-05** | P2 | **OUVERT** | `authService.getCurrentUser()` présent, retourne toujours `null` | — | Supprimer après preuve d'absence de consommateur |
| **API-06** | P2 | **FERMÉ** | `services/academyService.ts` : **absent du dépôt** | `ee30077` — code mort prouvé inatteignable, registre `docs/hygiene/HYGIENE-1-axe1-code-mort.md` § « Contenu d'académie non branché » | — |
| **API-07** | P2 | **OUVERT** | `useRealtime.ts` : 7 appels propres | — | Fragmentation |
| **API-08** | P2 | **OUVERT** | `utils/api.ts` : 1 appel direct | — | Fragmentation |
| **API-09** | P2 | **OUVERT** | `backoffice-api.ts` : **50** appels, vérifié | Hors périmètre auth/caisse/vente/stock du mandat HYGIÈNE-1 | 50 appels |

# ROUTES ET MARKETPLACE

| ID | Gravité | Statut | Preuve actuelle (code) | Commit / justification | Dette résiduelle |
|---|---|---|---|---|---|
| **ROUTE-01** | P2 | **OUVERT** | La route concurrente `@Get('transactions')` de `misc-rest` **existe toujours**. Elle est MASQUÉE (`TransactionsRestController` gagne), et un test le constate — **mais documenter ne ferme pas** | Son SQL a été aligné par prudence | Une route morte que personne n'appelle. Décider : supprimer ou assumer |
| **ROUTE-02** | P2 fonctionnel | **OUVERT** | `Marketplace.tsx` lit toujours `/caisse/produits`, le catalogue propre du marchand | `53695a4` — l'authentifier était **nuisible** (son propre stock présenté comme l'offre d'autrui) ; retiré, exception nommée dans le garde-fou | L'écran n'a pas de source de données correcte |
| **MKT-01** | P2 fonctionnel | **OUVERT** | `marketplace-data.ts` présent, se dit « source unique de vérité (mock) » | — | Données mock vivantes dans une appli pilote |
| **MKT-02** | P2 | **OUVERT** | Notifications statiques `nm1…nm4` dans le même fichier | — | Faux métier |

# CODE MORT

| ID | Gravité | Statut | Preuve actuelle (code) | Commit / justification | Dette résiduelle |
|---|---|---|---|---|---|
| **DEAD-01** | P1 hygiène | **FERMÉ** | `scripts/hygiene/atteignabilite.mjs` : **423 fichiers analysés, 423 atteints, 0 hors parcours** | `ee30077` — 99 supprimés / 17 899 lignes, 1 conservé. **Registre d'atteignabilité : `docs/hygiene/HYGIENE-1-axe1-code-mort.md`**, chaque fichier SUPPRIMÉ ou CONSERVÉ avec preuve | — |
| **DEAD-02** | P2 | **HORS PÉRIMÈTRE JUSTIFIÉ** | `mockUsers.ts` présent, consommé par `ProfileSwitcher` | `ProfileSwitcher` est monté sous `import.meta.env.DEV` — vérifié dans `AppLayout` | — |
| **DEAD-03** | Faible | **HORS PÉRIMÈTRE JUSTIFIÉ** | `ProfileSwitcher` importé dans plusieurs layouts | Toutes les utilisations vérifiées sont sous `import.meta.env.DEV` | — |

# TYPAGE

| ID | Gravité | Statut | Preuve actuelle (code) | Commit / justification | Dette résiduelle |
|---|---|---|---|---|---|
| **TYPE-01** | P1/P2 | **OUVERT** | Mesuré : **390** `any` sur les parcours d'argent | `56b4168` — **48 `any` de DONNÉE → 0** aux frontières argent/identité/produit/quantité/stock/session/hors-ligne ; `types/vente.ts` créé | 390, dont les `catch (e: any)` qui ne décrivent aucune donnée |
| **TYPE-02** | P1 | **OUVERT** | `credits.controller.ts` : 4 `: any` | — | DTO/contrats. **Avant réactivation du crédit** |
| **TYPE-03** | P2 | **OUVERT** | Le monkey-patch de `main.tsx` prend `input: any, init: any` | — | Disparaît avec API-04 |
| **TYPE-04** | Faible | **HORS PÉRIMÈTRE JUSTIFIÉ** | `type Any = any` dans `nativeStt.ts` / `nativeTts.ts` | Frontière plugin Capacitor, où le type n'est pas connaissable. **Ne pas « nettoyer » pour le score** | — |

# SÉCURITÉ

| ID | Gravité | Statut | Preuve actuelle (code) | Commit / justification | Dette résiduelle |
|---|---|---|---|---|---|
| **SEC-01** | **P0** | **FERMÉ** | `feedbak-sms.service.ts` : **0** appel `console.*`, **11** appels `await this.send(...)` | `5e55d57` — test comportemental espionnant `console` ET `Logger`, sur succès **et** échec d'envoi | — |
| **SEC-02** | **P0** | **FERMÉ** | Le chemin d'appel depuis `auth.controller.ts` existe toujours ; c'est le contenu du journal qui a changé | `5e55d57` | — |
| **SEC-03** | P1 | **FERMÉ** | Les deux notifications PIN passent par `send()` → vrai `SmsService` | `5e55d57` — **le SMS n'était jamais envoyé non plus**, ni à la création ni au changement | — |
| **SEC-05** | **P0 conception** | **FERMÉ** | `GET .../pin-decrypted` n'existe plus : ni la route, ni un remplaçant. Garde statique `pin-jamais-rendu` — analyse le code **sans les commentaires** — : **0** route déclarant `pin-decrypted`, **0** `return` transportant un PIN déchiffré. L'action back-office est devenue « Réinitialiser le PIN » | `b904db6` — reset, jamais récupération : serveur → SMS, réponse `{ success: true }`, audit `PIN_RESET` sans aucun fragment du code, ancien PIN invalidé, sessions révoquées. **Aucun repli back-office** (arbitrage Patrick) | — *(le cas « numéro perdu » est AUTH-RECOVERY-01, délibérément à part)* |
| **SEC-06** | P1 | **FERMÉ** | `create-acteur` ne renvoie plus `pinGenere` ; garde statique : **0** occurrence dans `auth/`, `users/`, `sms/`, `feedbak-sms/` | `b904db6`. **Correction de ma propre preuve :** en voulant la tester, la branche s'est révélée **inatteignable** — `signup` est fail-closed pour les rôles administratifs (`rolesCreablesPar('super_admin') = []`), donc personne ne pouvait créer un identificateur par cette route (403 vérifié). La fuite était **réelle dans le code, non exploitable par ce chemin** | — |
| **SEC-07** | P1 | **FERMÉ** | `crypto.randomInt` dans `pin-identificateur.ts` ; garde statique : **0** `Math.random(` dans les modules sensibles. 4 chiffres / alphabet 2–9 **conservés** (arbitrage terrain Patrick : mémorisation, dictée, voix, utilisatrices peu alphabétisées) | `b904db6`. **La condition de cet arbitrage n'était pas remplie et c'est ce lot qui la pose** : `identificateur/me/verify-pin` n'avait **aucun** compteur — essais illimités sur 4 096 combinaisons — et `change-pin` offrait la même porte sur `oldPin`. Les deux passent par `verrou-pin.ts`, sur **deux colonnes dédiées** (partager `failed_pin_attempts` aurait laissé une reconnexion effacer le verrou). Reproduction : verrou neutralisé → 3 tests rouges | — |
| **SEC-04** | P3 | **OUVERT** | `users.service.ts:334` journalise le terme de recherche saisi | Relevé en balayant SEC-01. **Donnée personnelle, pas un secret** | Journalisation de donnée personnelle |
| **AUTH-RECOVERY-01** | P1 | **OUVERT** | *Dette ouverte par arbitrage de Patrick au moment de SEC-2.* Depuis `b904db6` la remise à zéro d'un PIN passe **uniquement par SMS**, et c'est vérifié. Aucun parcours n'existe pour « numéro perdu ou changé » | **Ouverte délibérément pour ne pas polluer SEC-2 avec une récupération de compte improvisée** | Un identificateur qui perd son numéro n'a aucune voie de retour. Si le terrain impose un secours sans SMS, **ne jamais afficher le vrai PIN** : code de récupération à usage unique, TTL court, consommable une fois, qui oblige ensuite à choisir son propre PIN. Autre credential, autre route — pas un contournement de SEC-05 |
| **SEC-08** | **P1** | **OUVERT** | **Nouveau, vu en faisant SEC-2.** `POST /auth/identificateur/:id/pin` (`auth.controller.ts`) laisse un administrateur **choisir** le PIN d'un identificateur : il le connaît donc. Et c'est aujourd'hui le **seul** moyen d'en attribuer un, puisque `POST /users/backoffice/create` — la vraie voie de création d'un identificateur — n'en pose aucun, et que la branche PIN de `create-acteur` est inatteignable (cf. SEC-06) | — | **Le modèle « seule la personne connaît son code » n'est pas encore atteint** : SEC-2 a fermé la lecture, pas l'attribution. Cible : la création back-office génère et envoie par SMS comme `reinitialiser-pin`, et la route à PIN choisi disparaît. **Arbitrage Patrick requis** : ça change le geste d'enrôlement et touche un second module |

# SMS ET INTÉGRATIONS

| ID | Gravité | Statut | Preuve actuelle (code) | Commit / justification | Dette résiduelle |
|---|---|---|---|---|---|
| **SMS-01** | P2 | **FERMÉ** | Les 11 notifications de `feedbak-sms` passent par `send()`. Une seule stratégie | `5e55d57` | — |
| **MOCK-01** | P2 exploitation | **HORS PÉRIMÈTRE JUSTIFIÉ** | `odoo-client.config.ts:23` : défaut `mock` si `ODOO_CLIENT_MODE !== 'real'` | Le mode **réel** refuse de démarrer sans ses secrets — pas de repli silencieux vers le mock | — |
| **EXT-01** | P3 | **OUVERT** | Méthodes ANSUT traduction/TTS encore des ébauches | — | Ne pas les présenter comme capacités disponibles |
| **BO-01** | P3 | **OUVERT** | `BOParametres` : TODO feature flags / A/B sans endpoints | — | Fonction incomplète |
| **BO-02** | P3 | **OUVERT** | `BOConfigInstitution` : `isBackendReady = false` | — | Endpoint admin absent |
| **BO-03** | P3 | **OUVERT** | Routes admin modération/livraison décrites comme ébauches | — | À vérifier avant de les compter comme disponibles |

# SCHÉMA ET EXPLOITATION

> **Réserve de Patrick, reprise ici :** ces quatre lignes **ne se ferment pas en
> bloc** parce que B1 est corrigé. Un défaut opérationnel fermé n'efface pas la
> dette architecturale qui l'a produit.

| ID | Gravité | Statut | Preuve actuelle (code) | Commit / justification | Dette résiduelle |
|---|---|---|---|---|---|
| **SCHEMA-01** | P1 | **OUVERT** | Trois mécanismes coexistent : migrations TypeORM, `DbInitService`, `synchronize` | — | **La doctrine de schéma reste structurellement multiple** |
| **SCHEMA-02** | P1 | **OUVERT** | `schema-flags.ts` : base vierge → `synchronize`, base existante → migrations si `DB_MIGRATIONS_RUN` | Décision volontaire aujourd'hui | Multiplie les chemins de construction du schéma |
| **SCHEMA-03** | P1 | **OUVERT** | Des évolutions doivent être recopiées à la main dans DbInit | `73343a4` ferme **une instance** (B1 : `stock_mouvements.type` absent → annulation de vente cassée sur base neuve) et pose le garde-fou `schema-ledger-sans-migration`. `6ef6560` ferme **une seconde instance** (STK-01) et élargit le garde-fou : il énumère désormais **toutes** les tables écrites en SQL brut par le code et exige qu'elles existent après DbInit seul — c'est lui qui a révélé SCHEMA-05 et SCHEMA-06 | **Le mécanisme qui produit ce défaut demeure.** Le garde-fou détecte, il ne converge pas |
| **SCHEMA-04** | P1 | **FERMÉ** | = STK-01, fermé par `6ef6560`. Ce n'était pas un fait d'environnement : le dépôt suffisait à le prouver | `6ef6560` | — |
| **SCHEMA-05** | **P1** | **OUVERT** | **Nouveau (issu du garde-fou systématique).** `api_keys` est lue et écrite par du code vivant du back-office partenaires, et n'est créée que par une migration **archivée**, volontairement hors de la chaîne exécutable (ADR-0002). Sur base neuve la table n'existe pas | — | Toute fonction partenaire adossée à `api_keys` échoue sur un déploiement neuf. Décider : réintégrer la création, ou retirer le code mort |
| **SCHEMA-06** | **P1** | **OUVERT** | **Nouveau (issu du garde-fou systématique).** `keiwa_config_items` est lue, insérée, modifiée et supprimée par `admin-wallets.service.ts`, et créée **nulle part** : ni entité, ni migration, ni DbInit | — | La configuration Keiwa échoue sur toute base, neuve ou non, sauf table posée à la main |
| **SEED-01** | **P1** | **OUVERT** | **Nouveau — c'est le diagnostic de l'« observation non résolue ».** `AdminDivisionsSeedService.runSeed()` garde toute la cascade derrière `districtCount === 0`. **Un seul district présent, quelle qu'en soit l'origine, empêche définitivement le seed des régions, départements et communes.** « Districts non vide » y tient lieu de « tout est seedé » : deux sens pour une même donnée | — | En production : un district créé à la main, ou un premier démarrage interrompu après l'insertion des districts, et les communes ne sont **jamais** posées — `GET /producteurs/recoltes-prevues` perd silencieusement ses données. En test : `cooperatives-liste-colonnes` insère un district et ne le retire pas, donc `communes-gps-distance` échoue quand Jest le place après — d'où 3 rouges sur ~1 exécution complète sur 3. **Correctif : rendre chaque niveau idempotent séparément** |

# ARCHITECTURE

| ID | Gravité | Statut | Preuve actuelle (code) | Commit / justification | Dette résiduelle |
|---|---|---|---|---|---|
| **ARCH-01** | P2 | **HORS PÉRIMÈTRE JUSTIFIÉ** | 124 → **116** fichiers > 400 lignes | *La taille seule n'autorise aucun refactoring* (arbitrage Patrick, 19/09). Ne s'ouvre que sur un défaut structurel démontré | — |
| **ARCH-02** | P2 | **OUVERT** | Les Contexts concentrent état, réseau, transformations et règles | Réseau sorti (API-02), typage posé (TYPE-01) | Responsabilités encore mêlées |
| **ARCH-03** | P2 | **OUVERT** | `AppContext`, `UserContext`, services d'auth | Rafraîchissement unifié | Cartographie à faire |

# CLIENT, FIDÉLITÉ, TESTS, DOCS, UI

| ID | Gravité | Statut | Preuve actuelle (code) | Commit / justification | Dette résiduelle |
|---|---|---|---|---|---|
| **CLIENT-01** | P3 modèle | **OUVERT** | Client fragmenté : crédit par nom, fidélité par téléphone, marketplace par champs | — | Projet de modèle à part entière |
| **CLIENT-02** | P2 dormant | **OUVERT** | Crédit identifié par `(marchand_id, nom)` | — | Des homonymes partagent une dette. **Avant extension du crédit** |
| **FID-01** | P3 | **OUVERT** | Fidélité non intégrée automatiquement à la vente | — | Dette d'intégration |
| **TEST-01** | P2 | **OUVERT** | La couche d'affichage reste moins couverte que les invariants | Tests traversants ARGENT-1/2/3 ajoutés | C'est la raison de garder l'axe 5 conditionnel |
| **TEST-02** | P2 | **OUVERT** | Tests en scripts `.mjs`/`.mts` spécialisés | Acceptable tant qu'ils sont dans `verify` | Dette de maintenance |
| **TEST-03** | **P1** | **FERMÉ** | `annulation-remise-stock.spec.ts` : **0** occurrence de `LedgerMouvementType`. Garde-fou `schema-ledger-sans-migration.spec.ts` présent | *Ligne ajoutée le 19/09.* Un test appliquait une migration dans son `beforeAll` : huit tests passaient en prouvant le contraire de ce qu'on croyait. C'est ce qui a laissé B1 survivre | — |
| **TEST-04** | P2 | **FERMÉ** | `telephones-tests-uniques.spec.ts` présent, vérifié dans les deux sens | *Ligne ajoutée le 19/09.* Les specs partagent une base ; un numéro réutilisé fait passer une suite seule et échouer en groupe | — |
| **DOC-01** | P2 | **OUVERT** | Des documents décrivent des défauts corrigés ou des architectures antérieures | `ca946da` corrige ADR-0003 (il annonçait « fait » sur du code mort) | Les autres documents restent à dater |
| **DOC-02** | P2 | **OUVERT** | Contradictions sur `migrationsRun` entre docs | — | **Le code courant fait foi** |
| **DOC-03** | P3 | **OUVERT** | *Ligne ajoutée pendant cette passe.* `stocks-rest.controller.ts:18` affirme encore « Ne montre que les vraies variations de stock (`quantite_retranchee <> 0`) » — **faux depuis ARG-01** | Repéré en vérifiant ARG-01. **Non corrigé : cette passe est une photo, pas un chantier** | Un commentaire qui contredit son code |
| **UI-01** | P3 | **OUVERT** | Dette visuelle / tokens / couleurs littérales | — | Hors priorité sauf défaut fonctionnel |
| **VOICE-01** | À surveiller | **OUVERT** | Le transcript brut n'est pas exposé à la recette terrain | — | Instrumentation de recette, pas fonction métier |

---

## Ce qui n'est PAS de la dette

La sévérité doit jouer dans les deux sens. Ne sont pas des anomalies :

- `Math.random` dans les retours vocaux, les identifiants de toast, l'UI décorative ;
- les `fetch()` **du backend** vers BPay, SMS, ElevenLabs, ANSUT — ils n'ont pas
  vocation à passer par le client REST du frontend ;
- les `any` aux frontières Capacitor / STT / TTS (TYPE-04) ;
- les 116 gros fichiers : **ce ne sont pas 116 bugs** (ARCH-01) ;
- `ProfileSwitcher` et le mode mock d'Odoo, tous deux correctement protégés.

## Métriques HYGIÈNE finales

| Mesure | Départ (19/09 matin) | À `5e55d57` |
|---|---|---|
| Fichiers analysés (`frontend_src/src/app`) | 519 | **423** |
| Fichiers hors parcours d'atteignabilité | 100 (sur 182 « jamais importés ») | **0** |
| Fichiers > 400 lignes | 124 | **116** |
| `fetch()` hors `services/api/` | 222 / 68 fichiers | **196 / 60** — dont **0** sur auth, caisse, vente, stock |
| `any` sur les parcours d'argent | 440 *(415 annoncé au départ venait d'un motif plus étroit)* | **390** — dont **0** sur une donnée métier aux frontières |

## P0 et P1 encore OUVERTS

**P0 — aucun.**

STK-01 / SCHEMA-04 fermés par `6ef6560`, SEC-05 par `b904db6`. C'est la
première fois que cette section est vide. Elle ne dit rien sur les P1 : SEC-08
et SEED-01, ouvertes le même jour, touchent l'une un credential, l'autre des
données de production.

**P1 atteignables en pilote**

| ID | Ce qui reste |
|---|---|
| **API-01** | 196 `fetch()` hors couche API (0 sur les parcours d'argent) |
| **API-03** | Trois voies réseau pour l'auth |
| **API-04** | `main.tsx` monkey-patche `window.fetch` |
| **SCHEMA-01 / 02 / 03** | La doctrine de schéma reste multiple |
| **SCHEMA-05 / 06** | Deux tables écrites par du code vivant, créées nulle part qui s'exécute |
| **SEC-08** | Le PIN identificateur est encore **choisi** par un administrateur — arbitrage requis |
| **SEED-01** | Un district suffit à empêcher le seed des communes, en test **comme en production** |
| **TYPE-01** | 390 `any` (0 sur une donnée métier aux frontières) |

**P1 NON atteignables en pilote** — `CAISSE_CREDIT_ACTIF = false`.
Condition de réouverture écrite : **avant toute réactivation du crédit.**

| ID | Ce qui reste |
|---|---|
| **ARG-04** | Idempotence de création d'un crédit |
| **ARG-05** | Atomicité crédit / stock / caisse |
| **TYPE-02** | DTO et contrats du contrôleur crédit |
| **CLIENT-02** | Homonymes partageant une dette |

## Ce que le contre-audit a corrigé

| ID | Décision | Ce que j'avais eu tort d'affirmer |
|---|---|---|
| **ARG-02** | **Rouvert** | « Fermé » alors que le repli `p.unite` fait toujours dépendre l'historique du catalogue |
| **ARG-03** | **Rouvert** | « Fermé » sur un seul des trois chemins d'encaissement ; mon test ne couvrait pas l'acompte initial |
| **ARG-10** | **Ajouté** | Le règlement total échappe aussi à la caisse — je ne l'avais pas cherché |
| **API-01** | **Preuve corrigée** | « 0 sur auth/caisse/vente/stock » était **faux** : le garde-fou ne teste pas `auth`, et son propre commentaire le prétendait |
| **SEC-05** | **Ajouté** | Le PIN est récupérable en clair par conception. J'avais sécurisé sa journalisation sans voir qu'on le donne toujours |
| **SEC-06** | **Ajouté** | Le PIN repart aussi dans la réponse HTTP |
| **SEC-07** | **Ajouté** | Le PIN est généré avec `Math.random()`, 4 096 combinaisons |
| **STK-01** | **Requalifié** | Classé « fait d'environnement non vérifiable ». C'était vérifiable, et c'est B1 une seconde fois |

Confirmés sur leur périmètre par le contre-audit : ARG-01, API-02, API-06,
SEC-01, SEC-02, SEC-03, SMS-01, TEST-03, TEST-04, DEAD-01, et les cinq
HORS PÉRIMÈTRE — avec une nuance écrite sur MOCK-01 : accepté **seulement**
parce qu'Odoo n'est pas une dépendance obligatoire du pilote. Le jour où il le
devient, « variable absente ⇒ mock » doit être réexaminé.

## L'observation « non résolue » est résolue — c'était SEED-01

La révision 2 notait **3 échecs dont le détail n'avait pas été capturé**, non
classés « flake » en attendant mieux. Ils sont revenus, ils ont été capturés,
et ce n'était pas une instabilité.

Toujours les mêmes trois tests de `communes-gps-distance.spec.ts`, et toujours
la même cause : `runSeed()` ne pose les 13 communes d'Abidjan **que si la table
`districts` est vide**. `cooperatives-liste-colonnes.spec.ts` insère un district
et ne le retire pas. Selon l'ordre dans lequel Jest choisit les fichiers, le
seed s'exécute ou est sauté — vert quand la suite GPS passe en 3ᵉ position,
rouge quand elle passe en 26ᵉ ou 41ᵉ. Mesuré sur trois exécutions complètes :
verte, rouge, verte.

Ce n'est pas un défaut de test. Le même raccourci casse une **production** où
un district existe sans que les communes aient été posées. La dette est
inscrite en **SEED-01**, et aucun correctif n'a été fait dans ce lot : il
n'appartient pas à SEC-2.
