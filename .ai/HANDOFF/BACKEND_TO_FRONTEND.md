# HANDOFF — BACKEND_TO_FRONTEND

> Passation du Dev Backend vers le Dev Frontend : API prête à être consommée.

## API livrée

- **Endpoint** : `POST /api/v1/...`
- **Branche backend** : `feature/XXX-back`
- **Commit backend** : <SHA>
- **Statut** : ✅ Implémenté + tests unitaires verts + invariant (si module sacré) vert

## Contrat API détaillé

### Request
```typescript
{
  field1: string;       // obligatoire, max 100 chars
  field2: number;       // obligatoire, > 0
  field3?: boolean;     // optionnel, défaut false
}
```

### Response (200 OK)
```typescript
{
  id: string;           // UUID
  field1: string;
  field2: number;
  field3: boolean;
  createdAt: string;    // ISO 8601
}
```

### Erreurs
| Code | Cause | Message |
|---|---|---|
| 400 | Validation échouée | "field1 est requis" |
| 401 | Non authentifié | "Unauthorized" |
| 403 | Rôle insuffisant | "Forbidden" |
| 404 | Ressource introuvable | "Not found" |
| 409 | Conflit (déjà existant) | "Already exists" |
| 422 | Erreur métier | "Solde insuffisant" |
| 429 | Rate limit dépassé | "Too many requests" |
| 500 | Erreur serveur | "Internal server error" |

## Types TypeScript à utiliser côté frontend

Ajouter dans `frontend/src/app/types/` :
```typescript
export interface XxxRequest { ... }
export interface XxxResponse { ... }
```

## Service API à créer

Ajouter dans `frontend/src/app/services/api/xxx-api.ts` :
```typescript
export async function createXxx(req: XxxRequest): Promise<XxxResponse> {
  return apiRequest(API_URL, '/xxx', { method: 'POST', body: JSON.stringify(req) });
}
```

## Tests backend validés

- ✅ `backend/test/unit/xxx.spec.ts` (verts)
- ✅ `backend/test/invariants/xxx.spec.ts` (verts, si module sacré)
- ✅ `backend/src/xxx/xxx.controller.spec.ts` (verts)

## Pré-requis frontend

- **Auth** : JWT requis (cookie `bo_access_token` ou header `Authorization: Bearer`)
- **Rôles** : `marchand` uniquement
- **Throttling** : 10/min
- **Idempotence** : `Idempotency-Key` header requis (frontend doit générer `crypto.randomUUID()`)

## Date de passation

YYYY-MM-DD
