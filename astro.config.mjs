// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

import cloudflare from '@astrojs/cloudflare';

const isDevCommand = process.argv.includes('dev');

// https://astro.build/config
export default defineConfig({
  site: 'https://madrinhadosono.online',
  base: '/app-extrator',
  output: 'server',
  adapter: isDevCommand ? node({ mode: 'standalone' }) : cloudflare(),
});
