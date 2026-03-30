# docs audit

date: 2026-03-30
scope: README, CONTRIBUTING, Storybook config, component docs presence

## quick summary

the repo has more docs than the root files suggest, but the docs story is messy:

- component-level Storybook docs do exist under `src/components/**/__docs__`
- the root docs do not explain the current packaging/styling constraints clearly enough
- `CONTRIBUTING.md` is materially out of sync with the actual repo structure and install flow
- docs lean a bit too marketing-heavy in README and too hand-wavy on browser/accessibility limitations
- there is no clear "consumer install contract" for how styles are expected to work in a real app

## what exists today

### root docs

- `README.md`
- `CONTRIBUTING.md`

### interactive docs

- Storybook config in `.storybook/main.ts` and `.storybook/preview.ts`
- per-component docs/stories under `src/components/**/__docs__`

### notable gap

- no dedicated architecture, install troubleshooting, or accessibility docs
- no demo-consumer workflow doc yet
- no migration/versioning notes for future breaking changes

## misleading or stale docs

### 1. CONTRIBUTING repo structure is stale

`CONTRIBUTING.md` describes every component as having:

- `__docs__/`
- `__test__/`
- `style/`
- component file
- `index.ts`

that is no longer consistently true.

examples:

- some components use `style/`, but `switch` uses `styles/`
- not every component has tests
- the root-level `find` output makes it clear the structure is inconsistent enough that the guide overpromises uniformity

impact:

- contributors will look for patterns that do not actually hold
- it makes maintenance feel less trustworthy than it is

recommended fix:

- rewrite structure section to describe the repo as it is, not as an idealized template
- explicitly call out that tests/docs/style folders vary today

### 2. CONTRIBUTING install command is outdated

the guide tells contributors to use `yarn`, while the repo currently includes `package-lock.json` and all current work has been using `npm`.

impact:

- mixed package-manager signals
- contributor confusion
- risk of lockfile churn

recommended fix:

- standardize on `npm install` unless the repo intentionally wants multi-manager support

### 3. CONTRIBUTING packaging guidance documents a known broken workaround

`CONTRIBUTING.md` says tailwind inline classes do not apply reliably and recommends using `@apply` until the issue is resolved.

problem:

- this is a known architecture/package problem, not a stable contributor guideline
- it is phrased as temporary, but there is no linked issue, roadmap note, or consumer-safe explanation

impact:

- contributors inherit workaround-driven architecture
- users still do not get a clear install/failure explanation

recommended fix:

- replace with a short note that packaging/styling behavior is under active redesign
- link to the packaging decision doc once phase 2 lands

### 4. README installation is too optimistic

README says:

```ts
import 'react-magic-ui/dist/react-magic-ui.css'
```

that is necessary, but not enough context for current reality.

missing details:

- whether the package works without consumer tailwind scanning hacks
- browser limitations beyond the short Safari/Firefox note
- required React version expectations
- what is customizable via props vs CSS overrides vs not supported
- whether Storybook/demo reflect the package exactly as a consumer would use it

impact:

- users can install the package and still be unsure whether broken styling is their fault or the library’s packaging model

recommended fix:

- add a short "how styling works" section
- add a troubleshooting note for missing styles
- document peer/runtime expectations explicitly

### 5. README docs language is still a bit hype-first

examples:

- "stunning liquid glass effect UI components"
- "Here you can mess with the components. Enjoy!"
- feature list focuses more on vibe than constraints or behavior quality

impact:

- lowers trust slightly for developers evaluating whether the library is production-ready
- clashes with the actual next-version goal of clearer, more trustworthy docs

recommended fix:

- rewrite intro toward plain language
- keep the visual pitch, but add directness about strengths and current limitations

### 6. no accessibility contract is documented

for a component library, docs currently do not tell consumers:

- which components are keyboard-safe today
- which ones have partial a11y support
- known limitations in focus management / ARIA behavior
- what is planned for improvement

impact:

- consumers have no way to judge risk without reading source
- creates mismatch between pretty demos and real production expectations

recommended fix:

- add an accessibility section in README or dedicated docs page
- per component, document current support level honestly

### 7. browser support note is too narrow

the Safari/Firefox note only mentions the displacement effect, but the docs do not explain:

- whether degradation is purely visual or can affect usability
- whether some components rely on browser-specific rendering assumptions

recommended fix:

- expand browser support note into explicit graceful-degradation guidance

## broken or weak doc links / doc surface issues

### 1. root docs depend on external netlify surfaces

README links to:

- demo: `https://react-magic-ui-demo.netlify.app/`
- storybook: `https://react-magic-ui-docs.netlify.app/`

these may be fine when live, but the repo itself does not document:

- how they are deployed
- whether they are expected to match the current branch/package version
- whether the demo is a true consumer integration or just another internal preview surface

recommended fix:

- add one sentence clarifying what each surface is for
- later, document the demo as a consumer contract check

### 2. contributor docs link style is okay, but docs discoverability is weak

README mentions Storybook, but not where component docs live in the repo.

recommended fix:

- add a short repo map for maintainers/contributors

## component docs coverage

Storybook docs are present for all exported components inspected:

- badge
- button
- card
- checkbox
- glass
- input
- modal
- select
- sidebar
- slider
- switch
- tabs
- toast
- topbar

that is good.

however, component docs quality was not fully content-audited in this pass. based on spot checks and repo direction, likely follow-up issues are:

- prop docs may drift from source over time
- accessibility behavior is probably under-documented for interactive components
- installation/consumer caveats are documented globally, not per component

## storybook/config observations

- `.storybook/main.ts` points to `../src/**/__docs__/*.stories.tsx` and `../src/**/__docs__/*.mdx`
- `.storybook/preview.ts` imports both preview scss and `src/tailwind.css`
- this supports local docs rendering, but does not prove the published package behaves the same way in a consumer app

important nuance:

- Storybook currently validates internal source usage
- it does **not** document or guarantee external-consumer behavior
- docs should say that more clearly, especially while packaging is under review

## recommended docs backlog

### high priority

1. rewrite README intro/install section in plain language
2. fix CONTRIBUTING package manager + stale structure section
3. add explicit styling/package caveats and troubleshooting
4. add accessibility/support-status notes at root level

### medium priority

5. add `worklog/DEV_FLOW.md` with local build/test/storybook/demo expectations
6. document demo app purpose as consumer integration surface
7. add browser support / graceful degradation notes

### later

8. per-component accessibility notes in Storybook docs
9. migration notes if API/package changes become breaking
10. customization guide for liquid-glass tuning via CSS variables/hooks

## verdict

docs are not empty - the repo actually has decent component Storybook coverage - but the root documentation is underspecified where it matters most:

- install expectations
- packaging reality
- accessibility confidence
- contributor workflow truthfulness

the next version should optimize for trust, not hype.
