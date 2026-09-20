# Manus — règles du rail « expérience visuelle »

Arbitrage de Patrick, 20/09/2026. Deux rails parallèles, qui ne se mélangent
jamais dans les mêmes commits :

- **Manus = expérience visuelle** (présentation, UI, UX).
- **Claude multi-agent = plateforme** (sécurité, argent, schéma, API, observabilité).

## Branche

`design/manus`, créée depuis **`e17992a`** — le dernier état UI audité et
stable (`main` après la PR #246, registre révision 20). Jamais depuis un `main`
plus ancien.

## Périmètre — ce que Manus fait

Présentation, UI, UX uniquement. Livrable = **du code**, pas seulement des
maquettes.

## Interdits — ce que Manus ne touche pas

- aucun backend ;
- aucune machine d'encaissement (`services/machineEncaissement.ts`) ;
- aucune grammaire vocale (`voice-offline/grammaireEncaissement.ts`,
  `localIntent.ts`) ;
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
