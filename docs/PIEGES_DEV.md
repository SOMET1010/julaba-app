# Pièges de dev — Julaba

Journal des pièges d'environnement/outillage qui font perdre du temps : symptôme
visible, vraie cause, correction. Objectif : ne jamais rediagnostiquer deux fois
le même faux bug.

---

## 1. `@nestjs/common` v10 imbriqué → toutes les HttpException tombent en 500

**Symptôme.** En local, une erreur qui devrait être un 4xx renvoie un **500**.
Cas observé : `POST /auth/login` avec un mauvais mot de passe → **500 au lieu de
401**. Les tests d'invariants (qui assertent des codes 4xx) échouaient aussi en
local, d'où un ancien contournement « `mv node_modules/@nestjs/common` de côté
avant de lancer les invariants ».

**Vraie cause.** `node_modules` **désynchronisé du lockfile**. Le lockfile épingle
tout `@nestjs/*` en **v11** ; mais un `npm install` (non-`ci`) mal tombé pouvait
laisser un `@nestjs/common@10` **imbriqué sous `backend/node_modules`** (tiré par
des `@nestjs/jwt@10` / `@nestjs/passport@10` périmés). Le code du backend résout
alors la v10 imbriquée, tandis que `@nestjs/core` reste en v11. Or le filtre
d'exceptions de `core@11` fait `exception instanceof HttpException` : une
HttpException **créée par la v10** échoue ce test cross-version → elle n'est pas
reconnue comme HTTP → **500** générique.

Preuve minimale :

```
v10.UnauthorizedException  instanceof  v11.HttpException  ===  false   // → 500
v11.UnauthorizedException  instanceof  v11.HttpException  ===  true    // → 401
```

**La prod n'est PAS concernée.** Render build avec `npm ci` (install strict depuis
le lockfile) → v11 partout → cohérent → 401. Le workflow CI « Invariants
financiers » (qui asserte des 4xx) est vert, ce qui le confirme. Le 500 est un
**artefact strictement local**.

**Correction.** Resynchroniser l'install sur le lockfile :

```
npm ci
```

**Garde-fou.** `npm run check:nest-versions` (script `scripts/check-nest-versions.mjs`,
branché dans `ci.yml` juste après `npm ci`) échoue si les majors `@nestjs`
divergent, avec le message et la correction. En CI il passe toujours (install
propre) ; en local il aboie dès que l'install a dérivé.
