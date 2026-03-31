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

function collectLineHits(source, pattern) {
  return source
    .split(/\r?\n/)
    .map((line, index) => ({ lineNumber: index + 1, line }))
    .filter(({ line }) => pattern.test(line))
    .map(({ lineNumber, line }) => ({
      lineNumber,
      line: line.trim(),
    }));
}

function buildSidebarCollapsibleRemediation(appSource) {
  const sidebarRootPattern = /<Sidebar\b(?![^>]*\bcollapsible(?:=|\s|>))([^>]*)>/s;
  const match = appSource.match(sidebarRootPattern);

  if (!match) {
    return null;
  }

  const originalTag = match[0];
  const patchedTag = originalTag.replace('<Sidebar', '<Sidebar collapsible');
  const patchedSource = appSource.replace(sidebarRootPattern, patchedTag);

  return {
    originalTag,
    patchedTag,
    patchedSource,
    patch: [
      '--- a/src/App.tsx',
      '+++ b/src/App.tsx',
      '@@',
      `-${originalTag}`,
      `+${patchedTag}`,
    ].join('\n'),
  };
}

function findSidebarRootTag(appSource) {
  const sidebarRootMatch = appSource.match(/<Sidebar\b[^>]*>/s);
  return sidebarRootMatch?.[0] ?? null;
}

function detectSidebarWidthOverrideRisk(sidebarRootTag) {
  if (!sidebarRootTag) {
    return null;
  }

  const rootClassNameMatch = sidebarRootTag.match(/rootClassName\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*"([^"]*)"\s*\})/s);
  const rootClassValue = rootClassNameMatch?.[1] ?? rootClassNameMatch?.[2] ?? rootClassNameMatch?.[3] ?? '';

  if (!rootClassValue) {
    return null;
  }

  const riskyWidthClassPattern = /(^|\s)(?:!?(?:w|min-w|max-w)-\[[^\]]+\]|!?w-(?:full|screen|\d+\/\d+|\d+)|!?min-w-(?:\[[^\]]+\]|\d+)|!?max-w-(?:\[[^\]]+\]|\d+))(?:\s|$)/;
  if (!riskyWidthClassPattern.test(rootClassValue)) {
    return null;
  }

  return {
    rootClassValue,
    riskyClasses: rootClassValue
      .split(/\s+/)
      .filter((token) => token && riskyWidthClassPattern.test(` ${token} `)),
  };
}

async function auditDemoSource() {
  const appPath = path.join(demoDir, 'src', 'App.tsx');
  const mainPath = path.join(demoDir, 'src', 'main.tsx');
  const warnings = [];
  const remediationArtifacts = [];

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

  const styleImportPresent = /import\s+['"]react-magic-ui\/style\.css['"]\s*;?/m.test(combinedSource);
  if (!styleImportPresent) {
    warnings.push({
      type: 'missing-style-import',
      severity: 'warning',
      message: 'Demo app does not explicitly import react-magic-ui/style.css from src/main.tsx or src/App.tsx.',
      remediation: 'Add `import "react-magic-ui/style.css"` to the demo entrypoint so the packaged library CSS contract matches real consumer usage.',
      filesChecked: [mainPath, appPath],
    });
  }

  const sidebarRootTag = findSidebarRootTag(appSource);
  const sidebarWidthOverrideRisk = detectSidebarWidthOverrideRisk(sidebarRootTag);
  if (sidebarWidthOverrideRisk) {
    warnings.push({
      type: 'sidebar-root-width-override',
      severity: 'warning',
      message: 'Demo Sidebar rootClassName includes width utility classes that can override the component\'s collapsible width contract.',
      remediation: 'Avoid fixed/forced width utilities on `<Sidebar rootClassName={...}>` when using `collapsible`; prefer non-width styling hooks and let the component own its expanded/collapsed width.',
      filesChecked: [appPath],
      hits: {
        sidebarRoots: collectLineHits(appSource, /<Sidebar\b/),
      },
      context: {
        rootClassName: sidebarWidthOverrideRisk.rootClassValue,
        riskyClasses: sidebarWidthOverrideRisk.riskyClasses,
      },
    });
  }

  const internalPackagePathMatches = combinedSource.match(/react-magic-ui\/dist\//g) ?? [];
  if (internalPackagePathMatches.length > 0) {
    warnings.push({
      type: 'internal-package-path-import',
      severity: 'warning',
      message: 'Demo source still references an internal react-magic-ui/dist/* path instead of the public package contract.',
      remediation: 'Replace internal `react-magic-ui/dist/*` imports with the public package entrypoints (`react-magic-ui` and `react-magic-ui/style.css`).',
      filesChecked: [mainPath, appPath],
      hits: [
        ...collectLineHits(mainSource, /react-magic-ui\/dist\//),
        ...collectLineHits(appSource, /react-magic-ui\/dist\//),
      ],
    });
  }

  const toastHookImported = /\buseToast\b/.test(combinedSource);
  const toastProviderRendered = /<ToastProvider\b/.test(appSource);
  if (toastHookImported && !toastProviderRendered) {
    warnings.push({
      type: 'toast-hook-without-provider',
      severity: 'warning',
      message: 'Demo source uses `useToast` but does not render a surrounding <ToastProvider>, so toast interactions will fail at runtime by contract.',
      remediation: 'Wrap the relevant demo tree in `<ToastProvider>` when using `useToast`, or remove the hook usage from the sibling demo.',
      filesChecked: [mainPath, appPath],
      hits: {
        toastHook: [
          ...collectLineHits(mainSource, /\buseToast\b/),
          ...collectLineHits(appSource, /\buseToast\b/),
        ],
        toastProvider: collectLineHits(appSource, /<ToastProvider\b/),
      },
    });
  }

  const sidebarToggleUsed = /<Sidebar\.Toggle\b/.test(appSource);
  const sidebarMarkedCollapsible = /<Sidebar\b[^>]*\bcollapsible(?:=|\s|>)/s.test(appSource);
  const sidebarToggleRequiresCollapsibleFix = sidebarToggleUsed && !sidebarMarkedCollapsible;

  if (sidebarToggleRequiresCollapsibleFix) {
    const sidebarRemediation = buildSidebarCollapsibleRemediation(appSource);

    if (sidebarRemediation) {
      remediationArtifacts.push({
        type: 'sidebar-collapsible-patch',
        targetFile: appPath,
        patchFile: 'demo-remediation-sidebar-collapsible.patch',
        previewFile: 'demo-remediation-sidebar-collapsible.preview.txt',
      });
    }

    warnings.push({
      type: 'sidebar-toggle-without-collapsible',
      severity: 'warning',
      message: 'Demo renders <Sidebar.Toggle /> but the surrounding <Sidebar> is not marked collapsible, so the toggle will render null by contract.',
      remediation: 'Mark the surrounding `<Sidebar>` as `collapsible` (or remove `<Sidebar.Toggle />`) in the sibling demo before expecting collapse behavior in packaged-demo browser smoke.',
      filesChecked: [appPath],
      remediationArtifacts: sidebarRemediation
        ? {
            patchFile: 'demo-remediation-sidebar-collapsible.patch',
            previewFile: 'demo-remediation-sidebar-collapsible.preview.txt',
          }
        : undefined,
      hits: {
        toggle: collectLineHits(appSource, /<Sidebar\.Toggle\b/),
        sidebarRoots: collectLineHits(appSource, /<Sidebar\b/),
      },
    });

    if (sidebarRemediation) {
      await fs.writeFile(path.join(outDir, 'demo-remediation-sidebar-collapsible.patch'), `${sidebarRemediation.patch}\n`);
      await fs.writeFile(
        path.join(outDir, 'demo-remediation-sidebar-collapsible.preview.txt'),
        [
          '# target',
          appPath,
          '',
          '# current',
          sidebarRemediation.originalTag,
          '',
          '# suggested',
          sidebarRemediation.patchedTag,
          '',
          '# note',
          'Apply this in the sibling demo to clear the sidebar-toggle-without-collapsible warning and let packaged demo browser smoke assert collapse behavior end-to-end.',
        ].join('\n')
      );
    }
  }

  return {
    filesChecked: [mainPath, appPath],
    checklist: {
      styleImportPresent,
      internalPackagePathsDetected: internalPackagePathMatches.length > 0,
      toastHookImported,
      toastProviderRendered,
      sidebarTogglePresent: sidebarToggleUsed,
      sidebarCollapsibleEnabled: sidebarMarkedCollapsible,
      sidebarRootWidthOverrideDetected: Boolean(sidebarWidthOverrideRisk),
      sidebarToggleRequiresCollapsibleFix,
    },
    remediationArtifacts,
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
    remediationArtifacts: [],
    checklist: {
      styleImportPresent: false,
      internalPackagePathsDetected: false,
      toastHookImported: false,
      toastProviderRendered: false,
      sidebarRootWidthOverrideDetected: false,
      sidebarToggleRequiresCollapsibleFix: false,
      packedLibraryBuildPassed: false,
      packedLibraryInstallPassed: false,
      demoBuildAgainstPackedLibraryPassed: false,
    },
    steps: [],
    warnings: [],
    contractStatus: {
      overall: 'pending',
      warningCount: 0,
      warningTypes: [],
      failedStepCount: 0,
      allStepsPassed: false,
    },
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
  summary.remediationArtifacts = sourceAudit.remediationArtifacts;
  summary.checklist = {
    ...summary.checklist,
    ...sourceAudit.checklist,
  };
  await fs.writeFile(path.join(outDir, 'demo-source-audit.json'), JSON.stringify(sourceAudit, null, 2));

  const buildLibraryResult = await logStep('build library before packing', () =>
    run('npm', ['run', 'build'], { cwd: repoRoot })
  );
  summary.checklist.packedLibraryBuildPassed = true;
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
  summary.checklist.packedLibraryInstallPassed = true;
  await fs.writeFile(path.join(outDir, 'demo-install.stdout.txt'), installResult.stdout);
  await fs.writeFile(path.join(outDir, 'demo-install.stderr.txt'), installResult.stderr);

  const buildResult = await logStep('build demo app against packed library', () =>
    run('npm', ['run', 'build'], { cwd: demoDir })
  );
  summary.checklist.demoBuildAgainstPackedLibraryPassed = true;
  await fs.writeFile(path.join(outDir, 'demo-build.stdout.txt'), buildResult.stdout);
  await fs.writeFile(path.join(outDir, 'demo-build.stderr.txt'), buildResult.stderr);

  summary.tarballName = tarballName;
  summary.tarballPath = tarballPath;
  summary.packTempDir = packTempDir;
  summary.contractStatus = {
    overall: summary.warnings.length > 0 ? 'passed-with-warnings' : 'passed',
    warningCount: summary.warnings.length,
    warningTypes: summary.warnings.map((warning) => warning.type),
    failedStepCount: summary.steps.filter((step) => step.status === 'failed').length,
    allStepsPassed: summary.steps.every((step) => step.status === 'passed'),
  };

  await fs.writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));

  if (summary.warnings.length > 0) {
    console.warn(`demo consumer source audit emitted ${summary.warnings.length} warning(s)`);
    for (const warning of summary.warnings) {
      console.warn(`- [${warning.type}] ${warning.message}`);
      if (warning.remediation) {
        console.warn(`  fix: ${warning.remediation}`);
      }
    }
  }
}

await main();
