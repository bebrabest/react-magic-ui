import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import playwright from '/usr/lib/node_modules/openclaw/node_modules/playwright-core/index.js';
const { chromium } = playwright;

const STORYBOOK_URL = process.env.STORYBOOK_URL ?? 'http://127.0.0.1:6006';
const PORT = Number(process.env.STORYBOOK_PORT ?? '6006');
const executablePath = process.env.PLAYWRIGHT_CHROME_PATH ?? '/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';

const repoRoot = process.cwd();
const outRoot = process.env.RMUI_SMOKE_OUTDIR
  ? path.resolve(process.env.RMUI_SMOKE_OUTDIR)
  : path.join(repoRoot, 'worklog', 'browser-smoke');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join(outRoot, stamp);

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForStorybook(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;

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

async function gotoStory(page, storyId) {
  const url = `${STORYBOOK_URL}/iframe.html?id=${storyId}&viewMode=story`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(250);
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

  await step('checkbox toggles via keyboard', async () => {
    await gotoStory(page, 'checkbox--default');
    const checkbox = page.getByRole('checkbox', { name: /check me/i });
    await checkbox.focus();
    await page.keyboard.press('Space');
    await checkbox.waitFor({ state: 'visible' });
    if ((await checkbox.getAttribute('aria-checked')) !== 'true') {
      throw new Error('checkbox did not toggle to checked state after Space');
    }
  });

  await step('switch toggles via click', async () => {
    await gotoStory(page, 'switch--default');
    const sw = page.getByRole('switch');
    await sw.click();
    if ((await sw.getAttribute('aria-checked')) !== 'true') {
      throw new Error('switch did not toggle to checked state after click');
    }
  });

  await step('slider responds to keyboard input', async () => {
    await gotoStory(page, 'slider--default');
    const slider = page.getByRole('slider');
    await slider.focus();
    const before = Number(await slider.getAttribute('aria-valuenow'));
    await page.keyboard.press('ArrowRight');
    const after = Number(await slider.getAttribute('aria-valuenow'));
    if (!(after > before)) {
      throw new Error(`slider value did not increase after ArrowRight (before=${before}, after=${after})`);
    }
  });

  await step('select opens with keyboard and updates value', async () => {
    await gotoStory(page, 'select--default');
    const combobox = page.getByRole('combobox');
    await combobox.focus();
    await page.keyboard.press('ArrowDown');
    await page.getByRole('listbox').waitFor({ state: 'visible' });
    await page.keyboard.press('Enter');
    await page.getByText(/Selected value:/).waitFor({ state: 'visible' });
  });

  await step('tabs support keyboard navigation and activation', async () => {
    await gotoStory(page, 'tabs--default');
    const overview = page.getByRole('tab', { name: 'Overview' });
    await overview.focus();
    await page.keyboard.press('ArrowRight');
    const analytics = page.getByRole('tab', { name: 'Analytics' });
    await analytics.waitFor({ state: 'visible' });
    const selected = await analytics.getAttribute('aria-selected');
    if (selected !== 'true') {
      throw new Error('analytics tab was not activated after ArrowRight in default auto mode');
    }
    await page.getByText(/interactive charts/i).waitFor({ state: 'visible' });
  });

  await step('sidebar supports keyboard navigation and collapse toggle', async () => {
    await gotoStory(page, 'sidebar--default');
    const dashboard = page.getByRole('button', { name: /^dashboard$/i });
    await dashboard.focus();
    await page.keyboard.press('ArrowDown');
    const analytics = page.getByRole('button', { name: /^analytics$/i });
    await analytics.waitFor({ state: 'visible' });
    await analytics.focus();
    await page.keyboard.press('Enter');
    if ((await analytics.getAttribute('aria-current')) !== 'page') {
      throw new Error('sidebar did not mark Analytics as active after keyboard activation');
    }

    const toggle = page.getByRole('button', { name: /collapse sidebar|expand sidebar/i });
    await toggle.click();
    const title = page.getByText('Magic UI');
    await title.waitFor({ state: 'hidden' });
    await toggle.click();
    await title.waitFor({ state: 'visible' });
  });

  await step('modal opens and closes with Escape', async () => {
    await gotoStory(page, 'modal--default');
    await page.getByRole('button', { name: /open modal/i }).click();
    await page.getByRole('dialog', { name: /glass modal/i }).waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    await page.getByRole('dialog', { name: /glass modal/i }).waitFor({ state: 'hidden' });
  });

  await step('toast story shows and clears toasts', async () => {
    await gotoStory(page, 'toast--playground');
    await page.getByRole('button', { name: /show success/i }).click();
    await page.getByRole('status').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: /clear all/i }).click();
    await page.getByRole('status').waitFor({ state: 'hidden' });
  });

  await step('topbar renders composed brand, search, and actions', async () => {
    await gotoStory(page, 'topbar--default');
    await page.getByText('Magic UI').waitFor({ state: 'visible' });
    await page.getByText('Command Center').waitFor({ state: 'visible' });
    await page.getByPlaceholder('Search anything...').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Invite' }).waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Share' }).waitFor({ state: 'visible' });
  });

  return { page, results, pwLogs };
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

    const { page, results, pwLogs } = await runSmoke(browser);

    await page.screenshot({ path: path.join(outDir, 'final-state.png'), fullPage: true });
    await fs.writeFile(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2));
    await fs.writeFile(path.join(outDir, 'playwright-log.txt'), pwLogs.join('\n') + '\n');
    await fs.writeFile(path.join(outDir, 'storybook-log.txt'), sbLogs.join(''));

    await browser.close();

    const failed = results.find((result) => result.status === 'failed');
    if (failed) {
      throw new Error(`browser smoke failed at: ${failed.name}${failed.error ? ` - ${failed.error}` : ''}`);
    }

    console.log(JSON.stringify({ outDir, results }, null, 2));
  } finally {
    const waitExit = new Promise((resolve) => child.once('exit', resolve));
    try { child.kill('SIGTERM'); } catch {}
    await Promise.race([waitExit, sleep(3000)]);
    try { child.kill('SIGKILL'); } catch {}
  }
}

await main();
process.exit(0);
