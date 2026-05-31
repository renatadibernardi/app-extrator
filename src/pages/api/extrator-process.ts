import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import type { APIRoute } from 'astro';
import { DOC_MD_ROOT } from '../../lib/docPaths';

const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'pdf_to_md_hybrid.py');

export const prerender = false;

function sanitizeFolder(value: string): string {
  const folder = String(value || '').trim().replace(/\\/g, '/').replace(/^\/+/, '');
  if (!folder || folder === '.' || folder.includes('..') || path.isAbsolute(folder)) {
    return 'convertido';
  }
  return folder.split('/').filter(Boolean).join('/');
}

function sanitizeName(value: string): string {
  const base = path.basename(String(value || 'documento.pdf').trim());
  return base.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function toMarkdownName(pdfName: string): string {
  return sanitizeName(pdfName).replace(/\.[^.]+$/, '') + '.md';
}

function normalizeText(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trimEnd();
}

function runLibreOfficeToText(inputPath: string, tempDir: string): string {
  execFileSync(
    'libreoffice',
    ['--headless', '--convert-to', 'txt:Text', '--outdir', tempDir, inputPath],
    {
      encoding: 'utf-8',
      env: process.env,
      maxBuffer: 1024 * 1024 * 20,
    }
  );

  const convertedPath = path.join(tempDir, `${path.basename(inputPath, path.extname(inputPath))}.txt`);
  if (!fs.existsSync(convertedPath)) {
    throw new Error('Falha ao converter documento do Word.');
  }
  return fs.readFileSync(convertedPath, 'utf-8');
}

function runImageOcr(inputPath: string): string {
  const stdout = execFileSync('tesseract', [inputPath, 'stdout', '-l', 'por+eng', '--psm', '3'], {
    encoding: 'utf-8',
    env: process.env,
    maxBuffer: 1024 * 1024 * 20,
  });
  return normalizeText(String(stdout || ''));
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const form = await request.formData();
    const file = form.get('file');
    const folder = sanitizeFolder(String(form.get('folder') || 'convertido'));
    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ ok: false, error: 'Arquivo inválido.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!fs.existsSync(SCRIPT_PATH)) {
      return new Response(JSON.stringify({ ok: false, error: `Script não encontrado: ${SCRIPT_PATH}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ncs-extrator-'));
    const inputPdf = path.join(tmpDir, sanitizeName(file.name));
    const outputDir = path.join(DOC_MD_ROOT, folder);
    const outputFile = path.join(outputDir, toMarkdownName(file.name));
    const extension = path.extname(file.name).toLowerCase();

    fs.writeFileSync(inputPdf, Buffer.from(await file.arrayBuffer()));
    fs.mkdirSync(outputDir, { recursive: true });

    let markdown = '';
    let stdout = '';

    if (extension === '.pdf') {
      stdout = execFileSync('python3', [SCRIPT_PATH, inputPdf, outputFile, '--ocr-short-pages'], {
        encoding: 'utf-8',
        env: process.env,
        maxBuffer: 1024 * 1024 * 50,
      });
      markdown = fs.existsSync(outputFile) ? fs.readFileSync(outputFile, 'utf-8') : '';
    } else if (extension === '.txt' || extension === '.md') {
      markdown = normalizeText(await file.text());
      if (markdown) {
        markdown += '\n';
      }
      fs.writeFileSync(outputFile, markdown, 'utf-8');
      stdout = `OK: texto importado de ${file.name}`;
    } else if (extension === '.png' || extension === '.jpg' || extension === '.jpeg') {
      markdown = runImageOcr(inputPdf);
      if (markdown) {
        markdown += '\n';
      }
      fs.writeFileSync(outputFile, markdown, 'utf-8');
      stdout = `OK: OCR de imagem concluído para ${file.name}`;
    } else if (extension === '.doc' || extension === '.docx') {
      markdown = normalizeText(runLibreOfficeToText(inputPdf, tmpDir));
      if (markdown) {
        markdown += '\n';
      }
      fs.writeFileSync(outputFile, markdown, 'utf-8');
      stdout = `OK: documento convertido de ${file.name}`;
    } else {
      return new Response(JSON.stringify({ ok: false, error: `Formato não suportado: ${extension || 'desconhecido'}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      folder,
      outputFile,
      mdName: path.basename(outputFile),
      markdown,
      log: String(stdout || '').trim(),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : 'Falha ao processar o PDF.',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
