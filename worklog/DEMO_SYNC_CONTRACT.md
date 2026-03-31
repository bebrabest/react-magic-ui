# Demo sync contract

The sibling demo app at `../../react-magic-ui-demo` is our closest real consumer.

This repo now treats demo sync as an explicit contract instead of an informal "remember to check the demo" note.

## What must stay in sync

### Package contract

- the demo should import `react-magic-ui/style.css` (not internal `dist/*` paths)
- the demo should consume the published package shape (`react-magic-ui` exports), not internal source files
- the demo should keep working when this repo is packed and installed as a tarball

### Runtime behavior

- the demo should still build after local pack/install validation
- high-signal consumer flows should still work in a browser after pack/install
- known sibling-demo mismatches should be surfaced as warnings, not hidden in local notes

### Current known mismatch

- none right now - the sidebar toggle/collapsible contract is fixed and browser smoke now asserts collapse behavior for real

### Source-audit checks that matter

The demo source audit is intentionally opinionated about a few high-signal consumer-contract mistakes:

- `missing-style-import` - the demo must import `react-magic-ui/style.css`
- `internal-package-path-import` - the demo must not depend on `react-magic-ui/dist/*` internals
- `toast-hook-without-provider` - if the demo uses `useToast`, it must actually render a surrounding `<ToastProvider>`
- `controlled-modal-without-dismiss-handler` - if the demo controls `<Modal open={...}>`, it must also pass `onOpenChange` or `onClose` so built-in dismiss interactions can actually close the dialog
- `modal-missing-accessible-name` / `modal-missing-accessible-description` - if the demo renders `<Modal>`, it should give it a real accessible name (`title`, `aria-label`, or `aria-labelledby`) and meaningful descriptive context (`description` or `aria-describedby`) so the dialog contract is not visually correct but semantically thin
- `controlled-input-without-onchange` / `controlled-select-without-onchange` / `controlled-slider-without-onchange` / `controlled-checkbox-without-onchange` / `controlled-switch-without-setisactive` / `controlled-tabs-without-onvaluechange` - if the demo passes the controlled value prop for these library components, it must also pass the matching change handler so the example does not silently become read-only or state-stuck
- `tabs-without-list` / `tabs-duplicate-trigger-values` / `tabs-trigger-content-value-mismatch` / `tabs-initial-value-mismatch` - if the demo uses composed `Tabs`, it should render a real `<Tabs.List>`, keep trigger values unique, keep `<Tabs.Trigger value>` / `<Tabs.Content value>` pairs aligned, and ensure `value` / `defaultValue` points at a real trigger so navigation and panel selection stay honest from first render
- `select-duplicate-option-values` / `select-option-missing-label` - if the demo defines inline `Select` options, each option should keep a unique `value` and a non-empty `label` so controlled selection and consumer-facing option text do not become ambiguous or blank
- `sidebar-duplicate-item-ids` / `sidebar-item-target-missing` - sidebar navigation should keep each `<Sidebar.Item itemId>` unique and aligned with a real demo section/container `id`, otherwise active-state tracking and scroll targeting can quietly drift into ambiguous or dead links
- `sidebar-collapsed-item-missing-accessible-name` - if the demo uses a collapsible `Sidebar`, each `Sidebar.Item` still needs a usable accessible name (`aria-label` or plain text children), otherwise the collapsed nav can degrade into unnamed icon buttons for screen readers
- `sidebar-toggle-without-collapsible` - if the demo renders `<Sidebar.Toggle />`, the surrounding `<Sidebar>` must actually be `collapsible`
- `sidebar-root-width-override` - a collapsible sidebar should not also force width via `rootClassName`, because width utilities can silently override the component's own expanded/collapsed contract

## Validation commands

### Build-level consumer validation

```bash
npm run test:demo-consumer
```

This command:

1. audits demo source for obvious contract mismatches
2. builds the library
3. packs a local tarball
4. installs that tarball into the sibling demo
5. builds the demo against the packed library
6. writes a machine-readable `summary.json`

Output folder:

- `worklog/demo-consumer/<timestamp>/`

Key artifacts:

- `summary.json`
- `demo-source-audit.json` - includes warning `type`, `message`, `remediation`, and line-hit context for contract mismatches when detectable
- `demo-remediation-sidebar-collapsible.patch` / `demo-remediation-sidebar-collapsible.preview.txt` - emitted when the known sidebar mismatch is detected, so the sibling demo has a ready-to-apply fix hint instead of only prose guidance
- `library-build.*.txt`
- `pack.*.txt`
- `demo-install.*.txt`
- `demo-build.*.txt`

### Browser-level consumer validation

```bash
npm run test:demo-browser-smoke
```

This command runs the build-level validation first, then starts the demo preview and verifies a small set of real browser flows.

Output folder:

- `worklog/demo-browser-smoke/<timestamp>/`

Key artifacts:

- `summary.json` (includes inherited `demoConsumerChecklist`, `demoConsumerWarnings`, `demoConsumerRemediationArtifacts`, and a top-level `contractStatus` snapshot with explicit `overall`, warning types, skip, and failure counts)
- `results.json`
- `final-state.png`
- `playwright-log.txt`
- `preview-log.txt`
- copied `demo-consumer-summary.json`

## Review checklist

When changing package exports, CSS contract, or behavior-heavy components, verify:

- [ ] demo source still imports `react-magic-ui/style.css`
- [ ] demo source does not rely on internal package paths
- [ ] `npm run test:demo-consumer` passes
- [ ] source-audit warnings are reviewed and either fixed or intentionally accepted
- [ ] `npm run test:demo-browser-smoke` passes for real rendered flows
- [ ] any new known mismatch is documented here and emitted by validation output

## Why this exists

Without a written contract, the sibling demo drifts quietly and repo-side validation becomes less honest.

The goal is simple: if the demo is our "real consumer" confidence layer, it should validate the same package shape and styling contract that external users get.
