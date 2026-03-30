# architecture direction

date: 2026-03-30
branch: `dev/rmui-next`
status: decision for next-version planning

## decision

use a **hybrid architecture**:

- keep **react-magic-ui’s visual identity** custom - especially the `Glass` effect, liquid styling tokens, and composable presentational wrappers
- move **behavior-heavy, accessibility-critical interaction logic** onto mature primitive patterns instead of continuing to hand-roll everything
- keep the public API product-minded where it helps, but let the internals become more boring and reliable

in practice, this means:

- `Glass` stays the styling/effect foundation
- low-risk layout/presentational components can stay mostly custom
- high-risk controls should be rebuilt on top of **primitive-grade interaction foundations**
- the library should feel like **"liquid glass design system on top of reliable primitives"**, not a novelty effect package with custom behavior everywhere

## why this direction

the audit points in one direction pretty hard:

1. the visual layer is the differentiator
   - the repo’s unique value is the liquid-glass look and composable styling feel
   - replacing that with generic shadcn-style wrappers would dilute the point of the library

2. the behavior layer is where risk is concentrated
   - `Checkbox`, `Switch`, `Select`, and `Slider` are currently the weakest a11y/interaction areas
   - `Modal`, `Tabs`, and `ToastProvider` are closer, but still expensive to maintain safely by hand
   - tests are too shallow today to justify large custom-behavior refactors with confidence

3. the docs already show a trust gap
   - root docs are more optimistic than the current implementation reality
   - the next version should improve confidence, not just visuals

4. primitive-backed internals reduce maintenance cost
   - focus management, keyboard support, roving focus, ARIA state, dismissal behavior, and portal edge cases are all solved problems in mature primitive ecosystems
   - the project should spend its complexity budget on the visual system and packaging model, not reinventing checkbox semantics

## rejected options

### option A - stay fully custom everywhere

not recommended

pros:
- total control over markup and animations
- no dependency on external primitive APIs

cons:
- highest maintenance burden
- hardest path to trustworthy accessibility
- requires a much larger test suite before refactors are safe
- duplicates solved work for keyboard/focus/state behavior

why rejected:
- too much effort goes into rebuilding infrastructure the library does not uniquely benefit from owning

### option B - full shadcn/radix conversion across the board

not recommended

pros:
- strong a11y baseline for many interactive components
- easier contributor familiarity

cons:
- risks making the library feel like a themed wrapper set instead of its own system
- over-standardizes components that are mostly presentational already
- adds migration cost where there is little payoff (`Card`, `Badge`, `Topbar`, etc.)

why rejected:
- too blunt; it solves the risky parts but also erases useful custom architecture boundaries

### option C - hybrid foundation

recommended

pros:
- preserves the visual identity
- reduces risk where it matters most
- lets the public API stay product-friendly
- supports incremental migration component by component

cons:
- requires discipline to keep the architecture layered cleanly
- may temporarily mix old and new internals during migration

why chosen:
- best balance of distinctiveness, reliability, and implementation cost

## target architecture layers

### layer 1 - visual foundation

owned by react-magic-ui

responsibilities:
- liquid-glass rendering and styling
- theming hooks / CSS variables / visual customization
- spacing, shape, glow, blur, ripple, overlays
- shared class composition utilities
- browser graceful-degradation strategy for unsupported visual effects

main pieces:
- `Glass`
- shared style tokens/utilities
- component visual shells

rule:
- this layer should not own complex accessibility behavior if it can be avoided

### layer 2 - interaction foundation

primitive-grade behavior layer

responsibilities:
- keyboard navigation
- focus management and focus restoration
- ARIA roles, states, and relationships
- dismissal and escape handling
- roving focus / selection models
- portal behavior for overlays

implementation direction:
- use mature primitive patterns for the risky components
- whether the implementation uses Radix directly or a very similar primitive-backed internal layer is less important than the result: boring, predictable behavior

rule:
- this layer should be invisible to most consumers; it exists to make the product trustworthy

### layer 3 - product API layer

owned by react-magic-ui

responsibilities:
- consumer-facing props
- naming consistency
- opinionated defaults
- compatibility wrappers where migration is needed
- docs/examples that match real use

rule:
- consumers should interact with react-magic-ui concepts, not primitive implementation details, unless there is a strong reason to expose them

## component migration buckets

### keep custom, just clean up

these are mostly presentational and do not justify primitive-backed rewrites:

- `Glass`
- `Badge`
- `Card`
- `Topbar`

work needed:
- test coverage
- docs cleanup
- prop consistency review
- visual/browser fallback documentation

### keep custom API, strengthen internals selectively

these may keep their current product shape while improving implementation quality:

- `Button`
- `Input`
- `Sidebar`
- `Tabs`
- `Modal`
- `ToastProvider`

notes:
- `Button` and `Input` already benefit from native semantics, so the main work is consistency/tests/docs
- `Tabs`, `Modal`, and `ToastProvider` are behavior-heavy enough that primitive-backed internals are attractive even if the public API stays branded and opinionated
- `Sidebar` is app-shell/navigation flavored, so a direct primitive mapping may be weaker than a hybrid approach

### rebuild on stronger primitive foundations first

these are the clearest candidates for next-version internal migration:

- `Checkbox`
- `Switch`
- `Select`
- `Slider`

why these first:
- highest accessibility risk
- weakest current semantics
- easiest to justify replacing internal logic with more reliable primitives
- most likely to improve user trust quickly

## public API guidance

next version should not blindly mirror primitive APIs, but it also should stop using avoidably inconsistent naming.

principles:

- prefer common React control conventions where possible
  - `checked` / `defaultChecked` / `onCheckedChange`
  - `value` / `defaultValue` / `onValueChange`
  - `open` / `defaultOpen` / `onOpenChange`
- keep higher-level convenience props only when they clearly improve developer ergonomics
- if a current prop is off-convention, consider compatibility wrappers plus deprecation notes instead of hard breaks when possible

example:
- current `Switch` API with `isActive` / `setIsActive` is less standard than `checked` / `onCheckedChange`
- next version should move toward the standard naming model

## styling contract implications

the architecture decision also affects the packaging problem:

- visual styling should be centralized and explicit
- behavior primitives should not force consumers to guess how styles are applied
- the library should define a clear contract for:
  - what CSS ships with the package
  - what must be imported by consumers
  - what is customizable with props vs CSS variables vs class overrides

this supports phase 2 directly:
- once behavior is layered cleanly, the packaging decision becomes easier to explain and enforce

## testing implications

this direction changes how tests should be prioritized.

### high priority regression coverage before/during migration

- `Checkbox`
- `Switch`
- `Select`
- `Slider`
- `Tabs`
- `Modal`
- `ToastProvider`

focus areas:
- keyboard interaction
- focus behavior
- ARIA roles/state exposure
- controlled vs uncontrolled usage
- dismissal/overlay behavior
- portal rendering where relevant

### lower priority smoke coverage

- `Glass`
- `Card`
- `Badge`
- `Topbar`
- `Input`
- `Button`

focus areas:
- render contract
- prop passthrough
- visual class composition expectations

## docs implications

the docs should describe the system honestly:

- react-magic-ui is a liquid-glass component library with a custom visual foundation
- interaction reliability comes from hardened primitive-grade internals where appropriate
- not every component is equal in complexity or customization model
- browser support notes should distinguish clearly between visual degradation and behavior degradation

this is a stronger story than the current hype-first positioning because it tells developers why the library can be trusted

## implementation order recommendation

1. align on this architecture direction
2. clean up repo/config inconsistencies in phase 1
3. in phase 2, reproduce the consumer styling failure and decide the packaging contract
4. after packaging direction is set, start high-risk component migrations in this order:
   1. `Checkbox`
   2. `Switch`
   3. `Select`
   4. `Slider`
5. then harden:
   1. `Tabs`
   2. `Modal`
   3. `ToastProvider`
6. finally backfill docs/tests for lower-risk components

## verdict

**choose hybrid**

react-magic-ui should own the parts that make it special:
- liquid-glass visuals
- branded component ergonomics
- tasteful defaults

and stop owning the parts that mostly create maintenance risk:
- low-level interaction semantics for complex controls

that gives the project the best shot at becoming both visually distinct and actually dependable.
