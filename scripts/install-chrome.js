import fs from 'fs/promises';
import { spawnSync } from 'child_process';

async function fileExists(p) {
  if (!p) return false;
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  try {
    // 1) If env var points to a valid file, skip install
    const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (await fileExists(envPath)) {
      console.log(`[postinstall] Chrome already available at env path: ${envPath}. Skipping install.`);
      return;
    }
    // 2) If Lambda Chromium is available, skip install
    try {
      let chromium = null;
      try { chromium = (await import('@sparticuz/chrome-aws-lambda')).default; } catch {}
      if (!chromium) { try { chromium = (await import('chrome-aws-lambda')).default; } catch {} }
      if (chromium) {
        const exec = await chromium.executablePath;
        if (await fileExists(exec)) {
          console.log(`[postinstall] Lambda Chromium present at: ${exec}. Skipping install.`);
          return;
        }
      }
    } catch (_) {}


    // 2) Try puppeteer's auto-detected path
    let autoPath = null;
    try {
      const puppeteer = (await import('puppeteer')).default;
      if (puppeteer && typeof puppeteer.executablePath === 'function') {
        autoPath = puppeteer.executablePath();
      }
    } catch (e) {
      // ignore import errors during install
    }

    if (await fileExists(autoPath)) {
      console.log(`[postinstall] Chrome found at puppeteer executablePath: ${autoPath}. Skipping install.`);
      return;
    }

    console.log('[postinstall] Chrome not found. Attempting: npx puppeteer browsers install chrome');
    const res = spawnSync('npx', ['puppeteer', 'browsers', 'install', 'chrome'], {
      stdio: 'inherit',
      shell: true,
      env: process.env,
    });

    if (res.status !== 0) {
      console.warn('[postinstall] Puppeteer Chrome install failed or was interrupted.');
      console.warn('[postinstall] You can SSH into the app and run: npx puppeteer browsers install chrome');
      // Do not fail the npm install; allow app to start and generate guidance at runtime
    } else {
      console.log('[postinstall] Chrome install completed.');
    }
  } catch (err) {
    console.warn(`[postinstall] Unexpected error: ${err?.message || err}`);
    // Do not fail the install
  }
}

main().catch(() => {});

