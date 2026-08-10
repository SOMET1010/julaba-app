# Synchro offline-first de la boutique vocale

Relie la boucle transactionnelle du banc (`banc-vosk-julaba`) au serveur : le
téléphone enregistre les ventes/dépenses hors-ligne (journal append-only local),
puis les remonte quand le réseau revient. Réalise la « remontée » de la slide 11.

## Endpoints (`/api/v1`, protégés JWT)

### `POST /api/v1/boutique/mouvements/sync`
Remontée d'un lot de mouvements.
```json
{ "mouvements": [
  { "id": "uuid", "device": "dev-xxxx", "type": "vente",
    "produit": "tomate", "quantite": 10, "montant": 2000,
    "transcription": "j'ai vendu 10 tomates à 2000", "ts": 1737000000000 }
] }
```
Réponse : `{ "acquittes": ["uuid", ...], "recus": 1 }`.

- **Idempotent** : `id` est généré sur l'appareil ; `INSERT ... ON CONFLICT (id)
  DO NOTHING`. Un mouvement remonté deux fois n'a aucun effet (pas de double-comptage).
- `marchand_id` est fixé depuis le JWT, jamais accepté du client.

### `GET /api/v1/boutique/etat`
État recalculé par **rejeu** du journal (jamais stocké) :
`{ "stock": { "tomate": 30 }, "caisse": 2000, "nbMouvements": 12 }`.

## Règle append-only (rejeu)

On empile des mouvements horodatés, jamais un total :
- `vente` : stock −quantité, caisse +montant
- `depense` : stock +quantité (si produit), caisse −montant
- `reappro` : stock +quantité

Deux appareils qui rejouent les mêmes mouvements obtiennent le même état → pas de
conflit, pas d'écrasement, pas de perte.

## Côté banc (`banc-vosk-julaba`)

Le module `src/sync/outbox.ts` poste déjà vers `SYNC_ENDPOINT =
/api/v1/boutique/mouvements/sync` en mode « réseau ». Il ne reste qu'à servir les deux
apps sur la même origine (ou configurer le CORS + l'URL de base).

## Déploiement

Table créée par la migration `1780000000000-CreateBoutiqueMouvements` (exécutée
manuellement en production, comme les autres migrations TypeORM du projet).
