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
const packTempRoot = process.env.RMUI_PACK_TEMP_DIR
  ? path.resolve(process.env.RMUI_PACK_TEMP_DIR)
  : path.join(repoRoot, 'worklog', 'pack-temp');

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

async function expectTextIncludes(locator, expectedText) {
  const text = await locator.textContent();
  if (!text || !text.includes(expectedText)) {
    throw new Error(`expected text to include ${JSON.stringify(expectedText)} but got ${JSON.stringify(text)}`);
  }
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

  await step('sidebar click navigation scrolls the consumer demo to the matching section', async () => {
    const feedbackNavItem = page.getByRole('button', { name: /^feedback & display$/i });
    await feedbackNavItem.waitFor({ state: 'visible' });
    await feedbackNavItem.click();

    await page.waitForFunction(() => {
      const section = document.getElementById('feedback');
      if (!(section instanceof HTMLElement)) {
        return false;
      }

      const { top } = section.getBoundingClientRect();
      return top >= 0 && top <= window.innerHeight * 0.35;
    });

    await page.waitForFunction(() => {
      const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent?.trim() === 'Feedback & Display');
      return button?.getAttribute('aria-current') === 'page';
    });
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

  await step('input accepts typed text in the packaged demo', async () => {
    const input = page.getByPlaceholder('Small input...');
    await input.focus();
    await input.fill('packed demo smoke');
    await page.waitForFunction(() => {
      const element = document.activeElement;
      return element instanceof HTMLInputElement && element.placeholder === 'Small input...' && element.value === 'packed demo smoke';
    });
  });

  await step('modal opens, traps focus, and restores trigger focus on escape', async () => {
    const openModalButton = page.getByRole('button', { name: /open modal/i });
    await openModalButton.focus();
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog', { name: /glass modal/i });
    await dialog.waitFor({ state: 'visible' });
    await page.waitForFunction(() => {
      const active = document.activeElement;
      return active instanceof HTMLElement && active.closest('[role="dialog"]') !== null;
    });

    await page.keyboard.press('Tab');
    await page.waitForFunction(() => {
      const active = document.activeElement;
      return active instanceof HTMLElement && active.closest('[role="dialog"]') !== null;
    });

    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    await page.waitForFunction(() => {
      const active = document.activeElement;
      return active instanceof HTMLButtonElement && /open modal/i.test(active.textContent ?? '');
    });
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

  await step('toast variants expose the expected live-region semantics and can be cleared', async () => {
    await page.getByRole('button', { name: /^success$/i }).click();
    const successToast = page.getByRole('status');
    await successToast.waitFor({ state: 'visible' });
    await expectTextIncludes(successToast, 'Success!');

    await page.getByRole('button', { name: /^error$/i }).click();
    const errorToast = page.getByRole('alert');
    await errorToast.waitFor({ state: 'visible' });
    await expectTextIncludes(errorToast, 'Error');

    await page.getByRole('button', { name: /clear all/i }).click();
    await successToast.waitFor({ state: 'hidden' });
    await errorToast.waitFor({ state: 'hidden' });
  });

  await step('select and input keep their consumer-controlled values together', async () => {
    const combobox = page.locator('#inputs').getByRole('combobox').first();
    await combobox.focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => {
      const active = document.activeElement;
      return active?.getAttribute('role') === 'combobox' && /vue|angular|svelte|react/i.test(active.textContent ?? '') && !/small select/i.test(active.textContent ?? '');
    });

    const input = page.getByPlaceholder('Small input...');
    await input.focus();
    await input.fill('combined flow');

    const state = await page.evaluate(() => {
      const inputEl = document.querySelector('input[placeholder="Small input..."]');
      const comboEl = document.activeElement?.getAttribute('role') === 'combobox'
        ? document.activeElement
        : document.querySelector('#inputs [role="combobox"]');

      return {
        inputValue: inputEl instanceof HTMLInputElement ? inputEl.value : null,
        selectText: comboEl?.textContent?.trim() ?? null,
      };
    });

    if (state.inputValue !== 'combined flow') {
      throw new Error(`input lost controlled value (value=${JSON.stringify(state.inputValue)})`);
    }

    if (!state.selectText || /small select/i.test(state.selectText)) {
      throw new Error(`select lost chosen value during combined form flow (text=${JSON.stringify(state.selectText)})`);
    }
  });

  await step('consumer state survives section navigation and a modal round-trip', async () => {
    const inputsNavItem = page.getByRole('button', { name: /^inputs & forms$/i });
    await inputsNavItem.click();
    await page.waitForFunction(() => {
      const section = document.getElementById('inputs');
      if (!(section instanceof HTMLElement)) {
        return false;
      }

      const { top } = section.getBoundingClientRect();
      return top >= 0 && top <= window.innerHeight * 0.35;
    });

    const input = page.getByPlaceholder('Small input...');
    await input.focus();
    await input.fill('persist me');

    const combobox = page.locator('#inputs').getByRole('combobox').first();
    await combobox.focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    const selectedBeforeModal = await combobox.textContent();
    if (!selectedBeforeModal || /small select/i.test(selectedBeforeModal)) {
      throw new Error(`select did not settle on a real value before modal round-trip (text=${JSON.stringify(selectedBeforeModal)})`);
    }

    const openModalButton = page.getByRole('button', { name: /open modal/i });
    await openModalButton.click();
    const dialog = page.getByRole('dialog', { name: /glass modal/i });
    await dialog.waitFor({ state: 'visible' });
    await page.getByRole('button', { name: /confirm/i }).click();
    await dialog.waitFor({ state: 'hidden' });

    await inputsNavItem.click();
    await page.waitForFunction(() => {
      const section = document.getElementById('inputs');
      if (!(section instanceof HTMLElement)) {
        return false;
      }

      const { top } = section.getBoundingClientRect();
      return top >= 0 && top <= window.innerHeight * 0.35;
    });

    const state = await page.evaluate(() => {
      const inputEl = document.querySelector('input[placeholder="Small input..."]');
      const comboEl = document.querySelector('#inputs [role="combobox"]');

      return {
        inputValue: inputEl instanceof HTMLInputElement ? inputEl.value : null,
        selectText: comboEl?.textContent?.trim() ?? null,
      };
    });

    if (state.inputValue !== 'persist me') {
      throw new Error(`input state did not survive navigation/modal round-trip (value=${JSON.stringify(state.inputValue)})`);
    }

    if (state.selectText !== selectedBeforeModal?.trim()) {
      throw new Error(`select state changed across navigation/modal round-trip (before=${JSON.stringify(selectedBeforeModal?.trim())}, after=${JSON.stringify(state.selectText)})`);
    }
  });

  return { page, results, pwLogs };
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });

  const validation = spawn('npm', ['run', 'test:demo-consumer'], {
    cwd: repoRoot,
    stdio: 'pipe',
    env: {
      ...process.env,
      RMUI_PACK_TEMP_DIR: packTempRoot,
    },
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
