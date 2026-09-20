# Ajouter une langue à JULABA — en moins de quinze minutes

> Lot langues, 20/09/2026. Architecture : `frontend_src/src/app/i18n/voice/`.
> Aucun composant métier ne connaît un code de langue : ajouter une langue est
> un **ajout de données**, jamais une modification de logique.

## Qui fait quoi (arbitrage de Patrick, 20/09/2026)

| | Claude / ingénierie | Manus |
|---|---|---|
| **Fournit** | les identifiants stables (`TATA_*`, `QUEST_*`, `INT_*`…), le catalogue (`catalog.ts`), les variables des gabarits, `critiqueArgent`, le registre, le runtime (`t`, `speakMessage`, `detecterIntention`), les validateurs, le CSV d'échange | le français « marché » (`frMarche`), **toutes les traductions**, les variantes naturelles STT, la validation linguistique, et **toute la voix** : choix des voix, enregistrements, TTS, clips, packs, prosodie, association langue → voix, intégration audio |
| **Touche** | `types.ts`, `catalog.ts`, `registry.ts`, `runtime.ts`, `validators/`, le branchement des clés dans le code métier | `locales/<code>/{messages,intents,lexicon}.ts`, le champ `voix` du manifest, un rendu vocal derrière `contrat-audio.ts` |
| **Ne touche jamais** | le contenu linguistique (aucune traduction inventée, `frMarche` reste `null` côté Claude) | la logique métier, la machine d'encaissement, la grammaire, les gates, les identifiants |

Le CSV `docs/langues/JULABA-LANG-CATALOG.csv` (`npm run i18n:export`) est le
support d'échange : colonne `OWNER` = `manus` sur chaque ligne (la partie
éditable), colonne `NOTES` = quelles cellules sont à remplir.

## Les quatre gestes

### 1. Ajouter un manifest de langue (ingénierie, 2 minutes)

Créer `frontend_src/src/app/i18n/voice/locales/<code>/index.ts` sur le modèle
de `locales/bci/index.ts` :

```ts
import type { ManifestLocale } from '../../types';
export const BCI: ManifestLocale = {
  code: 'bci',            // provisoire tant que Patrick/Manus ne l'ont pas confirmé
  nom: 'Baoulé',
  iso639_3: 'bci',        // ou null si la variété n'est pas tranchée
  provisoire: true,
  formatNombre: 'fr-FR',  // formatage des nombres (espaces insécables)
  fallback: 'fr-ci',      // repli explicite, toujours tracé
  messages: {}, intents: {}, lexique: null,
  normaliser: null, parseurNombres: null,
  voix: null,             // emplacement réservé à Manus
};
```

Puis l'enregistrer dans `registry.ts` (`enregistrerLocale(BCI)`) et l'ajouter
à `LOCALES_PROVISOIRES` avec ce qu'on sait du code. **Tant que `messages` et
`intents` sont vides, tout retombe sur `fr-ci`** — l'application parle
exactement comme avant, et chaque repli est écrit dans le journal de voix
(`I18N_FALLBACK`, visible dans le « Rapport de test »).

Si la langue doit être sélectionnable par la marchande, ajouter son entrée
dans `LOCALE_PAR_PREFERENCE` (registry.ts) en face de la préférence
existante (`hooks/useLangPref.ts`).

### 2. Renseigner les traductions et les variantes STT (Manus)

Deux fichiers, **jamais mélangés** :

- `locales/<code>/messages.ts` — TTS_OUTPUT, ce que Tata dit. **Une**
  formulation canonique par clé, avec **exactement** les variables du
  catalogue (`{montant}`, `{total}`…, plus `{devise}` et `{symboleDevise}`
  fournis par le lexique) :

  ```ts
  export const MESSAGES_BCI: Readonly<Record<MessageId, MessageLocalise>> = {
    TATA_MANQUE: { template: '… {montant} …', validation: { linguistique: 'draft', finance: false } },
  };
  ```

- `locales/<code>/intents.ts` — STT_INPUT, ce que la marchande peut dire.
  **Plusieurs** variantes par intention :

  ```ts
  export const INTENTS_BCI: Readonly<Record<IntentId, IntentLocalise>> = {
    INT_ENCAISSER: { variantes: { mode: 'motif', mots: ['…', '…'] }, validation: { linguistique: 'draft', finance: false } },
    INT_OUI_VALIDE: { variantes: { mode: 'phrase_entiere', phrases: ['… …'] }, validation: { linguistique: 'draft', finance: false } },
  };
  ```

  `INT_OUI_VALIDE` est **obligatoirement** une liste blanche fermée
  (`phrase_entiere`) : réponses autonomes d'au moins deux mots, déjà
  normalisées, jamais un mot d'annulation dedans. Même sévérité que le
  français (VOIX-02) — le gate `validateCriticalMessages` le refuse sinon.

- `locales/<code>/lexicon.ts` — produits, unités, nombres, monnaie, verbes
  métier, unités dites. Les identifiants sont ceux de `fr-ci`
  (`produits.tomate`, `unites.kg`…), les formes sont celles de la langue.

Statuts de validation : `draft` → `native_validated` → `field_validated`, et
`finance: true` seulement quand une variante ou une formulation **critique
argent** a été explicitement validée pour l'argent. **Le runtime refuse de
servir un message ou une variante critique non validés** : il repasse à
`fr-ci`, tracé. Une traduction en brouillon ne peut donc jamais écrire de
l'argent.

### 3. Déposer la voix (Manus)

Rien à faire côté moteur. Le champ `voix` du manifest est libre ; le rendu
vocal se branche derrière `contrat-audio.ts` :

```ts
import { enregistrerRenduVocal } from '.../i18n/voice/contrat-audio';
enregistrerRenduVocal((message, direTexte) => {
  // message = { id, locale, texte, variables, fallback }
  // jouer un clip pour (id, locale), ou direTexte(message.texte)
});
```

Invariant à garder : `message.texte` est **la** chaîne dite ET affichée (la
relecture financière est affichée telle quelle — garde-fou
`caisseRelectureAffichee`). Un rendu peut choisir *comment* dire, jamais
*quoi*.

### 4. Lancer les validations (ingénierie, 1 minute)

```
npm run test:i18n-locales      # gates 1, 2, 3, 6 : clés, variables, orphelines, repli tracé
npm run test:i18n-argent       # gates 4, 5 + liste blanche stricte dans toutes les langues
npm run test:i18n-source       # gate 7 + inventaire à jour + couverture
npm run test:i18n-empreintes-argent   # gate 8 : les modules d'argent répondent comme avant
npm run i18n:export            # le CSV pour Manus, à jour
```

Tous font partie de `npm run verify`.

## Ce que l'architecture garantit (et ce qu'elle ne garantit pas)

- **Garantit** : aucune logique métier ne lit un code de langue ; une langue
  vide = français ; un brouillon financier n'est jamais servi ; chaque repli
  est tracé ; STT et TTS ne se mélangent pas ; les variables ne se perdent pas.
- **Ne garantit pas** : la qualité d'une traduction (Manus, validation
  native puis terrain) ; la reconnaissance STT dans la langue (modèle
  Sherpa par langue : chantier séparé, docs/RECHERCHE_SHERPA_LANGUES.md) ;
  la **composition grammaticale** — les accords français (pluriels de
  `dialoguesTata.ts`, `unite.utils.ts`) restent du code : une langue qui
  accorde autrement demandera ses propres règles de composition, à
  ajouter comme données de manifest (point ouvert, voir le rapport du lot).

## Codes de langue

Provisoires, listés et commentés dans `registry.ts` (`LOCALES_PROVISOIRES`).
Plusieurs variétés ne sont pas tranchées (Sénoufo, Bété, Dan, Wê, Koulango,
Lobi, Dida). Ne pas figer un faux code normalisé : Patrick et Manus tranchent,
et changer un code est une opération de données (aucun composant ne le lit).
