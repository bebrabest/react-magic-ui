# Development flow audit

## Current reality

The repo is an npm + Vite + Storybook + Vitest component library.

Primary commands from the root:

- `npm install` — install dependencies
- `npm run storybook` — run interactive component docs locally
- `npm run build` — build library output into `dist/`
- `npm test` — run Vitest once
- `npm run test-watch` — run Vitest in watch mode
- `npm run lint` — run ESLint with `--fix`
- `npm run build-storybook` — build static Storybook docs

## What was confusing before

- `CONTRIBUTING.md` still referenced `yarn`
- the documented component folder structure no longer matched the repo exactly
- there was no single concise note about which commands matter for day-to-day work
- `lint` is not a read-only check; it mutates files because it runs with `--fix`

## Normalized local workflow

1. `npm install`
2. `npm run storybook` for component work / visual verification
3. `npm test` for behavior checks
4. `npm run lint` before committing (note: may rewrite files)
5. `npm run build` before release-sensitive changes
6. `npm run build-storybook` when docs/story rendering changes need a full static verification
7. `npm run test:demo-consumer` when package exports / CSS contract / consumer-facing integration changes need build-level validation against the real demo app; it also writes source-audit warnings for obvious contract mismatches in the sibling demo app
8. `npm run test:demo-browser-smoke` when you want a higher-confidence rendered consumer check against the real demo app after installing the packed tarball

## Notes

- Storybook loads stories from `src/**/__docs__/*.stories.tsx` and `src/**/__docs__/*.mdx`
- library build is driven by `vite.config.ts` + `tsconfig.build.json`
- Tailwind config now resolves through the single `tailwind.config.ts`
- some components still do not have tests; see `worklog/AUDIT_TESTS.md`
- package consumption still has open Tailwind packaging questions; see phase 2 plan items

## Recommended follow-up cleanup

- split `lint` into a read-only `lint` and an explicit `lint:fix` to make CI/local expectations clearer
- mirror this workflow in the root README so contributors do not have to infer it from `package.json`
- once phase 2 is done, document the exact consumer setup path in README + CONTRIBUTING
