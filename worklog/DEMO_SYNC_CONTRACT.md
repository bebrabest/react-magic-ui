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

- `sidebar-toggle-without-collapsible`: the sibling demo renders `<Sidebar.Toggle />` without marking the surrounding `<Sidebar>` as `collapsible`, so the toggle cannot be asserted end-to-end yet

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
- `demo-source-audit.json`
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

- `summary.json` (includes inherited `demoConsumerChecklist`, `demoConsumerWarnings`, and a top-level `contractStatus` snapshot)
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
