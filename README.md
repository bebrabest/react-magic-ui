# react-magic-ui
[![npm version](https://img.shields.io/npm/v/react-magic-ui.svg)](https://www.npmjs.com/package/react-magic-ui)
[![npm downloads](https://img.shields.io/npm/dm/react-magic-ui.svg)](https://www.npmjs.com/package/react-magic-ui)
[![license](https://img.shields.io/npm/l/react-magic-ui.svg)](https://github.com/tweeedlex/react-magic-ui/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/tweeedlex/react-magic-ui.svg)](https://github.com/tweeedlex/react-magic-ui/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/tweeedlex/react-magic-ui.svg)](https://github.com/tweeedlex/react-magic-ui/issues)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/tweeedlex/react-magic-ui/blob/main/CONTRIBUTING.md)

A React component library for creating stunning liquid glass effect UI components.

![Screenshot](https://raw.githubusercontent.com/tweeedlex/react-magic-ui/main/public/assets/demo.png)

### [🚀 Live demo](https://react-magic-ui-demo.netlify.app/)
Here you can mess with the components. Enjoy!

## Installation

1. Install the library and its React peer dependencies:
```bash
npm install react react-dom react-magic-ui
```

2. Import the library stylesheet once in your app entry (for example `main.tsx`, `index.tsx`, or `App.tsx`):

```ts
import 'react-magic-ui/style.css'
```

That stylesheet import is part of the package contract right now. Without it, components render but won't pick up the liquid-glass styling.

`react` and `react-dom` are peer dependencies. Most React apps already have them installed, but if you're wiring this into a fresh project, install them explicitly.

The package no longer auto-loads Google Fonts, and it no longer forces a global `font-family` on your whole app. Components now inherit your app typography by default. If you want the original look, load `Nunito` yourself in your app shell and/or override `--rmui-font-family` after importing `react-magic-ui/style.css`.

## Documentation

### [📚 Live Component Examples in Storybook](https://react-magic-ui-docs.netlify.app/)

Explore all components with interactive examples, props documentation, and live code previews in our Storybook.

## Usage

Import the components you need:

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

## Available Components

- **Button** - Customizable button with liquid glass effect
- **Card** - Container with glassmorphism styling
- **Input** - Styled input field
- **Switch** - Toggle switch component
- **Toast** - Notification toast messages
- **Modal** - Modal dialog component
- **Tabs** - Tabbed interface component
- **Badge** - Label and badge component
- **Sidebar** - Navigation sidebar
- **Topbar** - Top navigation bar
- **Checkbox** - Checkbox component
- **Select** - Select component
- **Slider** - Slider component
- **Glass** - Base glass effect wrapper (used for creating custom components)

## Features

- 📱 14 components for your basic needs
- 🎨 Beautiful liquid glass effect
- 🌈 Liquid-like glassmorphism animations
- 🔧 Customizable with props
- 📦 Create your own custom components with Glass component

>  ⚠️ NOTE: Safari and Firefox only partially support the effect (displacement will not be visible)

## Featured In
- 📰 [[Medium] JavaScript in Plain English](https://javascript.plainenglish.io/react-magic-ui-e4289a3a0e8b)

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

# Lint source files (currently runs with --fix)
npm run lint

# Build the library package
npm run build

# Build the static Storybook site
npm run build-storybook
```

For a short contributor workflow note, see [`worklog/DEV_FLOW.md`](./worklog/DEV_FLOW.md).

## Quality expectations

This library now has colocated Vitest coverage for all exported components under `src/components/<component>/__test__/**`.

If you change an interactive component, treat keyboard behavior, focus management, and ARIA semantics as part of the public contract — not just the visuals. In practice that means updating tests when behavior changes, especially for components like `Modal`, `Select`, `Tabs`, `Slider`, `Toast`, `Checkbox`, `Switch`, and navigation shells.

## Contributing
Please read the [contributing guide](/CONTRIBUTING.md).


## License

MIT © [@tweeedlex](https://github.com/tweeedlex)