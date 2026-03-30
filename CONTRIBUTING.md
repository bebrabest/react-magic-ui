# Contributing

Thanks for your interest in contributing to react-magic-ui!

## Structure

Components live in `src/components` and are exported through `src/components/index.ts` and `src/index.ts`.

Typical component layout today:

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

Tests now live alongside components in `src/components/<component>/__test__/**`.

For behavior-heavy or accessibility-sensitive components (for example modal, select, tabs, slider, toast, checkbox, switch, sidebar), contributors should preserve and extend the current keyboard/ARIA contract rather than treating them as visual-only wrappers. When changing those components, add or update regression tests in the colocated `__test__` folder.

Coverage gaps and audit notes are tracked in `worklog/AUDIT_TESTS.md`.

## Development
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

# Lint files (currently auto-fixes)
npm run lint

# Build the library
npm run build

# Build static Storybook output
npm run build-storybook
```

For a concise day-to-day workflow note, see `worklog/DEV_FLOW.md`.

---

> ⚠️ NOTE 1: Safari and Firefox only partially support the effect (displacement will not be visible).
> The contributions to improve cross-browser compatibility are welcome.

> ⚠️ NOTE 2: Consumer apps should import the packaged stylesheet explicitly:
> `import 'react-magic-ui/style.css'`
>
> The library ships compiled CSS already, so consumers should not need to scan library internals with Tailwind just to get the default styling.

> ⚠️ NOTE 3: The published stylesheet does not fetch web fonts anymore and it should not set a package-wide `font-family` on the consumer app.
> Components should inherit the app's typography by default.
> If you want the original `Nunito` look, load that font in the consuming app (or docs/demo) and/or override `--rmui-font-family` after the stylesheet import.

## Commit Convention
Before you create a Pull Request, please check that your commit messages follow the Conventional Commits specification. This helps maintain a clear and consistent commit history.

https://www.conventionalcommits.org/

### Commit Examples
- `feat: add Dropdown component`
- `fix: resolve Button hover effect in Safari`
- `docs: update Card component examples`

## Requests for new components

If you have a request for a new component, please open a discussion on GitHub. We'll be happy to help you out.

## Testing

Tests are written using [Vitest](https://vitest.dev). You can run all the tests from the root of the repository.

```bash
npm run test
```

Please ensure that the tests are passing when submitting a pull request. If you're adding new features, please include tests.