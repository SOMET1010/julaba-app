# Audit UX et version recommandée des parcours Jùlaba

Date : 11 août 2026 · Source auditée : PARCOURS.md · Auteur : Alex (porteur produit)
Statut : DOCUMENT DE GOUVERNANCE — les parcours cibles décrits ici font foi.
La réponse d'architecte (vérifications code/recette, matrice remplie,
positions sur les décisions) est dans docs/REPONSE_AUDIT.md.

> Verdict : la cartographie décrit des routes, des fonctions et des clips —
> pas encore des parcours exploitables. Risque principal : Jùlaba peut
> SEMBLER vocal (beaucoup de messages lus) tout en restant dépendant du
> texte et du tactile pour les tâches importantes.

## Bloquants
- B1 — Vente vocale et caisse = deux parcours, deux paniers → panier UNIQUE.
- B2 — Capacités Web/PWA/APK non distinguées → matrice par canal, ne
  promettre que ce qui marche.
- B3 — Crédit présenté comme paiement simple → transaction atomique
  vente + stock + dette avant intégration caisse.
- B4 — Mobile money affiché sans recette bout-en-bout → masquer ou
  marquer « pilote ».
- B5 — Le guidage vocal fait dicter numéro et CODE en public → Tata ne
  demande JAMAIS de prononcer le PIN.
- B6 — Pas de comportement d'erreur vocale défini → chaque étape vocale
  prévoit répétition, correction, annulation, reprise.

## Majeurs
- M1 — 6 étapes avant la connexion → 2 écrans utiles puis connexion.
- M2 — Choix entre 4 modes abstrait → mode ADAPTATIF par défaut, réglage
  dans les paramètres.
- M3 — Installation de la voix avant la première valeur → après la
  première vente guidée ou sur Wi-Fi.
- M4 — 137 clips ≠ couverture → mesurer les TÂCHES réalisables sans lire.
- M5 — « Ouvrir la journée » peut bloquer la vente → ouverture auto à la
  première vente.
- M6 — Un même parcours d'entrée pour tous les rôles → deux familles :
  terrain vocal / administration textuelle.
- M7 — Stock insuffisant et produit inconnu non cadrés → avertir,
  confirmer, distinguer ligne libre / nouveau produit.
- M8 — Pas de consentement compréhensible à l'identification → explication
  parlée + confirmation tracée.

## Principes retenus
1. Une tâche, un parcours : UN panier ; la voix entre, le tactile complète ;
   vente enregistrée seulement après confirmation panier + paiement.
2. La voix AGIT (lancer, saisir, répéter, corriger, annuler, confirmer,
   annoncer) — pas seulement lire l'écran.
3. Aucun secret prononcé : PIN au pavé ou biométrie, jamais répété ;
   soldes lus sur demande seulement.
4. Chaque état = plusieurs signaux (voix, picto, animation, couleur,
   vibration) ; la couleur seule ne porte jamais le sens.
5. Une erreur ne détruit jamais le travail : panier conservé, échec de
   paiement ≠ vente, perte réseau ≠ perte de vente.

## Architecture des parcours
1. Terrain vocal prioritaire : marchande, producteur.
2. Terrain assisté : coopérative, identificateur.
3. Administration textuelle : institution, back-office.
4. Services conditionnels : marché virtuel, Keiwa, protection sociale,
   paiements — hors des parcours quotidiens tant que non confirmés.

## Parcours cibles (résumé opérationnel)
- ENTRÉE terrain : E0 Bienvenue (1 action) → E1 Tata se présente →
  E2 démonstration vocale (micro → tomates ×3 → 1 500 F → ✓, mode
  adaptatif d'office) → E3 connexion (numéro, PIN au pavé, biométrie
  proposée après succès) → E4 arrivée selon le rôle. Habituée :
  Bienvenue → biométrie/PIN → tâche.
- VENTE VOCALE (parcours principal) : toucher Tata → parler → écoute /
  traitement / réponse distincts → TATA RÉPÈTE avant d'ajouter →
  correction vocale (« non, deux », « le prix est mille », « enlève »,
  « annule ») → panier unique → vérification parlée du panier → paiement
  (espèces ; crédit quand atomique ; mobile money quand recetté) →
  monnaie annoncée → succès multi-signaux → vente suivante.
- Cas particuliers : ambigu → 2 photos ; inconnu → ligne libre (catalogue
  = action séparée) ; bruit → réessai sans vider ; réseau perdu espèces →
  attente locale idempotente ; double appui → verrou.
- VENTE TACTILE = secours : photos, catégories, +, panier commun.
- CRÉDIT = sous-parcours : client → montant → acompte → reste dit →
  échéance → confirmation → création ATOMIQUE (vente + stock + dette) →
  preuve.
- DÉPENSE : « Qu'est-ce que tu as payé ? » → catégorie image/voix →
  montant → répétition → confirmation → annulation immédiate possible.
- STOCK : photos, quantités parlées sur demande, alerte avant rupture,
  vente > stock = avertir + tracer l'écart, jamais de zéro silencieux.
- JOURNÉE : ouverture auto à la première vente ; clôture = total annoncé,
  comptage réel, écart expliqué, rien de supprimé.
- PRODUCTEUR : 3 tâches illustrées (déclarer / mes récoltes / commandes) ;
  déclaration guidée avec répétition ; publication avec conditions dites ;
  commande annoncée (produit, quantité, acheteur, date) — un statut n'est
  pas une logistique.
- COOPÉRATIVE : apport membre (identifier → produit → quantité → preuve) ;
  vente stock commun = panier commun + propriétaire + répartition +
  permissions + trace ; distribution neutralisée = INVISIBLE ; trésorerie
  avec origine/responsable/justificatif/statut.
- IDENTIFICATEUR : expliquer ORALEMENT → consentement AVANT photo/document/
  géoloc (« Nous allons enregistrer ton identité, ta photo et ta position
  pour créer ton dossier Jùlaba. Est-ce que tu acceptes ? ») → relire à
  voix haute → faire confirmer → local d'abord → statut de synchro visible.
- INSTITUTION / BO : textuels ; cohérence, filtres, traçabilité, export,
  audit, réel vs démo, date de dernière synchro ; voix non essentielle.

## Critères d'acceptation prioritaires
- Marchande non lectrice : vendre sans lire ; ajouter à la voix ; Tata
  répète produit/quantité/prix/total ; corriger oralement ; UN panier ;
  pas de clavier alphabétique obligatoire ; PIN jamais prononcé ; panier
  survit au rechargement ; échec paiement ≠ vente ; monnaie annoncée ;
  fin de vente voix + image + vibration.
- Hors-ligne : état annoncé sans jargon ; local conservé ; synchro
  rejouable sans doublon ; « enregistré ici » ≠ « synchronisé ».
- Accessibilité : cibles ≥ 48×48 ; contraste ; jamais couleur seule ;
  bouton répéter toujours là ; écoute/traitement/erreur distincts.

## Les 10 décisions métier (avant implémentation)
1. Fond de caisse : obligatoire ou informatif ?
2. Crédit : vente + stock + dette atomiques ?
3. Langues officiellement recettées ?
4. Canaux du pré-pilote : Web, PWA, APK ?
5. Mobile money masqué tant que non recetté ?
6. Vente > stock : autorisée ? écart tracé comment ?
7. Qui annule/rembourse une vente, dans quel délai ?
8. Preuve de consentement à l'identification ?
9. Mentions partenaires : au démarrage seulement ou partout ?
10. Promesse mains-libres retirée tant que pas de mot-réveil ?

## Ordre de travail
- Phase 0 : décisions + matrice de capacités + rejeu des scénarios réels.
- Phase 1 : VENTE UNIFIÉE (panier commun voix/tactile, correction vocale,
  persistance).
- Phase 2 : encaissement fiable (espèces, monnaie, confirmation, reçu,
  hors-ligne).
- Phase 3 : crédit atomique (paiements partiels, preuve, historique).
- Phase 4 : entrée courte + mode adaptatif + authentification sécurisée +
  recette avec vendeuses non lectrices.
- Phase 5 : autres rôles. Phase 6 : services conditionnels.

## Conclusion
La bonne version de Jùlaba n'est pas une collection d'écrans avec des
fichiers audio : c'est une suite de tâches où Tata permet d'agir, de
comprendre, de corriger et de confirmer sans dépendre de la lecture.
Priorité : parler → vérifier → corriger → panier unique → payer →
confirmer → recommencer.
