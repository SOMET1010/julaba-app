# Registre maître de dette technique — JULABA

**Photo fidèle de la branche `claude/clever-allen-dnr8by`.**
**Révision 17 — VOIX-01 : lots C, D et E livrés et contre-audités ; deux défauts trouvés (VOIX-02, VOIX-03) ; la dette reste OUVERTE.**
Révision 17 : **contre-audit des lots C, D, E sur `a947f2a`** — code lu, tests
relancés, garde-fous rejoués rouges sur la source d'avant. **Le chemin d'argent à
la voix tient** : une seule porte (`machineEncaissement.ts` l. 218), `handlePay`
à deux appelants sous un seul verrou, 17 scénarios d'attaque + 2 560 000
conversations énumérées, **0 paiement sans relecture exacte de l'état écrit**.
Deux défauts **reproduits et laissés ouverts** : **VOIX-02** — « oui je valide
pas » (le « ne » tombe à l'oral) est lu `oui_valide` et **écrit de l'argent
contre un refus** ; **VOIX-03** — sur `/marchand/caisse`, le bouton vert « Tata »
de la BottomBar est un **second micro vivant** qui vend dans le même panier
**sans l'unité dictée** (`unité` au lieu de `tas`, mesuré) et ne sait pas
« encaisse ». Décision produit exposée, non tranchée : `speak` vs `dire` sur la
relecture de la machine. Détail : `docs/parcours/VOIX-01-PLAN-PARCOURS.md` §12.
Révision 16 : **lot B2** — le contre-audit de Patrick sur `9cb89a5` a trouvé
ce que le lot B avait laissé passer. Le produit présélectionné arrivait à
l'écran mais **pas au moteur vocal** : elle touchait Tomate, disait « trois
tas », et Tata redemandait un prix que l'application connaissait déjà, panier
vide. Reproduit au franc avant correction. La parole prime, seul le nom est
repris, et sans rien on n'invente pas de produit.
Révision 15 : **lot B livré (voie 2, tranchée par Patrick)** — la caisse
devient l'unique surface de vente. Le moteur vocal y converge au lieu d'être
abstrait pour alimenter deux surfaces ; `VenteVocaleModal` est supprimé, sans
appelant restant. Le micro est rendu **sans aucune condition**, ce qui rend
« présent aux trois moments » vérifiable par une machine. Le piège évité est
nommé : sans `RaccourcisProvider` et `ObjectifProvider`, le moteur ne lève
aucune erreur — il retombe sur des valeurs nulles, et on obtient un micro qui
a l'air de marcher. **Lots C, D et E non faits : VOIX-01 reste OUVERTE.**
Révision 14 : Patrick fige la cible du 20/09/2026 — **surface portrait unique,
« Vendre » ouvre directement la caisse, la voix conduit tout le parcours SAUF
le montant reçu (billets pour le pilote), toute écriture d'argent vocale exige
une confirmation en deux temps, le repli après échec reste sur la même
surface.** Le **lot A** (surface) est livré : sur téléphone, la feuille
coulissante qui cachait le panier ET tout l'encaissement n'existe plus.
**VOIX-01 reste OUVERTE** — les lots B (micro permanent), C (grammaire
d'encaissement), D (relecture spontanée) et E (unité sans exception) ne sont
pas faits, et livrer un lot n'est pas fermer une dette.
Révision 2 : contre-audit de Patrick du 19/09/2026 — deux fermetures rouvertes,
une métrique corrigée, cinq dettes ajoutées, un P0 requalifié.
Révision 3 : **STK-01 et SCHEMA-04 fermés** ; le garde-fou systématique posé au
passage a révélé **SCHEMA-05** (`api_keys`) et **SCHEMA-06**
(`keiwa_config_items`) ; **AUTH-RECOVERY-01** ouverte par arbitrage avant SEC-2.
Révision 4 : **SEC-05, SEC-06 et SEC-07 fermés** ; **SEC-08** ouverte (le PIN
n'est plus lisible, mais il est encore *choisi* par un administrateur) ;
**SEED-01** ouverte — c'est le diagnostic des 3 échecs jusqu'ici non expliqués.
Révision 13 : **le terrain a trouvé ce qu'aucun test ne pouvait trouver.**
**VOIX-01** ouverte — la voix sait commencer et remplir une vente, pas la
terminer ; et le repli tactile, emprunté justement quand la dictée échoue, est
muet. Ce n'est pas une dette de code : c'est une dette de **produit**, et la
première de ce registre. La doctrine voix s'en trouve agrandie.
Révision 12 : plus aucun **défaut produit** P0/P1 atteignable par la recette
terrain marchande. Un défaut de **chaîne de fabrication** trouvé et fermé —
**REL-01** : l'APK se construisait par défaut depuis une branche de travail, pas
depuis le `main` audité. Deux formulations resserrées : **I6** est une
spécification **périmée** (la viser ferait implémenter une mauvaise cible), et
« aucun P1 atteignable en pilote » devient « par la recette terrain
marchande » — AUTH-RECOVERY-01 reste P1 OUVERT et n'est pas fermé par cette
séance.
Révision 11 : **SCHEMA-CI** — le gate n'est plus une discipline humaine, il
tourne à chaque PR et à chaque fusion. **SCHEMA-01/02/03 restent OUVERTES P1
architecture et ne bloquent plus l'APK pilote.** Aucun bloqueur de sortie ne
subsiste dans la section « P1 atteignables ».
Révision 10 : **SCHEMA-PILOTE** — un chemin de déploiement unique, prouvé et
figé (60 tables, 684 colonnes). Il **ne ferme pas** SCHEMA-01/02/03 : il rend le
risque non atteignable pour cette sortie. Son garde-fou au niveau **colonne** a
trouvé une **troisième** instance du mécanisme, **SCHEMA-07** — `bpay_transactions`
n'a jamais eu les colonnes que le code écrit, sur aucun chemin. Trouvée avant le
terrain, cette fois.
Révision 9 : **cinq P1 reclassés en P2 sur MESURE**, aucun fermé. API-03,
API-04 et TYPE-01 : architecture imparfaite, aucun comportement faux de la
marchande démontré. SCHEMA-05 et SCHEMA-06 : défauts réels, mais aucune voie du
pilote terrain ne les atteint. **SCHEMA-01/02/03 restent P1**, délibérément.
Révision 8 : le contre-audit a trouvé **deux défauts réels** dans ARGENT-4, tous
deux confirmés dans le code avant correction. **ARG-10 rouvert puis refermé** —
`reglement_credit` n'entrait pas dans la caisse théorique : écart fantôme de
7 000 F. **ARG-03 : ma déclaration était trop large** — elle portait sur
l'écriture, pas sur la clôture. **ARG-12 ouverte et fermée** : le vrai client
n'envoyait aucune clé d'idempotence, donc I5 était fermé dans le test et pas
dans le parcours. **ARG-11 corrigé** : sa liste de bloqueurs était incomplète.
Révision 7 : **ARGENT-4 livré** — ARG-03, ARG-05 et ARG-10 fermés par une
primitive transactionnelle unique dont la **nature est calculée**, jamais
fournie. **ARG-11** inscrit la condition bloquante de réouverture du crédit, et
nomme ce qui reste ouvert avant : ARG-04, I6, CLIENT-02, TYPE-02.
Révision 6 : **ARG-02 fermé** (deux couches mentaient sur l'historique, pas
une : la lecture serveur ET l'affichage front) et **API-01 fermé sur le
périmètre reformulé** — un 401 ne peut plus être lu comme un verdict métier.
**API-10** sort le décompte d'architecture pour qu'il ne soit pas fermé par la
bande ; **API-01b** a ouvert puis fermé le cas WebAuthn : même mensonge que le PIN,
par l'empreinte, et en pire — l'invite ne s'affichait même pas.
Révision 5 : **SEED-01 et SEC-08 fermés**. La batterie d'invariants est
redevenue déterministe (trois exécutions complètes d'affilée, 208/208), et il
n'existe plus aucun chemin métier où un humain interne choisit, lit ou dicte le
PIN d'un autre.
Le détail de chaque correction est dans la colonne « preuve ».

**Compte courant : 27 FERMÉ · 5 HORS PÉRIMÈTRE JUSTIFIÉ · 51 OUVERT** *(recompté ligne à ligne à la révision 17 : 81 lignes ; +2 OUVERT, VOIX-02 et VOIX-03)*.

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

**Règle de séquence (Patrick, 19/09/2026).** Un défaut extérieur au lot courant
peut être corrigé immédiatement **s'il rend les gates non déterministes ou
affaiblit la valeur de preuve du lot** — à quatre conditions : le nommer, le
reproduire, limiter le diff au strict nécessaire, et l'inscrire séparément au
registre. SEED-01 est le premier cas d'application.

**Doctrine voix, agrandie par le terrain du 20/09/2026.** La règle existante
disait : *aucune information importante ne doit exister uniquement sous forme de
texte.* Le terrain a montré le corollaire qui manquait :

> **Aucune information importante ne doit exister uniquement sous forme de texte.**
> **Aucune ÉTAPE importante ne doit exister uniquement sous forme tactile.**
> **La voix est une propriété du PARCOURS, pas de l'écran.**

C'est une règle d'architecture, pas un détail d'interface : elle explique
pourquoi chaque écran fait ce qu'il annonce alors que l'ensemble ne marche pas.

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
| **ARG-02** / B2 | P1 terrain | **FERMÉ** | **DEUX couches mentaient, pas une — le contre-audit n'avait relevé que la première.** (1) Serveur : `COALESCE(sm.unite, p.unite)` remplacé par `sm.unite` seule, et la jointure sur `produits` disparaît avec le repli. (2) **Écran** : la fiche produit affichait `{m.qty} {selectedStock.unit}` — l'unité du catalogue d'aujourd'hui, sans même regarder celle du mouvement ; le correctif serveur ne pouvait rien pour ces lignes. Trois rendus corrigés. Une unité absente est **dite** (`uniteConnue` + « unité non enregistrée »), jamais empruntée | `ecc1ae6` — reproduction avant correctif : `COALESCE` remis, 3 des 4 invariants rougissent. Le 4ᵉ passe dans les deux cas : il couvre B2, pas ARG-02, et c'est écrit | — |
| **ARG-03** | P1 | **FERMÉ** | Les trois chemins d'encaissement passent par `encaisser-credit.ts` ; le contrôleur contient **0** `INSERT INTO caisse_transactions` ; **et la clôture comprend les deux natures** | `a959ec5` — *ma déclaration « les trois chemins sont fermés » était trop large en révision 7 : elle portait sur l'écriture, pas sur la lecture de clôture. Une écriture d'argent n'est finie que quand la clôture la comprend* | — |
| **ARG-10** | P1 | **FERMÉ** | *Rouvert au contre-audit de la révision 7, puis refermé.* `/payer` encaisse le reste **et la clôture le compte** : `caisseTheorique` somme `acompte_credit` **et** `reglement_credit`. Un invariant ferme réellement la journée après un règlement et exige **écart = 0** | `a959ec5` — j'avais fermé ARG-10 sur une ligne de caisse correctement écrite que la clôture ignorait : écart fantôme de 7 000 F, mesuré en reproduisant. Mon test ne fermait jamais la journée, il ne pouvait pas le voir | — |
| **ARG-11** | **P1** | **OUVERT** | **Condition bloquante de réouverture du crédit.** `CAISSE_CREDIT_ACTIF` ne repasse à `true` qu'une fois TOUT ce qui suit fermé — et la liste de la révision 7 était **incomplète**, le contre-audit l'a corrigée. **Restent ouverts : ARG-04** (idempotence de la *création* — `CreerCreditData` ne dédoublonne pas le crédit lui-même, `blockers.spec.ts` I4 toujours `it.failing`), **I6 — MAIS SA SPÉCIFICATION EST PÉRIMÉE** : `blockers.spec.ts` exige encore une ligne `caisse_transactions.type = 'credit'`, alors que la convention de caisse est `vente` / `depense` / `acompte_credit` / `reglement_credit` — `'credit'` n'en fait pas partie. **Le viser tel quel ferait implémenter une mauvaise cible.** Le vrai besoin est plus large : une vente à crédit doit produire une trace de vente comptablement correcte **et** décrémenter le stock atomiquement. **I6 est à réécrire avant tout chantier de réactivation**, **CLIENT-02**, **TYPE-02** | — | ARGENT-4 + 4b traitent l'**encaissement** et sa **clôture**. Rien d'autre |
| **ARG-12** / I5 réel | **P1** | **FERMÉ** | *Ouverte et fermée dans le même lot, au contre-audit.* Le vrai client (`caisse-api.ts`) n'envoyait **aucune** clé : le serveur en fabriquait une avec `Date.now()`, donc deux envois de la même tentative encaissaient **deux fois** — pendant que `blockers.spec.ts` I5 restait vert, puisqu'il fournissait la clé lui-même. Les trois fonctions client envoient désormais une clé ; test dédié sur le vrai client ; le serveur **refuse** un acompte sans clé au lieu d'en deviner une | `a959ec5` — « un test qui fournit ce que le vrai client ne fournit pas ne teste pas le vrai client ». I5 est annoté pour dire ce qu'il prouve et ce qu'il ne prouve pas | — |
| **REL-01** | **P1 sortie** | **FERMÉ** | *Défaut de chaîne de FABRICATION, pas de produit, trouvé au contre-audit du `main` fusionné.* `apk.yml` construisait par défaut `claude/clever-allen-dnr8by` et la recette terrain disait de laisser les valeurs par défaut — option B incluse. L'APK aurait été **tracé comme venant d'une branche de travail**, pas du `main` qui a traversé la chaîne de preuve | `335b483` — au moment de la fusion les deux arbres étaient identiques (`main` n'a qu'un merge commit de plus), donc le binaire aurait été le même ; **dès le commit suivant sur `main`, la construction devenait réellement périmée sans que rien ne le signale** | — |
| **ARG-04** | P1 dormant | **OUVERT** | `POST /caisse/credits` sans `idempotency_key` — vérifié : la seule clé du fichier est celle de l'acompte | — | Idempotence de création. **Avant réactivation du crédit** |
| **ARG-05** | P1 | **FERMÉ** | Atomicité crédit / client / caisse / audit : les quatre écritures dans la même transaction, les quatre ou aucune. Verrou `FOR UPDATE` : deux paiements simultanés s'additionnent au lieu de s'écraser | `45e99ff` — un test exige qu'un encaissement refusé ne laisse **rien** derrière lui | — |
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
| **API-01** | P1 | **FERMÉ** | **Reformulation, 19/09/2026 : « le vrai problème n'est pas qu'il y a trop de `fetch()` directs ; c'est qu'un 401 sur un appel auth peut être interprété comme une erreur métier ».** Sur ce périmètre : `WalletPage`, `UniversalParametres`, `UniversalProfil` passent par `services/api/auth-api.ts`, qui ne rend que trois états — succès métier, erreur métier, reconnexion requise. Garde-fou corrigé **dans les deux sens** : la regex couvre `auth`, et le non-convergé est **nommé** dans `RESTE_A_CONVERGER` au lieu d'être masqué ; un contrôle fait rougir toute exception périmée (il en a trouvé 3 posées par excès) | `1c90b97` — conséquence mesurée sur vrai serveur : bon PIN + jeton expiré → 401 → `data.valid` **undefined** → « Code PIN incorrect ». La marchande tapait le bon code de son portefeuille et l'application lui disait non | **Le décompte d'architecture reste, et il est sorti dans API-10 : rien n'est caché ici** |
| **API-02** | P1 | **FERMÉ** | `StockContext.tsx` : **0** `fetch(` | `9d74fec` — `stocks-api.ts` | — |
| **API-03** | **P2 architecture** | **OUVERT** | **Re-mesuré après API-01/01b :** `useWebAuthn` est passé de **7 → 2** appels directs, et il ne reste **qu'UNE** implémentation de rafraîchissement de session (`api-client.ts:70`). Les appels directs restants sont **tous d'avant-session** — `login`, `activer`, `create-acteur`, connexion biométrique — où un 401 a un sens métier (« identifiants faux »), pas « session expirée ». Tout appel EN session passe par la couche | Reclassé P1→P2 sur mesure, pas sur impression | *Le décompte « trois voies » était périmé.* La fragmentation demeure, sans conséquence terrain démontrée |
| **API-04** | **P2 architecture** | **OUVERT** | **Mesuré, et plus grave que « une imperfection » :** `api-client.ts` ne pose **jamais** l'en-tête `Authorization` — le patch global de `main.tsx` est donc **porteur**, pas un confort. Vérifié en revanche : il s'applique bien au rejeu hors-ligne (la file tourne dans la page, le service worker ne sert qu'aux notifications), et le rejeu après rafraîchissement relit le jeton neuf | Reclassé P1→P2 sur mesure | **Point unique de défaillance hors de la couche API.** Aucun comportement faux démontré aujourd'hui ; la cible est que la couche pose l'en-tête elle-même |
| **API-05** | P2 | **OUVERT** | `authService.getCurrentUser()` présent, retourne toujours `null` | — | Supprimer après preuve d'absence de consommateur |
| **API-06** | P2 | **FERMÉ** | `services/academyService.ts` : **absent du dépôt** | `ee30077` — code mort prouvé inatteignable, registre `docs/hygiene/HYGIENE-1-axe1-code-mort.md` § « Contenu d'académie non branché » | — |
| **API-07** | P2 | **OUVERT** | `useRealtime.ts` : 7 appels propres | — | Fragmentation |
| **API-08** | P2 | **OUVERT** | `utils/api.ts` : 1 appel direct | — | Fragmentation |
| **API-09** | P2 | **OUVERT** | `backoffice-api.ts` : **50** appels, vérifié | Hors périmètre auth/caisse/vente/stock du mandat HYGIÈNE-1 | 50 appels |
| **API-10** | P2 hygiène | **OUVERT** | **Sorti d'API-01 pour ne pas le fermer par la bande.** Mesuré : **173** `fetch()` directs hors `services/api/` *(et non 196 — le chiffre précédent était périmé)*, dont **69** hors back-office. Aucun ne produit plus de message faux sur un parcours marchande | — | C'est de la fragmentation, pas un défaut de comportement. À traiter au fil des écrans, jamais en masse |
| **API-01b** | **P1** | **FERMÉ** | `EtatBiometrie` remplace le booléen : ok / non_reconnue / annulee / session_expiree / indisponible. Les 5 appels **en session** passent par la couche auth ; les 2 appels **avant session** (connexion biométrique) restent directs, il n'y a pas de jeton à rafraîchir. Le typage a forcé les 4 appelants à traiter chaque cas | `d4fdd7c` — séparation vérifiée : un échec WebAuthn normal est une **exception levée** par le navigateur, une session finie est un **401 HTTP**. Couture `navigateurWebAuthn` ajoutée pour que le test couvre autre chose que le seul cas « session expirée ». `PropositionReconnaissance` ne note plus un refus sur session expirée — ça l'aurait privée de la proposition pour une raison qui ne la concerne pas | — |

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
| **TYPE-01** | **P2 architecture** | **OUVERT** | Re-mesuré : **502** `: any` + **265** `as any` *(le « 390 » du registre comptait autrement — les deux mesures sont données pour qu'on cesse de comparer des chiffres incomparables)*, dont **125** `catch (e: any)`. Et surtout : **0** sur une donnée métier aux frontières argent (montant, prix, quantité, stock, solde, acompte, total) | `56b4168` puis reclassé P1→P2 sur mesure | Dette de typage, pas de défaut de comportement. **Condition de réouverture : toute donnée d'argent qui redeviendrait `any` à une frontière** |
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
| **SEC-08** | **P1** | **FERMÉ** | `POST /auth/identificateur/:id/pin` n'existe plus (404 vérifié), et `POST /users/backoffice/create` — la vraie voie de création — génère le PIN par `crypto.randomInt`, l'écrit chiffré, l'envoie par SMS et ne le rend nulle part. Audit `PIN_IDENTIFICATEUR_CREE` sans aucun fragment du code. Preuve qui **traverse** : SMS → base chiffrée → `verify-pin` accepte | `3d3e00c` — il ne reste que trois chemins : création (serveur → SMS), réinitialisation (serveur → SMS), et `me/change-pin` où l'identificateur choisit le **sien**. Garde statique : aucune route paramétrée par l'identifiant d'autrui n'accepte un PIN dans son corps — **écrit faux d'abord** (il passait au vert sur la route à interdire), corrigé, puis prouvé sur route témoin | — |

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
| **SCHEMA-01** | **P1** | **OUVERT** | Trois mécanismes coexistent : migrations TypeORM, `DbInitService`, `synchronize` | `591524c` — **SCHEMA-PILOTE ne ferme pas cette ligne et ne prétend pas le faire.** Il prouve qu'**un seul** de ces chemins construit la base du pilote, et il le fige | **La doctrine reste structurellement multiple.** Le risque est rendu non atteignable pour CETTE sortie, pas supprimé |
| **SCHEMA-02** | **P1** | **OUVERT** | `schema-flags.ts` : base vierge → `synchronize`, base existante → migrations si `DB_MIGRATIONS_RUN` | `591524c` — le gate vérifie que la branche « vierge » est bien celle du pilote et qu'aucune table `migrations` n'apparaît | Multiplie les chemins de construction du schéma |
| **SCHEMA-03** | **P1** | **OUVERT** | Des évolutions doivent être recopiées à la main dans DbInit | `73343a4` (B1), `6ef6560` (STK-01), `591524c` (**SCHEMA-PILOTE** : garde-fou étendu aux **COLONNES** — 41 tables, 344 colonnes — + empreinte figée de 60 tables / 684 colonnes) | **Le mécanisme qui produit ce défaut demeure — et il a produit une TROISIÈME instance, SCHEMA-07, que le garde-fou au niveau table ne pouvait pas voir.** Le garde-fou détecte, il ne converge toujours pas |
| **SCHEMA-04** | P1 | **FERMÉ** | = STK-01, fermé par `6ef6560`. Ce n'était pas un fait d'environnement : le dépôt suffisait à le prouver | `6ef6560` | — |
| **SCHEMA-05** | **P2 — non bloquant pilote** | **OUVERT** | `api_keys` est lue et écrite par du code vivant (`partner/partner.controller.ts`, `partner-api-keys.service.ts`) et créée seulement par une migration **archivée** : elle n'existe pas sur base neuve. **Le défaut est réel** | Reclassé P1→P2 par Patrick (19/09/2026), sources vérifiées : aucune étape partenaire dans `docs/RECETTE-TERRAIN-GROUPEE.md` ni au périmètre du pilote espèces (`docs/INVENTAIRE_RECETTES_V1.md`) | **Aucune voie du pilote terrain n'atteint cette fonction. À fermer avant activation de l'API partenaires** |
| **SCHEMA-06** | **P2 — non bloquant pilote** | **OUVERT** | `keiwa_config_items` est lue, insérée, modifiée et supprimée par `admin-wallets.service.ts`, et créée **nulle part**. **Le défaut est réel** | Reclassé P1→P2 par Patrick (19/09/2026) : Keiwa/paiements sont des services **conditionnels**, No-Go maintenu, terrain décrit comme « pilote espèces fonctionnellement fermé » (`docs/AUDIT_UX.md`, `JULABA_DECISIONS.md`, `docs/RECETTE.md`) | **Aucune voie du pilote terrain n'atteint cette fonction. À fermer avant activation Keiwa** |
| **SCHEMA-07** | **P1** | **FERMÉ** | **Troisième instance du mécanisme SCHEMA-03, trouvée par le garde-fou COLONNE de SCHEMA-PILOTE — avant le terrain, pas à l'usage.** `bpay_transactions` était créée avec `montant` alors que le code insère `amount`, `merchant_tx_id`, `provider`, `type` et met à jour `error_message` : cinq colonnes qui n'existaient **ni dans DbInit, ni dans la baseline**. Ce n'était donc pas une divergence DbInit/migrations comme B1 et STK-01, mais une table qui n'a **jamais** correspondu au code | `591524c` — corrigé dans DbInit **et** par migration ; `montant` conservée (on ne supprime pas une colonne qui peut porter des données) | — *(tout paiement B-Pay et toute recharge échouaient, sur base neuve **comme** sur base migrée — hors parcours pilote, Keiwa étant No-Go)* |
| **SEED-01** | **P1** | **FERMÉ** | Chaque niveau du seed compare les codes du jeu à ceux en base et n'insère que ce qui manque ; aucun niveau ne décide pour un autre. Les cartes parent sont relues en base après chaque insertion | `8b66407` — reproduction déterministe avant correctif (le test pose lui-même le district parasite) : 3 rouges. Après : 4 verts, et **la batterie complète est redevenue déterministe** — cinq exécutions d'affilée, 205/205 | — |

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
| **DOC-03** | P3 | **FERMÉ** | La docstring de `lireMouvements` décrit ce que le code fait : toutes les variations remontent, ventes hors stock comprises | `ecc1ae6` — corrigée sur le chemin même d'ARG-02, la ligne au-dessus de celle qui changeait | — |
| **UI-01** | P3 | **OUVERT** | Dette visuelle / tokens / couleurs littérales | — | Hors priorité sauf défaut fonctionnel |
| **VOIX-01** | **P1 produit** | **OUVERT** | **Continuité vocale de bout en bout du parcours de vente.** *Trouvée au terrain le 20/09/2026, sur l'APK `julaba-apk-2f34941`. Aucun des 233 invariants ne pouvait la produire : ils prouvent qu'une vente est **juste**, jamais qu'elle est **praticable**.* **Le diagnostic, de Patrick :** « JULABA n'est pas en logique de caisse POS — ce sont des fonctionnalités affichées qui se perdent au fil du workflow. On peut commencer avec la voix et, à l'étape suivante, ne plus avoir de fonctionnalité vocale. » **Vérifié dans le code, pas déduit :** `vendreVocalUnifie.ts` l'énonce lui-même — « la voix ajoute une ligne au panier ; **l'encaissement reste exclusivement le bouton tactile “Payer en espèces”** ». **DEUX coutures, pas une.** (1) *Le parcours principal* : la voix sait **commencer et remplir** la vente, elle ne sait pas la **terminer** — panier, encaissement, montant reçu, « compte juste », paiement sont tactiles. (2) *La branche d'échec*, non couverte par la première mesure : `SaisieGuidee` et `ConfirmationLigne` contiennent **0** appel `speak()`. La « répétition de Tata » — « j'ai compris : 3 tas à 500, c'est bon ? » — y est **écrite, jamais dite**. **C'est le repli emprunté quand la dictée vient d'échouer** : on envoie une marchande qui n'a pas été comprise vers un écran qui ne lui parle pas | — | **Ce n'est PAS « ajouter un micro sur POSCaisse »** : ce serait retomber dans le piège écran par écran que cette dette décrit. **La cible est un parcours, pas un écran.** `docs/AUDIT_UX.md` la disait déjà — « une tâche, un parcours : UN panier ; la voix entre, le tactile complète » et « marchande non lectrice : **vendre sans lire** ». La première moitié est tenue (un panier partagé), la seconde non. **Plan : `docs/parcours/VOIX-01-PLAN-PARCOURS.md`** (validé le 20/09/2026, quatre arbitrages figés). **Avancement — lot A livré le 20/09/2026** : sur téléphone portrait, produits + panier + total + « Payer en espèces » vivent sur la même route, sans feuille à ouvrir ni écran à changer ; l'unité rejoint la ligne de panier, où elle n'existait que dans la barre flottante supprimée. Garde-fou `caisseSurfaceUnique.test.mts` (suite `verify`), **prouvé rouge sur la source d'avant — 8 échecs**. **Avancement — lot B livré le 20/09/2026** : la caisse est l'unique surface de vente ; le moteur vocal y a convergé (`MicroVenteCaisse.tsx`), l'accueil et la fiche produit y mènent directement (produit transmis par l'état de route), le repli tactile y est absorbé, et `VenteVocaleModal` est supprimé sans appelant restant. Garde-fou `caisseMicroPermanent.test.mts` (suite `verify`) sur les cinq preuves exigées, **prouvé rouge sur la source d'avant — 13 échecs**. **Correction — lot B2 le 20/09/2026** : le produit présélectionné n'atteignait pas le moteur vocal (`vendreUnifie(action.produit, …)`). Symptôme mesuré : « Je n'ai pas compris le prix. Redis-moi combien tu as vendu », panier vide, alors que le prix était au catalogue. Module pur `preselectionVente.ts`, appliqué à la vente directe **et** au raccourci ; la parole prime ; ni l'unité ni le prix de la fiche ne sont forcés. **Reproduit rouge — 7 échecs** sur le comportement d'avant. **Avancement — lots C, D, E livrés le 20/09/2026 et contre-audités (`a947f2a`)** : C — grammaire `grammaireEncaissement.ts` consultée en premier par `intentLocal` (annulation différée si la phrase porte une vente), machine à états `machineEncaissement.ts` avec **un seul** `type: 'encaisser'` (l. 218) gardé par relecture faite + empreinte identique (total, reçu, composition triée) + panier non vide + reçu > 0 suffisant ; `POSCaisse` tient la machine dans un `useRef`, `handlePay` (l. 241) a **deux appelants** (bouton l. 671, effet l. 366) sous le **même** verrou `paiementEnCoursRef` ; `MicroVenteCaisse` transmet et s'arrête (0 `handlePay`, 0 `enregistrerVente`) ; **17 scénarios d'attaque + 2 560 000 conversations énumérées : 0 paiement sans relecture exacte de l'état écrit** ; garde-fou `caisseEncaissementVocal.test.mts` rouge sur `f0c965c` (plante à l'import ; 30 échecs avec les modules purs copiés). D — `relectureSpontanee.ts` (pur) ; `ajouterAuPanier`/`ajouterMontantLibre` disent ligne + unité + total ; « Il manque X », « Compte juste », « Tu rends Y » dits d'eux-mêmes, muets quand la machine relit ; `SaisieGuidee`/`ConfirmationLigne` parlent (`repliParle.test.mts`, **14 échecs** rejoués sur `f0c965c`). E — `uniteEntendue` (« kilos » → `kg`), ligne libre dictée avec l'unité prononcée (`vendreVocalUnifie` l. 193), `ChoixUnite` (≥ 44 px, unité dite) sur l'article libre (`choixUnite.test.mts`, **3 échecs** rejoués sur `f7d1916`). `test:ci` gelée inchangée (diff vérifié), 7 scripts ajoutés dans `verify` ; tsc/verify/test:ci/build à 0 ; 0 marqueur de conflit. **Pourquoi la dette reste OUVERTE, et rien d'autre** : (1) **VOIX-02** — une phrase de refus écrit de l'argent sur le chemin même du lot C ; (2) **VOIX-03** — un second micro sur la surface de vente perd l'unité et ne finit pas la vente : le lot E n'est pas « sans exception » sur un chemin atteignable, et le lot B n'est pas « un seul micro ». Tout le reste est vérifié dans le code et mesuré (plan §12). **Aucune dictée réelle sur un téléphone à ce jour** |
| **VOIX-02** | **P1** | **OUVERT** | **« Oui je valide pas » écrit de l'argent.** `grammaireEncaissement.ts` : `ANNULATION` (l. 92) ne connaît pas « pas » seul (seulement « pas encore ») et `AFFIRMATION_PUIS_VALIDE` (l. 83-85) accepte tout ce qui suit `valid\w*`. À l'oral le « ne » tombe : **« oui je valide pas », « oui valide pas », « oui, je valide pas » → `oui_valide`**. Traversée mesurée (script jetable, 20/09/2026) : grammaire → `intentLocal` → `reduire` en `attente_confirmation` sur l'état relu → effet **`encaisser`** → `handlePay`. Aussi : « oui valide la dépense », « ma cliente a dit oui valide » → paient dans le même état. Le critère de fermeture du lot C est **tenu à la lettre** (l'argent écrit est exactement l'état relu) et **contredit dans son esprit** : Tata demande « Je valide ? », elle répond non, ça paie — le commentaire de la grammaire (« le doute profite TOUJOURS au refus ») décrit une règle que le code ne tient pas sur cette forme | — *(trouvée au contre-audit, non corrigée : la forme de la règle appartient à Patrick)* | **Dégât borné** : les billets ont été touchés et le montant est celui qu'elle vient d'entendre ; il reste une vente enregistrée contre un refus dit, à annuler ensuite. Atteignable en pilote dès qu'une relecture a eu lieu. Aucun test rouge ne l'attrape aujourd'hui : `grammaireEncaissement.test.mts` [4]-[5] ne joue pas « valide pas » |
| **VOIX-03** | **P1 produit** | **OUVERT** | **Un second micro vivant sur la surface de vente, qui ne sait ni l'unité ni « encaisse ».** `/marchand/caisse` est rendu sous `AppLayout` (`routes.tsx` l. 58) qui monte `BottomBar` (l. 116) partout sauf `hiddenPaths` (l. 81, la caisse n'y est pas) ; `BottomBar` affiche sur téléphone (`lg:hidden`) un bouton rond vert « Tata » (l. 76-88) qui ouvre `TantieSagesseModal`, lequel vend dans le **même panier** par `vendreVocalUnifie(nomParle, quantite, montant)` **sans transmettre l'unité dictée** (l. 85-86, 128-131). **Mesuré** (script jetable, même phrase « vends deux tas de gombo à 500 ») : micro de la caisse → `unite: "tas"`, Tata dit « 2 tas de gombo » ; micro vert → **`unite: "unité"`**, Tata dit « 2 gombos » — deux sens à la même donnée, sur le reçu. Ce micro ne déclare pas `onIntentionEncaissement` ; « encaisse » dit dedans → `intentLocal` (partagé) → `encaisser` → non contourné → `executerActionTataMarchand` → `not_handled` → rien (lecture du code ; la phrase prononcée alors n'est pas mesurée) | — *(signalé hors lot par l'agent E, établi atteignable au contre-audit ; non corrigé)* | C'est le motif même de VOIX-01 (« deux voix », un micro qui ne finit pas la vente) reformé sur la surface que le lot B rendait unique. **Le lot E n'est donc pas « sans exception »** sur un chemin qu'une marchande atteint depuis la caisse elle-même. Hypothèse, pas diagnostic : origine possible des « deux voix » du terrain. Trois voies (masquer le micro vert sur la caisse, lui transmettre unité + intentions, le retirer du parcours marchand pilote) — **à trancher par Patrick** |
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

**P1 atteignables par la RECETTE TERRAIN MARCHANDE — deux depuis la révision 17 : VOIX-02 et VOIX-03**

> **Révision 17.** La phrase « aucun bloqueur de sortie » n'est plus vraie telle
> quelle : **VOIX-02** (une phrase de refus écrit une vente, dégât borné au
> montant relu) et **VOIX-03** (second micro sur la caisse, unité perdue, vente
> non terminable) sont atteignables par une marchande sur un téléphone connu.
> Qu'ils bloquent ou non l'APK terrain est une décision de Patrick, pas du
> registre — le registre dit seulement qu'ils existent, qu'ils sont reproduits,
> et qu'ils ne sont pas corrigés.

*Ce qui suit reste vrai pour les lignes qu'il nomme :*

> **Formulation resserrée au contre-audit du 20/09/2026.** Dire « aucun P1
> atteignable en pilote » était trop large : le périmètre JULABA inclut
> l'identificateur, et **AUTH-RECOVERY-01 reste P1 OUVERT**. Ce qui est vrai,
> et seulement cela : la feuille `docs/RECETTE-TERRAIN-GROUPEE.md` que nous
> allons exécuter ne teste **qu'une marchande sur un téléphone connu**, et
> aucun scénario identificateur n'y figure. AUTH-RECOVERY-01 est donc **non
> bloquant pour CETTE séance d'APK — pas fermé, et pas hors périmètre.**

> **SCHEMA-01/02/03 restent OUVERTES P1 architecture. Elles ne bloquent plus
> l'APK pilote parce que le chemin unique de construction du schéma pilote est
> reconstruit, testé, figé et imposé par CI à chaque fusion.**

| ID | Ce qui reste, et ce qui le tient |
|---|---|
| **SCHEMA-01 / 02 / 03** | La doctrine de schéma reste multiple — migrations TypeORM, `DbInitService`, `synchronize`. **Rien de cela n'est fermé.** Ce qui a changé : `.github/workflows/schema-pilote.yml` lance `node scripts/schema-pilote.mjs` à chaque PR et à chaque fusion. Empreinte différente, colonne manquante, second démarrage divergent ou invariant tombé ⇒ **PR rouge**. `--figer` est **refusé par le script lui-même** en CI : un gel est une décision humaine, sinon toute PR qui change le schéma se régulariserait elle-même. **La dette demeure ; son atteignabilité pour cette sortie, non** |

*Et ce gate n'est pas décoratif : il a trouvé **SCHEMA-07** à son premier
passage — une troisième instance du mécanisme, sur une forme que le garde-fou
au niveau table ne pouvait pas voir. Trouvée avant le terrain, cette fois.*

*Reclassés en P2 sur mesure, pas sur impression (révision 9) : **API-03**,
**API-04**, **TYPE-01** — architecture imparfaite, aucun comportement faux de
la marchande démontré ; **SCHEMA-05**, **SCHEMA-06** — défauts réels, mais
aucune voie du pilote terrain ne les atteint. Aucune de ces cinq lignes n'est
fermée.*

**P1 NON atteignables en pilote** — `CAISSE_CREDIT_ACTIF = false`.
Condition de réouverture écrite : **avant toute réactivation du crédit.**

| ID | Ce qui reste |
|---|---|
| **ARG-04** | Idempotence de création d'un crédit — `blockers.spec.ts` I4, toujours `it.failing` |
| **TYPE-02** | DTO et contrats du contrôleur crédit |
| **CLIENT-02** | Homonymes partageant une dette |

## Ce que le contre-audit a corrigé

| ID | Décision | Ce que j'avais eu tort d'affirmer |
|---|---|---|
| **ARG-02** | **Rouvert, puis fermé** | « Fermé » alors que le repli `p.unite` faisait toujours dépendre l'historique du catalogue. Fermé depuis — et la reprise a révélé un **second** défaut, à l'écran, que ni le contre-audit ni moi n'avions vu |
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
