# Le back-office, mesuré — 22/09/2026

**Aucune correction dans ce document.** Il compte, il nomme, il se rejoue :

```
node ci/mesure-backoffice.mjs --json /tmp/mesure-bo.json
```

---

## Ce qui a été mesuré, et pourquoi pas avec le banc

Le banc terrain ouvre un vrai navigateur et juge ce qu'une marchande **voit**.
Le back-office ne se visite pas sans un compte d'administration, et **il n'en
existe aucun sur le déploiement** : `SEED_DEMO_BO_PASSWORD` n'est pas
renseignée sur Render. Ce n'est pas un oubli — c'est la décision prise après
l'incident du mot de passe publié : *pas de variable → pas de compte
back-office*. Les comptes acteurs sont seedés normalement ; seule
l'administration est refusée.

**Tant que Patrick ne pose pas cette variable au tableau de bord Render, le banc
ne peut pas entrer.** Elle ne doit jamais figurer dans le dépôt : un `value:`
dans `render.yaml` est publié avec le code.

Ce qui se mesure quand même — et c'est la moitié la plus grave — est **statique**
et vérifiable ligne à ligne.

---

## Le compte

| | |
|---|---|
| Écrans | **37** |
| Lignes | **33 678** |
| Replis qui fabriquent une **liste vide** (`?? []`, `\|\| []`, `Array.isArray(x) ? x : []`) | **76** |
| Replis qui fabriquent un **zéro** (`?? 0`, `\|\| 0`) | **158** |
| Erreurs **avalées** (console seulement, rien à l'écran) | **18** écrans + **8** contexte |
| Écrans qui **n'affichent jamais** une erreur | **32 / 37** |

---

## Le défaut, et il est le même que côté marchande

C'est la faute fermée **cinq fois de suite** sur le chemin de la marchande :
ACC-02, CAI-01, HIS-01, DEP-02, STK-01. *Une lecture ratée devient un chiffre
affirmé.*

**Ici elle est pire, parce qu'une institution DÉCIDE sur ces chiffres.**
« 0 marchande active dans cette zone » ne veut pas dire la même chose selon
qu'on l'a comptée ou qu'on n'a pas pu la lire — et rien, à l'écran, ne permet
de faire la différence.

### Le cas le plus net : `BODashboard.tsx`

```tsx
const acteurs = Array.isArray(_bo.acteurs) ? _bo.acteurs : [];
const dossiers = Array.isArray(_bo.dossiers) ? _bo.dossiers : [];
const zones = Array.isArray(_bo.zones) ? _bo.zones : [];
…
{/* KPIs - 100 % données réelles */}
<UniversalKPI label="Total acteurs"  animatedTarget={totalActeurs} sub="enregistrés" />
<UniversalKPI label="Acteurs actifs" animatedTarget={actifs}       sub="du total" />
<UniversalKPI label="En attente"     animatedTarget={enAttente}    sub="dossiers à valider" />
<UniversalKPI label="Zones actives"  animatedTarget={zones.filter(z => z.actif === true).length}
                                     sub={`sur ${zones.length} zones`} />
```

Le commentaire dit **« 100 % données réelles »** juste au-dessus de sept
compteurs qui valent **zéro** quand rien n'a été lu. Le code affirme le
contraire de ce qu'il fait.

### La source commune : `BackOfficeContext.tsx`

| | |
|---|---|
| Listes initialisées à `[]` | **12** |
| Erreurs avalées | **8** |
| Un **seul** champ `error` pour tout le back-office | **oui** |

```ts
try { setDossiers(await boGetDossiers()); setDossiersLoaded(true); }
catch (e: any) { console.error('[BO]', e); }
```

La console d'un navigateur n'est pas une interface. L'écran reste vide, l'agent
croit que c'est vide. Et un seul `error` partagé veut dire qu'une erreur sur les
zones efface celle des acteurs : on ne peut pas dire à l'agent **ce qui**
manque.

---

## Les dix écrans les plus exposés

| Écran | `[]` | `0` | avalées | affiche une erreur |
|---|---:|---:|---:|---|
| `FicheIdentificationDynamiqueBO.tsx` | 4 | 2 | **14** | oui |
| `BOZones.tsx` | 5 | **25** | 0 | **NON** |
| `BORapports.tsx` | 5 | **22** | 0 | **NON** |
| `BODashboard.tsx` | 7 | 16 | 0 | **NON** |
| `BOAcademy.tsx` | **14** | 7 | 0 | **NON** |
| `BOAnalyticsProduit.tsx` | 7 | 13 | 0 | **NON** |
| `BOMonitoringIA.tsx` | 5 | 13 | 0 | **NON** |
| `BOActeurDetail.tsx` | 3 | 11 | 0 | **NON** |
| `BOActeurs.tsx` | 1 | 6 | 2 | **NON** |
| `BOMissions.tsx` | 1 | 8 | 0 | **NON** |

---

## Ce que cette mesure NE dit pas

Elle est **statique**. Elle ne dit rien des impasses, des boutons qui ne font
rien, des permissions, ni de ce qui se passe réellement sans réseau. Tout cela
demande le banc, donc un compte — donc la variable Render.

Un `?? 0` n'est pas fautif en soi : il l'est quand la valeur peut être
**inconnue**. Les 158 relevés sont des **suspects**, pas des coupables ; seule
la lecture au cas par cas tranche. Le défaut **structurel**, lui, est certain :
il n'existe nulle part, dans ce back-office, de façon de dire « je n'ai pas pu
lire ».

---

## Ce qu'il faudrait pour fermer, et dans quel ordre

1. **La variable Render** — décision de Patrick, hors dépôt. Sans elle, aucune
   mesure vivante du back-office n'est possible.
2. **Un état de lecture partagé**, comme `etatCaisseAccueil` côté marchande :
   `attente | illisible | connue`, une fois, dans le contexte — au lieu de 12
   listes qui commencent vides et d'un `error` unique.
3. **Le tableau de bord d'abord** : sept compteurs, et c'est l'écran sur lequel
   une institution se fait une idée en trois secondes.
