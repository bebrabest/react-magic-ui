import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

// use the playwright-core that ships with openclaw (no extra deps in the repo)
import playwright from '/usr/lib/node_modules/openclaw/node_modules/playwright-core/index.js';
const { chromium } = playwright;

const STORYBOOK_URL = process.env.STORYBOOK_URL ?? 'http://127.0.0.1:6006';
const PORT = Number(process.env.STORYBOOK_PORT ?? '6006');
const executablePath = process.env.PLAYWRIGHT_CHROME_PATH ?? '/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';

const repoRoot = process.cwd();
const outRoot = process.env.RMUI_VISUAL_OUTDIR
  ? path.resolve(process.env.RMUI_VISUAL_OUTDIR)
  : path.join(repoRoot, 'worklog', 'visual');

const now = new Date();
const stamp = now.toISOString().replace(/[:.]/g, '-');
const outDir = path.join(outRoot, stamp);

const targets = [
  { name: 'storybook-home', url: `${STORYBOOK_URL}/` },
  { name: 'button-default', url: `${STORYBOOK_URL}/iframe.html?id=button--default&viewMode=story` },
  { name: 'card-default', url: `${STORYBOOK_URL}/iframe.html?id=card--default&viewMode=story` },
  { name: 'select-default', url: `${STORYBOOK_URL}/iframe.html?id=select--default&viewMode=story` },
  { name: 'checkbox-default', url: `${STORYBOOK_URL}/iframe.html?id=checkbox--default&viewMode=story` },
  { name: 'switch-default', url: `${STORYBOOK_URL}/iframe.html?id=switch--default&viewMode=story` },
  { name: 'slider-default', url: `${STORYBOOK_URL}/iframe.html?id=slider--default&viewMode=story` },
  { name: 'tabs-default', url: `${STORYBOOK_URL}/iframe.html?id=tabs--default&viewMode=story` },
  { name: 'toast-default', url: `${STORYBOOK_URL}/iframe.html?id=toast--default&viewMode=story` },
  { name: 'modal-default', url: `${STORYBOOK_URL}/iframe.html?id=modal--default&viewMode=story` },
];

async function sleep(ms) {
  await new Promise(r => setTimeout(r, ms));
}

async function waitForStorybook(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  // cheap probe that works without extra deps
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${STORYBOOK_URL}/iframe.html`, { method: 'GET' });
      if (res.ok) return;
    } catch {}
    await sleep(750);
  }
  throw new Error(`storybook did not become ready at ${STORYBOOK_URL} within ${timeoutMs}ms`);
}

function startStorybook() {
  // run the repo script so local storybook config is used
  const child = spawn('npm', ['run', 'storybook', '--', '-p', String(PORT), '--ci'], {
    stdio: 'pipe',
    env: { ...process.env, BROWSER: 'none' },
  });

  const logs = [];
  const onData = (chunk) => logs.push(chunk.toString('utf8'));
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);

  return { child, logs };
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });

  const { child, logs: sbLogs } = startStorybook();

  try {
    await waitForStorybook();

    const browser = await chromium.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
      deviceScaleFactor: 1,
    });

    const pwLogs = [];
    page.on('console', msg => pwLogs.push(`[console:${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => pwLogs.push(`[pageerror] ${err.message}`));
    page.on('requestfailed', req => pwLogs.push(`[requestfailed] ${req.url()} :: ${req.failure()?.errorText}`));

    for (const t of targets) {
      await page.goto(t.url, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(outDir, `${t.name}.png`), fullPage: true });
    }

    await fs.writeFile(path.join(outDir, 'playwright-log.txt'), pwLogs.join('\n') + '\n');
    await browser.close();

    const storybookLog = sbLogs.join('');
    await fs.writeFile(path.join(outDir, 'storybook-log.txt'), storybookLog);

    const files = await fs.readdir(outDir);
    console.log(JSON.stringify({ outDir, files }, null, 2));
  } finally {
    // always stop the dev server
    const waitExit = new Promise((resolve) => child.once('exit', resolve));
    try { child.kill('SIGTERM'); } catch {}
    await Promise.race([waitExit, sleep(3000)]);
    try { child.kill('SIGKILL'); } catch {}
  }
}

await main();
// safety: ensure we don't hang the autonomy loop
process.exit(0);
