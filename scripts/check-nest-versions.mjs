#!/usr/bin/env node
// Garde-fou : cohérence des versions @nestjs vues par le BACKEND.
//
// Piège (cf. docs/PIEGES_DEV.md) : si un `@nestjs/common` en v10 est imbriqué
// sous backend/node_modules (node_modules désynchronisé du lockfile v11), le
// filtre d'exceptions de `@nestjs/core@11` teste `instanceof HttpException` sur
// une exception CRÉÉE par la v10 → le test échoue → toutes les HttpException
// (401, 400, 404…) tombent en 500. Symptôme observé : un mauvais mot de passe
// renvoyait 500 au lieu de 401.
//
// Ce check résout les paquets @nestjs COMME le backend à l'exécution (depuis
// backend/) et échoue si leurs majors divergent. En CI (`npm ci` depuis le
// lockfile) il passe ; il n'aboie que si l'install a dérivé — la correction est
// alors un simple `npm ci`.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'backend');
const req = createRequire(path.join(backendDir, 'package.json'));

// core = référence (le filtre d'exceptions vit dedans) ; common/jwt/passport ont
// dérivé par le passé et tirent des HttpException.
const PKGS = ['@nestjs/core', '@nestjs/common', '@nestjs/jwt', '@nestjs/passport', '@nestjs/platform-express'];

const seen = PKGS.map((p) => {
  try {
    const v = req(`${p}/package.json`).version;
    return { p, v, major: v.split('.')[0] };
  } catch {
    return { p, v: '(absent)', major: null };
  }
});

console.log('Versions @nestjs résolues depuis backend/ :');
for (const s of seen) console.log(`  ${s.p.padEnd(30)} ${s.v}`);

const majors = new Set(seen.filter((s) => s.major).map((s) => s.major));
if (majors.size > 1) {
  console.error(`\n❌ Versions @nestjs INCOHÉRENTES (majors présents : ${[...majors].sort().join(', ')}).`);
  console.error('   Conséquence : les HttpException (401/400/404) tombent en 500 (instanceof cross-version).');
  console.error('   Cause : node_modules désynchronisé du lockfile. Corrige avec :  npm ci');
  process.exit(1);
}

console.log(`\n✅ @nestjs cohérent (major ${[...majors][0] ?? '—'}).`);
