# packaging reproduction - consumer styling contract

date: 2026-03-30
branch: `dev/rmui-next`
phase: 2 - reproduce consumer styling issue

## question tested

does `react-magic-ui` work as a normal installed dependency in a fresh consuming app without extra Tailwind scanning/config hacks?

## setup

created a minimal Vite React TypeScript consumer app outside the library repo flow:

- packed the current library locally with `npm pack`
- installed the tarball into `autonomy/rmui-consumer-test`
- rendered a simple `Card` + `Button`
- built the consumer app in two variants:
  1. package import only
  2. package import + explicit `import 'react-magic-ui/dist/react-magic-ui.css'`

## key finding

**the current package does not auto-include its compiled stylesheet when consumers import components from `react-magic-ui`**

so the real failure mode is:

- components render
- component class names are present in the DOM / JS bundle
- but the visual styles are missing unless the consumer also imports `react-magic-ui/dist/react-magic-ui.css`

this means the problem is **not** currently "consumer must scan library source with Tailwind"
it is more specifically:

- the package already ships compiled CSS
- but consumers must know to import it manually
- if they do not, the library looks broken/un-styled

## evidence

### library package shape

- `src/index.ts` imports `./tailwind.css`
- built package exports `./dist/react-magic-ui.css`
- built `dist/index.es.js` does **not** contain a CSS side-effect import

### consumer build results

#### variant 1 - no explicit library CSS import

consumer entry only imported the JS package:

```ts
import App from './App'
```

result:

- built CSS payload: `1788` bytes
- library style markers in built CSS: `0`
- library components present in built JS bundle

interpretation:

- the app renders library components
- none of the package CSS ships into the consumer output

#### variant 2 - explicit `react-magic-ui/dist/react-magic-ui.css` import

consumer entry imported the package stylesheet:

```ts
import 'react-magic-ui/dist/react-magic-ui.css'
```

result:

- built CSS payload: `34704` bytes
- library style markers in built CSS: `7`
- built CSS includes component/module selectors like `_btn_...`, `_card_...`, `bg-positive`, and the Google Fonts import

interpretation:

- explicit CSS import makes the package render correctly in a real consumer build

## conclusion

current state today:

- **works** if consumer imports the shipped CSS file
- **fails visually** if consumer only imports components
- **does not require Tailwind content scanning** in the consumer once the CSS file is imported

so the next packaging decision should optimize for one of these:

1. keep compiled CSS as the contract, but make it much harder to miss
   - document it aggressively
   - consider auto-importing CSS from the package entry if the target bundlers support it reliably
2. move to a clearer hybrid package contract
   - compiled default theme CSS included or explicitly auto-wired
   - css variables/hooks for customization
   - no consumer Tailwind source-scanning requirement

## recommendation direction

this reproduction strengthens the case for the planned **hybrid packaged CSS approach**:

- ship compiled default visuals
- do not require consumer Tailwind config hacks
- decide whether CSS should be:
  - an explicit required import with much clearer docs, or
  - automatically pulled in from the package entry for supported bundlers

## artifacts

- library repo: `autonomy/react-magic-ui`
- consumer repro app: `autonomy/rmui-consumer-test`
- consumer outputs:
  - `autonomy/rmui-consumer-test/dist-no-css`
  - `autonomy/rmui-consumer-test/dist-with-css`
