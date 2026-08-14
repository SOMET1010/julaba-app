# ADR-0001 — Décrément de stock à la vente (suivi pré-recette #12)

- **Statut** : Accepté (cadrage fonctionnel) — implémentation reportée à une passe dédiée.
- **Date** : 2026-08-14
- **Décideur** : Alex (validé en session).
- **Périmètre** : marché B2 (publications/commandes) + vente directe producteur. **Aucun mouvement financier** (règle « argent gelé »).

## Contexte

En pré-recette, un producteur déclare une récolte (ex. 10 kg), enregistre une
vente, et son **stock ne décrémente pas** (#12). Cause racine, confirmée par
lecture du code :

1. La mécanique de réservation **existe déjà** et est correcte
   (`StockReservationService` : `reserver` / `convertir` / `liberer`, verrous
   `FOR UPDATE`, idempotence par `commande_id`). Elle **n'est pas** à réinventer.
2. Tout l'effet stock est **conditionné à `commande.publicationId`**
   (`commandes-rest.controller.ts` create ~l.138, update ~l.272).
3. La **vente directe** producteur (`type: 'vente_directe'`,
   `CommandesProducteurPage`) crée une commande **sans `publication_id` ni
   `recolte_id`** → `publicationId` absent → ni réservation ni conversion → la
   récolte n'est **jamais** décrémentée.

Le modèle cible souhaité (disponible vs réservé, définitif à la réalisation,
restitution à l'annulation, sans argent) **correspond déjà** à l'existant. #12
est donc un **trou de câblage sur le parcours vente directe**, pas un défaut de
modèle.

## Décisions

### D1 — Cycle de vie du stock (confirmé, = code actuel)

> **Disponible** ↓ dès la **réservation** (`en_attente`) → **décrément définitif
> de la récolte** à la **confirmation** (`confirmée`) → **livraison** = état
> logistique **sans effet stock** → **annulation** ne restitue **qu'une**
> réservation encore `active`.

Rationale : évite de « revendre » une récolte déjà engagée ; simple à raisonner ;
découple le stock de la finance (objet même de #12) ; conforme au comportement
en place (moins d'effets de bord).

### D2 — La vente directe décrémente le stock, via une récolte explicite

Une vente directe est une **sortie réelle de marchandise** : elle doit
décrémenter la récolte, sous le **même invariant D1** (définitif à la
confirmation), **sans** créer de seconde mécanique de stock parallèle.

**Contrainte forte — pas de déduction heuristique.** La vente directe doit
fournir explicitement la **`recolte_id`** concernée. Si plusieurs récoltes
peuvent correspondre au produit, l'utilisateur / le flux métier tranche ; le
serveur **ne devine pas** (sinon risque : corriger le stock global en altérant
la mauvaise récolte). Une vente directe **sans `recolte_id`** est **refusée**
(erreur explicite), pas silencieusement acceptée.

### D3 — Expiration : hors périmètre #12

Une réservation `en_attente` reste **active jusqu'à confirmation ou annulation**.
Aucun TTL / auto-libération dans #12. Le sujet devient une **évolution séparée**,
avec ses propres règles de concurrence et de notification. Consigné comme dette
assumée.

## Conséquences

- **À implémenter (passe dédiée, non lancée ici)** :
  - Rattachement d'une `recolte_id` à la saisie de vente directe (UI + payload
    `createCommande`), et passage de ce parcours par `convertir` à la
    confirmation — sans dépendre d'une publication.
  - Validation serveur : `type === 'vente_directe'` ⇒ `recolte_id` requis ;
    refus explicite sinon.
- **Inchangé** : `StockReservationService`, le cycle réservation→conversion→
  libération du parcours marché, l'absence de tout mouvement financier.
- **Reporté** : expiration/TTL des réservations.

## Invariants testables (CI « Invariants — Postgres jetable »)

Déjà couverts par `backend/test/invariants/stock-reservation.spec.ts` :

- **I-A** — `en_attente` : `publications.quantite_disponible -= q`, ligne
  `stock_reservations` `active`.
- **I-D** — `annulée` depuis une réservation `active` : disponible restitué,
  ligne `liberee` ; ne restitue jamais une `convertie`.
- **I-E** — demande > disponible ⇒ **409**, aucun effet.
- **I-B (partiel)** — `confirmée` : conversion `active → convertie`, idempotente.

À ajouter (encodés en `it.todo`, cf. spec) :

- **I-B (récolte)** — `confirmée` décrémente `recoltes.stock_disponible` de `q`
  exactement une fois ; `stock_vendu += q` ; `statut = 'vendue'` si 0.
- **I-C** — `en_livraison` / `livrée` ne modifient **ni** disponible **ni**
  récolte (assertion de non-effet).
- **D2-a** — vente directe avec `recolte_id` décrémente cette récolte à la
  confirmation (même invariant que le marché).
- **D2-b** — vente directe **sans** `recolte_id` est **refusée** (pas de
  déduction heuristique).
- **D3** — une réservation `en_attente` reste `active` tant qu'aucune
  confirmation/annulation n'intervient (pas de TTL).
