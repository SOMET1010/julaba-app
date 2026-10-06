# Guide Rapide - Mode Développement

## Pour activer le mode dev

**Fichier:** `/src/app/config/devMode.ts`

```typescript
export const DEV_MODE = true;  // ✅ Mode dev activé
```

Ensuite, relancez l'application. Vous verrez :
- Un badge orange "MODE DÉVELOPPEMENT" en haut
- La page d'accueil avec tous les profils accessibles
- Aucun appel API
- Navigation libre

## Pour désactiver le mode dev (retour à la normale)

**Fichier:** `/src/app/config/devMode.ts`

```typescript
export const DEV_MODE = false;  // ❌ Mode dev désactivé
```

L'application reviendra au comportement normal :
- Page de connexion au démarrage
- Appels API vers Supabase
- Authentification requise
- Données réelles

## C'est tout !

Un seul fichier à modifier, une seule variable à changer.
