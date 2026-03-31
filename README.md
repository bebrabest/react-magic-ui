# react-magic-ui
[![npm version](https://img.shields.io/npm/v/react-magic-ui.svg)](https://www.npmjs.com/package/react-magic-ui)
[![npm downloads](https://img.shields.io/npm/dm/react-magic-ui.svg)](https://www.npmjs.com/package/react-magic-ui)
[![license](https://img.shields.io/npm/l/react-magic-ui.svg)](https://github.com/tweeedlex/react-magic-ui/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/tweeedlex/react-magic-ui.svg)](https://github.com/tweeedlex/react-magic-ui/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/tweeedlex/react-magic-ui.svg)](https://github.com/tweeedlex/react-magic-ui/issues)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/tweeedlex/react-magic-ui/blob/main/CONTRIBUTING.md)

A React component library for building liquid-glass UI without making consumers reverse-engineer the styling contract.

![Screenshot](https://raw.githubusercontent.com/tweeedlex/react-magic-ui/main/public/assets/demo.png)

## Links

- [Live demo](https://react-magic-ui-demo.netlify.app/)
- [Storybook docs](https://react-magic-ui-docs.netlify.app/)
- [Contributing guide](./CONTRIBUTING.md)
- [Development flow notes](./worklog/DEV_FLOW.md)
- [Demo sync contract](./worklog/DEMO_SYNC_CONTRACT.md)

## Quick start

Install the package and its React peer dependencies:

```bash
npm install react react-dom react-magic-ui
```

Import the packaged stylesheet once in your app entry (`main.tsx`, `index.tsx`, `App.tsx`, etc.):

```ts
import 'react-magic-ui/style.css'
```

Then import the components you need:

```tsx
import 'react-magic-ui/style.css'
import { Button, Card } from 'react-magic-ui'

function App() {
  return (
    <section>
      <Button>Click me</Button>
      <Card>
        <h2>Beautiful Card</h2>
        <p>With liquid glass effect</p>
      </Card>
    </section>
  )
}
```

## Consumer contract

A few things are intentional now:

- `react` and `react-dom` are peer dependencies.
- `react-magic-ui/style.css` is an explicit part of the package contract.
- The package ships compiled CSS already; consumers should not need to scan library internals with Tailwind just to get default styling.
- The package no longer auto-loads Google Fonts.
- The package no longer forces a global `font-family` across the whole app.
- Components inherit app typography by default.

If you want the original `Nunito` look, load that font in your app shell and/or override `--rmui-font-family` after importing `react-magic-ui/style.css`.

## Components

The library currently exports 14 components:

- `Badge`
- `Button`
- `Card`
- `Checkbox`
- `Glass`
- `Input`
- `Modal`
- `Select`
- `Sidebar`
- `Slider`
- `Switch`
- `Tabs`
- `Toast`
- `Topbar`

Use Storybook for the most complete examples and props documentation.

## Quality bar

This repo now keeps colocated Vitest coverage for all exported components under `src/components/<component>/__test__/**`.

If you change an interactive component, treat keyboard behavior, focus management, and ARIA semantics as part of the public contract — not just the visuals. That matters especially for components like `Modal`, `Select`, `Tabs`, `Slider`, `Toast`, `Checkbox`, `Switch`, and navigation shells.

## Development

The repo uses **npm + Vite + Storybook + Vitest**.

```bash
# Install dependencies
npm install

# Run Storybook for component development
npm run storybook

# Run tests once
npm test

# Watch tests locally
npm run test-watch

# Lint source files without rewriting them
npm run lint

# Apply ESLint auto-fixes explicitly when you want mutations
npm run lint:fix

# Build the library package
npm run build

# Build the static Storybook site
npm run build-storybook

# Validate the real demo app against a packed local tarball
# (also emits source-audit warnings plus a machine-readable checklist + contractStatus in summary.json,
# with remediation + line-hit context when the audit can locate the mismatch; current checks cover stylesheet import,
# internal package-path usage, ToastProvider/useToast pairing, controlled Modal dismiss wiring plus modal accessible name/description checks,
# controlled form/component usage without matching handlers (`Input`, `Select`, `Slider`, `Checkbox`, `Switch`, `Tabs`),
# Tabs composition integrity (`Tabs.List`, unique trigger values, trigger/content value alignment, valid initial value/defaultValue),
# duplicate inline Select option values, missing inline Select option labels, Sidebar item-id integrity (unique itemIds + real matching section ids),
# collapsed-sidebar item accessible names, Sidebar.Toggle/collapsible pairing, and risky width overrides on collapsible sidebars)
npm run test:demo-consumer

# Validate the real demo app in a browser after installing the packed tarball
# (also carries the demo-consumer checklist + source-audit warnings/remediation artifacts into the browser-smoke summary/output,
# including an overall contract status plus skip/failure counts)
npm run test:demo-browser-smoke
```

For a shorter contributor workflow note, see [`worklog/DEV_FLOW.md`](./worklog/DEV_FLOW.md).
For the explicit sibling-demo rules/checklist, see [`worklog/DEMO_SYNC_CONTRACT.md`](./worklog/DEMO_SYNC_CONTRACT.md).

## Browser support note

> Safari and Firefox only partially support the full liquid effect. The displacement layer is currently limited there.

## Featured in

- [[Medium] JavaScript in Plain English](https://javascript.plainenglish.io/react-magic-ui-e4289a3a0e8b)

## License

MIT © [@tweeedlex](https://github.com/tweeedlex)
