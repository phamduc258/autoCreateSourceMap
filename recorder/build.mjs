// Build recorder -> dist/ de publish len npm registry.  Chay:  npm run build
// - Transpile record.ts (TS, ESM) -> dist/cli.js, them shebang de chay nhu CLI.
// - Giu @playwright/test / dotenv la EXTERNAL (consumer cai qua "dependencies", khong bundle vao).
// - Copy inject.js -> dist/inject.js: record.ts doc inject.js theo import.meta.url (nam CANH cli.js).
import * as esbuild from 'esbuild';
import { copyFileSync } from 'node:fs';

await esbuild.build({
  entryPoints: ['record.ts'],
  outfile: 'dist/cli.js',
  platform: 'node',
  format: 'esm',
  target: 'node18',
  bundle: true,
  packages: 'external',
  banner: { js: '#!/usr/bin/env node' },
});
copyFileSync('inject.js', 'dist/inject.js');
console.log('✔ built: dist/cli.js + dist/inject.js');
