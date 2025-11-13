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
  // Determine base URL for assets (logo, images, etc.)
  // Priority: 1) Explicit data.baseUrl, 2) Environment variable, 3) Default localhost
  const baseUrl = data.baseUrl || process.env.BASE_URL || 'http://localhost:3000';

  // Determine font path for embedded fonts in PDF
  // Use absolute file path to the project root for file:// URLs
  const fontPath = path.resolve(__dirname, '..');
  const { trueList, falseList } = generateBooleanLists(data);
  const tokens = {
    '{{BASE_URL}}': baseUrl,
    '{{FONT_PATH}}': fontPath,
    '{{howOld}}': getValueByKey(data , "howOld")??'-',
    '{{smokeYears}}': getValueByKey(data , "smokeYears")??'-',
    '{{packYears}}': getValueByKey(data , "packYears")??'-',
    '{{trueList}}': trueList??'<li>None</li',
    '{{falseList}}': falseList??'<li>None</li',
    // '{{SYMPTOMS_YES}}': lang === 'ar' ? buildListAr(data.symptomsYes) : buildList(data.symptomsYes),
    // '{{SYMPTOMS_NO}}': lang === 'ar' ? buildListAr(data.symptomsNo) : buildList(data.symptomsNo),
    // '{{GENERATED_AT}}': new Date().toLocaleString(lang === 'ar' ? 'ar' : 'en-US'),
  };
  let out = html;
  for (const [k, v] of Object.entries(tokens)) {
    out = out.replaceAll(k, String(v));
  }
  return out;
}

function generateBooleanLists(report) {
  const trueItems = [];
  const falseItems = [];

  report.forEach(item => {
    if (item.type === "boolean") {
      const li = `<li>${item.question}</li>`;
      if (item.value === true) {
        trueItems.push(li);
      } else if (item.value === false) {
        falseItems.push(li);
      }
    }
  });

  return {
    trueList: trueItems.join(""),
    falseList: falseItems.join("")
  };
}

function getValueByKey(report, searchKey) {
  const item = report.find(entry => entry.key === searchKey);
  if (!item) return null;

  // Handle both object and stringified JSON cases
  if (typeof item.value === "string") {
    try {
      const parsed = JSON.parse(item.value);
      return parsed.value || null;
    } catch {
      return item.value; // not JSON, return as-is
    }
  }

  return item.value?.value || null;
}

async function getPuppeteer() {
  try {
    const m = await import('puppeteer-core');
    return m.default || m;
  } catch (e1) {
    try {
      const m2 = await import('puppeteer');
      return m2.default || m2;
    } catch (e2) {
      throw new Error('Neither puppeteer-core nor puppeteer is installed. Please install one of them.');
    }
  }
}
async function getChromium() {
  try {
    const m = await import('@sparticuz/chromium');
    return m.default || m;
  } catch (e) {
    console.warn('[Puppeteer] @sparticuz/chromium not found:', e.message);
    return null;
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

  // Prefer @sparticuz/chromium if available (for AWS Lambda or serverless environments)
  const chromium = await getChromium();
  let launchOptions;
  if (chromium) {
    try {
      // Resolve executablePath whether it's a function or a value
      let execPath = await (typeof chromium.executablePath === 'function'
        ? chromium.executablePath()
        : chromium.executablePath);

      // If not provided or missing on disk, try known direct bin path
      if (!execPath || !(await pathExists(execPath))) {
        const cwd = process.cwd();
        const directPath = path.join(cwd, 'node_modules', '@sparticuz', 'chromium', 'bin', 'chromium');
        if (await pathExists(directPath)) {
          execPath = directPath;
        }
      }

      if (execPath && (await pathExists(execPath))) {
        // Try to ensure required shared libraries are discoverable (e.g., NSS on some hosts)
        const libCandidates = [
          '/tmp/al2/lib',
          '/tmp/aws/lib',
          path.join(process.cwd(), 'node_modules', '@sparticuz', 'chromium', 'lib'),
          '/opt/lib',
        ];
        const existingLibPaths = [];
        for (const d of libCandidates) {
          try {
            const st = await fs.stat(d);
            if (st && st.isDirectory()) existingLibPaths.push(d);
          } catch {}
        }
        const envForChrome = { ...process.env };
        if (existingLibPaths.length) {
          const uniq = Array.from(new Set(existingLibPaths));
          envForChrome.LD_LIBRARY_PATH = `${uniq.join(':')}${process.env.LD_LIBRARY_PATH ? ':' + process.env.LD_LIBRARY_PATH : ''}`;
          console.log(`[Puppeteer] LD_LIBRARY_PATH set for Chromium: ${envForChrome.LD_LIBRARY_PATH}`);
        }

        launchOptions = {
          args: [...(chromium.args || []), `--lang=${lang === 'ar' ? 'ar' : 'en-US'}`],
          defaultViewport: chromium.defaultViewport,
          executablePath: execPath,
          headless: chromium.headless ?? 'new',
          env: envForChrome,
        };
        console.log(`[Puppeteer] Using @sparticuz/chromium at: ${execPath}`);
      } else {
        console.warn('[Puppeteer] @sparticuz/chromium executablePath not found, falling back to system Chrome...');
      }
    } catch (e) {
      console.warn(`[Puppeteer] @sparticuz/chromium error: ${e?.message || e}. Falling back...`);
    }
  }

  if (!launchOptions) {
    // Resolve executable path in this order:
    // 1) Explicit env var
    // 2) Common system locations
    // 3) Puppeteer-managed browser cache (if installed via `npx puppeteer browsers install chrome`)
    let resolvedExecutablePath = process.env.PUPPETEER_EXECUTABLE_PATH || null;
    // If env var is set but path does not exist, ignore it and fall back
    if (resolvedExecutablePath && !(await pathExists(resolvedExecutablePath))) {
      console.warn(`[Puppeteer] Ignoring missing PUPPETEER_EXECUTABLE_PATH: ${resolvedExecutablePath}`);
      resolvedExecutablePath = null;
    }
    if (!resolvedExecutablePath) {
      resolvedExecutablePath = await findSystemChrome();
    }
    if (!resolvedExecutablePath && typeof puppeteer.executablePath === 'function') {
      try {
        const autoPath = puppeteer.executablePath();
        if (autoPath && (await pathExists(autoPath))) {
          resolvedExecutablePath = autoPath;
        } else if (autoPath) {
          console.warn(`[Puppeteer] Auto-detected path does not exist: ${autoPath}`);
        }
      } catch {}
    }

    console.log(`[Puppeteer] Using executablePath: ${resolvedExecutablePath || 'auto (bundled/managed)'}`);

    launchOptions = {
      headless: 'new',
      ...(resolvedExecutablePath ? { executablePath: resolvedExecutablePath } : {}),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--font-render-hinting=medium',
        `--lang=${lang === 'ar' ? 'ar' : 'en-US'}`,
      ],
    };
  }

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

