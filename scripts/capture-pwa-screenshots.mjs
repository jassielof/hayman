import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const screenshotsDir = path.join(root, 'static', 'screenshots');
const previewUrl = 'http://127.0.0.1:4174';
const demoBibId = 'screenshot-demo';
const demoBibTitle = 'Sample Bibliography';
const demoEntryTitle = 'Clean Code';

async function waitForServer(url, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.status > 0) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Preview server did not start at ${url}`);
}

function startDevServer() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.platform === 'win32' ? 'bun.exe' : 'bun',
      ['run', 'dev', '--host', '127.0.0.1', '--port', '4174'],
      {
        cwd: root,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    child.on('error', reject);
    child.stdout?.on('data', () => {});
    child.stderr?.on('data', () => {});

    resolve(child);
  });
}

function stopDevServer(child) {
  if (!child?.pid) return Promise.resolve();
  if (process.platform !== 'win32') {
    child.kill('SIGTERM');
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const killer = spawn(
      'taskkill.exe',
      ['/pid', String(child.pid), '/T', '/F'],
      {
        stdio: 'ignore',
        windowsHide: true,
      },
    );
    killer.on('error', () => resolve());
    killer.on('exit', () => resolve());
  });
}

async function seedDemoData(page) {
  await page.goto(`${previewUrl}/__screenshot_demo__`, {
    waitUntil: 'domcontentloaded',
  });

  const error = page.locator('[data-screenshot-error="true"]');
  if (await error.count()) {
    throw new Error(`Seed failed: ${await error.textContent()}`);
  }

  await page.waitForSelector('[data-screenshot-ready="true"]', {
    state: 'attached',
    timeout: 60_000,
  });
}

async function waitForPageReady(page) {
  const spinner = page.locator('main .loading-xl.loading-spinner');
  if (await spinner.count()) {
    await spinner.waitFor({ state: 'detached', timeout: 60_000 });
  }
}

async function waitForBibliographyDetail(page) {
  await waitForPageReady(page);
  await page
    .getByRole('heading', { name: demoBibTitle, level: 1 })
    .waitFor({ timeout: 60_000 });
  await page.getByText(demoEntryTitle).first().waitFor({ timeout: 60_000 });
  await page.waitForTimeout(500);
}

async function waitForHomeWithBibliography(page) {
  await waitForPageReady(page);
  await page
    .getByRole('heading', { name: demoBibTitle, level: 6 })
    .waitFor({ timeout: 60_000 });
  await page.waitForTimeout(500);
}

async function capture(page, filePath) {
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`Wrote ${filePath}`);
}

async function run() {
  await mkdir(screenshotsDir, { recursive: true });

  const devServer = await startDevServer();
  let browser;

  try {
    await waitForServer(previewUrl);
    browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    await seedDemoData(page);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${previewUrl}/bibliography/${demoBibId}`, {
      waitUntil: 'domcontentloaded',
    });
    await waitForBibliographyDetail(page);
    await capture(page, path.join(screenshotsDir, 'desktop.png'));

    const mobilePage = await context.newPage();
    await mobilePage.setViewportSize({ width: 390, height: 844 });
    await mobilePage.goto(previewUrl, { waitUntil: 'domcontentloaded' });
    await waitForHomeWithBibliography(mobilePage);
    await capture(mobilePage, path.join(screenshotsDir, 'mobile.png'));
  } finally {
    await browser?.close();
    await stopDevServer(devServer);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
