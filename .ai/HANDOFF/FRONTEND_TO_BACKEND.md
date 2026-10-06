# HANDOFF — FRONTEND_TO_BACKEND

> Passation du Dev Frontend vers le Dev Backend : besoin d'API.

## Besoin frontend

- **User story** : "En tant que marchande, je veux ..."
- **Écran** : `frontend/src/app/pages/marchand/xxx.tsx`
- **Branche frontend** : `feature/XXX-front`

## Endpoints attendus

### Endpoint 1
- **Méthode** : `POST /api/v1/xxx`
- **Request DTO attendu** : ...
- **Response DTO attendu** : ...
- **Codes d'erreur attendus** : ...
- **Throttling** : ...
- **Idempotence** : oui/non
- **Auth** : JWT + rôle `marchand`

### Endpoint 2 (si besoin)
- ...

## Maquettes UX

- **Wireframe** : `SPECS/FEATURE-XXX_UX.md`
- **Parcours vocal** : ... (description du parcours voice-first)
- **3 confits visuels** : normal/soleil/sombre

## Critères d'acceptation

1. ...
2. ...
3. ...

## Contraintes techniques

- **Offline** : oui/non (si oui, IndexedDB + idempotence)
- **Temps réel** : oui/non (si oui, WebSocket `/ws`)
- **Notifications push** : oui/non
- **Voice-first** : oui/non (si oui, intégration Tata Nanti Lou)

## Date de passation

YYYY-MM-DD
