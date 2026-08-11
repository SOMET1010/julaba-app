# Décisions métier — validées par Alex le 11/08/2026

Les 10 orientations de docs/REPONSE_AUDIT.md §4 sont VALIDÉES, avec les
conditions ci-dessous. Ce document fait foi pour l'implémentation.

1. **Fond de caisse : informatif, jamais bloquant.** La clôture ne
   demande le fond réel QUE si elle produit un vrai rapprochement
   (ventes espèces + fond initial − dépenses espèces = attendu vs
   constaté → écart). Sans ce rapprochement, ne pas demander de fond.
2. **Crédit atomique : prérequis absolu.** Tant qu'une transaction
   unique ne garantit pas vente + mouvement de stock + dette + acompte +
   identifiant commun + idempotence, le crédit reste un registre séparé
   et n'apparaît PAS comme paiement intégré à la caisse.
3. **Langues.** Français recetté ; bambara limité aux NOMBRES ; dioula
   suspendu. Communication exacte : « Interface et guidage en français ;
   reconnaissance expérimentale de certains nombres en bambara. »
   Prévoir une étude terrain des langues réellement parlées au pré-pilote.
4. **Canaux.** APK terrain prioritaire ; Web = démo + back-office ; PWA
   non promise. L'APK devient BLOQUANT pour la recette : tests sur vrais
   téléphones d'entrée de gamme (Android minimal, mémoire, micro,
   haut-parleur/oreillette, hors-ligne, fermeture forcée, redémarrage,
   batterie faible, stockage plein). Un authenticator virtuel Web ne
   prouve pas la biométrie des appareils du kit.
5. **Mobile money : masqué par défaut** en pré-pilote — drapeau désactivé
   par défaut, appliqué côté INTERFACE ET côté SERVEUR (une route non
   recettée ne reste pas appelable parce que le bouton est caché).
6. **Vente > stock : avertir, confirmer, ne pas bloquer** — mais le code
   actuel écrase à zéro (`Math.max(0, stock - quantite)` dans la caisse
   frontend, GREATEST(0) côté serveur) : AUCUN écrasement silencieux.
   Avant de promettre la fonction, choisir le modèle : stock négatif
   autorisé, OU mouvement d'écart séparé, OU ajustement tracé.
7. **Annulation : rien n'est jamais supprimé.** Même la dernière vente du
   jour produit un événement TRACÉ (annulation/avoir). À spécifier :
   espèces vs crédit, locale vs synchronisée, délai, motif, permission,
   remise en stock, impact caisse, impact dette, lien à la vente
   d'origine.
8. **Consentement (identification) : sous réserve juridique.** Un bouton
   « J'accepte » écrit ne suffit pas pour une personne non lectrice. Le
   système doit : lire la phrase, permettre de la réécouter, montrer les
   données concernées (identité, photo, document, position), permettre le
   refus, empêcher l'agent de confirmer À LA PLACE de l'acteur, tracer
   version du texte + heure + agent + réponse. Validation juridique
   avant déploiement.
9. **Mentions partenaires : démarrage, À propos, paramètres/légal.**
   Aucune mention sur les écrans quotidiens de vente.
10. **Mains libres : promesse retirée** tant que le mot-réveil n'existe
    pas. Formulation autorisée : « Tata peut parler dans l'oreillette.
    Pour lui parler, l'utilisatrice touche le microphone. »

## Points bloquants associés

- **Sherpa / APK** : réponse factuelle dans docs/REPONSE_SHERPA.md — le
  plugin natif n'existe pas encore ; option retenue à confirmer :
  modèle embarqué dans l'APK (option 1).
- **Phase 1 vente vocale** : spécification OBLIGATOIRE avant code —
  docs/SPEC_VENTE_VOCALE.md. Le brouillon d'implémentation du 11/08 a
  été jeté (non conforme : ajout au panier sans ligne provisoire
  confirmée).
- **Correctif sécurité indépendant** (dictée du PIN) : DÉJÀ LIVRÉ —
  v5.0.0.20, PR #79 fusionnée.
