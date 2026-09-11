# Audit d’amélioration Julaba

**Date :** 11 septembre 2026  
**Périmètre :** application web/mobile, vente vocale, mode hors ligne, données de caisse, sécurité, performance et maintenabilité.  
**Méthode :** lecture ciblée du code, exécution de la suite de tests, contrôle TypeScript, build de production, analyse du bundle et `npm audit --omit=dev`.

## 1. Conclusion exécutive

Julaba possède déjà une base solide pour une application destinée aux marchandes : le **moteur Sherpa-ONNX est local**, le service worker est enregistré dès l’ouverture, les clips Tata Nanti Lou sont préchargés et les commandes vocales hors connexion sont placées dans une file locale. La décision **« clips Tata uniquement »** est cohérente avec l’objectif d’autonomie : aucun moteur vocal cloud ne doit prendre le relais pendant une vente.

Les améliorations les plus importantes ne sont pas de nouvelles fonctionnalités. Elles concernent la **fiabilité de la donnée commerciale**, la **mise à niveau des dépendances de sécurité**, puis la **complétude des clips vocaux féminins**. Un risque métier précis doit être traité en premier : le modal assistant `TantieSagesseModal` ne réutilise pas toujours le parcours de caisse standard, notamment pour les dépenses.

> **Décision recommandée :** ne pas démarrer le chantier multilingue avant d’avoir fermé les deux P0 ci-dessous. Une transcription excellente n’a de valeur que si la vente, le stock et la marge restent exacts.

## 2. Éléments vérifiés

| Domaine | Constat vérifié | Évaluation |
|---|---|---|
| Voix de vente | Clips Tata embarqués, modèle Sherpa-ONNX local et politique sans voix générique pour les réponses dynamiques | Conforme au choix produit B |
| Hors ligne | File locale, service worker, cache des clips et tests réels `useVoiceCore` | Base robuste |
| PWA | `manifest.json`, `sw.js` et pré-cache de 137 clips Tata au build | Déjà opérationnel |
| Qualité | Suite `npm run test:ci` exécutée avec succès ; TypeScript et build réussis | Bonne discipline de non-régression |
| Performance | Distribution `frontend/dist` de 20 Mo ; chunk principal de 768 Ko non compressé | À optimiser progressivement |
| Maintenabilité | 39 fichiers de tests ; 1 003 occurrences statiques de `any` dans le frontend | Dette technique mesurable |
| Dépendances | `npm audit --omit=dev` : 22 vulnérabilités, dont 14 élevées | Priorité sécurité |

## 3. Points forts à préserver

### 3.1. Le parcours de vente doit rester local

Le module `useVoiceCore` combine la transcription locale, l’intention locale et la file de commandes hors connexion. Le test d’intégration ajouté couvre désormais le vrai flux : hors ligne, `onAction` n’est pas appelé, la commande est mise en file, puis l’interface affiche un message de synchronisation différée.

Le runtime vocal ne fait plus de téléchargement de manifeste ni de TTS réseau. Un clip Tata est joué une seule fois lorsqu’il est disponible ; sans clip, le texte reste visible sans voix générique. Cette règle est essentielle pour la cohérence de Tata Nanti Lou et pour les zones à faible connectivité.

### 3.2. La stratégie PWA est déjà utile aux marchandes

`vite.config.ts` pré-cache les petits chunks et les clips Tata. `main.tsx` enregistre le service worker dès le démarrage et préchauffe le moteur vocal local sans bloquer le premier affichage. Il faut préserver ce comportement lors de toute optimisation de bundle ou ajout de modèle linguistique.

### 3.3. La sécurité applicative de base existe

Le backend NestJS possède déjà une allowlist CORS, Helmet, un guard de throttling, des jetons d’accès courts (15 minutes par défaut) et des refresh tokens limités dans le temps. Ces protections doivent être conservées et testées lors des mises à niveau de dépendances.

## 4. Risques et améliorations prioritaires

### P0 — Fiabilité financière et sécurité de production

| Action | Problème observé | Proposition | Critère de validation |
|---|---|---|---|
| **Unifier les actions du modal Tata avec `CaisseContext`** | `TantieSagesseModal.tsx` appelle directement `/caisse/depense` pour une dépense, alors que `CaisseContext` fournit l’idempotence, la file hors ligne et la gestion des rejets | Faire passer ventes, dépenses et stock par les mêmes méthodes métier que `VenteVocaleModal` | Mode avion : une dépense vocale est mise dans l’outbox locale, puis synchronisée une seule fois au retour réseau |
| **Préserver le lien produit–stock–marge** | La vente créée par le modal assistant peut ne pas porter `productId` ni `prix_achat` | Réutiliser `apparierProduit` et `construireLigneVocale` avant `enregistrerVente` | Une vente vocale de tomates décrémente le bon stock et le rapport de marge utilise le prix d’achat réel |
| **Mettre à niveau les dépendances vulnérables** | `npm audit --omit=dev` remonte 14 alertes élevées, notamment autour de React Router, Multer, js-yaml et des dépendances Nest | Créer une branche de mise à niveau, mettre à jour les versions corrigées et exécuter les tests API/mobile avant fusion | Audit sans alertes élevées acceptées ; suite de tests et build réussis |

### P1 — Inclusion, autonomie et performance perçue

| Action | Bénéfice attendu | Proposition | Critère de validation |
|---|---|---|---|
| **Étendre le pack Tata local** | Tata reste présente dans les confirmations utiles au lieu d’afficher seulement du texte | Enregistrer prioritairement nombres, montants FCFA, unités, produits courants, erreurs et confirmations | 90 % des scénarios de vente de référence sont restitués par un clip Tata sans voix système |
| **Créer un guidage contextuel permanent** | Réduire l’hésitation des personnes peu familières du numérique | Afficher une seule prochaine action, avec pictogramme et clip Tata si disponible : « parle », « confirme », « regarde le montant », « réseau revenu » | Test terrain : une marchande réalise une vente sans aide extérieure après une courte démonstration |
| **Réduire le poids initial** | Accélérer le premier affichage sur Android modeste | Mesurer les routes réellement utilisées par les marchandes, puis différer les écrans back-office, PDF, cartes et graphiques lourds | Chunk initial inférieur à 500 Ko non compressé sans perte du parcours marchand |
| **Mettre les packs linguistiques hors de l’APK de base** | Éviter un APK trop lourd | Français local par défaut ; Dioula/Bambara comme packs installés avant usage Wi‑Fi, avec modèle STT et clips Tata associés | Le parcours français reste utilisable hors connexion sans installer un pack complémentaire |

### P2 — Maintenabilité et pilotage

| Action | Bénéfice attendu | Proposition | Critère de validation |
|---|---|---|---|
| **Réduire les `any` sur les parcours critiques** | Réduire les régressions invisibles | Commencer par caisse, voix, stock et composants marchands ; remplacer les données d’action par des unions TypeScript | Aucun `any` nouveau sur les fichiers touchés ; tests de types au CI |
| **Tableau d’incidents hors ligne** | Rendre visibles les opérations définitivement rejetées | Exposer les lettres mortes de l’outbox avec action « corriger » ou « annuler » | Toute erreur 4xx est visible, expliquée et traitable par la marchande ou le support |
| **Budget de performance** | Éviter le retour d’un bundle massif | Ajouter une étape CI qui archive les tailles de bundle et alerte au-delà d’un seuil | Variation de taille suivie à chaque publication |

## 5. Matrice Impact / Effort

Les tailles d’effort sont des ordres de grandeur pour un développeur connaissant déjà Julaba : **S** (moins de 2 jours), **M** (3 à 5 jours) et **L** (une à deux semaines, incluant tests et recette terrain).

| Priorité | Recommandation | Impact métier | Effort | Justification de séquencement |
|---|---|---:|:---:|---|
| P0 | Unifier les actions Tata avec `CaisseContext` | Très élevé | M | Protège directement ventes, dépenses, stock, marge et synchronisation hors ligne. |
| P0 | Préserver le lien produit–stock–marge | Très élevé | M | Empêche un bilan faux après une vente vocale ; à réaliser avec le chantier précédent. |
| P0 | Mettre à niveau les dépendances vulnérables | Élevé | M | Réduit le risque de déni de service et d’exposition web ; nécessite une branche de compatibilité. |
| P1 | Étendre le pack Tata local | Élevé | L | Forte amélioration de confiance, mais dépend de l’enregistrement et de l’intégration de clips réels. |
| P1 | Ajouter un guidage contextuel | Élevé | M | Réduit les erreurs d’usage et améliore l’autonomie des marchandes peu familiarisées au numérique. |
| P1 | Réduire le poids initial | Moyen | M | Améliore le premier affichage sans bloquer la fiabilité financière ou hors ligne. |
| P1 | Distribuer des packs linguistiques hors APK | Moyen | L | Nécessite tests de taille, installation, stockage et qualité ASR terrain. |
| P2 | Réduire les `any` sur les parcours critiques | Moyen | M | Réduit la dette et les régressions, sans effet immédiat pour la marchande. |
| P2 | Rendre les lettres mortes visibles | Moyen | M | Améliore le support et le suivi des opérations rejetées. |
| P2 | Installer un budget de performance CI | Faible à moyen | S | Empêche les régressions futures, après la mesure de référence du bundle. |

## 6. Ce qui ne doit pas être fait maintenant

Le projet ne doit pas intégrer un TTS cloud dans la vente vocale, ni remplacer le français Sherpa-ONNX par un modèle générique plus lourd sans test terrain. Omnilingual ASR reste une piste pour les packs Dioula/Bambara, mais il ne doit pas devenir un prérequis du parcours marchand français.

Il ne faut pas non plus lancer tous les chantiers de qualité à la fois. La séquence recommandée est : **P0 données + dépendances**, puis **P1 pack Tata et guidage**, puis **P2 dette TypeScript et budget de performance**.

## 7. Prochain sprint recommandé

Le prochain sprint doit se limiter à deux livrables :

1. **Fiabilisation du modal Tata** : une seule voie métier pour vente, dépense et stock, avec test mode avion et vérification de marge.
2. **Plan de mise à niveau des dépendances** : branche dédiée, mises à niveau minimales, validation backend/mobile et rapport des alertes restantes.

Ce choix consolide le produit déjà utile plutôt que de disperser l’effort sur de nouveaux modules.
