// Copies the v0.6 shared logic from porur-native (TypeScript, single source of truth) into src/ as plain JS.
import { transform } from 'esbuild'; import { readFileSync, writeFileSync } from 'fs';
const SRC = process.env.NATIVE || '../porur-native/packages/shared/src';
for (const f of ['models', 'modelsApi']) {
  const { code } = await transform(readFileSync(`${SRC}/${f}.ts`, 'utf8'), { loader: 'ts', format: 'esm', target: 'es2020' });
  writeFileSync(`src/${f}.js`, `// GENERATED from porur-native/packages/shared/src/${f}.ts by scripts/sync-models.mjs — do not edit.\n` + code.replace(/from "\.\/models"/g, 'from "./models.js"'));
  console.log('wrote src/' + f + '.js');
}
