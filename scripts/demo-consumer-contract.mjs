import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const demoDir = process.env.RMUI_DEMO_DIR
  ? path.resolve(process.env.RMUI_DEMO_DIR)
  : path.resolve(repoRoot, '../../react-magic-ui-demo');
const outRoot = process.env.RMUI_DEMO_CONTRACT_OUTDIR
  ? path.resolve(process.env.RMUI_DEMO_CONTRACT_OUTDIR)
  : path.join(repoRoot, 'worklog', 'demo-consumer');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join(outRoot, stamp);
const packTempRoot = process.env.RMUI_PACK_TEMP_DIR
  ? path.resolve(process.env.RMUI_PACK_TEMP_DIR)
  : path.join(repoRoot, 'worklog', 'pack-temp');
const packTempDir = path.join(packTempRoot, stamp);

async function run(command, args, { cwd = repoRoot, env = process.env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
        return;
      }

      const error = new Error(
        `command failed (${code}): ${command} ${args.join(' ')}\n${stdout}\n${stderr}`.trim()
      );
      error.stdout = stdout;
      error.stderr = stderr;
      error.code = code;
      reject(error);
    });
  });
}

async function auditDemoSource() {
  const appPath = path.join(demoDir, 'src', 'App.tsx');
  const mainPath = path.join(demoDir, 'src', 'main.tsx');
  const warnings = [];

  let appSource = '';
  try {
    appSource = await fs.readFile(appPath, 'utf8');
  } catch {
    appSource = '';
  }

  let mainSource = '';
  try {
    mainSource = await fs.readFile(mainPath, 'utf8');
  } catch {
    mainSource = '';
  }

  const combinedSource = `${mainSource}\n${appSource}`;

  if (!/import\s+['"]react-magic-ui\/style\.css['"]\s*;?/m.test(combinedSource)) {
    warnings.push({
      type: 'missing-style-import',
      severity: 'warning',
      message: 'Demo app does not explicitly import react-magic-ui/style.css from src/main.tsx or src/App.tsx.',
      filesChecked: [mainPath, appPath],
    });
  }

  const sidebarToggleUsed = /<Sidebar\.Toggle\b/.test(appSource);
  const sidebarMarkedCollapsible = /<Sidebar\b[^>]*\bcollapsible(?:=|\s|>)/s.test(appSource);

  if (sidebarToggleUsed && !sidebarMarkedCollapsible) {
    warnings.push({
      type: 'sidebar-toggle-without-collapsible',
      severity: 'warning',
      message: 'Demo renders <Sidebar.Toggle /> but the surrounding <Sidebar> is not marked collapsible, so the toggle will render null by contract.',
      filesChecked: [appPath],
    });
  }

  return {
    filesChecked: [mainPath, appPath],
    warnings,
  };
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(packTempDir, { recursive: true });

  const summary = {
    repoRoot,
    demoDir,
    outDir,
    steps: [],
    warnings: [],
  };

  const logStep = async (name, fn) => {
    const startedAt = new Date().toISOString();
    try {
      const result = await fn();
      summary.steps.push({ name, status: 'passed', startedAt, finishedAt: new Date().toISOString() });
      return result;
    } catch (error) {
      summary.steps.push({
        name,
        status: 'failed',
        startedAt,
        finishedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  await logStep('verify demo app path exists', async () => {
    await fs.access(demoDir);
  });

  const sourceAudit = await logStep('audit demo source for consumer contract mismatches', () =>
    auditDemoSource()
  );
  summary.warnings = sourceAudit.warnings;
  await fs.writeFile(path.join(outDir, 'demo-source-audit.json'), JSON.stringify(sourceAudit, null, 2));

  const buildLibraryResult = await logStep('build library before packing', () =>
    run('npm', ['run', 'build'], { cwd: repoRoot })
  );
  await fs.writeFile(path.join(outDir, 'library-build.stdout.txt'), buildLibraryResult.stdout);
  await fs.writeFile(path.join(outDir, 'library-build.stderr.txt'), buildLibraryResult.stderr);

  const packResult = await logStep('pack library tarball', () =>
    run('npm', ['pack', '--pack-destination', packTempDir], { cwd: repoRoot })
  );
  const tarballName = packResult.stdout.trim().split(/\s+/).pop();
  const tarballPath = path.join(packTempDir, tarballName);

  await fs.writeFile(path.join(outDir, 'pack.stdout.txt'), packResult.stdout);
  await fs.writeFile(path.join(outDir, 'pack.stderr.txt'), packResult.stderr);

  const installResult = await logStep('install packed library into demo app', () =>
    run('npm', ['install', '--no-save', tarballPath], { cwd: demoDir })
  );
  await fs.writeFile(path.join(outDir, 'demo-install.stdout.txt'), installResult.stdout);
  await fs.writeFile(path.join(outDir, 'demo-install.stderr.txt'), installResult.stderr);

  const buildResult = await logStep('build demo app against packed library', () =>
    run('npm', ['run', 'build'], { cwd: demoDir })
  );
  await fs.writeFile(path.join(outDir, 'demo-build.stdout.txt'), buildResult.stdout);
  await fs.writeFile(path.join(outDir, 'demo-build.stderr.txt'), buildResult.stderr);

  summary.tarballName = tarballName;
  summary.tarballPath = tarballPath;
  summary.packTempDir = packTempDir;

  await fs.writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));

  if (summary.warnings.length > 0) {
    console.warn(`demo consumer source audit emitted ${summary.warnings.length} warning(s)`);
    for (const warning of summary.warnings) {
      console.warn(`- [${warning.type}] ${warning.message}`);
    }
  }
}

await main();
