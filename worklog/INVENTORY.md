# component inventory

phase 0 deliverable for `dev/rmui-next`

## summary

| component | role | risk | current foundation | docs | tests | migration direction | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Glass` | visual wrapper / liquid effect primitive | medium | custom SVG filter + overlay + ripple container | yes | no | stay custom | core visual value; likely becomes the styling shell for higher-level primitives |
| `Button` | action trigger | medium | custom button built on `Glass` | yes | yes | partial custom / maybe wrap primitive conventions | native button semantics are fine; mainly styling + variant API |
| `Card` | presentational container | low | custom `Glass` wrapper | yes | no | stay custom | mostly layout + styling, minimal behavior |
| `Input` | text input | medium | native `<input>` wrapped in `Glass` | yes | no | partial custom | keep native input, improve labeling/docs/tests |
| `Badge` | status label | low | custom `Glass` span | yes | yes | stay custom | presentational, low behavior risk |
| `Checkbox` | binary selection | high | custom button + label span | yes | no | rebuild on primitive/native checkbox foundation | currently not a real checkbox control, weak labeling/keyboard semantics |
| `Switch` | binary toggle | high | custom button only | yes | no | rebuild on switch primitive | missing `role="switch"`, checked semantics, keyboard coverage |
| `Select` | option selection | high | fully custom button + popup | yes | no | rebuild on select/listbox primitive | missing listbox/option semantics, keyboard nav, focus management |
| `Slider` | range input | high | fully custom div/mouse drag | yes | no | rebuild on slider primitive or native range base | mouse-only now; no keyboard/accessibility semantics |
| `Modal` | dialog / overlay | high | custom portal + focus/escape/scroll lock | yes | yes | rebuild on dialog primitive or keep custom behavior layer if hardened | already closer than some others, but focus trap / aria behavior still incomplete |
| `Tabs` | tabbed navigation/content | high | custom compound component built on `Button` | yes | no | keep hybrid or rebase onto tabs primitive patterns | has some tab semantics + arrow nav already; still needs stronger tests and behavior review |
| `ToastProvider` | ephemeral notifications | high | custom provider + portal + timers | yes | no | rebuild on toast primitive patterns or harden custom layer | status/live-region exists, but dismissal/focus/stacking need audit |
| `Sidebar` | navigation shell | medium-high | custom compound component | yes | yes | hybrid | mostly nav/layout; may keep custom API while improving semantics/keyboard model |
| `Topbar` | app/header layout | low-medium | custom compound layout component | yes | yes | stay custom | mostly structure; low a11y risk unless interactive children are embedded |

## a11y-critical vs low-risk

### a11y-critical / behavior-heavy

these are the first candidates for Radix/shadcn-style primitives or a stricter headless behavior layer:

- `Checkbox`
- `Switch`
- `Select`
- `Slider`
- `Modal`
- `Tabs`
- `ToastProvider`
- `Sidebar` - not a primitive in the same sense, but navigation/collapse/selection behavior deserves keyboard + aria review

### lower-risk / mostly visual

these can likely stay custom with tests/docs cleanup:

- `Glass`
- `Button`
- `Card`
- `Input`
- `Badge`
- `Topbar`

## per-component notes

### glass
- hidden SVG filter with hardcoded `id="lg-dist"`
- wraps every usage in extra DOM layers + animation state
- likely becomes the dedicated styling/effect layer rather than the behavior layer
- possible future concern: repeated identical filter markup per instance

### button
- native button semantics preserved through `Glass as="button"`
- variant styling uses dynamic class names like `bg-${variant}`
- behavior risk is low compared with select/modal/tabs

### card
- presentational only
- prop typing says `direction?: "column" | "row"` but default value is `"col"` - smells like API inconsistency worth checking later

### input
- keeps native input element, which is good
- liquid effect is on wrapper rather than the input itself
- no current tests for typing, disabled state, forwarded props, or labeling usage

### badge
- presentational label with optional leading/trailing icon
- low-risk unless used as status indicator needing stronger docs around color meaning

### checkbox
- implemented as `button` + clickable `span` label
- no `input type="checkbox"`, no `role="checkbox"`, no `aria-checked`
- likely biggest mismatch between visuals and accessible behavior

### switch
- implemented as clickable button without switch semantics
- prop naming uses `isActive` / `setIsActive` instead of more conventional `checked` / `onCheckedChange`
- good candidate for a v2 compatibility wrapper over a primitive

### select
- custom open state + outside click handler only
- no keyboard navigation, no option roving focus, no listbox semantics
- high payoff target for primitive migration

### slider
- custom mouse drag over `div`
- no keyboard support, no touch/pointer handling audit, no `aria-valuenow`
- strong candidate for primitive/native replacement

### modal
- has portal, `role="dialog"`, labelled/described ids, escape close, overlay close, body scroll lock
- does not appear to trap focus or restore focus to trigger
- likely salvageable, but using a mature dialog primitive may be cheaper than hardening everything by hand

### tabs
- already has compound API, tab roles, ids, panel linkage, arrow/home/end handling
- focus behavior is custom and needs tests, especially auto/manual activation and disabled triggers
- could remain custom API while borrowing Radix semantics internally

### toastprovider
- has provider API, portal rendering, stacked positions, timed dismissal, close button, polite live region
- no tests yet for timers/dismissal/ordering/portal behavior
- likely wants primitive-inspired patterns even if the public API stays custom

### sidebar
- compound API with controlled/uncontrolled collapse and active item state
- interactive items are buttons, which is okay for app-shell selection but not necessarily for routing/navigation
- needs a future decision: nav semantics for links vs app-command buttons

### topbar
- layout shell with sections/brand/actions/divider
- low behavior complexity
- likely stays custom unless architecture pushes all layout wrappers into a smaller styling-only layer

## inventory totals

- components exported: 14
- components with `__docs__`: 14/14
- components with tests: 5/14 (`Badge`, `Button`, `Modal`, `Sidebar`, `Topbar`)
- components with no tests yet: 9/14

## initial migration buckets

### stay custom
- `Glass`
- `Badge`
- `Card`
- `Topbar`

### partial custom / native base is probably enough
- `Button`
- `Input`
- `Sidebar`
- `Tabs` (custom API, stronger internal semantics)
- `Modal` (maybe primitive-backed if we want less maintenance risk)
- `ToastProvider` (custom API, stronger internal behavior)

### prime primitive-backed rebuild candidates
- `Checkbox`
- `Switch`
- `Select`
- `Slider`

## next questions for the audit

- how much of the current storybook/docs reflect real behavior vs idealized API
- whether the demo app consumes built package output or source directly
- which tests cover keyboard/focus/a11y behavior today - likely almost none outside modal/sidebar basics
- whether `Glass` should stay public as-is or become a lower-level/internal effect primitive with a more constrained API
