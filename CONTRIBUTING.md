# Contributing

Thanks for helping improve react-magic-ui.

## Project shape

Components live in `src/components` and are exported through `src/components/index.ts` and `src/index.ts`.

Typical component layout:

```text
src/components/
  └── component-name/
      ├── <Component>.tsx
      └── index.ts
```

Storybook docs are colocated under per-component `__docs__` folders when present:

```text
src/components/<component>/__docs__/
  ├── <Component>.mdx
  └── <Component>.stories.tsx
```

Tests live alongside components in `src/components/<component>/__test__/**`.

## Quality expectations

For behavior-heavy or accessibility-sensitive components (for example `Modal`, `Select`, `Tabs`, `Slider`, `Toast`, `Checkbox`, `Switch`, `Sidebar`), preserve and extend the current keyboard, focus, and ARIA contract rather than treating them as visual-only wrappers.

If behavior changes, update the colocated regression tests too.

Coverage gaps and audit notes are tracked in `worklog/AUDIT_TESTS.md`.

## Local development

### Clone the repository

```bash
git clone https://github.com/tweeedlex/react-magic-ui.git
cd react-magic-ui
```

### Install dependencies

```bash
npm install
```

### Common commands

```bash
# Run Storybook locally
npm run storybook

# Run tests once
npm test

# Run tests in watch mode
npm run test-watch

# Lint files without rewriting them
npm run lint

# Apply ESLint auto-fixes explicitly when desired
npm run lint:fix

# Build the library
npm run build

# Build static Storybook output
npm run build-storybook
```

For the shorter day-to-day workflow, see `worklog/DEV_FLOW.md`.

## Consumer-facing package rules

Please keep the package contract consistent unless you are intentionally changing it:

- Consumer apps should import the packaged stylesheet explicitly:
  `import 'react-magic-ui/style.css'`
- The library ships compiled CSS already, so consumers should not need Tailwind content-scanning just to get default styling.
- The published stylesheet should not fetch remote web fonts implicitly.
- The published stylesheet should not set a package-wide global `font-family` across the consumer app.
- Components should inherit app typography by default.

If you want the original `Nunito` look in docs/demo or a consuming app, load it there explicitly and/or override `--rmui-font-family` after the stylesheet import.

## Browser support note

> Safari and Firefox only partially support the effect today. The displacement layer is not fully visible there.
>
> Cross-browser improvements are welcome.

## Commit convention

Before opening a pull request, keep commit messages in Conventional Commits style:

<https://www.conventionalcommits.org/>

Examples:

- `feat: add Dropdown component`
- `fix: resolve Button hover effect in Safari`
- `docs: update Card component examples`

## New component requests

If you want a new component, open a GitHub discussion first.

## Testing

Tests are written with [Vitest](https://vitest.dev).

```bash
npm test
```

Please make sure tests pass before submitting a pull request. If you add behavior, add tests with it.
