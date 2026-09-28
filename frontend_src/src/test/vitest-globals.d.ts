/**
 * Déclarations de types globales Vitest — JULABA frontend (INIT-021).
 *
 * Avec `globals: true` dans `vitest.config.ts`, Vitest injecte `describe`,
 * `it`, `expect`, `vi`, `beforeEach`, `afterEach`, etc. dans la portée
 * globale. TypeScript strict ne les connaît pas par défaut ; cette référence
 * ambiante les expose au type-checker sans modifier `tsconfig.json`.
 *
 * Les tests peuvent donc utiliser AU CHOIX :
 *   - les globals (style Jest) : `describe('x', () => { it('fait y', …) })`
 *   - les imports explicites : `import { describe, it, expect } from 'vitest'`
 *
 * Les imports explicites restent recommandés pour la lisibilité (un lecteur
 * voit immédiatement d'où viennent les symboles) et pour l'autocomplétion
 * fiable dans les IDE.
 */
/// <reference types="vitest/globals" />
