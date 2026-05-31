import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const clientDir = path.join(distDir, 'client');
const serverDir = path.join(distDir, 'server');
const workerDir = path.join(distDir, '_worker.js');

if (fs.existsSync(clientDir)) {
  fs.cpSync(clientDir, distDir, { recursive: true });
}

if (fs.existsSync(serverDir)) {
  fs.rmSync(workerDir, { recursive: true, force: true });
  fs.mkdirSync(workerDir, { recursive: true });
  fs.cpSync(serverDir, workerDir, { recursive: true });
  fs.rmSync(path.join(workerDir, 'wrangler.json'), { force: true });
  fs.writeFileSync(
    path.join(workerDir, 'index.js'),
    [
      'globalThis.process ??= {};',
      'globalThis.process.env ??= {};',
      'export { default } from "./entry.mjs";',
      ''
    ].join('\n')
  );
  fs.rmSync(serverDir, { recursive: true, force: true });
}
