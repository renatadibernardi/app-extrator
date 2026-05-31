import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();

await page.setViewport({ width: 1200, height: 900 });
await page.goto('http://localhost:4324/proposta', { waitUntil: 'networkidle0', timeout: 30000 });

// Aguarda fontes e animações
await new Promise(r => setTimeout(r, 1500));

// Injeta CSS específico para impressão
await page.addStyleTag({ content: `
  @page { margin: 0; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { overflow: visible !important; }
  .site-header { position: relative !important; }
  .lazy-section { opacity: 1 !important; transform: none !important; }
` });

const outputPath = path.join(__dirname, 'NCS-Studio-Proposta.pdf');

await page.pdf({
  path: outputPath,
  format: 'A4',
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
  preferCSSPageSize: false,
});

await browser.close();

console.log('PDF gerado:', outputPath);
