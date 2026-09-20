# Manus — règles du rail « expérience visuelle »

Arbitrage de Patrick, 20/09/2026. Deux rails parallèles, qui ne se mélangent
jamais dans les mêmes commits :

- **Manus = design + voix produit** : présentation, UI, UX, et l'expérience
  vocale côté produit — voix TTS, choix de voix, tonalité, rendu vocal,
  ergonomie vocale, la perception des « deux voix », la cohérence entre les
  voix, le comportement ressenti par l'utilisatrice.
- **Claude multi-agent = plateforme** : backend, auth, argent/crédit, schéma,
  API, typage, observabilité technique et QA. Côté voix, Claude
  **instrumente seulement** (transcript brut, moteur STT, intention retenue,
  voix TTS réellement sélectionnée, événements et timings STT/TTS, erreurs,
  contexte réseau/appareil) et ne modifie **jamais** un comportement vocal ni
  un choix de voix.

## Branche

`design/manus`, créée depuis **`e17992a`** — le dernier état UI audité et
stable (`main` après la PR #246, registre révision 20). Jamais depuis un `main`
plus ancien.

## Périmètre — ce que Manus fait

Présentation, UI, UX, et l'expérience vocale produit (ci-dessus). Livrable =
**du code**, pas seulement des maquettes. Le journal d'observabilité voix
(transcript brut, moteur STT, intention, voix sélectionnée, timings) est
fourni par le rail plateforme pour diagnostiquer ; Manus décide de ce que la
marchande entend.

## Interdits — ce que Manus ne touche pas

- aucun backend ;
- aucune machine d'encaissement (`services/machineEncaissement.ts`) ;
- aucune grammaire vocale ni reconnaissance d'intention
  (`voice-offline/grammaireEncaissement.ts`, `localIntent.ts`) — la voix
  produit, oui ; ce que les phrases DÉCLENCHENT, non ;
- aucun texte de relecture financière : ils sont émis par la machine
  d'encaissement (argent) et affichés tels quels ;
- aucun `handlePay`, `enregistrerVente`, stock, auth ou logique métier ;
- aucune nouvelle source de tokens parallèle : la charte de la caisse vit dans
  `frontend_src/src/styles/commerce.css` (`--caisse-*`), point ;
- conservation des attributs et de l'accessibilité dont les tests dépendent
  (`aria-label`, la ligne de rendu
  `<MicroVenteCaisse produitPreselectionne={produitPreselectionne} onIntentionEncaissement={onIntentionEncaissement} />`
  seule sur sa ligne, `renderCartLines()`/`renderCartFooter()` rendus
  exactement deux fois, cibles tactiles ≥ 44 px, aperçu à 4 cartes).

## Obligations à la livraison

- **PR obligatoire** vers `main` ;
- `typecheck` + `verify` + `test:ci` + `build` **verts**, aucun garde-fou
  existant modifié pour faire passer le lot ;
- **capture et mesures visuelles** pour chaque écran modifié (390 × 844,
  `scrollWidth ≤ 390`, 0 élément hors viewport, cibles ≥ 44 px) — le banc
  `frontend_src/apercu-caisse/` sait le faire ;
- fusion **comme un lot indépendant, après contre-audit**.

## Côté plateforme

Claude ne retouche plus au design. Un agent plateforme qui rencontre un
conflit avec une modification Manus **le signale** ; il ne « répare » pas l'UI
lui-même.

## Langues (mission i18n, 20/09/2026)

**Claude** : architecture i18n ; extraction de toutes les intentions et
phrases ; clés stables ; séparation `STT_INPUT` / `TTS_OUTPUT` ; structure
multilingue ; lexiques produits / unités / nombres ; validation des
placeholders ; branchement des textes et intentions dans le moteur ;
garde-fous métier, surtout argent.

**Manus** : français marché ; traductions/adaptations Dioula, Baoulé, Agni,
Bété, Adioukrou, Ébrié, Sénoufo, etc. ; variantes naturelles de phrases ; et
toute la partie voix — choix des voix, enregistrements, TTS, clips, packs
audio, qualité/prosodie, association langue → voix, intégration audio côté
produit.

Point de rencontre : `docs/langues/JULABA-LANG-CATALOG.csv` (généré par le
rail plateforme, rempli par Manus) et les fichiers `locales/<langue>/` +
`audio/manifest.ts` (contrat et validateurs côté Claude, contenu côté Manus).
Les variantes STT **financières** (« oui valide », « encaisse », etc.) ne
s'activent qu'avec `validation.finance = true`, et la liste blanche de
`oui_valide` reste aussi stricte dans toutes les langues.
