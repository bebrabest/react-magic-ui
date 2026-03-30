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

const targetSpecs = [
  { name: 'button-default', title: 'Button', story: 'Default' },
  { name: 'card-default', title: 'Card', story: 'Default' },
  { name: 'select-default', title: 'Select', story: 'Default' },
  { name: 'checkbox-default', title: 'Checkbox', story: 'Default' },
  { name: 'switch-default', title: 'Switch', story: 'Default' },
  { name: 'slider-default', title: 'Slider', story: 'Default' },
  { name: 'tabs-default', title: 'Tabs', story: 'Default' },
  { name: 'toast-playground', title: 'Toast', story: 'Playground' },
  { name: 'modal-default', title: 'Modal', story: 'Default' },
  { name: 'sidebar-default', title: 'Sidebar', story: 'Default' },
  { name: 'topbar-default', title: 'Topbar', story: 'Default' },
];

async function sleep(ms) {
  await new Promise(r => setTimeout(r, ms));
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

async function fetchStoryIndex() {
  const candidates = [`${STORYBOOK_URL}/index.json`, `${STORYBOOK_URL}/stories.json`];

  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const entries = data.entries ?? data.stories;
      if (entries && typeof entries === 'object') {
        return { url, entries };
      }
    } catch {}
  }

  throw new Error(`could not load Storybook story index from ${candidates.join(' or ')}`);
}

function buildTargets(entries) {
  const stories = Object.entries(entries).map(([id, entry]) => ({
    id,
    title: entry.title,
    name: entry.name,
    type: entry.type,
  }));

  return targetSpecs.map(spec => {
    const match = stories.find(
      story => story.type === 'story' && story.title === spec.title && story.name === spec.story,
    );

    if (!match) {
      const available = stories
        .filter(story => story.type === 'story' && story.title === spec.title)
        .map(story => story.name)
        .sort();
      throw new Error(
        `storybook target not found for ${spec.title}/${spec.story}. available stories for ${spec.title}: ${available.join(', ') || '(none)'}`,
      );
    }

    return {
      name: spec.name,
      id: match.id,
      title: match.title,
      story: match.name,
      url: `${STORYBOOK_URL}/iframe.html?id=${match.id}&viewMode=story`,
    };
  });
}

function startStorybook() {
  const child = spawn('npm', ['run', 'storybook', '--', '-p', String(PORT), '--ci'], {
    stdio: 'pipe',
    env: { ...process.env, BROWSER: 'none' },
  });

  const logs = [];
  const onData = chunk => logs.push(chunk.toString('utf8'));
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);

  return { child, logs };
}

async function waitForStableStory(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('#storybook-root, #storybook-docs', { timeout: 15_000 });
  await page.waitForFunction(
    () => {
      const docsRoot = document.querySelector('#storybook-docs');
      if (docsRoot) return true;

      const storyRoot = document.querySelector('#storybook-root');
      if (!storyRoot) return false;

      return storyRoot.childElementCount > 0 || storyRoot.textContent.trim().length > 0;
    },
    { timeout: 15_000 },
  );
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(750);
}

async function captureShot(page, filepath) {
  await page.screenshot({ path: filepath, fullPage: true });
}

async function applyInteractionState(page, target) {
  switch (target.name) {
    case 'select-default': {
      const combobox = page.getByRole('combobox');
      await combobox.click();
      await page.getByRole('option', { name: 'Option 3' }).click();
      await page.getByText('Selected value: option3').waitFor({ timeout: 5_000 });
      return ['selected-option3'];
    }

    case 'slider-default': {
      const slider = page.getByRole('slider');
      await slider.focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await page.getByText('52').waitFor({ timeout: 5_000 });
      return ['value-52'];
    }

    case 'tabs-default': {
      await page.getByRole('tab', { name: 'Analytics' }).click();
      await page.getByText('Dive into interactive charts, trend analysis, and comparison reports').waitFor({
        timeout: 5_000,
      });
      return ['analytics-active'];
    }

    case 'toast-playground': {
      await page.getByRole('button', { name: 'Show error' }).click();
      await page.getByRole('alert').waitFor({ timeout: 5_000 });
      return ['error-toast-open'];
    }

    case 'modal-default': {
      await page.getByRole('button', { name: 'Open modal' }).click();
      await page.getByRole('dialog', { name: 'Glass modal' }).waitFor({ timeout: 5_000 });
      return ['dialog-open'];
    }

    case 'sidebar-default': {
      const toggle = page.getByRole('button', { name: 'collapse sidebar' });
      await toggle.click();
      await page.getByRole('button', { name: 'expand sidebar' }).waitFor({ timeout: 5_000 });
      return ['collapsed'];
    }

    default:
      return [];
  }
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });

  const { child, logs: sbLogs } = startStorybook();

  try {
    await waitForStorybook();
    const { url: storyIndexUrl, entries } = await fetchStoryIndex();
    const targets = buildTargets(entries);

    const browser = await chromium.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });

    const pwLogs = [`[info] story index loaded from ${storyIndexUrl}`];
    const captures = [];

    for (const t of targets) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1100 },
        deviceScaleFactor: 1,
      });

      page.on('console', msg => pwLogs.push(`[console:${msg.type()}][${t.name}] ${msg.text()}`));
      page.on('pageerror', err => pwLogs.push(`[pageerror][${t.name}] ${err.message}`));
      page.on('requestfailed', req => {
        const errorText = req.failure()?.errorText ?? 'unknown';
        if (errorText === 'net::ERR_ABORTED') return;
        pwLogs.push(`[requestfailed][${t.name}] ${req.url()} :: ${errorText}`);
      });

      await page.goto(t.url, { waitUntil: 'domcontentloaded' });
      await waitForStableStory(page);

      const baseFile = `${t.name}.png`;
      await captureShot(page, path.join(outDir, baseFile));
      captures.push({ target: t.name, state: 'base', file: baseFile });

      const interactionStates = await applyInteractionState(page, t);
      for (const state of interactionStates) {
        await page.waitForTimeout(300);
        const file = `${t.name}--${state}.png`;
        await captureShot(page, path.join(outDir, file));
        captures.push({ target: t.name, state, file });
      }

      await page.close();
    }

    await fs.writeFile(path.join(outDir, 'playwright-log.txt'), pwLogs.join('\n') + '\n');
    await fs.writeFile(path.join(outDir, 'targets.json'), JSON.stringify(targets, null, 2) + '\n');
    await fs.writeFile(path.join(outDir, 'captures.json'), JSON.stringify(captures, null, 2) + '\n');
    await browser.close();

    const storybookLog = sbLogs.join('');
    await fs.writeFile(path.join(outDir, 'storybook-log.txt'), storybookLog);

    const files = await fs.readdir(outDir);
    console.log(JSON.stringify({ outDir, files, captures }, null, 2));
  } finally {
    const waitExit = new Promise(resolve => child.once('exit', resolve));
    try {
      child.kill('SIGTERM');
    } catch {}
    await Promise.race([waitExit, sleep(3000)]);
    try {
      child.kill('SIGKILL');
    } catch {}
  }
}

await main();
process.exit(0);
