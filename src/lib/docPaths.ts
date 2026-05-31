import path from 'node:path';

export const APP_ROOT = process.cwd();
export const DRIVE_ROOT = path.join(APP_ROOT, 'drive');
export const DOC_PDF_ROOT = path.join(DRIVE_ROOT, 'pdf');
export const DOC_MD_ROOT = path.join(DRIVE_ROOT, 'md');
export const DOC_MD_OUTPUT_ROOT = path.join(DOC_MD_ROOT, 'convertido');
