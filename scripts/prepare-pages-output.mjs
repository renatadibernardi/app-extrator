import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const clientDir = path.join(distDir, 'client');
const serverDir = path.join(distDir, 'server');
const workerFile = path.join(distDir, '_worker.js');

if (fs.existsSync(clientDir)) {
  fs.cpSync(clientDir, distDir, { recursive: true });
}

if (fs.existsSync(serverDir)) {
  fs.rmSync(workerFile, { recursive: true, force: true });
  await build({
    entryPoints: [path.join(serverDir, 'entry.mjs')],
    outfile: workerFile,
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
    external: ['cloudflare:workers'],
    banner: {
      js: 'globalThis.process ??= {}; globalThis.process.env ??= {};'
    }
  });
  fs.rmSync(serverDir, { recursive: true, force: true });
}
