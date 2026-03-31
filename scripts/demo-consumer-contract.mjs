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

function findComponentTags(source, componentName) {
  return [...source.matchAll(new RegExp(`<${componentName}(?!\\.)\\b[^>]*>`, 'g'))].map((match) => match[0]);
}

function hasProp(tag, propName) {
  return new RegExp(`\\b${propName}\\s*=`).test(tag);
}

function collectAttributeValues(source, pattern) {
  return [...source.matchAll(pattern)].map((match) => match[1]).filter(Boolean);
}

function unique(values) {
  return [...new Set(values)];
}

function auditTabsComposition(source, filePath) {
  const tabsRootTags = findComponentTags(source, 'Tabs');
  const tabsRootPresent = tabsRootTags.length > 0;
  if (!tabsRootPresent) {
    return {
      checklist: {
        tabsRootPresent: false,
        tabsListRendered: false,
        tabsTriggerValuesUnique: false,
        tabsTriggerContentPairsAligned: false,
        tabsInitialValueMatchesTrigger: false,
      },
      warnings: [],
    };
  }

  const triggerValues = collectAttributeValues(source, /<Tabs\.Trigger\b[^>]*\bvalue\s*=\s*["']([^"']+)["']/g);
  const contentValues = collectAttributeValues(source, /<Tabs\.Content\b[^>]*\bvalue\s*=\s*["']([^"']+)["']/g);
  const duplicateTriggerValues = triggerValues.filter((value, index) => triggerValues.indexOf(value) != index);
  const triggerOnlyValues = unique(triggerValues.filter((value) => !contentValues.includes(value)));
  const contentOnlyValues = unique(contentValues.filter((value) => !triggerValues.includes(value)));
  const tabsInitialValues = tabsRootTags
    .flatMap((tag) => [
      ...collectAttributeValues(tag, /\bvalue\s*=\s*["']([^"']+)["']/g),
      ...collectAttributeValues(tag, /\bdefaultValue\s*=\s*["']([^"']+)["']/g),
    ]);
  const tabsInitialValueMismatches = unique(tabsInitialValues.filter((value) => !triggerValues.includes(value)));
  const tabsListRendered = /<Tabs\.List\b/.test(source);
  const tabsTriggerValuesUnique = duplicateTriggerValues.length === 0;
  const tabsTriggerContentPairsAligned = triggerOnlyValues.length === 0 && contentOnlyValues.length === 0;
  const tabsInitialValueMatchesTrigger = tabsInitialValueMismatches.length === 0;
  const warnings = [];

  if (!tabsListRendered) {
    warnings.push({
      type: 'tabs-without-list',
      severity: 'warning',
      message:
        'Demo source renders `<Tabs>` without `<Tabs.List>`, which makes the composed tab navigation contract incomplete and harder to use/access as intended.',
      remediation:
        "Render a `<Tabs.List>` wrapper around the demo's `<Tabs.Trigger>` elements so the composed tabs structure matches the library contract.",
      filesChecked: [filePath],
      hits: {
        tabsRoots: collectLineHits(source, /<Tabs(?!\.)\b/),
        tabsLists: collectLineHits(source, /<Tabs\.List\b/),
      },
    });
  }

  if (!tabsTriggerValuesUnique) {
    warnings.push({
      type: 'tabs-duplicate-trigger-values',
      severity: 'warning',
      message:
        'Demo source renders duplicate `<Tabs.Trigger value="...">` values, which makes tab selection/state ambiguous by contract.',
      remediation:
        'Give each `<Tabs.Trigger>` in the sibling demo a unique `value` so selection and matching `<Tabs.Content>` panels stay unambiguous.',
      filesChecked: [filePath],
      hits: {
        triggers: collectLineHits(source, /<Tabs\.Trigger\b/),
      },
      context: {
        duplicateTriggerValues: unique(duplicateTriggerValues),
      },
    });
  }

  if (!tabsTriggerContentPairsAligned) {
    warnings.push({
      type: 'tabs-trigger-content-value-mismatch',
      severity: 'warning',
      message:
        'Demo source has `<Tabs.Trigger>` / `<Tabs.Content>` value mismatches, so some tabs will not reveal the intended panel (or some panels can never be selected) by contract.',
      remediation:
        "Keep the sibling demo's `<Tabs.Trigger value>` and `<Tabs.Content value>` sets aligned so every trigger has exactly one matching panel and vice versa.",
      filesChecked: [filePath],
      hits: {
        triggers: collectLineHits(source, /<Tabs\.Trigger\b/),
        contents: collectLineHits(source, /<Tabs\.Content\b/),
      },
      context: {
        triggerValues: unique(triggerValues),
        contentValues: unique(contentValues),
        triggerOnlyValues,
        contentOnlyValues,
      },
    });
  }

  if (!tabsInitialValueMatchesTrigger) {
    warnings.push({
      type: 'tabs-initial-value-mismatch',
      severity: 'warning',
      message:
        'Demo source gives `<Tabs>` a `value` or `defaultValue` that does not match any `<Tabs.Trigger value="...">`, so the example can boot into a state with no valid selected tab by contract.',
      remediation:
        'Keep each demo `<Tabs value>` / `<Tabs defaultValue>` aligned with a real `<Tabs.Trigger value>` so the initial selected tab exists in the composed tab set.',
      filesChecked: [filePath],
      hits: {
        tabsRoots: collectLineHits(source, /<Tabs(?!\.)\b/),
        triggers: collectLineHits(source, /<Tabs\.Trigger\b/),
      },
      context: {
        tabsInitialValues: unique(tabsInitialValues),
        triggerValues: unique(triggerValues),
        tabsInitialValueMismatches,
      },
    });
  }

  return {
    checklist: {
      tabsRootPresent: true,
      tabsListRendered,
      tabsTriggerValuesUnique,
      tabsTriggerContentPairsAligned,
      tabsInitialValueMatchesTrigger,
    },
    warnings,
  };
}

function extractInlineSelectOptions(selectTag) {
  const optionsMatch = selectTag.match(/\boptions\s*=\s*\{\s*\[([\s\S]*?)\]\s*\}/);
  if (!optionsMatch) {
    return [];
  }

  return [...optionsMatch[1].matchAll(/\bvalue\s*:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
}

function auditSelectOptionValues(source, filePath) {
  const selectTags = findComponentTags(source, 'Select');
  if (selectTags.length === 0) {
    return {
      checklist: {
        selectRootPresent: false,
        selectOptionValuesUnique: false,
      },
      warnings: [],
    };
  }

  const duplicateContexts = selectTags
    .map((tag, index) => {
      const optionValues = extractInlineSelectOptions(tag);
      const duplicateValues = optionValues.filter((value, valueIndex) => optionValues.indexOf(value) !== valueIndex);

      return {
        index,
        tag,
        optionValues,
        duplicateValues: unique(duplicateValues),
      };
    })
    .filter((entry) => entry.duplicateValues.length > 0);

  return {
    checklist: {
      selectRootPresent: true,
      selectOptionValuesUnique: duplicateContexts.length === 0,
    },
    warnings:
      duplicateContexts.length === 0
        ? []
        : [
            {
              type: 'select-duplicate-option-values',
              severity: 'warning',
              message:
                'Demo source renders a `<Select>` with duplicate option `value` entries, which makes controlled selection and label lookup ambiguous by contract.',
              remediation:
                'Keep each demo `<Select options={[...]}>` value unique so the selected value always maps to one clear option.',
              filesChecked: [filePath],
              hits: {
                selects: collectLineHits(source, /<Select\b/),
                optionValues: collectLineHits(source, /\bvalue\s*:\s*["'][^"']+["']/),
              },
              context: {
                duplicateSelects: duplicateContexts.map(({ index, duplicateValues, optionValues, tag }) => ({
                  selectIndex: index,
                  duplicateValues,
                  optionValues,
                  tag,
                })),
              },
            },
          ],
  };
}

function collectSidebarItemIds(source) {
  return [...source.matchAll(/<Sidebar\.Item\b[^>]*\bitemId\s*=\s*["']([^"']+)["']/g)].map((match) => match[1]);
}

function collectSectionIds(source) {
  return [
    ...source.matchAll(/<(?:section|div)\b[^>]*\bid\s*=\s*["']([^"']+)["']/g),
  ].map((match) => match[1]);
}

function auditSidebarNavigation(source, filePath) {
  const sidebarItemIds = collectSidebarItemIds(source);
  const sectionIds = unique(collectSectionIds(source));
  const duplicateSidebarItemIds = unique(
    sidebarItemIds.filter((itemId, index) => sidebarItemIds.indexOf(itemId) !== index)
  );
  const missingSectionTargets = unique(sidebarItemIds.filter((itemId) => !sectionIds.includes(itemId)));
  const sidebarItemIdsUnique = duplicateSidebarItemIds.length === 0;
  const sidebarItemTargetsExist = missingSectionTargets.length === 0;

  return {
    checklist: {
      sidebarItemIdsPresent: sidebarItemIds.length > 0,
      sidebarItemIdsUnique,
      sidebarItemTargetsExist,
    },
    warnings: [
      ...(!sidebarItemIdsUnique
        ? [
            {
              type: 'sidebar-duplicate-item-ids',
              severity: 'warning',
              message:
                'Demo source renders duplicate `<Sidebar.Item itemId="...">` values, which makes active-state tracking and scroll targeting ambiguous by contract.',
              remediation:
                'Give each sibling demo `<Sidebar.Item>` a unique `itemId` so active navigation state and scroll targeting stay unambiguous.',
              filesChecked: [filePath],
              hits: {
                sidebarItems: collectLineHits(source, /<Sidebar\.Item\b/),
              },
              context: {
                duplicateSidebarItemIds,
                sidebarItemIds,
              },
            },
          ]
        : []),
      ...(!sidebarItemTargetsExist
        ? [
            {
              type: 'sidebar-item-target-missing',
              severity: 'warning',
              message:
                'Demo source renders one or more `<Sidebar.Item itemId="...">` values that do not match any demo section/container `id`, so navigation clicks can silently point at nothing by contract.',
              remediation:
                'Keep sibling demo `<Sidebar.Item itemId>` values aligned with real section/container `id` attributes so sidebar navigation scrolls to actual content.',
              filesChecked: [filePath],
              hits: {
                sidebarItems: collectLineHits(source, /<Sidebar\.Item\b/),
                sections: collectLineHits(source, /<(?:section|div)\b[^>]*\bid\s*=/),
              },
              context: {
                missingSectionTargets,
                sidebarItemIds,
                sectionIds,
              },
            },
          ]
        : []),
    ],
  };
}

function auditControlledComponentUsage({
  source,
  componentName,
  valueProp,
  handlerProps,
  warningType,
  message,
  remediation,
  filePath,
}) {
  const componentTags = findComponentTags(source, componentName);
  const offendingTags = componentTags.filter(
    (tag) => hasProp(tag, valueProp) && !handlerProps.some((handlerProp) => hasProp(tag, handlerProp))
  );

  if (offendingTags.length === 0) {
    return null;
  }

  return {
    warning: {
      type: warningType,
      severity: 'warning',
      message,
      remediation,
      filesChecked: [filePath],
      hits: {
        component: collectLineHits(source, new RegExp(`<${componentName}(?!\\.)\\b`)),
        valueProp: collectLineHits(source, new RegExp(`\\b${valueProp}\\s*=`)),
        handlerProps: handlerProps.flatMap((handlerProp) =>
          collectLineHits(source, new RegExp(`\\b${handlerProp}\\s*=`))
        ),
      },
      context: {
        componentName,
        valueProp,
        handlerProps,
        offendingTags,
      },
    },
    checklist: {
      [`${componentName.charAt(0).toLowerCase()}${componentName.slice(1)}ControlledUsage`]: true,
      [`${componentName.charAt(0).toLowerCase()}${componentName.slice(1)}HandlerProvided`]: false,
    },
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

  const controlledModalUsage = /<Modal\b[^>]*\bopen\s*=/.test(appSource);
  const modalDismissHandlerProvided = /<Modal\b[^>]*\b(?:onOpenChange|onClose)\s*=/.test(appSource);
  if (controlledModalUsage && !modalDismissHandlerProvided) {
    warnings.push({
      type: 'controlled-modal-without-dismiss-handler',
      severity: 'warning',
      message: 'Demo source renders a controlled `<Modal open={...}>` without `onOpenChange` or `onClose`, so overlay/escape/close-button interactions cannot drive state back down by contract.',
      remediation: 'When the sibling demo controls `<Modal open={...}>`, also pass `onOpenChange` (preferred) or `onClose` so dismiss interactions can actually close the dialog.',
      filesChecked: [appPath],
      hits: {
        modal: collectLineHits(appSource, /<Modal\b/),
        onOpenChange: collectLineHits(appSource, /\bonOpenChange\s*=/),
        onClose: collectLineHits(appSource, /\bonClose\s*=/),
      },
    });
  }

  const tabsCompositionAudit = auditTabsComposition(appSource, appPath);
  warnings.push(...tabsCompositionAudit.warnings);

  const selectOptionAudit = auditSelectOptionValues(appSource, appPath);
  warnings.push(...selectOptionAudit.warnings);

  const sidebarNavigationAudit = auditSidebarNavigation(appSource, appPath);
  warnings.push(...sidebarNavigationAudit.warnings);

  const controlledComponentAudits = [
    auditControlledComponentUsage({
      source: appSource,
      componentName: 'Input',
      valueProp: 'value',
      handlerProps: ['onChange'],
      warningType: 'controlled-input-without-onchange',
      message: 'Demo source renders a controlled `<Input value={...}>` without `onChange`, so the field becomes read-only by accident and stops behaving like a real consumer input.',
      remediation: 'When the sibling demo passes `value` to `<Input>`, also pass `onChange` (or remove `value` to keep it uncontrolled).',
      filePath: appPath,
    }),
    auditControlledComponentUsage({
      source: appSource,
      componentName: 'Select',
      valueProp: 'value',
      handlerProps: ['onChange'],
      warningType: 'controlled-select-without-onchange',
      message: 'Demo source renders a controlled `<Select value={...}>` without `onChange`, so the selected option cannot actually update through the component contract.',
      remediation: 'When the sibling demo passes `value` to `<Select>`, also pass `onChange` (or remove `value` to keep it uncontrolled).',
      filePath: appPath,
    }),
    auditControlledComponentUsage({
      source: appSource,
      componentName: 'Slider',
      valueProp: 'value',
      handlerProps: ['onChange'],
      warningType: 'controlled-slider-without-onchange',
      message: 'Demo source renders a controlled `<Slider value={...}>` without `onChange`, so keyboard/drag interactions cannot persist the next value through the component contract.',
      remediation: 'When the sibling demo passes `value` to `<Slider>`, also pass `onChange` (or remove `value` to keep it uncontrolled).',
      filePath: appPath,
    }),
    auditControlledComponentUsage({
      source: appSource,
      componentName: 'Checkbox',
      valueProp: 'checked',
      handlerProps: ['onChange'],
      warningType: 'controlled-checkbox-without-onchange',
      message: 'Demo source renders a controlled `<Checkbox checked={...}>` without `onChange`, so user toggles cannot update the checked state through the component contract.',
      remediation: 'When the sibling demo passes `checked` to `<Checkbox>`, also pass `onChange` (or remove `checked` to keep it uncontrolled).',
      filePath: appPath,
    }),
    auditControlledComponentUsage({
      source: appSource,
      componentName: 'Switch',
      valueProp: 'isActive',
      handlerProps: ['setIsActive'],
      warningType: 'controlled-switch-without-setisactive',
      message: 'Demo source renders a controlled `<Switch isActive={...}>` without `setIsActive`, so user toggles cannot update the switch state through the component contract.',
      remediation: 'When the sibling demo passes `isActive` to `<Switch>`, also pass `setIsActive` (or remove `isActive` to keep it uncontrolled).',
      filePath: appPath,
    }),
    auditControlledComponentUsage({
      source: appSource,
      componentName: 'Tabs',
      valueProp: 'value',
      handlerProps: ['onValueChange'],
      warningType: 'controlled-tabs-without-onvaluechange',
      message: 'Demo source renders controlled `<Tabs value={...}>` without `onValueChange`, so tab selection cannot flow back up through the component contract.',
      remediation: 'When the sibling demo passes `value` to `<Tabs>`, also pass `onValueChange` (or use `defaultValue` for uncontrolled tabs).',
      filePath: appPath,
    }),
  ].filter(Boolean);

  for (const controlledAudit of controlledComponentAudits) {
    warnings.push(controlledAudit.warning);
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
      controlledModalUsage,
      modalDismissHandlerProvided,
      inputControlledUsage: /<Input\b[^>]*\bvalue\s*=/.test(appSource),
      inputHandlerProvided: !controlledComponentAudits.some((audit) => audit.warning.type === 'controlled-input-without-onchange'),
      selectControlledUsage: /<Select\b[^>]*\bvalue\s*=/.test(appSource),
      selectHandlerProvided: !controlledComponentAudits.some((audit) => audit.warning.type === 'controlled-select-without-onchange'),
      sliderControlledUsage: /<Slider\b[^>]*\bvalue\s*=/.test(appSource),
      sliderHandlerProvided: !controlledComponentAudits.some((audit) => audit.warning.type === 'controlled-slider-without-onchange'),
      checkboxControlledUsage: /<Checkbox\b[^>]*\bchecked\s*=/.test(appSource),
      checkboxHandlerProvided: !controlledComponentAudits.some((audit) => audit.warning.type === 'controlled-checkbox-without-onchange'),
      switchControlledUsage: /<Switch\b[^>]*\bisActive\s*=/.test(appSource),
      switchHandlerProvided: !controlledComponentAudits.some((audit) => audit.warning.type === 'controlled-switch-without-setisactive'),
      tabsControlledUsage: /<Tabs\b[^>]*\bvalue\s*=/.test(appSource),
      tabsHandlerProvided: !controlledComponentAudits.some((audit) => audit.warning.type === 'controlled-tabs-without-onvaluechange'),
      tabsRootPresent: tabsCompositionAudit.checklist.tabsRootPresent,
      tabsListRendered: tabsCompositionAudit.checklist.tabsListRendered,
      tabsTriggerValuesUnique: tabsCompositionAudit.checklist.tabsTriggerValuesUnique,
      tabsTriggerContentPairsAligned: tabsCompositionAudit.checklist.tabsTriggerContentPairsAligned,
      tabsInitialValueMatchesTrigger: tabsCompositionAudit.checklist.tabsInitialValueMatchesTrigger,
      selectRootPresent: selectOptionAudit.checklist.selectRootPresent,
      selectOptionValuesUnique: selectOptionAudit.checklist.selectOptionValuesUnique,
      sidebarItemIdsPresent: sidebarNavigationAudit.checklist.sidebarItemIdsPresent,
      sidebarItemIdsUnique: sidebarNavigationAudit.checklist.sidebarItemIdsUnique,
      sidebarItemTargetsExist: sidebarNavigationAudit.checklist.sidebarItemTargetsExist,
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
      controlledModalUsage: false,
      modalDismissHandlerProvided: false,
      inputControlledUsage: false,
      inputHandlerProvided: false,
      selectControlledUsage: false,
      selectHandlerProvided: false,
      sliderControlledUsage: false,
      sliderHandlerProvided: false,
      checkboxControlledUsage: false,
      checkboxHandlerProvided: false,
      switchControlledUsage: false,
      switchHandlerProvided: false,
      tabsControlledUsage: false,
      tabsHandlerProvided: false,
      tabsRootPresent: false,
      tabsListRendered: false,
      tabsTriggerValuesUnique: false,
      tabsTriggerContentPairsAligned: false,
      tabsInitialValueMatchesTrigger: false,
      selectRootPresent: false,
      selectOptionValuesUnique: false,
      sidebarItemIdsPresent: false,
      sidebarItemIdsUnique: false,
      sidebarItemTargetsExist: false,
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
