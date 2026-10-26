# People Tracker — design

Date: 2026-10-26. Status: approved by the author, screen by screen. Source canvas: https://claude.ai/artifact/SpAP7x3XMwad48RGXjCTkj — the `canvas/` folder holds the same screens as `.dc.html` files (`canvas.json` has the layout). Open a `.dc.html` in a browser to see the screen at 390×844; the `support.js` it references is not needed for these static boards.

This document wins over `docs/superpowers/specs/2026-10-26-people-tracker-design.md` where they disagree. **Implementation follows these screens strictly.**

## Principles

1. **Same parts everywhere.** One row shape on every list: a 40 px circle on the left (an initial for a person, an icon for a format), a 17 px name, a 13 px grey line under it, a faint chevron on the right where the row opens something. Rows are 60 px, no separators, 20 px gutters.
2. **Every fork is a row of buttons.** A choice between N things is one row of N equal capsules (44 px, 8 px apart, 15 px text with a 16 px icon), the chosen one filled white on dark. A grey 13 px label above the row names the fork. Nothing is a toggle you may or may not press.
3. **Nothing extra.** A screen shows only what its job needs. No "last seen" on the screen that records an interaction, no date next to the person.
4. **Facts have places, never separators.** Never "41 days · Call". A fact gets its own row, column or line.
5. **Minimal and native.** Dark Obsidian theme, system font, Obsidian's accent (#a882ff in the mockups) only for Meeting and for accent text; everything else greys.
6. **Mobile first.** Every screen is drawn at 390 pt; desktop is the same screen in a wider tab.

## Feed (`Main.dc.html`) — the main screen

- Title "People" (30 px bold). A stats icon button in the top-right. A round white "+" (56 px) bottom-right, over a fade; the list scrolls under it.
- Days are groups: "Today  Sun, 26 Oct" / "Friday  24 Oct" — day name 15 px semibold, date 13 px grey, 8 px apart, on one line. Groups are 12 px apart with a hairline above each but the first. Empty days don't appear.
- Row: format icon in a circle (Meeting: accent-tinted circle with accent icon; Call and Text: grey circle, grey icon), the person's name, under it the format and its qualifiers as one grey line ("Meeting, one on one", "Call, shared activity", "Text"), a faint chevron. Two interactions with the same person the same day are two rows. Tap → Edit.
- The "+" → Who.

## Who (`Who.dc.html`) — step 1 of a new interaction

- Header: ✕ on the left, "New interaction" centred, 17 px semibold.
- A capsule search field (40 px, magnifier, clear button). The keyboard is up.
- First row, always visible above the keyboard: a white circle with a plus, "Add “<typed>”", under it "New person". Creates the person's note and goes to How.
- Sections "Recent" (people in order of their last interaction, newest first; under the name the date of it) and "Everyone" (the other matches; under the name "No interactions yet" when none). Section labels 13 px semibold grey, no hairlines. The typed substring is bold in the names.
- Row: initial in a grey circle, name, grey date line. Tap → How.

## How (`How.dc.html`, `HowCall.dc.html`, `HowMeeting.dc.html`) — step 2

- Header: back arrow, title "New interaction" with the date under it in grey 13 px ("Today ▾"; tap opens a date picker), a round white ✓ on the right that saves.
- The person as a row: initial circle and name, nothing else.
- Fork "How": Text · Call · Meeting, with icons (speech bubble, phone, two people).
- Text: nothing more.
- Call: fork "What for": Talk · Shared activity.
- Meeting: fork "Company": One on one · In company; then fork "Length": Some time · Whole day. Both are required picks.
- ✓ records the interaction and returns to the feed.

## Edit (`Edit.dc.html`)

The How screen with everything filled in: title "Edit interaction", the interaction's date under it, ✕ on the left, a red trash icon next to the ✓ on the right. No delete button at the bottom.

## Person note (`Person.dc.html`)

A panel inside the note's Properties area, above the text, collapsible under the heading "Person": rows `last seen` (days ago), `usual gap` (days), `this year` (count), `by month` (a 12-month stacked bar chart by format with a legend: Text, Call, Meeting, Whole day), `recent` (three latest as date · dot · format with qualifiers, then "All N" that expands the list in place).

**Built from Obsidian's own Properties classes** (`metadata-container`, `metadata-properties-heading`, `metadata-property`, `metadata-property-key`, `metadata-property-icon`, `metadata-property-key-input`, `metadata-property-value`, `metadata-input-longtext`), exactly as `HabitBlock` in Marble Habit Tracker, so it is pixel-identical to the real Properties next to it. Own CSS only for the chart and the recent list, reading Obsidian's variables. The mockup is approximate; the real Properties panel is the reference.

## Stats (`Stats.dc.html`)

- Back arrow, title "Stats", fork "Week · Month · Year" (Month by default).
- Two numbers 32 px bold: interactions and people in the period, each with the difference to the previous period in small green (+) or red (−).
- "By month": the same chart as in the person note, over everyone.
- "Falling behind": person rows with "Usually every N days" under the name and "N days" (since the last interaction) bold on the right; "N more" expands.
- "Most often this month/week/year": person rows with the count on the right.
- Tap a person → their note.

## Style system

- Every colour, size and radius is a CSS variable in `styles.css` mapped to Obsidian variables, as in Marble Habit Tracker; the same `tests/styles.test.ts` guard.
- Shared parts are plain classes reused across screens: the row, the circle, the capsule button, the fork row, the section label, the sheet header. A new control uses an existing class; only a new kind of object gets new CSS.
