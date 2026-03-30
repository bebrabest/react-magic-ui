# packaging decision - hybrid compiled-css contract

date: 2026-03-30
branch: `dev/rmui-next`
phase: 2 - packaging decision

## summary

recommend **option c - hybrid**:

- keep shipping a compiled default stylesheet with the package
- treat that stylesheet as part of the public install contract
- move behavior-heavy components toward primitive-grade interaction foundations over time
- expose a small set of css variables / styling hooks for customization
- **do not require consumer Tailwind content-scanning hacks** just to make the library render correctly

this keeps the library's main value prop intact - it should look good out of the box - while still leaving room for sane customization later

## options evaluated

### option a - compiled css only

**shape**

- build all component styles into one distributable css file
- consumer imports that css file once
- components rely on shipped classnames/modules rather than consumer Tailwind generation

**pros**

- easiest install story
- strongest visual consistency
- no consumer Tailwind config surprises
- easiest path to keeping the current brand/look stable

**cons**

- weaker customization story unless variables/hooks are added deliberately
- can feel monolithic if consumers want only part of the visual system
- if the css import contract is unclear, users think the package is broken

**verdict**

good baseline, but too rigid alone unless paired with customization hooks

### option b - headless primitives + optional theme package

**shape**

- ship mostly unstyled behavior primitives
- put the liquid-glass theme into a separate package or optional layer

**pros**

- more flexible for advanced consumers
- closer to modern headless ecosystem patterns
- easier theming/composition story long-term

**cons**

- weakens the main product promise - the "magic" is no longer out of the box
- much bigger migration cost
- docs and support burden go up fast
- not aligned with current project expectations or user value

**verdict**

not the right move for the next version. maybe interesting much later if the project intentionally becomes a styling system instead of a batteries-included component library

### option c - hybrid

**shape**

- accessible/headless-ish behavior foundations where they matter
- bundled compiled css for default visuals
- css variables and a few documented hooks for practical customization
- consumer imports one official stylesheet, with optional deeper overrides

**pros**

- best balance of install simplicity and customization
- preserves the visual identity
- avoids Tailwind scanning/documentation pain
- lines up with the broader architecture direction already chosen

**cons**

- requires discipline so the styling API stays small and coherent
- still needs a clear consumer contract and packaging polish

**verdict**

**recommended**

## why this recommendation fits the repo's current reality

from the repro:

- the package already ships compiled css successfully
- consumers only break visually when they miss the css import
- this means the actual problem is packaging/docs/contract clarity, not a fundamental inability to ship styles

so the smartest next-version move is not "make every consumer configure Tailwind correctly"
it is:

1. keep compiled css as the default path
2. make the css contract obvious and harder to misuse
3. add a small customization surface so compiled css does not become a dead end

## recommended public contract

for the next version, the intended consumer setup should be:

```ts
import 'react-magic-ui/style.css'
import { Button, Card } from 'react-magic-ui'
```

notes:

- prefer exporting a friendly `./style.css` subpath instead of forcing `./dist/react-magic-ui.css`
- keep the stylesheet explicit for now rather than auto-importing it from the js entry
- document this in README, storybook docs, and package examples everywhere

## why not auto-import css from the js entry right now

it is tempting, but i do **not** recommend making css side-effect imports from the library entry the primary contract yet

reasons:

- bundler behavior is mostly good now, but still less explicit/debuggable than a clear documented css import
- consumers often want control over stylesheet ordering
- explicit import makes SSR/framework troubleshooting easier
- it avoids surprising consumers who want headless-ish usage later

so the better near-term path is:

- explicit stylesheet contract
- cleaner export path
- package metadata that clearly marks css as a side effect

if future consumer testing shows auto-import is reliable across the target bundlers/frameworks, it can be reconsidered later as an ergonomic enhancement

## concrete implementation plan

### phase 2a - immediate packaging polish

1. add a friendly package export:
   - `"./style.css": "./dist/react-magic-ui.css"`
2. add `sideEffects` metadata including css files so bundlers do not get clever and strip them
3. rewrite install docs to use `react-magic-ui/style.css`
4. add a tiny consumer smoke example in README and/or docs that mirrors real usage

### phase 2b - customization surface

1. identify the smallest useful set of design tokens / css variables
   - glass blur
   - border opacity
   - highlight intensity
   - background tint
   - radius where applicable
   - semantic colors used by badges/toasts/buttons
2. expose them in the shipped stylesheet with safe defaults
3. document 3-5 realistic customization examples instead of inventing a huge theming system

### phase 2c - integration confidence

1. keep the minimal consumer app repro as a regression harness
2. test these scenarios against packed output:
   - js-only import -> should fail visibly by design, but docs must make contract obvious
   - js + `react-magic-ui/style.css` -> should work
   - overridden css variables -> should work
3. eventually wire the demo app to consume the built package the same way an external app would

## acceptance criteria for this direction

- a new consumer can install the package and get styled components in one obvious documented step
- no Tailwind content scanning of library internals is required
- customization exists, but stays deliberately small
- packaging behavior is verified in a real consumer environment, not just storybook

## recommendation in one line

**ship the look as compiled css, expose a clean `style.css` entry, add a small css-variable customization layer, and stop making consumers solve library-internal Tailwind problems**
