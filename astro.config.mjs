// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: 'https://madrinhadosono.online',
  base: '/app-extrator',
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
});
