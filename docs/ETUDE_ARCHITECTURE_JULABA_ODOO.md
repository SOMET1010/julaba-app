# Étude d'architecture — JULABA × Odoo (hybride invisible)

**Statut : étude READ-ONLY, aucun code touché, aucune migration lancée.**
Objectif : décider *si* et *où* Odoo devrait devenir un moteur métier derrière l'UX JULABA (voix, pictogrammes, langues locales, non-lectrice) — jamais visible par la marchande.

Méthode : 3 audits de cartographie (agents dédiés, lecture seule) + inspection directe du code stock/offline (déjà auditée pendant le LOT 1 en cours) + recherche externe sur l'état actuel de l'API Odoo (19.0, septembre 2026). Chaque affirmation ci-dessous est sourcée par un chemin de fichier exact.

---

## 1. Cartographie du métier actuel

### Vente, panier, paiement espèces, catalogue
- **Panier** : 100 % côté client (`CaisseContext.tsx`, `cartStorage.ts`), aucune table serveur — n'existe qu'au moment du `POST /caisse/vente`. Choix délibéré pour tenir hors-ligne sur téléphone 3G.
- **Vente** : `POST /caisse/vente` (`backend/src/caisse-rest/caisse-rest.controller.ts` L169-277) = une transaction Postgres unique (QueryRunner) : vérifie l'idempotence (`idempotency_key`, index unique `ux_caisse_tx_idempotency_key`), insère `caisse_transactions`, décrémente `produits.stock` ligne par ligne avec `FOR UPDATE`, journalise tout manquant dans `stock_mouvements` (jamais de clamp silencieux — invariant documenté I3). Une session de caisse s'auto-ouvre (`ensureSessionOuverte`, `ON CONFLICT`) : **la marchande n'est jamais bloquée pour vendre**, il n'y a pas de fermeture de session obligatoire.
- **Annulation self-service** : sa propre vente, statut `VALIDEE`, **jour même seulement** (comparaison ISO, suppose implicitement Abidjan=UTC). L'argent n'est jamais retouché (« gelé ») — seuls le statut et le stock (restitution idempotente, `stock-restitution.ts`, partagée avec l'annulation admin) bougent.
- **Catalogue** : double fourche — table `produits` (marchand, `marchand_id` en `varchar`, comparaison texte sans cast à cause d'un bug déjà rencontré) vs table `stocks`/entité `Stock` (coopérateur/producteur, `proprietaire_id`). Deux catalogues statiques désynchronisés existent en plus : `CATALOGUE` backend (21 produits, endpoint `/catalogue` orphelin, jamais appelé) et `CATALOGUE_PRODUITS` frontend (37 produits, vignettes emoji pour l'appariement vocal/tactile non-lectrice).
- **Paiement espèces** : `mode_paiement` est une **chaîne libre non contrainte** côté serveur. Le montant qui fait foi est toujours le montant **dicté à la voix**, prioritaire sur le prix catalogue (`venteVocale.ts` : *« la marchande dit ce qu'elle a réellement encaissé »*) — aucune vérification indépendante. Décomposition en coupures FCFA réelles pour la monnaie à rendre (`utils/fcfa.ts`).
- **Crédit vente** : backend fonctionnel (`credits.controller.ts`, table `credits` + `clients`) mais **désactivé côté UI** par `CAISSE_CREDIT_ACTIF = false` (`POSCaisse.tsx` L23-29), avec commentaire explicite : stock non décrémenté pour le crédit, chaîne non idempotente. Confirmé : `POST /caisse/credits` n'a **aucune** `idempotency_key`, contrairement à `/caisse/vente`.
- **Mobile Money** : deux implémentations disjointes. (A) réelle — recharge/retrait du wallet via l'agrégateur **BPay** (`backend/src/bpay/`), webhook signé, verrou pessimiste, plafond 10M XOF. (B) en caisse — **purement déclarative** (`CAISSE_MOBILE_MONEY_ACTIF = false`), on note juste le nom de l'opérateur en texte, aucun encaissement réel.

### Dépenses, caisse, écart, historique, reporting
- **Dépenses** : une seule table pivot `caisse_transactions` (`type='depense'`). **Bug actif confirmé** : le frontend envoie `{notes}`, le contrôleur lit `body.description` — chaque dépense saisie via l'écran principal perd sa description/catégorie après rechargement. Aucune colonne `categorie` en base ; toute la catégorisation (transport, repas, loyer…) est un classement heuristique client sur un texte qui, de toute façon, ne survit pas au reload.
- **Ouverture/fermeture de caisse** : `caisse_sessions` (`fond_initial`, `fond_final`, `ouvert`). **Bug actif confirmé** : `closeDay` envoie `comptage_reel`, le contrôleur lit `body.fond_final` → toujours `undefined` → `fond_final` vaut systématiquement 0 en base.
- **Écart de caisse** : **n'existe pas côté serveur.** Calculé côté client (`caisseTheorique = fondInitial + ventes − dépenses`, y compris les acomptes crédit), affiché une fraction de seconde puis **jamais persisté** — `updatedSession` est calculé puis jeté sans être sauvegardé. Aucune table, aucun historique d'écarts.
- **Historique** : `GET /caisse/transactions` (pagination plafonnée à 1000, commentaire explicite sur la 3G). La règle d'exclusion des ventes annulées des totaux est dupliquée à 3 endroits différents côté frontend, jamais côté serveur.
- **Reporting/marge/bénéfice** : **deux définitions incompatibles de « marge » coexistent** : (1) marge commerciale réelle (`prix_vente − prix_achat`) calculée à l'écriture de la vente et stockée en base ; (2) « bénéfice net » du reporting agrégé = `ventes − dépenses` (un flux de trésorerie, pas une marge produit) — même mot, deux calculs, deux résultats différents pour un même jour. Rapport hebdo vocal généré à la volée (GPT-4o + TTS), sans cache.

### Crédit, acomptes, clients, fidélité
- **Acomptes** : propriété scalaire de `credits.acompte` (`UPDATE ... SET acompte = acompte + $1`, additif pour tolérer les paiements concurrents) — pas de table de versements séparée, donc pas d'historique de qui a payé quoi et quand au-delà du delta d'API.
- **Clients — fragmentation critique** : trois silos disjoints sans clé commune : `clients` (crédit, clé `(marchand_id, nom)`, pas de téléphone obligatoire — deux clientes homonymes fusionnent leur dette), `fidelite_clients` (clé `(marchand_id, telephone)`), `commandes.acheteur_*` (marketplace). **Aucun concept unifié de client dans tout le dépôt.**
- **Fidélité** : bien conçue en interne (journal append-only `fidelite_evenements` comme source de vérité canonique, projection dérivable dans `fidelite_clients.points`, idempotence sur `gagner`/`utiliser`) mais **totalement déconnectée de la vente** — aucun déclenchement automatique post-vente, la marchande doit ressaisir manuellement téléphone + montant sur un écran séparé. `fidelite_config.actif = false` par défaut.

### Stock, mouvements de stock (connaissance directe — audit LOT 1)
- **Stock** : même double fourche que le catalogue (`produits.stock` marchand vs `stocks`/`Stock` coopérateur-producteur). `PATCH /stocks/:id` a un mécanisme d'idempotence via une table `stock_operation_idempotency` (migration `1781500000000-StockOperationIdempotence.ts`) — **mais cette migration n'est PAS mirroée dans `DbInitService.runInit()`**, le mécanisme réellement actif en production (TypeORM `migrationsRun` s'est révélé peu fiable historiquement, cf. commentaires d'incident dans `db-init.service.ts`). Verdict : cette protection anti-doublon spécifique au stock est **probablement inactive en production**, contrairement à celle de `/caisse/vente` qui, elle, est mirroée et confirmée active.
- **Mouvements de stock** : `stock_mouvements` est un ledger append-only — jamais de mutation, toujours une nouvelle ligne, y compris pour les restitutions. C'est la même philosophie que `stock.move` chez Odoo (mouvements immuables) : un des rares domaines où l'existant est déjà « du niveau Odoo », d'où un risque de migration faible si l'écriture continue de passer par une couche qui préserve cet invariant.

### Offline et resynchronisation (connaissance directe — audit LOT 1)
Deux files **indépendantes et incohérentes entre elles**, découverte centrale pour la section 4 :
1. **`offlineCaisse.ts`** (IndexedDB) — rejoue de vraies requêtes HTTP (vente, dépense, PATCH stock) avec `idempotency_key` intégrée au payload, lettre morte sur 4xx permanent, plafond de tentatives sur 5xx transitoire, ordre préservé. Isolation par utilisateur (`owner_user_id`) **ajoutée cette session** (P0-1, testée verte, pas encore commitée) — avant ce correctif, un terminal partagé (logout/login) pouvait rejouer la file de la marchande A sous le compte de la marchande B.
2. **`useOfflineVoiceQueue.ts`** (localStorage) — rejoue le **texte brut** de l'énoncé vocal (pas une opération structurée), sans `owner_user_id`, avec un bug de `clearQueue()` qui vide `sessionStorage` au lieu de `localStorage`. **N'a pas encore le correctif d'isolation par utilisateur** (P1-1, identifié, pas encore fait).

Ces deux files répondent en fait déjà, de façon incomplète, exactement à la question posée en section 4 de cette étude (`owner_user_id`/`operation_id`/état/rejeu) — voir section G.

---

## 2. Classification architecturale

| Domaine | Classe | Justification |
|---|---|---|
| Voix, pictogrammes, langues locales, reconnaissance d'intention | **A** | Cœur de la différenciation JULABA ; aucun équivalent Odoo, ne se délègue pas. |
| Panier (état local éphémère) | **A** | Choisi délibérément client-only pour l'offline 3G ; un panier serveur Odoo casserait cette contrainte. |
| Montant dicté prioritaire sur catalogue, décomposition FCFA en coupures | **A** | Logique de confiance/geste terrain non-lectrice, sans équivalent générique. |
| Auto-ouverture de session, annulation self-service « jour même » | **A/D** | Politique produit de confiance envers une marchande non lectrice ; incompatible avec le modèle de session POS standard (fermeture stricte). |
| Vente (écriture transactionnelle + décrément stock + idempotence) | **C** | JULABA doit rester le point d'entrée (voix, offline, latence) ; Odoo peut devenir autoritaire sur l'écriture *si* le Gateway préserve l'atomicité — sinon rester en A tel quel. |
| Stock / mouvements de stock (ledger) | **B** (marchand) / **B** potentiel plus fort (coopérative/producteur, stock consolidé multi-acteurs) | `stock.move`/`stock.quant` d'Odoo couvrent ce besoin nativement ; le ledger actuel est déjà conceptuellement compatible. |
| Comptabilité / marge réelle / écart de caisse / reporting consolidé | **B** | Domaine générique où un moteur mature apporte une vraie valeur ; l'existant a des bugs (marge à deux définitions, écart jamais persisté) qu'Odoo, bien intégré, corrigerait structurellement. |
| Crédit marchand, acomptes | **C/D** | Logique de dette informelle (clé `nom`, pas de vrai `partner_id`) ; utile de la faire porter par Odoo (`account.move`) mais nécessite d'abord de fiabiliser JULABA (idempotence manquante) et de résoudre l'identité client. |
| Clients (identité unifiée) | **D** | Le silo à trois entités actuel est spécifique/accidentel à JULABA (pas un choix produit) ; un `res.partner` central est justement ce qui manque — migration nécessaire mais lourde (dédoublonnage), pas un simple branchement. |
| Fidélité | **B**, mais faible priorité | Le module `loyalty` d'Odoo couvrirait le besoin ; le gain réel serait surtout de l'automatiser (ce que JULABA ne fait pas non plus aujourd'hui). |
| Mobile Money — recharge/retrait wallet (BPay réel) | **D** | Agrégateur ivoirien propriétaire (BPay), sans connecteur Odoo générique ; garder tel quel côté JULABA, ne pas migrer. |
| Mobile Money — en caisse | **A (aujourd'hui déclaratif)** | Rien à migrer : ce n'est pas un vrai encaissement actuellement. |
| Offline / resynchronisation | **A**, avec Gateway obligatoire pour toute cible Odoo | Contrainte la plus dure de toute l'étude — voir section 4/G ; JULABA doit garder l'intégralité de la mécanique d'outbox durable, quel que soit le moteur d'écriture final. |

---

## A. Architecture actuelle (simplifiée)

```
┌─────────────────────────────┐
│  JULABA UI (React/Capacitor) │  Voix • Icônes • Tactile guidé
│  CaisseContext / AppContext  │  Panier local, calculs dérivés (marge, caisse théorique)
│  offlineCaisse (IndexedDB)   │  ┐
│  useOfflineVoiceQueue (LS)   │  ┘ 2 files indépendantes, incohérentes
└──────────────┬───────────────┘
               │ REST (JWT), idempotency_key par payload
┌──────────────▼───────────────┐
│  NestJS backend (caisse-rest, │  Logique métier en SQL brut (peu d'entités TypeORM),
│  stocks-rest, credits, bpay,  │  DbInitService.runInit() = vrai schéma prod (pas TypeORM
│  fidelite-rest, wallets…)     │  migrationsRun, historiquement peu fiable)
└──────────────┬───────────────┘
               │
┌──────────────▼───────────────┐
│  Postgres (Render)            │  produits/stocks (double fourche), caisse_transactions,
│                                │  stock_mouvements (ledger), credits, clients,
│                                │  fidelite_*, bpay_transactions, wallets
└────────────────────────────────┘
```

Postgres est **l'unique source de vérité**, écrite directement et uniquement par le backend NestJS. C'est un point fort (pas de double autorité entre deux moteurs) qu'une intégration Odoo mal conçue pourrait détruire.

## B. Architecture cible JULABA × Odoo (hybride, périmètre volontairement restreint — voir J)

```
┌─────────────────────────────┐
│  JULABA UI (inchangée)       │  Voix • Icônes • Tactile • Langues locales
│  Domain commands (inchangés) │  POST /caisse/vente, PATCH /stocks/:id, etc. — MÊME contrat
│  Outbox durable UNIFIÉE      │  operation_id • owner_user_id • payload • état
└──────────────┬───────────────┘
               │ REST interne JULABA (JWT JULABA, inchangé — jamais de credential Odoo ici)
┌──────────────▼───────────────┐
│  JULABA Integration Gateway   │  • Authentification JULABA (déjà là)
│  (module NestJS existant,     │  • Mapping JULABA ↔ Odoo (modèles/champs)
│   étendu, pas remplacé)       │  • Idempotence (operation_id → table odoo_sync_log)
│                                │  • Validation de commande (déjà là, class-validator)
│                                │  • Traduction des erreurs Odoo → codes JULABA simples
│                                │  • Journal technique (audit_logs existe déjà)
│                                │  • Cache métier limité (catalogue/stock en lecture)
└──────────────┬───────────────┘
               │ Odoo External JSON-2 API (bearer API key, JAMAIS dans le frontend)
┌──────────────▼───────────────┐
│  Odoo 19 (moteur choisi)      │  Domaines B uniquement : stock consolidé, comptabilité,
│                                │  reporting, crédit/`account.move`, `res.partner`
└────────────────────────────────┘
```

Point structurant : **le Gateway n'est pas un nouveau composant à inventer de zéro** — c'est le backend NestJS actuel (`caisse-rest`, `stocks-rest`…) auquel on ajoute une couche de traduction vers Odoo pour les domaines classés B, sans toucher au contrat que le frontend consomme déjà.

## C. Table comparative (fonction par fonction)

| Fonction | Aujourd'hui | Cible JULABA/Odoo | Pourquoi | Difficulté migration | Risque |
|---|---|---|---|---|---|
| Catalogue produits | Deux listes statiques désynchronisées (backend orphelin, frontend consommé) + double table `produits`/`stocks` | `product.product` Odoo comme référentiel, JULABA garde une façade image/vignette/appariement phonétique en cache local | Réconcilie une incohérence déjà existante ; Odoo n'ajoute pas de risque nouveau ici, il en résout un | Moyenne (fusionner 2 fourches + 2 listes avant tout branchement) | Moyen |
| Panier | 100 % client, éphémère | **Inchangé** | Contrainte offline 3G non négociable | — | Faible (ne pas toucher) |
| Vente (écriture) | Transaction Postgres unique, FOR UPDATE, idempotente, prouvée en prod | JULABA écrit toujours en premier (source de vérité immédiate côté marchande) ; Odoo reçoit en synchronisation différée via Gateway, jamais en écriture synchrone bloquante | Latence réseau + pas de transaction distribuée ACID JULABA↔Odoo | Élevée si on veut Odoo "autoritaire temps réel" ; faible si Odoo reste en aval | **Élevé** si mal conçu (double autorité, cf. bug déjà rencontré et corrigé sur le stock côté JULABA) |
| Paiement espèces | Champ texte libre, montant dicté fait foi | Inchangé côté UX ; le Gateway normalise le `mode_paiement` avant écriture Odoo | La contrainte de confiance vocale ne se délègue pas | Faible | Faible |
| Dépenses | Bug actif (`notes`/`description`), pas de catégorie en base | Corriger le bug JULABA **avant** toute migration ; ensuite seulement mapper vers `account.move`/dépense catégorisée | Migrer un bug ne le corrige pas, il l'exporte | Faible (bug) puis moyenne (mapping catégorie) | Moyen (propager une donnée déjà cassée) |
| Ouverture/fermeture de caisse | Auto-ouverture permanente, bug `fond_final` toujours 0 | Garder l'auto-ouverture (règle produit A) ; corriger le bug puis alimenter `pos.session` en écriture différée pour la comptabilité | Auto-ouverture incompatible avec le POS Odoo standard (session obligatoire) | Moyenne | Moyen |
| Écart de caisse | N'existe pas en base | Réel gain Odoo : `pos.session`/`cash.box` journalisent nativement l'écart | C'est une fonctionnalité à ajouter, pas à migrer — changement de comportement produit à valider avec l'utilisatrice | Faible techniquement, sensible côté produit | Faible technique / Moyen produit |
| Historique | Requêtes paginées, règle d'exclusion dupliquée 3x côté client | Vue serveur unique (JULABA ou Odoo) qui exclut les ventes annulées | Élimine une incohérence de calcul déjà réelle | Faible | Faible |
| Reporting / marge / bénéfice | Deux définitions de "marge" incompatibles | Odoo comme moteur de reporting comptable consolidé ; JULABA garde le rapport vocal quotidien (couche UX) | Domaine générique où un moteur mature comptable est un vrai gain | Moyenne | Faible à Moyen |
| Crédit marchand | Fonctionnel mais désactivé (pas d'idempotence, stock non lié) | `account.move`/termes de paiement Odoo, **après** avoir fiabilisé JULABA et résolu l'identité client | Migrer une fonctionnalité déjà instable multiplierait le risque de double-crédit | Élevée (dépend de "Clients" ci-dessous) | **Élevé** tant que non fiabilisé |
| Acomptes | Scalaire additif, pas d'historique de versements | `account.payment` (lignes de paiement distinctes) | Gain réel de traçabilité | Moyenne | Faible |
| Clients | 3 silos disjoints, aucune clé commune | `res.partner` central | Le point le plus dangereux du dossier : nécessite un vrai projet de dédoublonnage, pas un branchement API | **Élevée** | **Élevé** |
| Annulation/remboursement | "Argent gelé", jamais de remboursement réel, fenêtre jour-même | Garder la politique JULABA (anti-fraude terrain) ; Odoo ne voit que l'écriture finale (annulée) | Politique métier assumée, sans équivalent Odoo standard (avoir/note de crédit) | Faible si on ne cherche pas à imposer le modèle Odoo standard | Moyen (si on force un remboursement automatique non désiré) |
| Fidélité | Bien conçue (ledger append-only) mais déconnectée de la vente | Le module `loyalty` d'Odoo couvrirait le besoin, mais le vrai gain est d'abord l'automatisation côté JULABA | Le moteur n'est pas le problème ici, l'intégration au flux de vente l'est | Faible (peu utilisé) | Faible |
| Mobile Money (wallet réel, BPay) | Fonctionnel, agrégateur propriétaire ivoirien | **Ne pas migrer** — aucun connecteur Odoo générique pour BPay | Argent réel, intégration déjà mature et spécifique | — | Élevé si touché sans raison |
| Mobile Money (caisse) | Déclaratif, aucun encaissement réel | Sans objet tant que non activé | — | — | — |
| Stock / mouvements de stock (marchand) | Idempotence PATCH probablement inactive en prod (migration non mirroée) ; ledger append-only sain | `stock.move`/`stock.quant` Odoo pour la partie coopérative/producteur en priorité (moins voix/offline-critique) | Domaine le plus "prêt" conceptuellement pour Odoo | Moyenne | Moyen (si migré côté marchand sans résoudre l'offline d'abord) |
| Offline / resynchronisation | 2 files incohérentes (HTTP structuré vs texte brut vocal), isolation utilisateur partiellement corrigée cette session | Une seule outbox durable, state machine explicite, Gateway toujours en aval | Condition **bloquante** de tout le reste — voir section G | Élevée (mais déjà à 70 % construite dans `offlineCaisse.ts`) | **Élevé** si sous-estimé |

## D. Composants JULABA qui pourraient à terme disparaître (si le pilote B ci-dessus réussit)
- Le calcul dupliqué de `caisseTheorique`/marge dans `AppContext.tsx` (remplacé par un solde lu depuis Odoo).
- Le rapport hebdo agrégé en SQL brut (`rapport-hebdo.controller.ts`) — la partie *calcul*, pas la partie *voix* (qui resterait une couche JULABA au-dessus de données Odoo).
- La table `credits`/`clients` maison — **seulement** une fois `res.partner` en place et le dédoublonnage fait ; pas avant.
- Le second catalogue backend orphelin (`CATALOGUE`, endpoint `/catalogue`) — déjà mort, à supprimer indépendamment de toute décision Odoo.

## E. Composants JULABA à garder impérativement, quelle que soit la décision
- Tout le pipeline voix (`useVoiceCore`, `VenteVocaleModal`, dialogues, guidage) — classe A, aucun équivalent Odoo.
- Le panier client éphémère et son mode négoce (prix modifiable à la vente).
- L'outbox offline durable et son modèle `owner_user_id`/`operation_id`/idempotence — **à unifier et renforcer, jamais à retirer** (voir G).
- L'auto-ouverture de session et l'annulation self-service jour-même (politiques de confiance non-lectrice).
- Le montant dicté prioritaire sur le catalogue, la décomposition FCFA en coupures.
- L'intégration BPay (Mobile Money wallet réel) — spécifique, mature, sans équivalent Odoo.

## F. Design du Gateway

Le Gateway n'est **pas un nouveau service à écrire de zéro** : c'est le backend NestJS actuel, étendu. Rôle et contrats :

```
// Contrat inchangé côté frontend — aucune modification UI requise pour le POC
POST /caisse/vente
{
  idempotency_key: "uuid-genere-cote-client",   // = operation_id
  details: [...],                                // panier
  mode_paiement: "especes",
  ...
}

// Nouveau, interne au Gateway (jamais exposé au frontend) :
// table odoo_sync_log
{
  operation_id: uuid PK,
  domaine: "vente" | "credit" | "stock" | ...,
  odoo_model: "pos.order" | "account.move" | "stock.move",
  odoo_record_id: int | null,
  etat: "pending" | "syncing" | "confirmed" | "rejected",
  tentatives: int,
  derniere_erreur: text | null,
  payload_hash: text,          // détecte un rejeu avec un payload DIFFÉRENT sous la même clé
  cree_le: timestamp,
  confirme_le: timestamp | null
}
```

Pseudo-code de la traduction (appelé après le commit Postgres existant, jamais à sa place) :

```
async function synchroniserVersOdoo(operationId, domaine, payload) {
  const existant = await odooSyncLog.get(operationId);
  if (existant?.etat === "confirmed") return existant;         // idempotent
  if (existant?.payload_hash && existant.payload_hash !== hash(payload))
    throw new ErreurConflitIdempotence(operationId);           // même clé, payload différent = anomalie

  await odooSyncLog.upsert({ operationId, domaine, etat: "syncing" });
  try {
    const enregistrementOdoo = await odooClient.appeler(
      mapping[domaine].modele, mapping[domaine].methode, mapping[domaine].versPayloadOdoo(payload)
    );
    await odooSyncLog.upsert({ operationId, etat: "confirmed", odoo_record_id: enregistrementOdoo.id });
  } catch (erreurOdoo) {
    await odooSyncLog.upsert({ operationId, etat: "rejected", derniere_erreur: traduireErreur(erreurOdoo) });
    // JULABA reste la source de vérité immédiate : la vente est DÉJÀ enregistrée côté JULABA,
    // seul le miroir Odoo est en retard/en échec — jamais l'inverse.
  }
}
```

Traduction d'erreurs : `traduireErreur()` mappe les codes JSON-RPC/erreurs Odoo connues ("stock insuffisant", "session fermée", "partenaire introuvable") vers les codes d'erreur simples déjà consommés par l'UI voix existante (`setError`/`ttsSpeak` dans `VenteVocaleModal.tsx`) — aucune nouvelle UI d'erreur à inventer.

Protection anti-double-soumission : contrainte unique sur `operation_id` dans `odoo_sync_log`, exactement le même pattern que `ux_caisse_tx_idempotency_key` déjà en production et déjà prouvé (`test/invariants/i2-idempotence-vente.spec.ts`).

Cache métier limité : lecture du catalogue/stock consolidé Odoo mise en cache côté Gateway (TTL court), jamais d'appel Odoo synchrone dans le chemin critique voix→vente.

## G. Design offline — la question la plus importante de l'étude

**Constat central, à dire tel quel : ce que la section 4 demande d'inventer existe déjà, partiellement, dans `offlineCaisse.ts`.** La table demandée par l'énoncé...

```
JULABA → outbox locale durable → owner_user_id → operation_id → payload → état → reconnexion → Gateway → Odoo
```

...est la description quasi exacte de `offlineCaisse.ts` (IndexedDB, `enfilerOperation(endpoint, payload, userId)`, rejeu via `synchroniser(poster, currentUserId)`) — à trois différences près, dont deux **sont déjà des failles connues et documentées dans ce dépôt** :

1. **État binaire, pas une vraie state machine.** Aujourd'hui : actif/en attente ou lettre morte (dead). La cible demandée est `pending → syncing → confirmed | rejected`. Le "syncing" manque littéralement (pas de verrou logique pendant un envoi en vol) — un rejeu concurrent (reconnexion + relance manuelle) pourrait produire un double appel réseau avant que l'idempotency_key ne l'intercepte côté serveur. Le filet de sécurité existe (clé stable), mais l'état client devrait le refléter explicitement pour éviter du bruit réseau inutile en 3G.
2. **Deux files, pas une.** `useOfflineVoiceQueue` (localStorage, rejoue du texte brut, pas de `owner_user_id`) est un mécanisme parallèle et incohérent avec `offlineCaisse` (IndexedDB, rejoue une opération structurée, `owner_user_id` désormais imposé). **Toute cible Odoo doit d'abord unifier ces deux files en une seule outbox structurée** — sinon le Gateway devrait apprendre à consommer deux formats différents, ce qui double la surface de bug exactement là où la marge d'erreur doit être minimale (argent réel).
3. **Isolation par utilisateur** : partiellement corrigée cette session sur `offlineCaisse` (P0-1, testé, pas encore poussé en prod) ; **pas encore corrigée** sur `useOfflineVoiceQueue` (P1-1). Le scénario 3 imposé par l'énoncé ("A crée une vente hors-ligne ; A se déconnecte ; B se connecte ; la vente de A ne doit jamais devenir celle de B") est *exactement* le test T8 déjà écrit et vert cette session pour `offlineCaisse` — et *échouerait* aujourd'hui sur `useOfflineVoiceQueue`, qui n'a pas cette protection.

**Stratégie de récupération/rejeu recommandée pour une cible Odoo (extension de l'existant, pas une réinvention) :**
- L'outbox reste **le seul état qui compte pendant la coupure** — jamais de dépendance à un état mémoire volatile (déjà le cas : IndexedDB survit à la fermeture de l'app et au redémarrage du téléphone).
- Chaque entrée porte `operation_id` (généré côté client, stable au rejeu) + `owner_user_id` (capturé à la création, jamais réattribué) + payload complet (commande structurée, pas un texte à réinterpréter) + état.
- Au retour réseau : le rejeu ne traite **que** les opérations dont `owner_user_id === utilisateur courant** (règle déjà implémentée dans `offlineCaisse.synchroniser` cette session) ; les opérations d'un autre compte restent intactes en file, ni perdues ni rejouées (`ignorees++`).
- Une opération héritée sans `owner_user_id` (avant ce correctif) est adoptée par l'utilisateur courant au premier rejeu plutôt que perdue — migration douce déjà testée (T10).
- Le Gateway, côté serveur, reste le point unique de vérité pour la déduplication finale (contrainte unique sur `operation_id`) — l'outbox client est une garantie de *non-perte*, pas de *non-doublon* (cette garantie-là vient du serveur, comme aujourd'hui).
- `useOfflineVoiceQueue` devrait, avant toute cible Odoo, être fusionnée dans `offlineCaisse` (ou a minima recevoir le même modèle de propriété et transformer son contenu en commande structurée plutôt qu'en texte à réinterpréter) — c'est un prérequis, pas une option, si l'objectif est l'intégrité financière.

## H. POC minimal proposé

Aucune migration générale. Peut se faire par-dessus le backend actuel, sans toucher un seul écran JULABA.

1. **Scénario nominal.** La marchande ouvre JULABA → 5 produits chargés (lus depuis Odoo via le Gateway, en lecture seule) → elle en sélectionne 2 → confirme une vente cash → JULABA écrit `caisse_transactions` (inchangé, comme aujourd'hui) avec un `operation_id` unique → le Gateway crée en tâche de fond l'enregistrement Odoo correspondant → Odoo confirme → JULABA affiche+dit "Vente enregistrée" (déjà vrai dès l'écriture Postgres, pas besoin d'attendre Odoo) → le stock affiché est relu depuis Odoo consolidé → **rejouer exactement le même `operation_id` doit créer zéro enregistrement Odoo supplémentaire** (test direct de la contrainte unique sur `odoo_sync_log.operation_id`).
2. **Scénario coupure réseau.** Couper le réseau → enregistrer la vente (elle passe dans `offlineCaisse`, comme aujourd'hui) → fermer/recharger l'application → rétablir le réseau → synchronisation automatique → **exactement une vente dans Odoo**, jamais zéro, jamais deux.
3. **Scénario terminal partagé.** A enregistre une vente hors-ligne → A se déconnecte → B se connecte sur le même téléphone → **la vente de A ne doit jamais apparaître sous le compte de B**, ni dans JULABA ni dans Odoo — test direct de `owner_user_id` dans l'outbox + dans le Gateway.

Le POC ne doit toucher qu'un domaine déjà classé B/C dans le tableau (par exemple le stock consolidé côté coopérative, moins critique voix/offline) — **pas** la vente cash marchande en direct, tant que le point G n'est pas réglé.

## I. Recherche API Odoo — état vérifié (septembre 2026)

- Odoo 19 introduit l'**External JSON-2 API** : `POST /json/2/<model>/<method>`, authentification par clé API en en-tête `Authorization: bearer <clé>` (remplace le couple login/mot de passe des anciennes API), arguments toujours nommés (pas d'appel positionnel). C'est la cible technique recommandée pour tout nouveau développement.
- Les anciennes **XML-RPC / JSON-RPC** (`/xmlrpc`, `/xmlrpc/2`, `/jsonrpc`, convention `execute_kw`) sont **explicitement en fin de vie** — les sources divergent sur l'échéance précise (Odoo 20 vs Odoo 22 selon la source consultée), mais la direction est sans ambiguïté : ne pas bâtir une nouvelle intégration dessus.
- Modèles Odoo pertinents identifiés pour les domaines classés B : `pos.order`/`pos.session` (vente/session), `product.product`/`product.template` (catalogue), `stock.move`/`stock.quant` (mouvements/niveaux de stock), `account.move`/`account.payment` (comptabilité, crédit, acomptes), `res.partner` (clients unifiés), `loyalty.program` (fidélité).
- **Limite structurelle confirmée, directement pertinente pour la section G** : le mode offline natif du POS Odoo repose sur IndexedDB/localStorage côté navigateur, mais **il est impossible d'ouvrir une nouvelle session POS sans connexion internet** — seules des sessions déjà ouvertes en ligne continuent de fonctionner hors-ligne. Le scénario JULABA (coupure de plusieurs heures, application fermée, téléphone redémarré, session potentiellement jamais ouverte en ligne ce jour-là) **dépasse ce que l'offline standard d'Odoo garantit**. Confirmation directe de la mise en garde de l'énoncé : ne pas supposer que l'offline standard d'Odoo suffit.
- Aucune clé Odoo ne doit transiter par le frontend JULABA — seul le Gateway (backend) détient la clé API Odoo, jamais le navigateur/l'application mobile.

## J. Recommandation finale

**Architecture hybride, mais à périmètre volontairement restreint — pas "Odoo derrière toute la vente terrain".**

Motivation, en assumant les deux biais à éviter :
- L'existant a de vraies qualités d'ingénierie déjà prouvées en production sur le chemin le plus critique (vente cash) : transaction unique, verrou `FOR UPDATE`, idempotence de bout en bout, ledger append-only, restitution de stock idempotente. Remplacer ce chemin par un aller-retour réseau vers un moteur externe, sans gain fonctionnel évident, **ajouterait un risque d'intégrité sans le retirer** — l'analyse ci-dessus montre qu'il faudrait de toute façon reconstruire, côté Gateway, quasiment la même mécanique d'idempotence/outbox déjà écrite côté JULABA. Le travail d'intégrité ne diminue pas en ajoutant Odoo, il se **déplace**.
- À l'inverse, plusieurs domaines classés B souffrent aujourd'hui de bugs réels et de duplications (deux définitions de "marge", écart de caisse jamais persisté, trois silos "client", crédit sans idempotence) que la discipline d'un moteur mature corrigerait structurellement — et ce sont précisément des domaines où JULABA n'apporte aucune valeur d'inclusion spécifique (comptabilité, reporting consolidé, identité client, stock multi-acteurs côté coopérative/producteur).

Recommandation concrète : **piloter le B/C sur le versant le moins voix/offline-critique de l'app** (coopérative/producteur : stock consolidé, comptabilité, reporting) via le Gateway décrit en F, **avant** d'envisager de toucher au chemin vente-cash-vocale de la marchande — celui-ci doit d'abord voir son offline unifié (section G) et ses bugs de caisse/dépense corrigés indépendamment de toute décision Odoo. Une fois le Gateway et le POC validés sur un domaine à faible risque, réévaluer domaine par domaine (jamais en bloc) si le crédit/client mérite le même traitement — cela dépend d'un projet de dédoublonnage client qui est un chantier à part entière, avec ou sans Odoo.

**Ne pas retenir "Odoo comme backend complet"** : cela imposerait de renoncer à l'auto-ouverture de session (règle produit A) ou de la reconstruire par-dessus Odoo — un contournement, pas une simplification — et romprait la garantie "une seule autorité d'écriture" qui est aujourd'hui une vraie force du système.

**Ne pas retenir "garder l'architecture actuelle sans rien changer"** non plus : les bugs de reporting/marge/écart/dépense et la fragmentation client sont des dettes réelles, indépendantes du débat Odoo, qui méritent d'être corrigées quel que soit le moteur choisi.

## K. Note méthodologique

Ce document ne contient aucun code d'implémentation — uniquement des contrats d'API (JSON) et du pseudo-code pour expliciter l'architecture proposée, conformément au périmètre demandé. Aucun fichier de production n'a été modifié pendant la rédaction de cette étude ; le seul travail de code en cours dans ce dépôt (LOT 1, isolation par utilisateur de `offlineCaisse`) reste en pause, non commité, comme convenu avant le lancement de cette étude.
