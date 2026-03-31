# Development flow audit

## Current reality

The repo is an npm + Vite + Storybook + Vitest component library.

Primary commands from the root:

- `npm install` — install dependencies
- `npm run storybook` — run interactive component docs locally
- `npm run build` — build library output into `dist/`
- `npm test` — run Vitest once
- `npm run test-watch` — run Vitest in watch mode
- `npm run lint` — run ESLint in read-only mode
- `npm run lint:fix` — run ESLint with auto-fixes enabled
- `npm run build-storybook` — build static Storybook docs

## What was confusing before

- `CONTRIBUTING.md` still referenced `yarn`
- the documented component folder structure no longer matched the repo exactly
- there was no single concise note about which commands matter for day-to-day work
- `lint` used to mutate files unexpectedly because it ran with `--fix`; that is now split into read-only `lint` plus explicit `lint:fix`

## Normalized local workflow

1. `npm install`
2. `npm run storybook` for component work / visual verification
3. `npm test` for behavior checks
4. `npm run lint` before committing
5. `npm run lint:fix` only when you intentionally want ESLint to rewrite files
6. `npm run build` before release-sensitive changes
7. `npm run build-storybook` when docs/story rendering changes need a full static verification
8. `npm run test:demo-consumer` when package exports / CSS contract / consumer-facing integration changes need build-level validation against the real demo app; it also writes source-audit warnings plus a machine-readable checklist in `summary.json` for obvious contract mismatches in the sibling demo app, including remediation and line-hit context when detectable. current high-signal checks include stylesheet import, internal package-path usage, `useToast` vs `ToastProvider`, controlled `Modal open={...}` usage without a dismiss handler, modal accessible name/description integrity, controlled library component usage without the matching change handler (`Input`, `Select`, `Slider`, `Checkbox`, `Switch`, `Tabs`), plus Input/Checkbox/Switch/Button accessible-name coverage (`label`, `aria-label`, or `aria-labelledby` for Input/Checkbox/Switch; visible text children, `text`, `aria-label`, or `aria-labelledby` for Button), Tabs composition integrity (`Tabs.List`, unique trigger values, trigger/content value alignment, valid initial value/defaultValue), inline `Select` option integrity (unique values plus non-empty labels), Sidebar nav integrity (unique `Sidebar.Item itemId`s that actually point at real section/container ids, valid initial `activeItemId` alignment, inline click-target alignment, and usable item accessible names), collapsed-sidebar item accessible names, `Sidebar.Toggle` vs `collapsible`, and risky width overrides on collapsible sidebars
9. `npm run test:demo-browser-smoke` when you want a higher-confidence rendered consumer check against the real demo app after installing the packed tarball; it now also carries the nested demo-consumer checklist plus source-audit warnings/remediation artifacts into the browser-smoke summary/output so sibling-demo contract mismatches are visible in the higher-level flow

## Notes

- Storybook loads stories from `src/**/__docs__/*.stories.tsx` and `src/**/__docs__/*.mdx`
- library build is driven by `vite.config.ts` + `tsconfig.build.json`
- Tailwind config now resolves through the single `tailwind.config.ts`
- some components still do not have tests; see `worklog/AUDIT_TESTS.md`
- package consumption still has open Tailwind packaging questions; see phase 2 plan items

## Demo sync notes

- the sibling demo contract and review checklist now live in `worklog/DEMO_SYNC_CONTRACT.md`
- `test:demo-consumer` is the source of truth for build-level demo sync status and writes the machine-readable checklist plus a compact `contractStatus.overall` summary into `summary.json`; when possible it also emits concrete remediation artifacts for known sibling-demo mismatches
- `test:demo-browser-smoke` is the higher-confidence rendered consumer check and carries those warnings/remediation artifacts forward, along with skip/failure counts and its own `contractStatus.overall`

## Recommended follow-up cleanup

- now that `lint` and `lint:fix` are split, consider adding a dedicated CI/check script bundle if the repo later needs stricter release automation
- once phase 2 is done, document the exact consumer setup path in README + CONTRIBUTING
