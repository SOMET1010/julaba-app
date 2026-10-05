# Fiche d'intégration — un agent serveur parle à l'API JULABA

**Destinataire :** le projet `SOMET1010/julaba-whatsapp-agent` (post-pilote), et
tout futur appelant **serveur** de l'API JULABA.

**Ce document décrit l'existant au 05/10/2026, vérifié dans le code.** Il ne
propose aucune évolution et n'a entraîné aucune modification. Ce qui n'existe
pas est écrit **« À DÉFINIR »** — et le point le plus important de cette fiche
en est un (§2).

| | |
|---|---|
| API | `https://julaba-api.onrender.com/api/v1` |
| Pile | NestJS 11 · TypeORM 0.3 · PostgreSQL (Render) |
| Préfixe | `API_PREFIX`, `/api/v1` en production |
| Source | `backend/src/caisse-rest/`, `backend/src/stocks-rest/`, `backend/src/auth/` |

---

## 1 · LA RÈGLE QUI PRIME SUR TOUTES LES AUTRES

L'application sert des marchandes **dont beaucoup ne savent pas lire**. Un
agent conversationnel qui écrit dans leur caisse touche leur argent **sans
qu'aucun écran ne puisse les prévenir**.

Deux doctrines du dépôt s'appliquent ici sans adaptation :

> « **Sur l'argent, la preuve doit TRAVERSER.** »
> « **Aucune information importante uniquement en texte.** »

En clair, pour cet agent : **aucune écriture sans reformulation vocale et
confirmation explicite de la marchande**. C'est l'ordre de livraison retenu par
Patrick le 05/10 — (b) consultation, puis (a) écriture confirmée, puis (c)
support.

---

## 2 · AUTHENTIFICATION — LE POINT DUR, À LIRE EN ENTIER

### Ce qui existe

`POST /auth/login` rend un **JWT d'utilisateur**. Charge utile émise par
`auth.service.ts:411` :

```
{ sub: <id utilisateur>, phone: <téléphone>, role: <rôle> }
```

- durée de vie : `JWT_EXPIRES_IN`, **`15m` par défaut** ;
- un **refresh token** est délivré en parallèle (`JWT_REFRESH_DAYS`, 7 jours) ;
- `JwtStrategy.validate()` **recharge l'utilisateur en base** à chaque requête :
  un jeton dont l'utilisateur n'existe plus ne passe pas ;
- `CaisseRestController` est protégé par `@UseGuards(JwtAuthGuard)` **au niveau
  de la classe** : toutes les routes `/caisse/*` l'exigent ;
- chaque route lit `@CurrentUser() user` et **scope tout à `user.id`** — lecture
  comme écriture. Une marchande ne peut pas voir ni toucher la caisse d'une
  autre, et ce n'est pas un filtre applicatif optionnel : c'est dans chaque
  requête SQL.

### Ce qui N'EXISTE PAS

**Il n'y a aucun mécanisme d'authentification « agent serveur ».** Pas de compte
de service, pas de clé d'API machine, pas de délégation, pas d'impersonation.
Vérifié : le seul émetteur de jeton est `POST /auth/login`, pour un utilisateur
humain, et `validate()` exige une ligne de la table des utilisateurs.

**Conséquence directe, et elle n'est pas contournable :** en l'état, un agent
serveur ne peut agir qu'en **détenant les identifiants d'une marchande** et en
se connectant à sa place.

### Pourquoi c'est un arbitrage, pas un détail technique

Un agent qui conserve les identifiants de connexion de plusieurs marchandes
devient le point unique dont la compromission ouvre **toutes** leurs caisses.
Le dépôt porte déjà une alerte sur ce terrain — **ALERTE-SEC-01**, 29
identifiants en clair dans un dépôt public — et une règle métier stricte,
**SEC-2** : « le PIN arrive strictement par SMS, aucun repli back-office ».
Stocker des identifiants de marchandes dans un agent va dans la direction
opposée.

**Trois voies, et le choix appartient à Patrick :**

| | principe | ce que ça coûte |
|---|---|---|
| **A** | **Compte de service + délégation explicite.** Un jeton d'agent, et la marchande autorise nommément l'agent à agir pour elle (table de liaison, révocable à tout moment). | à construire côté backend — n'existe pas |
| **B** | **Jeton délégué de courte durée.** La marchande déclenche depuis l'application une autorisation WhatsApp limitée dans le temps. | à construire, mais ne stocke aucun identifiant durable |
| **C** | **L'agent détient les identifiants.** | **aucun développement, et le plus dangereux.** Non recommandé |

**À DÉFINIR — aucune de ces voies n'est choisie, et aucune n'est implémentée.**
Tant que ce point n'est pas tranché, **(b) consultation seule** est déjà
réalisable en C sur un **compte de test**, jamais sur une marchande réelle.

### Détails pratiques

- En-tête : `Authorization: Bearer <jeton>`.
- `CORS_ORIGIN` ne concerne qu'un navigateur : un appel serveur n'est pas
  soumis au CORS. Les jetons vivent côté client en mémoire parce que les
  cookies cross-domaine sont bloqués entre `julaba-web` et `julaba-api`.
- Un `ThrottlerGuard` est posé globalement (`app.module.ts:154`) : un agent qui
  boucle sera limité. **Les seuils exacts sont À DÉFINIR** (voir
  `docs/AUDIT_THROTTLING.md`).

---

## 3 · ROUTES DE LECTURE — phase (b), sans aucun risque

Toutes sous `/caisse`, toutes scopées à l'utilisateur du jeton.

| route | rend |
|---|---|
| `GET /caisse/transactions?limit=&page=` | les transactions. **Plafonnée** : 500 par défaut, **1000 maximum** ; `?page=2` pour remonter |
| `GET /caisse/session/:date` | la journée de caisse (`{ session }` ou `{ session: null }`) — `date` au format `YYYY-MM-DD` |
| `GET /caisse/produits` | l'étal de la marchande |
| `GET /catalogue` · `GET /catalogue/categories` | le catalogue |
| `GET /stocks` · `GET /stocks/mouvements` · `GET /stocks/:id/mouvements` | stocks et historique |

### Deux pièges de lecture, qui portent sur l'argent

**1. `{ session: null }` ne veut pas dire « caisse vide ».** Il veut dire
« aucune journée ouverte à cette date » — ou bien le serveur n'a pas répondu.
Le lot **ACC-03** (03/10/2026) a fermé exactement ce défaut côté application :
la caisse du jour se calcule sur **deux** lectures distinctes — les
transactions **et** la journée de caisse — et tant que les deux ne sont pas
revenues, **le montant n'est pas affirmable**.

> **L'agent doit reprendre cette règle.** « Ta caisse aujourd'hui : zéro
> franc » a été réellement dit à une marchande qui avait 100 F. Un agent vocal
> ne peut pas se reprendre : ce qui est dit est dit.
>
> Règle : **inconnu / non chargé / erreur ≠ 0.** La référence est
> `frontend_src/src/app/services/etatCaisseAccueil.ts`, à lire avant d'écrire
> la moindre phrase de restitution de solde.

**2. La liste des transactions est plafonnée.** Sans pagination, un agent qui
additionne ce qu'il reçoit annoncera un total **faux** au-delà de 500 lignes.
Le même défaut a déjà été payé une fois : « 501 ventes de 1 000 F, Tata
annonçait 500 000 F au lieu de 501 000 ».

---

## 4 · ROUTES D'ÉCRITURE — phase (a), après confirmation seulement

### 4.1 Une vente — `POST /caisse/vente`

**C'est la seule route de vente.** Une autre existait (`POST
/caisse/transactions`) ; elle est désormais **fermée** avec ce message :

> « Une vente s'enregistre par `POST /caisse/vente` — seule route qui garantit
> l'idempotence et le mouvement de stock. »

Corps accepté (lu dans `caisse-rest.controller.ts:635` et suivantes) :

```
{
  "idempotency_key": "<obligatoire en pratique — voir §5>",
  "montant": 2000,                  // > 0, sinon 400
  "produits": [                     // facultatif ; sans lui, pas de mouvement de stock
    { "nom": "Piment", "quantite": 1, "productId": "<id de son étal>" }
  ],
  "produit": "Piment",              // repli si `produits` absent
  "quantite": 1,
  "prix_achat": 0,                  // facultatif — sert au calcul de marge
  "mode_paiement": "especes",
  "source": "whatsapp",             // RECOMMANDÉ : rend l'origine traçable
  "date_operation": "<ISO 8601>"    // facultatif, voir la borne ci-dessous
}
```

Variantes acceptées pour l'identifiant de ligne : `productId`, `produit_id`,
`id`. Pour le nom : `nom` ou `name`.

**Ce que fait la route, dans l'ordre :**
1. cherche une transaction portant la même `idempotency_key` → si trouvée,
   **la retourne telle quelle, sans rien écrire** ;
2. valide le montant ( > 0 ) ;
3. calcule la marge **ligne par ligne** ;
4. ouvre la journée si besoin (**la vendeuse n'est jamais bloquée**) ;
5. **dans une seule transaction SQL** : lit le stock, décide du mouvement,
   met à jour `produits.stock`, insère la transaction. *Toute erreur
   d'inventaire annule la vente* ;
6. si la base refuse pour violation d'unicité, relit et retourne l'existante ;
7. hors transaction : événement temps réel + contrôle de stock.

Réponse : `{ "transaction": { … } }`.

**Trois comportements à connaître :**

- **Sans ligne appariée** (`productId` absent et nom inconnu), la vente est
  enregistrée mais **aucun stock ne bouge**. Ce n'est pas un bug : une vente
  libre n'a pas de stock à mouvementer.
- **Une vente à perte est enregistrée telle quelle.** Arbitrage explicite :
  « ne jamais masquer une réalité économique ». Mais un **coût inconnu** ne
  produit pas une perte — « inventer une perte serait aussi faux qu'inventer
  un gain ».
- **`date_operation` est borné** : 10 minutes dans le futur, 14 jours dans le
  passé. Hors bornes, l'opération est datée d'aujourd'hui. On n'écrit jamais
  dans un mois clos sur la foi d'une horloge distante.

### 4.2 Une dépense — `POST /caisse/depense`

```
{
  "idempotency_key": "<obligatoire en pratique>",
  "montant": 500,                   // > 0
  "description": "transport",       // le MOTIF dit par la marchande
  "categorie": "<une des onze>",    // sinon null — « null est une réponse »
  "mode_paiement": "especes",
  "source": "whatsapp",
  "date_operation": "<ISO 8601>"    // mêmes bornes que la vente
}
```

Deux points déjà corrigés, à ne pas rouvrir :
- le motif se lit dans `description`, et `notes` est accepté en transition ;
- une catégorie inconnue vaut **`null`**, jamais « autre » — « autre » est un
  choix qu'elle peut faire, lui donner aussi le sens de « on ne sait pas »
  serait donner deux sens à la même donnée.

### 4.3 Un mouvement de stock — `PATCH /stocks/:id`

L'idempotence passe par une **table dédiée** : `stock_operation_idempotency`,
avec `ON CONFLICT (idempotency_key) DO NOTHING`. Le corps accepte
`nom`/`produit`, `quantite`, `prix_achat`, `prix_vente`/`prix`, `unite`,
`categorie`, `seuil_alerte`, `image`, et `idempotency_key`.

**Un agent ne devrait pas écrire ici directement :** le stock d'une vente est
déjà mouvementé par `POST /caisse/vente`, dans la même transaction SQL que
l'écriture de l'argent. Passer par `/stocks` en plus **compterait deux fois**.

---

## 5 · IDEMPOTENCE — la règle, et le piège

### Le mécanisme réel

**Triple sécurité côté caisse**, et c'est la raison pour laquelle un rejeu ne
crée pas de doublon :

1. **lecture préalable** — `findOne({ idempotency_key, user_id })` ;
2. **index UNIQUE PARTIEL en base**, posé par `db-init.service.ts:217` :
   ```sql
   CREATE UNIQUE INDEX ux_caisse_tx_idempotency_key
     ON caisse_transactions (idempotency_key)
     WHERE idempotency_key IS NOT NULL;
   ```
3. **rattrapage** de la violation `23505` → relit et retourne l'existante.

C'est le point 2 qui tient sous la concurrence : deux requêtes simultanées ne
peuvent pas aboutir toutes les deux. Les points 1 et 3 évitent qu'une
deuxième requête voie une erreur.

### Le piège, et il est sérieux

**L'index est GLOBAL — sur `idempotency_key` seule, pas sur
`(user_id, idempotency_key)`.** Or la lecture, elle, filtre sur les deux.

Conséquence mesurable : si **deux marchandes différentes** présentent la même
clé, la seconde écriture viole l'index ; le rattrapage cherche alors la
transaction avec *son* `user_id`, **ne la trouve pas**, et l'erreur remonte.
La vente est perdue sans explication claire.

> **Règle pour l'agent : les clés doivent être uniques GLOBALEMENT, pas par
> marchande.** Un format qui le garantit :
>
> ```
> wa-<identifiant marchande>-<identifiant message WhatsApp>
> ```
>
> L'identifiant de message WhatsApp est déjà unique et **stable au rejeu** —
> c'est exactement la propriété recherchée. **Ne jamais utiliser un horodatage
> ni un tirage aléatoire** : deux envois du même message donneraient deux
> clés, donc deux ventes.

### La propriété à garantir de bout en bout

Même note vocale reçue deux fois (réseau, rejeu WhatsApp, redémarrage de
l'agent) :
- **une seule** transaction en caisse ;
- **un seul** mouvement de stock ;
- la **même** réponse qu'au premier appel.

Cette propriété est déjà tenue par l'API **à condition que l'agent présente la
même clé**. L'agent est responsable de la stabilité de la clé ; l'API est
responsable du reste.

---

## 6 · CE QUI EST HORS PÉRIMÈTRE, ET POURQUOI

| sujet | état |
|---|---|
| **Crédit (vente à crédit)** | **désactivé** — `CAISSE_CREDIT_ACTIF = false` **en dur**, pas une variable d'environnement. Le pilote est en espèces. Le verrou ferme **l'écriture**, pas la lecture de l'historique |
| **Odoo** | lecture seule — `ODOO_REAL_WRITE_ENABLED = false`. Aucune vente ne remonte vers Odoo |
| **Keiwa** | hors pilote |
| **Le périmètre du pilote** | **ne bouge pas.** Cet agent est **post-pilote** (décision du 05/10) |

---

## 7 · AVANT LA PREMIÈRE LIGNE DE CODE DE L'AGENT

1. **Trancher le §2** (A, B ou C). Sans ce choix, (a) ne peut pas démarrer
   honnêtement sur une marchande réelle.
2. **Travailler sur un compte de test**, jamais sur une marchande réelle avant
   que le §2 soit tranché. Voir la compétence `identifier` du dépôt, qui crée
   des comptes réels par l'API publique d'inscription.
3. **Ne jamais écrire d'identifiant ni de clé dans le dépôt** ni dans un canal
   archivé (ALERTE-SEC-01). Secrets d'environnement uniquement.
4. **Lire `etatCaisseAccueil.ts`** avant d'écrire la restitution de solde. Il
   dit ce qu'un écran — et donc une voix — a le **droit** d'affirmer.
5. **Prouver l'idempotence avant toute écriture réelle** : même clé deux fois,
   une seule transaction, un seul mouvement, même réponse.

---

## 8 · CE QUE CETTE FICHE NE DIT PAS — À DÉFINIR

- le mécanisme d'authentification d'un agent serveur (§2) — **rien n'existe** ;
- les seuils exacts du `ThrottlerGuard` ;
- s'il faut tracer l'origine WhatsApp au-delà du champ `source` ;
- la conduite à tenir quand la marchande ne confirme pas, ou confirme à moitié ;
- la conservation des notes vocales (donnée personnelle, consentement) ;
- les trois parlers visés : le code porte le **dioula/mandingue**
  (`nombresMandingue.ts` : variétés `mandingue`, `bambara`, `dioula-ci`) et le
  **français de Côte d'Ivoire**. Cela fait deux, pas trois.
