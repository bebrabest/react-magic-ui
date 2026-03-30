# packaging note - font loading contract

date: 2026-03-30
branch: `dev/rmui-next`
phase: 2 - packaging polish

## question

should the published library stylesheet keep a remote Google Fonts `@import` side effect?

## decision

**no**

remove the remote font import from the shipped CSS and treat typography as part of the consumer/docs shell, not an automatic network side effect of importing the component library stylesheet.

## why

- importing `react-magic-ui/style.css` should not silently trigger a third-party network request
- apps may have CSP/privacy/performance constraints that reject or dislike remote font imports from dependencies
- the font import was now the most obvious remaining global side effect after the CSS packaging cleanup
- consumers can still get the intended look by loading `Nunito` themselves or overriding a CSS variable

## implementation shape

- remove the Google Fonts `@import` from `src/tailwind.css`
- keep a default font stack via `--rmui-font-family`
- preserve the old visual default by setting `--rmui-font-family` to `Nunito` first, then system fallbacks
- document that consumers should load the font explicitly if they want the exact original typography

## contract after this change

default install:

```ts
import 'react-magic-ui/style.css'
```

optional exact-visual setup:

```ts
import 'react-magic-ui/style.css'

// load Nunito in your app shell, or override after import
```

example override:

```css
:root {
  --rmui-font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}
```

## expected validation

- published CSS should no longer contain `fonts.googleapis.com`
- consumer build should not gain font-loading side effects from the package stylesheet
- component styling should remain intact with the fallback stack
