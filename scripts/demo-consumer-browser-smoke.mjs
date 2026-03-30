import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import playwright from '/usr/lib/node_modules/openclaw/node_modules/playwright-core/index.js';
const { chromium } = playwright;

const repoRoot = process.cwd();
const demoDir = process.env.RMUI_DEMO_DIR
  ? path.resolve(process.env.RMUI_DEMO_DIR)
  : path.resolve(repoRoot, '../../react-magic-ui-demo');
const outRoot = process.env.RMUI_DEMO_BROWSER_OUTDIR
  ? path.resolve(process.env.RMUI_DEMO_BROWSER_OUTDIR)
  : path.join(repoRoot, 'worklog', 'demo-browser-smoke');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join(outRoot, stamp);
const previewPort = Number(process.env.RMUI_DEMO_PREVIEW_PORT ?? '4173');
const previewUrl = process.env.RMUI_DEMO_PREVIEW_URL ?? `http://127.0.0.1:${previewPort}`;
const executablePath = process.env.PLAYWRIGHT_CHROME_PATH ?? '/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForUrl(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) return;
    } catch {}

    await sleep(500);
  }

  throw new Error(`preview did not become ready at ${url} within ${timeoutMs}ms`);
}

function startPreview() {
  const child = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(previewPort), '--strictPort'], {
    cwd: demoDir,
    stdio: 'pipe',
    env: { ...process.env, BROWSER: 'none' },
  });

  const logs = [];
  const onData = (chunk) => logs.push(chunk.toString('utf8'));
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);

  return { child, logs };
}

async function runSmoke(browser) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  });

  const pwLogs = [];
  page.on('console', (msg) => pwLogs.push(`[console:${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => pwLogs.push(`[pageerror] ${err.message}`));
  page.on('requestfailed', (req) => pwLogs.push(`[requestfailed] ${req.url()} :: ${req.failure()?.errorText}`));

  await page.goto(previewUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});

  const results = [];

  async function step(name, fn) {
    try {
      await fn();
      results.push({ name, status: 'passed' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ name, status: 'failed', error: message });
      throw error;
    }
  }

  await step('demo renders key shell content', async () => {
    await page.getByRole('heading', { name: /beautiful react components/i }).waitFor({ state: 'visible' });
    await page.getByText(/components/i).first().waitFor({ state: 'visible' });
    await page.getByRole('button', { name: /^default$/i }).waitFor({ state: 'visible' });
  });

  await step('sidebar keyboard navigation updates active item', async () => {
    const overview = page.getByRole('button', { name: /^overview$/i });
    await overview.focus();
    await page.keyboard.press('ArrowDown');

    const buttons = page.getByRole('button', { name: /^buttons$/i });
    await buttons.waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Buttons');

    await page.keyboard.press('Enter');
    await page.waitForFunction(() => {
      const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent?.trim() === 'Buttons');
      return button?.getAttribute('aria-current') === 'page';
    });
  });

  await step('select updates chosen value in the demo', async () => {
    const combobox = page.locator('#inputs').getByRole('combobox').first();
    await combobox.focus();
    await page.keyboard.press('ArrowDown');
    await page.getByRole('listbox').waitFor({ state: 'visible' });
    await page.keyboard.press('Enter');
    const value = await combobox.textContent();
    if (!value || /small select/i.test(value)) {
      throw new Error(`select did not update away from placeholder text (value=${JSON.stringify(value)})`);
    }
  });

  await step('switch and checkbox toggle with keyboard', async () => {
    const smallSwitch = page.getByRole('switch').first();
    await smallSwitch.focus();
    await page.keyboard.press('Space');
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-checked') === 'true');

    const smallCheckbox = page.getByRole('checkbox', { name: /^small$/i });
    await smallCheckbox.focus();
    await page.keyboard.press('Space');
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-checked') === 'true');
  });

  await step('slider responds to keyboard changes', async () => {
    const slider = page.getByRole('slider').first();
    await slider.focus();
    const before = Number(await slider.getAttribute('aria-valuenow'));
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => {
      const active = document.activeElement;
      return active?.getAttribute('role') === 'slider' && Number(active.getAttribute('aria-valuenow')) > 50;
    });
    const after = Number(await slider.getAttribute('aria-valuenow'));
    if (!(after > before)) {
      throw new Error(`slider value did not increase (before=${before}, after=${after})`);
    }
  });

  await step('modal opens and closes with escape', async () => {
    await page.getByRole('button', { name: /open modal/i }).click();
    await page.getByRole('dialog', { name: /glass modal/i }).waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    await page.getByRole('dialog', { name: /glass modal/i }).waitFor({ state: 'hidden' });
  });

  await step('tabs switch visible content', async () => {
    await page.getByRole('tab', { name: /^pricing$/i }).click();
    await page.getByText(/free & open source/i).waitFor({ state: 'visible' });
  });

  await step('topbar keeps key external actions visible', async () => {
    await page.getByRole('link', { name: /github/i }).waitFor({ state: 'visible' });
    await page.getByRole('link', { name: /get started/i }).waitFor({ state: 'visible' });
    await page.getByText(/^v(?:\d+|1\.x\.x)/i).waitFor({ state: 'visible' });
  });

  await step('toast can be shown and cleared', async () => {
    await page.getByRole('button', { name: /^success$/i }).click();
    await page.getByRole('status').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: /clear all/i }).click();
    await page.getByRole('status').waitFor({ state: 'hidden' });
  });

  return { page, results, pwLogs };
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });

  const validation = spawn('npm', ['run', 'test:demo-consumer'], {
    cwd: repoRoot,
    stdio: 'pipe',
    env: process.env,
  });

  let validationStdout = '';
  let validationStderr = '';
  validation.stdout.on('data', (chunk) => {
    validationStdout += chunk.toString('utf8');
  });
  validation.stderr.on('data', (chunk) => {
    validationStderr += chunk.toString('utf8');
  });

  const validationCode = await new Promise((resolve, reject) => {
    validation.on('error', reject);
    validation.on('close', resolve);
  });

  await fs.writeFile(path.join(outDir, 'demo-consumer-validation.stdout.txt'), validationStdout);
  await fs.writeFile(path.join(outDir, 'demo-consumer-validation.stderr.txt'), validationStderr);

  if (validationCode !== 0) {
    throw new Error(`npm run test:demo-consumer failed with exit code ${validationCode}`);
  }

  const { child, logs: previewLogs } = startPreview();

  try {
    await waitForUrl(previewUrl);

    const browser = await chromium.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });

    const { page, results, pwLogs } = await runSmoke(browser);

    await page.screenshot({ path: path.join(outDir, 'final-state.png'), fullPage: true });
    await fs.writeFile(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2));
    await fs.writeFile(path.join(outDir, 'playwright-log.txt'), pwLogs.join('\n') + '\n');
    await fs.writeFile(path.join(outDir, 'preview-log.txt'), previewLogs.join(''));

    await browser.close();

    const failed = results.find((result) => result.status === 'failed');
    if (failed) {
      throw new Error(`demo browser smoke failed at: ${failed.name}${failed.error ? ` - ${failed.error}` : ''}`);
    }

    console.log(JSON.stringify({ outDir, previewUrl, results }, null, 2));
  } finally {
    const waitExit = new Promise((resolve) => child.once('exit', resolve));
    try { child.kill('SIGTERM'); } catch {}
    await Promise.race([waitExit, sleep(3000)]);
    try { child.kill('SIGKILL'); } catch {}
  }
}

await main();
process.exit(0);
