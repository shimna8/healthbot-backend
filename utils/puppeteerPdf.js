import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildList(items = []) {
  if (!Array.isArray(items) || items.length === 0) return '<li>None</li>';
  return items.map((s) => `<li>${escapeHtml(s)}</li>`).join('\n');
}

function buildListAr(items = []) {
  if (!Array.isArray(items) || items.length === 0) return '<li>لا يوجد</li>';
  return items.map((s) => `<li>${escapeHtml(s)}</li>`).join('\n');
}

async function loadTemplate(lang) {
  const file = lang === 'ar' ? 'ar.html' : 'en.html';
  const p = path.join(__dirname, '..', 'templates', 'report', file);
  const html = await fs.readFile(p, 'utf-8');
  return html;
}

function applyReplacements(html, lang, data) {
  const tokens = {
    '{{AGE}}': data.age ?? '-',
    '{{GENDER}}': data.gender ?? '-',
    '{{SMOKER}}': data.smoker ?? '-',
    '{{CAREGIVER}}': data.caregiver ?? '-',
    '{{SYMPTOMS_YES}}': lang === 'ar' ? buildListAr(data.symptomsYes) : buildList(data.symptomsYes),
    '{{SYMPTOMS_NO}}': lang === 'ar' ? buildListAr(data.symptomsNo) : buildList(data.symptomsNo),
    '{{GENERATED_AT}}': new Date().toLocaleString(lang === 'ar' ? 'ar' : 'en-US'),
  };
  let out = html;
  for (const [k, v] of Object.entries(tokens)) {
    out = out.replaceAll(k, String(v));
  }
  return out;
}

async function getPuppeteer() {
  try {
    const m = await import('puppeteer');
    return m.default || m;
  } catch (e1) {
    try {
      const m2 = await import('puppeteer-core');
      return m2.default || m2;
    } catch (e2) {
      throw new Error('Neither puppeteer nor puppeteer-core is installed. Please install one of them.');
    }
  }
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function findSystemChrome() {
  let candidates = [];
  if (process.platform === 'linux') {
    candidates = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
    ];
  } else if (process.platform === 'darwin') {
    candidates = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ];
  } else if (process.platform === 'win32') {
    candidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];
  }
  for (const p of candidates) {
    if (await pathExists(p)) return p;
  }
  return null;
}

export async function renderReportPdf(lang = 'en', data = {}, pdfOptions = {}) {
  const template = await loadTemplate(lang);
  const html = applyReplacements(template, lang, data);

  const puppeteer = await getPuppeteer();

  // Resolve executable path in this order:
  // 1) Explicit env var
  // 2) Common system locations
  // 3) Puppeteer-managed browser cache (if installed via `npx puppeteer browsers install chrome`)
  let resolvedExecutablePath = process.env.PUPPETEER_EXECUTABLE_PATH || null;
  if (!resolvedExecutablePath) {
    resolvedExecutablePath = await findSystemChrome();
  }
  if (!resolvedExecutablePath && typeof puppeteer.executablePath === 'function') {
    try {
      resolvedExecutablePath = puppeteer.executablePath();
    } catch {}
  }

  const launchOptions = {
    headless: 'new',
    ...(resolvedExecutablePath ? { executablePath: resolvedExecutablePath } : {}),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--font-render-hinting=medium',
      `--lang=${lang === 'ar' ? 'ar' : 'en-US'}`,
    ],
  };

  let browser;
  try {
    browser = await puppeteer.launch(launchOptions);
  } catch (e) {
    const help = `Chrome executable not found. Set PUPPETEER_EXECUTABLE_PATH to your Chrome/Chromium binary, or run \n` +
      '`npx puppeteer browsers install chrome` to install a managed browser.';
    throw new Error(`${e.message}\n${help}`);
  }

  try {
    const page = await browser.newPage();

    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: ['load', 'domcontentloaded', 'networkidle0'] });
    await page.emulateMediaType('screen');

    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      ...pdfOptions,
    });

    return buffer;
  } finally {
    await browser?.close();
  }
}

export function getDefaultReportData() {
  return {
    age: 62,
    gender: 'Male',
    smoker: 'Non-smoker',
    caregiver: 'Daughter: 20',
    symptomsYes: [
      'Worsening cough',
      'Night sweats',
      'Cough lasting longer than 2 weeks',
      'Chest pain when breathing',
      'Shortness of breath',
    ],
    symptomsNo: [],
  };
}

