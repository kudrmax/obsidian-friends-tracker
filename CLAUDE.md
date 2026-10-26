# People Tracker

## The screens are decided

`docs/design/README.md` and the boards in `docs/design/canvas/` are the approved design; `docs/superpowers/specs/2026-10-26-people-tracker-design.md` is the spec behind them. Where they disagree, the design wins. Build what they show, down to the row heights; a screen that needs something they don't show gets designed first, not improvised.

## User-facing text stays true

Some text describes how the plugin behaves. When behavior changes, update that text in the same commit:

- `src/ui/SettingsTab.ts` descriptions and `README.md` — update when a setting or feature changes.

Names that come from settings (labels, property names) are passed in, never written into the text.

## One design system

Every look value lives in one place, so a new screen can only be built from the parts the phone already has:

- `styles.css` — the `body { … }` block at the top holds every token: colours (through Obsidian's theme where it has one), radii, sizes, type, spacing, opacity, layers, motion. Component rules only read `var(--pt-…)` tokens. Need a value that isn't there? Reuse the token of the same part on the phone; add a new token, named for what it is for, only for something new that was agreed.
- Everything is round: a circle is `--pt-radius-circle`, anything longer than tall is `--pt-radius-capsule`.
- `src/ui/design.ts` `DESIGN` — the measures TypeScript lays things out with; each one names its CSS token in `DESIGN_TOKENS`.
- `tests/styles.test.ts` fails on a number, colour, curve, font or radius written into a rule, on Obsidian's variables read outside the tokens, on unused or undefined tokens, on `DESIGN` disagreeing with the CSS, and on a size or time written inline in TypeScript instead of a named constant. Don't loosen it to pass: move the value into a token.
- The person block inside a note is built from Obsidian's own Properties classes (`metadata-container`, `metadata-property`, …), so it is pixel-identical to the Properties next to it. Its own CSS covers only the chart and the recent list.

## Trying a build

A branch build is tried on this laptop in a separate Obsidian, the phone view and the desktop view, never in Max's own Obsidian or vault: `~/Obsidian` is production and syncs to his phone.

- The separate Obsidian runs with its own profile and a scratch vault: `open -n -a Obsidian --args --user-data-dir=<scratch>/obsidian-user --remote-debugging-port=9333`, the vault registered in that profile's `obsidian.json`, holding sample people notes and the plugin's `data.json`, with the branch build in its `.obsidian/plugins/people-tracker/`. Reuse one that is already running (`ps aux | grep remote-debugging-port`); never open a scratch vault with `obsidian://open`.
- Check the build there first yourself, over the debugging port: the phone view (window 390×844, then `app.emulateMobile(true)`) and the desktop view. Then leave it open for Max to click through, with a checklist of what to try.
- `~/Obsidian/.obsidian/plugins/people-tracker/` only ever gets builds Max installs himself. Never copy a branch build there, never touch its `data.json`.
- A page in a browser is not a check: it runs the code outside Obsidian and misses what Obsidian adds.
