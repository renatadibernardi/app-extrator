// @ts-check
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

import cloudflare from '@astrojs/cloudflare';

const isDevCommand = process.argv.includes('dev');

// https://astro.build/config
export default defineConfig({
  site: 'https://madrinhadosono.online',
  output: 'server',
  adapter: isDevCommand ? node({ mode: 'standalone' }) : cloudflare(),
  vite: {
    resolve: {
      alias: isDevCommand
        ? {
            'cloudflare:workers': fileURLToPath(new URL('./src/lib/cloudflare-workers-shim.ts', import.meta.url)),
          }
        : {},
    },
  },
});
