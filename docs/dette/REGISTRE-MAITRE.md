# Registre maître de dette technique — JULABA

**Source unique de vérité pour la dette connue.** Établi par Patrick le
19/09/2026, puis **vérifié ligne à ligne contre le code de la branche**
`claude/clever-allen-dnr8by` (`5e55d57`), et non contre `main` (`59b9142`),
qui a dix-sept commits de retard.

Ce document remplace les registres partiels précédents. Les documents d'audit
antérieurs décrivent un état dépassé sur plusieurs points : **ne pas les
utiliser comme vérité courante** (cf. DOC-01).

## Comment une ligne se ferme

Une ligne ne se ferme pas parce qu'un correctif a été écrit. Elle se ferme
quand :

1. une **preuve reproductible** existe — entrée métier → persistance réelle →
   lecture/affichage ou voix ;
2. cette preuve **échouait avant** le correctif (non-vacuité) ;
3. les portes passent.

Et une dette n'est **acceptable avant terrain** que si elle est réellement hors
parcours, volontairement désactivée, sans impact monétaire ni historique, et
avec une raison explicite écrite. *« Le terrain ne doit pas servir à
redécouvrir des défauts déjà compris. »* — Patrick, 19/09/2026.

## Les cinq mesures

| Mesure | Départ (19/09 matin) | Maintenant (`5e55d57`) |
|---|---|---|
| Fichiers analysés (`frontend_src/src/app`) | 519 | **423** |
| Fichiers hors parcours d'atteignabilité | 182 « jamais importés » → 100 réellement hors parcours | **0** |
| Fichiers > 400 lignes | 124 | **116** |
| `fetch()` hors `services/api/` | 222 / 68 fichiers | **196 / 60** — dont **0** sur auth, caisse, vente, stock |
| `any` sur les parcours d'argent | 440 (mesure corrigée ; 415 annoncé au départ venait d'un motif plus étroit) | **390** — dont **0** sur une donnée métier aux frontières |

---

# ARGENT

| ID | Niveau | Dette | Statut vérifié | Preuve |
|---|---|---|---|---|
| **ARG-01** / B3 | P1 terrain | Vente hors stock journalisée mais invisible à l'écran | ✅ **FERMÉ** | `853dff7` — filtre retiré, l'écran montre « 4 » + « ⚠ hors stock » |
| **ARG-02** / B2 | P1 terrain | Unité d'un mouvement de stock relue du catalogue actuel | ✅ **FERMÉ** | `853dff7` — colonne `unite` figée au ledger (DbInit + migration) |
| **ARG-03** / A3 | P1 dormant | Acompte crédit invisible à la caisse théorique | ✅ **FERMÉ** | `853dff7` — écriture `acompte_credit`, clôture sans écart fantôme |
| **ARG-04** | P1 dormant | `POST /caisse/credits` sans idempotence | 🔴 **OUVERT** | Vérifié : une seule clé dans le fichier, celle de l'acompte |
| **ARG-05** | P1 dormant | Crédit, stock et caisse ne forment pas une transaction unique | 🔴 **OUVERT** | `credits.controller.ts` — invariants I4/I5/I6 rouges |
| **ARG-06** | P2 modèle | `marge` et `benefice` : deux colonnes, une valeur | 🟡 **PARTIEL** | `ed9321b` — côté écran, **un** champ. Les deux colonnes subsistent (fusion = migration) |
| **ARG-07** | P2 | « Bénéfice » ambigu entre marge commerciale et résultat ventes−dépenses | 🔴 **OUVERT** | Deux concepts à nommer distinctement |
| **ARG-08** | P2 modèle | La vente ne persiste pas sa devise | 🔴 **OUVERT** | Vérifié : **0** colonne `devise` sur `caisse_transactions` |
| **ARG-09** | P3 affichage | « FCFA » codé en dur | 🔴 **OUVERT** | Mesuré : **480 occurrences / 107 fichiers**. *(Correction : j'avais annoncé « 142 » — c'était faux, deux mesures différentes confondues.)* |

# STOCK

| ID | Niveau | Dette | Statut vérifié | Preuve |
|---|---|---|---|---|
| **STK-01** | **P0 publication** | Migration `StockOperationIdempotence` à exécuter dans l'environnement cible | 🔴 **OUVERT — fait d'environnement** | La migration existe (`1781500000000`). **Seul P0 non coché de `todo.md`.** Je ne peux pas le vérifier depuis ici : il faut la base réelle |
| **STK-02** | P2 modèle | `stock = 0` confond « épuisé » et « non suivi en stock » | 🔴 **OUVERT** | ADR-0003 #6, différé par arbitrage |
| **STK-03** | P2 architecture | Deux modèles coexistent : `produits` (marchand) et `stocks` (producteur/coopérateur) | 🟡 **NOMMÉ, non résolu** | `974de94` — les alertes interrogent désormais **les deux**, ce qui rend la dualité explicite au lieu de la subir |
| **STK-04** | P2 | Les réapprovisionnements manuels ne passent pas par le ledger | 🔴 **OUVERT** | Commentaire de `stocks-rest.controller.ts` |

# UNITÉS

| ID | Niveau | Dette | Statut vérifié | Preuve |
|---|---|---|---|---|
| **UNI-01** | P2 modèle | Plusieurs vocabulaires d'unités | 🔴 **OUVERT** | Vérifié : `config/unites.ts` **plus** des listes propres dans ≥ 6 écrans (`GestionStock`, `RecolteForm`, `Commandes`, `Stock`, `MarcheHub`, `BesoinMarchand`) |
| **UNI-02** | P2 modèle | Facteurs de conversion globaux alors qu'un « sac » dépend du produit | 🔴 **OUVERT** | ADR-0003 #4, différé par arbitrage |
| **UNI-03** | P2 historique | Pas de représentation historique stable de l'unité | ✅ **FERMÉ pour la vente et le stock** | `a430b78` (vente) + `853dff7` (mouvement de stock). **Reste ouvert** pour récolte et commande |

# COUCHE RÉSEAU

| ID | Niveau | Dette | Statut vérifié | Preuve |
|---|---|---|---|---|
| **API-01** | P1 hygiène | `fetch()` directs malgré `api-client.ts` | 🟡 **PARTIEL** | `9d74fec` — 222/68 → **196/60**, et **0 sur auth/caisse/vente/stock**. Garde-fou `test:convergence-api` |
| **API-02** | P1 | `StockContext` fait ses propres `fetch()` | ✅ **FERMÉ** | `9d74fec` — `stocks-api.ts` |
| **API-03** | P1 | Plusieurs voies réseau pour l'auth | 🟡 **PARTIEL** | `9d74fec` — rafraîchissement de session **4 → 1**. `authService` (4) et `useWebAuthn` (7) restent **délibérément** : un 401 y signifie « mauvais code », pas « session expirée » |
| **API-04** | P1 architecture | `main.tsx` monkey-patche `window.fetch` pour le bearer | 🔴 **OUVERT** | Comportement d'auth hors de la couche API. À absorber lors de l'unification |
| **API-05** | P2 | `authService.getCurrentUser()` retourne toujours `null` | 🔴 **OUVERT** | Vérifié présent |
| **API-06** | P2 | `academyService` a son propre `apiFetch` | ✅ **FERMÉ** | `ee30077` — c'était du **code mort**, supprimé (listé « non fait » dans `IMPLEMENTATION_STATUS.md`) |
| **API-07** | P2 | `useRealtime.ts` a son propre `apiFetch` | 🔴 **OUVERT** | Vérifié : 7 appels |
| **API-08** | P2 | `utils/api.ts` appelle directement | 🔴 **OUVERT** | Vérifié : 1 appel |
| **API-09** | P2 | `backoffice-api.ts` ≈ 50 appels directs | 🔴 **OUVERT** | Vérifié : **50**. Hors périmètre auth/caisse/vente/stock |

# ROUTES ET MARKETPLACE

| ID | Niveau | Dette | Statut vérifié | Preuve |
|---|---|---|---|---|
| **ROUTE-01** | P2 | `/transactions` dans `misc-rest` coexiste avec `/caisse/transactions` | 🟡 **DOCUMENTÉ, décision à prendre** | Vérifié : la route est **MASQUÉE** — `TransactionsRestController` gagne. Un test le constate. Son SQL a été aligné par prudence. **Corriger ce code ne change rien pour personne** : la question est si la route doit exister |
| **ROUTE-02** | P2 fonctionnel | La marketplace lit `/caisse/produits`, le catalogue propre du marchand | 🟡 **DOCUMENTÉ, exception nommée** | `53695a4` — j'avais « corrigé » en l'authentifiant : **c'était nuisible**, ça lui présentait son propre stock comme l'offre d'autrui. Retiré. Exception écrite dans le garde-fou pour que personne ne recommence |
| **MKT-01** | P2 fonctionnel | `marketplace-data.ts` se dit « source unique de vérité (mock) » | 🔴 **OUVERT** | Fichier présent |
| **MKT-02** | P2 | Notifications marketplace statiques `nm1…nm4` | 🔴 **OUVERT** | Même fichier. Du faux métier dans une appli pilote |

# CODE MORT

| ID | Niveau | Dette | Statut vérifié | Preuve |
|---|---|---|---|---|
| **DEAD-01** | P1 hygiène | 182/519 fichiers jamais importés | ✅ **FERMÉ** | `ee30077` — mesure refaite par **atteignabilité réelle** (100 hors parcours, pas 182). **99 supprimés / 17 899 lignes**, 1 conservé, **zéro inexpliqué**. Registre : `docs/hygiene/HYGIENE-1-axe1-code-mort.md` |
| **DEAD-02** | P2 | `mockUsers.ts` contient des utilisateurs de développement | 🟡 **ACCEPTÉ** | Vérifié présent, consommé par `ProfileSwitcher`, lui-même sous `import.meta.env.DEV` |
| **DEAD-03** | Faible | `ProfileSwitcher` monté dans plusieurs layouts | 🟢 **HORS PÉRIMÈTRE** | Protégé par `import.meta.env.DEV`. Pas un bug de production |

# TYPAGE

| ID | Niveau | Dette | Statut vérifié | Preuve |
|---|---|---|---|---|
| **TYPE-01** | P1/P2 | 415 `any` sur les parcours d'argent | 🟡 **PARTIEL** | `56b4168` — **48 `any` de donnée → 0** aux frontières argent/identité/produit/quantité/stock/session/hors-ligne. `types/vente.ts` créé. 390 restants, dont les `catch (e: any)` qui ne décrivent aucune donnée |
| **TYPE-02** | P1 | `credits.controller.ts` : `body: any`, résultats SQL `any` | 🔴 **OUVERT** | Vérifié : 4 occurrences. **DTO avant réactivation du crédit** |
| **TYPE-03** | P2 | Le monkey-patch de `main.tsx` prend `input: any, init: any` | 🔴 **OUVERT** | Disparaît avec API-04 |
| **TYPE-04** | Faible | `type Any = any` aux frontières STT/TTS natives | 🟢 **ASSUMÉ** | Frontière plugin. **Ne pas « nettoyer » pour le score** |

# SÉCURITÉ

| ID | Niveau | Dette | Statut vérifié | Preuve |
|---|---|---|---|---|
| **SEC-01** | **P0** | PIN identificateur écrit **en clair** dans les journaux, avec le téléphone | ✅ **FERMÉ** | `5e55d57` — test comportemental qui espionne `console` **et** `Logger`, y compris sur échec d'envoi |
| **SEC-02** | **P0** | Ce n'était pas du code mort : `auth.controller.ts` appelle bien la fonction | ✅ **CONFIRMÉ puis FERMÉ** | `5e55d57` |
| **SEC-03** | P1 | Notifications de changement de PIN en `console` au lieu du SMS réel | ✅ **FERMÉ** | `5e55d57` — **le SMS n'était jamais envoyé non plus**, ni à la création ni au changement |
| **SEC-04** | P3 | `users.service.ts:334` journalise le terme de recherche saisi | 🔴 **OUVERT** | Donnée personnelle, **pas un secret**. Relevé en balayant SEC-01 |

# SMS ET INTÉGRATIONS

| ID | Niveau | Dette | Statut vérifié | Preuve |
|---|---|---|---|---|
| **SMS-01** | P2 | Deux stratégies d'envoi dans `feedbak-sms` | ✅ **FERMÉ** | `5e55d57` — les onze notifications passent par `send()` |
| **MOCK-01** | P2 exploitation | Odoo bascule en mock si `ODOO_CLIENT_MODE !== 'real'` | 🟢 **PAR CONCEPTION** | Vérifié. Le mode **réel**, lui, refuse de démarrer sans ses secrets — pas de repli silencieux |
| **EXT-01** | P3 | Méthodes ANSUT traduction/TTS encore des ébauches | 🔴 **OUVERT** | Ne pas les présenter comme capacités disponibles |
| **BO-01/02/03** | P3 | Feature flags, `isBackendReady=false`, routes admin en ébauche | 🔴 **OUVERT** | Dette fonctionnelle back-office |

# SCHÉMA ET EXPLOITATION

| ID | Niveau | Dette | Statut vérifié | Preuve |
|---|---|---|---|---|
| **SCHEMA-01** | P1 | Gestion mixte : migrations + DbInit + `synchronize` | 🔴 **OUVERT** | Convergence à poursuivre |
| **SCHEMA-02** | P1 | Base vierge → `synchronize`; base existante → migrations si demandé | 🟢 **VOLONTAIRE** | Multiplie les chemins, mais c'est une décision assumée |
| **SCHEMA-03** | P1 | Des évolutions ont dû être recopiées à la main dans DbInit | 🟡 **PARTIEL** | `73343a4` — **B1 en était l'exemple vivant** : `stock_mouvements.type` manquait à DbInit, l'annulation d'une vente échouait sur toute base neuve. Corrigé + garde-fou `schema-ledger-sans-migration` |
| **SCHEMA-04** | P1 | `StockOperationIdempotence` : l'environnement cible peut différer du code | 🔴 **OUVERT** | = STK-01. **Fait d'environnement, à fermer avec preuve** |

# ARCHITECTURE

| ID | Niveau | Dette | Statut vérifié | Preuve |
|---|---|---|---|---|
| **ARCH-01** | P2 | 124 fichiers > 400 lignes, max 6 649 | 🟢 **MESURE, pas dette** | 124 → **116**. *La taille seule n'autorise aucun refactoring* (arbitrage Patrick). Ne s'ouvre que sur un défaut structurel démontré |
| **ARCH-02** | P2 | Les Contexts concentrent état, réseau, transformations et règles | 🟡 **RÉDUIT** | Réseau sorti (API-02), typage posé (TYPE-01). Responsabilités encore mêlées |
| **ARCH-03** | P2 | Plusieurs sources de vérité pour session/utilisateur/auth | 🟡 **RÉDUIT** | Rafraîchissement unifié. `AppContext`/`UserContext` restent à cartographier |

# CLIENT, FIDÉLITÉ, TESTS, DOCS

| ID | Niveau | Dette | Statut vérifié | Preuve |
|---|---|---|---|---|
| **CLIENT-01** | P3 modèle | Le client est fragmenté : crédit par nom, fidélité par téléphone, marketplace par champs | 🔴 **OUVERT** | Projet de modèle à part entière |
| **CLIENT-02** | P2 dormant | Crédit identifié par `(marchand_id, nom)` : des homonymes partagent une dette | 🔴 **OUVERT** | **Avant extension du crédit** |
| **FID-01** | P3 | Fidélité non intégrée automatiquement à la vente | 🔴 **OUVERT** | Dette d'intégration, pas bug caisse |
| **TEST-01** | P2 | La couche d'affichage est moins couverte que les invariants | 🟡 **RÉDUIT** | Tests traversants ARGENT-1/2/3. C'est la raison de garder l'axe 5 conditionnel |
| **TEST-02** | P2 | Tests en scripts `.mjs`/`.mts` plutôt qu'un système homogène | 🔴 **OUVERT** | Dette de maintenance, pas de correction |
| **TEST-03** | **P1** | **Un test peut réparer le schéma pour se rendre vert** | ✅ **FERMÉ** | *Ligne ajoutée le 19/09.* `annulation-remise-stock.spec.ts` appliquait une migration dans son `beforeAll` : huit tests passaient en prouvant le contraire de ce qu'on croyait. Rustine retirée, garde-fou posé (`73343a4`) |
| **TEST-04** | P2 | Les specs d'invariants partagent **une** base ; un numéro de téléphone réutilisé fait passer une suite seule et échouer en groupe | ✅ **FERMÉ** | *Ligne ajoutée le 19/09.* Garde-fou `telephones-tests-uniques` (`974de94`), vérifié dans les deux sens |
| **DOC-01** | P2 | Des documents décrivent des défauts corrigés ou des architectures antérieures | 🟡 **PARTIEL** | `ca946da` — ADR-0003 corrigé (il annonçait « fait » sur du code mort). **Les autres restent à dater** |
| **DOC-02** | P2 | Documentations contradictoires sur `migrationsRun` | 🔴 **OUVERT** | **Le code courant fait foi** |
| **UI-01** | P3 | Dette visuelle / tokens / couleurs littérales | 🔴 **OUVERT** | Hors priorité sauf défaut fonctionnel |
| **VOICE-01** | À surveiller | Le transcript brut n'est pas exposé à la recette terrain | 🔴 **OUVERT** | Instrumentation de recette, pas fonction métier |

---

## Ce qui n'est PAS de la dette

La sévérité doit jouer dans les deux sens. Ne sont pas des anomalies :

- `Math.random` dans les retours vocaux, les identifiants de toast, l'UI décorative ;
- les `fetch()` **du backend** vers BPay, SMS, ElevenLabs, ANSUT — ils n'ont pas
  vocation à passer par le client REST du frontend ;
- les `any` aux frontières Capacitor / STT / TTS (TYPE-04) ;
- les 124 gros fichiers : **ce ne sont pas 124 bugs** ;
- `ProfileSwitcher` et le mode mock d'Odoo, tous deux correctement protégés.

## Observation non résolue

Un passage complet des invariants a montré **3 échecs dont le détail n'a pas
été capturé**. Les cinq passages suivants sont verts (189/189). Cause inconnue,
non reproduite. **Ce n'est pas classé « flake »** : à surveiller au prochain
run complet, et à instruire s'il revient.

## Ce qui reste avant terrain

Par ordre, et seulement ce qui est **atteignable** :

1. **STK-01 / SCHEMA-04** — la seule ligne P0 encore ouverte. Fait
   d'environnement : exécuter la migration sur la base cible, ou prouver
   qu'elle y est.
2. Les lignes P1 **dormantes du crédit** (ARG-04, ARG-05, TYPE-02, CLIENT-02)
   ne sont pas atteignables en pilote (`CAISSE_CREDIT_ACTIF = false`) — elles
   ont une raison explicite et une condition de réouverture écrite :
   **avant toute réactivation du crédit**.
3. Tout le reste est P2/P3 ou hors parcours.
