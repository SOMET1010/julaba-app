# Veille 30 jours

Outil de recherche multi-sources inspire du skill open-source
[last30days](https://github.com/mvanhorn/last30days-skill).
Il interroge plusieurs sources publiques sur les 30 derniers jours, classe les
resultats par engagement reel et par confirmation croisee entre sources, puis
synthetise une note sourcee.

Adapte ici a la veille des marches agricoles ivoiriens (cacao, cafe, anacarde,
hevea, riz, vivriers).

## Structure

- `types.ts` : types partages (query, source, preuve, constat, note).
- `sources.ts` : catalogue des sources et leur poids d'engagement.
- `veilleService.ts` : orchestrateur (regroupement, classement, synthese).
- `demoProvider.ts` : fournisseur de demonstration deterministe (hors-ligne).
- `index.ts` : point d'entree du module.

Interface : `src/app/components/shared/veille/VeilleTrenteJours.tsx`
Route : `/marchand/veille` (voir `routes.tsx`).

## Utilisation

```ts
import { runVeille, DemoVeilleProvider, defaultSourceIds } from '../services/veille';

const provider = new DemoVeilleProvider();
const brief = await runVeille(
  { sujet: 'prix du cacao', sources: defaultSourceIds(), fenetreJours: 30 },
  { provider },
);
```

## Brancher un backend reel

Le moteur est agnostique du fournisseur. Pour connecter un vrai backend
(scraping ou API a la last30days), il suffit d'implementer l'interface
`VeilleProvider` :

```ts
import type { VeilleProvider, VeilleQuery, VeilleEvidence } from '../services/veille';

export class ApiVeilleProvider implements VeilleProvider {
  readonly id = 'api';
  async collect(query: VeilleQuery): Promise<VeilleEvidence[]> {
    const res = await fetch('/api/v1/veille', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    });
    return res.json();
  }
}
```

Puis passer ce fournisseur a `runVeille(query, { provider: new ApiVeilleProvider() })`.

Le fournisseur peut renseigner `cluster`, `clusterTitre` et `sentiment` sur
chaque preuve pour piloter le regroupement. A defaut, l'orchestrateur regroupe
par titre normalise et deduit la tonalite du titre.

## Determinisme

Le fournisseur de demonstration derive une graine du sujet (PRNG mulberry32),
donc une meme recherche renvoie toujours le meme resultat. Aucun appel a
`Date.now()` ni `Math.random()`. La date de synchronisation peut etre injectee
via l'option `now` de `runVeille` (utile pour les tests).
