# A11Y_CLAVIER.md — Les routes sans BottomBar et leur sortie (A11Y-005)

> Répondu le 29/10/2026, arbre `767ea138`. Sur ces 11 routes, AppLayout masque
> la BottomBar (`hiddenPaths`) : ni les onglets du bas, ni le bouton Tata ne
> sont là. La question de l'audit : « quelle est l'alternative clavier ? » —
> c'est-à-dire : comment sort-on de l'écran quand on ne peut pas toucher
> une barre qui n'existe pas ?

## La réponse courte

Chacune de ces routes est une **page plein écran qui possède son propre
contrôle de retour**, placé en tête d'écran — donc atteint par le tout
premier `Tab` (après le skip-link « Aller au contenu principal » d'AppLayout).
Le clavier et le lecteur d'écran n'ont jamais besoin de la BottomBar pour
ressortir : le retour est le premier focusable du contenu.

## Le tableau de vérité (vérifié dans le source, route par route)

| Route (BottomBar masquée) | Écran | Contrôle de sortie | Nom accessible | Vérifié |
|---|---|---|---|---|
| `/academy` | UniversalAcademy | bouton retour du header (`handleBack`) | `aria-label="Retour"` — **AJOUTÉ 29/10, il manquait** (×2 boutons) | source + banc axe pour l'homologue support |
| `/marchand/cahier` | MarchandDepenses | bouton retour du header | `aria-label="Revenir en arrière"` (préexistant) | source |
| `/marchand/ventes-passees` | VentesPassees | `SubPageLayout` | `aria-label="Retour"` | source |
| `/marchand/commandes` | MesCommandes | `SubPageLayout` | `aria-label="Retour"` | source |
| `/marchand/support` | SupportPage → SupportContact (`showBack`) | bouton retour 44×44 du bandeau | `aria-label="Retour"` — **AJOUTÉ 29/10, il manquait** ; le cas est INSCRIT au harnais axe (`test:a11y-axe`) : la règle `button-name` refuse à jamais un retour muet ici | source **et** harnais axe |
| `/marchand/alertes` | MarchandAlertes | `SubPageLayout` | `aria-label="Retour"` | source |
| `/producteur/alertes` | ProducteurAlertes | `SubPageLayout` | `aria-label="Retour"` | source |
| `/producteur/support` | SupportPage → SupportContact | idem `/marchand/support` | idem | idem |
| `/cooperative/commandes` | Commandes (coopérative) | `SubPageLayout` | `aria-label="Retour"` | source |
| `/cooperative/support` | SupportPage → SupportContact | idem | idem | idem |
| `/institution/support` | SupportPage → SupportContact | idem | idem | idem |

`SubPageLayout` (components/layout/SubPageLayout.tsx:50) porte le bouton
retour partagé : `<button aria-label="Retour" onClick={… navigate(-1)}>` —
un seul endroit, 48 écrans servis.

## Ce que ce document NE prétend PAS

- La **navigation interne** de ces écrans (onglets, filtres) est un autre
  sujet — ce document répond à la sortie, pas à chaque interaction.
- Le **comportement réel de TalkBack/VoiceOver** sur ces écrans se juge en
  recette terrain (rang 7 du plan) — le banc axe en jsdom couvre la
  structure (noms, rôles, landmarks), pas la restitution sonore.

## La règle qui reste

Toute NOUVELLE route ajoutée à `hiddenPaths` doit posséder un contrôle de
sortie focusable ET nommé en tête d'écran. Le jour où cette règle est
enfreinte, le tableau ci-dessus ment — et un tableau qui ment dans `.ai/`
est exactement le genre de dette que les registres refusent depuis le
29/10 : mets à jour ce fichier DANS le commit qui ajoute la route.
