# Smoke test Odoo réel — lecture seule

**Statut : protocole à exécuter, pas encore lancé.** Aucune instance Odoo réelle n'est branchée à ce jour ; ce document ne modifie aucun code, aucune configuration, aucune infrastructure. Il décrit le test à dérouler **le jour où une instance Odoo 19 de test sera disponible**, pour passer d'un « client Odoo validé par contrat » (mock + fixtures, voir `backend/src/odoo-gateway/`) à un véritable **POC Odoo connecté**.

Portée : **lecture seule uniquement** — catalogue et stock. Aucune écriture réelle n'est exécutée ni autorisée pendant ce test (voir section Prérequis).

---

## 1. Prérequis

- Une instance Odoo 19 accessible en HTTPS depuis ce backend (test/démo — jamais une instance de production).
- Le nom de la base Odoo, si l'instance en héberge plusieurs sur le même domaine.
- Une **clé API dédiée**, créée spécifiquement pour ce test, avec le **minimum de droits nécessaire à de la lecture** sur `product.product`. Ne jamais réutiliser une clé API personnelle ou une clé déjà utilisée ailleurs.
- Confirmation que l'environnement d'exécution du backend peut effectivement atteindre cette URL en sortant (réseau sortant autorisé vers l'hôte Odoo).

## 2. Variables backend nécessaires

Toutes ces variables sont **backend uniquement** — jamais exposées au frontend JULABA, jamais commitées. À définir uniquement dans l'environnement où le test est exécuté (pas en production), et à retirer/réinitialiser une fois le test terminé.

| Variable | Valeur pour ce test | Rôle |
|---|---|---|
| `ODOO_CLIENT_MODE` | `real` | Bascule le Gateway sur `OdooRealClient` au lieu du mock (voir `odoo-gateway.module.ts`). |
| `ODOO_BASE_URL` | URL de l'instance de test | Cible des appels `POST /json/2/<model>/<method>`. |
| `ODOO_API_KEY` | Clé API dédiée lecture seule | Jamais loggée, jamais retournée dans une réponse d'erreur (déjà testé unitairement, voir `odoo-real.client.spec.ts`). |
| `ODOO_DB` | Nom de la base, si nécessaire | Envoyée en en-tête `X-Odoo-Database` uniquement si définie. |
| `ODOO_REAL_WRITE_ENABLED` | `false` | **Doit rester `false` pendant tout ce test.** Sans ça, seules `product.product/search_read` et `product.product/read` sont exécutables — voir l'allowlist dans `odoo-real.client.ts`. |
| `ODOO_POC_ENABLED` | `true` **uniquement pendant le test contrôlé** | Sans elle, `/odoo-poc/*` répond 404 (`OdooPocEnabledGuard`). À repasser à `false`/absente dès le test terminé. |

## 3. Préparer les données de test dans Odoo

Créer **2 ou 3 produits de test clairement identifiables** dans Odoo (nom explicite du type `JULABA-TEST-1`, référence dédiée) — jamais des produits réels déjà utilisés par un autre usage de l'instance. Noter, pour chacun, tel qu'affiché **directement dans Odoo** :
- nom (`name`)
- prix (`list_price`)
- référence (`default_code`)
- stock disponible (`qty_available`)

Ces valeurs relevées à la source serviront de référence de comparaison aux étapes 7-8.

## 4. Déroulé du test

1. Démarrer le backend avec les variables de la section 2.
2. Appeler `GET /odoo-poc/catalogue` (JWT valide requis — `JwtAuthGuard` reste actif).
3. Vérifier que les produits de test créés à l'étape 3 apparaissent, mappés au format JULABA (`versJulaba`, voir `produit-mapper.ts`) : `nom`, `prix`, `stock`, `odooProductId`, `codeOdoo` correspondent aux valeurs relevées dans Odoo.
4. Appeler `GET /odoo-poc/stock/:odooProductId` pour chacun des produits de test.
5. Comparer le stock reçu à celui relevé directement dans Odoo (étape 3).
6. Appeler manuellement (hors UI, ex. `curl`/Postman contre `POST /odoo-poc/mouvement-stock`, ou tout autre modèle/méthode hors allowlist) et vérifier que l'appel est **refusé avant tout accès réseau réel à Odoo** — l'allowlist (`product.product/search_read`, `product.product/read`) doit tenir même contre une vraie instance.
7. Inspecter les logs backend produits pendant tout le test et confirmer qu'**aucune valeur de `ODOO_API_KEY` n'apparaît nulle part** (ni en clair, ni dans un message d'erreur, ni dans une trace de requête).

## 5. Critères GO

- Authentification réelle fonctionnelle (`Authorization: bearer <clé>` accepté par l'instance).
- `search_read` réel fonctionnel : le catalogue JULABA reflète exactement les produits de test créés dans Odoo.
- `read` réel fonctionnel : le stock reçu par `/odoo-poc/stock/:id` correspond à celui relevé dans Odoo.
- Mapping JULABA ↔ Odoo conforme (aucun champ manquant, mal typé, ou décalé).
- Aucune écriture n'a eu lieu sur l'instance Odoo à aucun moment du test.
- Aucune fuite de secret dans les logs.
- Aucun comportement différent de ce que les tests par contrat (`odoo-gateway.contract.spec.ts`, `odoo-real.client.spec.ts`) avaient anticipé.

## 6. Critères NO-GO

- La forme réelle de la réponse JSON-2 diffère de l'hypothèse actuelle (le client suppose que le corps de la réponse **est** directement le résultat de la méthode, sans enveloppe façon ancien JSON-RPC `{jsonrpc, result, id}` — voir le commentaire de tête de `odoo-real.client.ts`).
- Échec d'authentification ou de sélection de base (`X-Odoo-Database`).
- Divergence de champs Odoo par rapport à ceux attendus par `produit-mapper.ts` (`id`, `name`, `list_price`, `qty_available`, `default_code`).
- Stock incohérent entre ce que JULABA affiche et ce qu'Odoo affiche réellement.
- Un appel hors allowlist (`create`, `write`, `unlink`, une méthode métier type `action_*`, ou toute combinaison `model/method` non listée) parvient malgré tout jusqu'au réseau.

## 7. Après le test

Quel que soit le résultat :
- Retirer/réinitialiser `ODOO_POC_ENABLED` (repasser à `false`/absente) et supprimer la clé API de test créée pour l'occasion.
- Si GO : mettre à jour ce document avec la date du test et le résultat, avant d'envisager un lot d'écriture réelle (qui nécessitera sa propre allowlist d'écriture explicite — voir la réserve laissée ouverte sur `ODOO_REAL_WRITE_ENABLED` dans `odoo-real.client.ts`).
- Si NO-GO : consigner précisément l'écart observé (section 6) avant toute nouvelle tentative — ne pas ajuster le code à l'aveugle sans comprendre la cause exacte de la divergence.
