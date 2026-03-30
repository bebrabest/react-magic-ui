# test audit

phase 0 deliverable for `dev/rmui-next`

## current status

- test command: `npm test` -> `vitest run`
- result after dependency repair: 5 test files passed, 23 tests passed
- prior failure mode: vitest/jsdom worker startup failed because `cssstyle` could not resolve `css-tree` from a broken/incomplete install state in `node_modules`
- repair performed: refreshed dependencies with `npm install`, which corrected the transitive dependency graph and updated `package-lock.json`

## current test files

| component | test file | tests | current coverage summary |
| --- | --- | ---: | --- |
| `Badge` | `src/components/badge/__test__/Badge.test.tsx` | 4 | render, text content, extra class, leading/trailing icons |
| `Button` | `src/components/button/__test__/Button.test.tsx` | 5 | render, text content, extra class, icon slots |
| `Modal` | `src/components/modal/__test__/Modal.test.tsx` | 6 | open rendering, close button, overlay click, escape key, body scroll lock, hidden state |
| `Sidebar` | `src/components/sidebar/__test__/Sidebar.test.tsx` | 4 | item rendering, brand rendering, click handling, controlled active item styling |
| `Topbar` | `src/components/topbar/__test__/Topbar.test.tsx` | 4 | title render, left/right content, `Topbar.Header`, `Topbar.Actions` |

## component-by-component gaps

### tested today

#### badge
- covered: basic render path and icon slots
- missing:
  - variant/color API expectations
  - accessibility expectations for decorative icons
  - snapshot/DOM assertions for semantic wrapper choice if that API matters

#### button
- covered: content, extra class, icon slots
- missing:
  - click/disabled behavior
  - forwarded button attributes (`type`, `disabled`, `aria-*`)
  - keyboard interaction expectations
  - variant styling contract

#### modal
- covered: major happy-path open/close mechanics
- missing:
  - focus trap
  - focus restore to trigger
  - `aria-labelledby` / `aria-describedby` contract assertions
  - multiple modal stacking / nested dialog edge cases
  - portal/container behavior under SSR-like conditions

#### sidebar
- covered: rendering and item click callbacks
- missing:
  - keyboard navigation
  - collapsed state interactions
  - semantics for navigation vs action items
  - aria-current / selected-state expectations
  - controlled vs uncontrolled collapse behavior

#### topbar
- covered: layout composition smoke tests
- missing:
  - semantic heading/landmark expectations if intended
  - responsive behavior contract
  - action slot accessibility when consumers pass controls

### no tests yet

#### glass
- missing all coverage
- recommended first tests:
  - renders children
  - supports polymorphic `as`
  - passes through className / style
  - liquid effect DOM structure is stable enough for consumers

#### card
- missing all coverage
- recommended first tests:
  - render and direction prop
  - className passthrough
  - header/body/footer composition if applicable

#### input
- missing all coverage
- recommended first tests:
  - value/defaultValue/change handling
  - disabled state
  - placeholder and forwarded props
  - label association in real usage examples

#### checkbox
- missing all coverage
- high priority because semantics look weak
- recommended first tests:
  - checked/unchecked state
  - keyboard toggle
  - label click behavior
  - actual accessibility role/state exposure

#### switch
- missing all coverage
- high priority
- recommended first tests:
  - `checked`/active state changes
  - keyboard toggle
  - `role="switch"` + checked state exposure
  - disabled behavior

#### select
- missing all coverage
- high priority
- recommended first tests:
  - open/close behavior
  - option selection
  - outside click close
  - keyboard navigation and highlighted option behavior
  - listbox/option semantics

#### slider
- missing all coverage
- high priority
- recommended first tests:
  - value changes from pointer interaction
  - keyboard interaction
  - min/max/step bounds
  - `aria-valuenow` / role expectations

#### tabs
- missing all coverage
- high priority
- recommended first tests:
  - tab activation
  - arrow/home/end keyboard nav
  - disabled tab handling
  - `aria-controls` / `aria-labelledby` linkage

#### toastprovider
- missing all coverage
- high priority
- recommended first tests:
  - add/remove toast flow
  - auto-dismiss timers
  - manual dismiss
  - stacking order / position
  - live region semantics

## coverage picture

- exported components: 14
- components with tests: 5/14
- components without tests: 9/14
- current suite is mostly smoke/integration-lite coverage
- strongest existing behavior coverage: `Modal`
- weakest area overall: accessibility-critical primitives (`Checkbox`, `Switch`, `Select`, `Slider`, `Tabs`, `ToastProvider`)

## recommended test priority order

1. `Checkbox`
2. `Switch`
3. `Select`
4. `Slider`
5. `Tabs`
6. `ToastProvider`
7. strengthen `Modal`
8. strengthen `Sidebar`
9. add basic coverage for `Input`
10. fill low-risk smoke tests for `Glass`, `Card`

## notes influencing architecture decision

- the current test footprint is too shallow to safely refactor custom behavior-heavy primitives without either:
  - introducing a stronger primitive foundation, or
  - first adding behavior/accessibility regression tests
- existing tests skew toward presentational components and basic interaction smoke tests
- this supports moving the highest-risk controls toward mature primitive patterns instead of continuing to hand-roll semantics
