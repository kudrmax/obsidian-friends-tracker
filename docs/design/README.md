# Friends Tracker — design

Date: 2026-10-26. Status: approved by the author, screen by screen. Source canvas: https://claude.ai/artifact/SpAP7x3XMwad48RGXjCTkj — the `canvas/` folder holds the same screens as `.dc.html` files (`canvas.json` has the layout). Open a `.dc.html` in a browser to see the screen at 390×844; the `support.js` it references is not needed for these static boards.

This document wins over `docs/superpowers/specs/2026-10-26-people-tracker-design.md` where they disagree. **Implementation follows these screens strictly.**

## Principles

1. **Same parts everywhere.** One row shape on every list: a 40 px circle on the left (an initial for a person, an icon for a format), a 17 px name, a 13 px grey line under it, a faint chevron on the right where the row opens something. Rows are 60 px, no separators, 20 px gutters.
2. **Every fork is a row of buttons.** A choice between N things is one row of N equal capsules (44 px, 8 px apart, 15 px text with a 16 px icon), the chosen one filled white on dark. A grey 13 px label above the row names the fork. Nothing is a toggle you may or may not press.
3. **Nothing extra.** A screen shows only what its job needs. No "last seen" on the screen that records an interaction, no date next to the person.
4. **Facts have places, never separators.** Never "41 days · Call". A fact gets its own row, column or line.
5. **Minimal and native.** Dark Obsidian theme, system font, Obsidian's accent (#a882ff in the mockups) only for Meeting and for accent text; everything else greys.
6. **Mobile first.** Every screen is drawn at 390 pt; desktop is the same screen in a wider tab. On a computer Who, How and Edit are pages inside the People tab (the list steps aside until the sheet closes), never pop-ups; on a phone they are full-screen sheets.

## Feed (`Main.dc.html`) — the main screen

- Title "People" (30 px bold). Two round buttons (56 px) bottom-right over a fade: the white "+" and, 12 px left of it, a quiet grey one with the stats icon. The list scrolls under them.
- Days are groups: "Today  Sun, 26 Oct" / "Friday  24 Oct" — day name 15 px semibold, date 13 px grey, 8 px apart, on one line. Groups are 12 px apart with a hairline above each but the first. Empty days don't appear.
- Row: format icon in a circle (Meeting: accent-tinted circle with accent icon; Call and Text: grey circle, grey icon), the person's name, under it the format and its qualifiers as one grey line ("Meeting, one on one", "Call, shared activity", "Text"), the time of day in grey 13 px tabular figures, then a faint chevron (`MainTime.dc.html`, approved 2026-10-27). Within a day the rows go by time, latest first; a time before the day's start hour counts as the end of that day. Records without a time come last, by name. Two interactions with the same person the same day are two rows. Tap → Edit.
- The "+" → Who.
- Above the days, under the title: the Reach out block (`MainReach.dc.html`, decided 2026-10-29), the same one as on Stats. The first day under it gets the hairline every other day has.

## Who (`Who.dc.html`) — step 1 of a new interaction

- Header: ✕ on the left, "New interaction" centred, 17 px semibold.
- A capsule search field (40 px, magnifier, clear button). The keyboard is up.
- First row, always visible above the keyboard: a white circle with a plus, "Add “<typed>”", under it "New person". Creates the person's note and goes to How.
- Sections "Recent" (people in order of their last interaction, newest first; under the name the date of it) and "Everyone" (the other matches; under the name "No interactions yet" when none). Section labels 13 px semibold grey, no hairlines. The typed substring is bold in the names.
- Row: initial in a grey circle, name, grey date line. Tap → How.

## How (`How.dc.html`, `HowCall.dc.html`, `HowMeeting.dc.html`) — step 2

- Header: back arrow, title "New interaction" with the date and the time under it in grey 13 px, 12 px apart, each with its own small chevron ("Today ▾  18:40 ▾"; the date opens the date picker, the time opens the time picker: hours as a grid of round buttons, then minutes in fives; `EditTime.dc.html`, approved 2026-10-27). A new interaction starts with the current time. A record without a time shows "No time ▾". A round white ✓ on the right saves.
- The person as a row: initial circle and name, nothing else.
- Fork "How": Text · Call · Meeting, with icons (speech bubble, phone, two people).
- Text: nothing more.
- Call: fork "What for": Talk · Shared activity.
- Meeting: fork "Company": One on one · In company; then fork "Length": Some time · Whole day. Both are required picks.
- Then, for every kind, fork "Who started" with a muted "optional" after the label: Me · <the person's name>, with an outgoing and an incoming arrow (`HowStarted.dc.html`, `HowStartedText.dc.html`, approved 2026-10-29). Nothing is picked by default, ✓ saves without it, and tapping the picked capsule unpicks it. Stored as `initiated: me | them`; a record without it is simply not marked.
- ✓ records the interaction and returns to the feed.

## Edit (`Edit.dc.html`)

The How screen with everything filled in: title "Edit interaction", the interaction's date under it, ✕ on the left, a red trash icon next to the ✓ on the right. No delete button at the bottom.

## Person note (`Person.dc.html`)

A panel inside the note's Properties area, above the text, collapsible under the heading "Person". Rows, top to bottom; a row with nothing to say is left out, except `last seen` (approved 2026-10-27, replacing the board's `this year` row):

- `last seen` — days since the last **meeting**, "never" without one.
- `last contact` — days since the last interaction of any kind; only when it is later than the last meeting.
- `contact every` — the target, "7 days", typed in place; empty ("Empty") when there is none. Always shown, so a target is set from the note (`PersonTarget.dc.html`, decided 2026-10-29).
- `heads-up` — a checkbox: whether this person gets the yellow stage before the target runs out. Only with a target.
- With a target, the row that shows the latest contact is yellow when the target is about to run out and red when it has; its tooltip says "6 days ago, every 7 days". Without a target it has no colour. No extra text: a fact has its place.
- `usual gap` — days, as on Stats. A fact only, never a colour.
- `past year` — interactions in the last 365 days, then the difference with the 365 before in small green (+) or red (−), as on Stats; no difference for a person first met within those 365 days.
- `who starts` — "You 70% · Dima 30%": over all time, of the interactions where who started is marked. No row when none is marked (`PersonStarted.dc.html`, approved 2026-10-29).
- `since` — the first logged interaction, always with its year ("12 Mar 2023").
- `by week` / `by month` / `by year` — a fork of three small capsules (Weeks · Months · Years, 28 px, Months by default) over the stacked bar chart by format: twelve weeks from Monday labelled by the Monday's day, twelve months by letter, or the years from the first interaction on (the last twelve) labelled by year, left-aligned in twelve places so a bar is as wide in every range. The legend gives each format's count over the bars shown. The choice is the same for every person and lasts while Obsidian is open; the bars grow again when it changes.
- `recent` — three latest as date · dot · format with qualifiers, then "All N" that expands the list in place. Tap a line → Edit, opened over the note in the note's own tab (never a second tab); ✓, ✕, delete and Escape step back to the note and the finished Edit leaves the tab's history. After a delete the undo offer is an Obsidian notice with the accent "Undo", since the note has no undo line.

A person with no interactions shows `last seen: never` and `contact every`.

**Built from Obsidian's own Properties classes** (`metadata-container`, `metadata-properties-heading`, `metadata-property`, `metadata-property-key`, `metadata-property-icon`, `metadata-property-key-input`, `metadata-property-value`, `metadata-input-longtext`), exactly as `HabitBlock` in Marble Habit Tracker, so it is pixel-identical to the real Properties next to it. Own CSS only for the chart, its range fork and the recent list, reading Obsidian's variables. The mockup is approximate; the real Properties panel is the reference.

## Stats (`Stats.dc.html`)

- Title "Stats", fork "Week · Month · Year" (Month by default). No back arrow of its own: Stats opens in the Friends tab, and the tab's own back arrow leads to the feed (decided 2026-10-27).
- Two numbers 32 px bold: interactions and people in the period, each with the difference to the previous period in small green (+) or red (−).
- Under them two more numbers of the same size, without a difference: "you started" and "they started", in percent of the period's interactions where it is marked; left out when nothing in the period is marked (`StatsStarted.dc.html`, approved 2026-10-29). Everything on Stats is over the chosen period.
- "By month": the same chart as in the person note, over everyone.
- "Reach out" (below).
- "Most often this month/week/year": person rows with the count on the right. Under the name, a grey line "You 70% · Katya 30%" — who started, over the period; no line for a person with nothing marked in it.
- Tap a person → their note.

## Reach out (decided 2026-10-29)

A person may have a target, "contact every N days", kept in the note's frontmatter (`contact_every`, `heads_up`, names in the settings) and set in the person's panel. Colour and lists exist only for people with a target; the plugin never guesses whom to call.

- Days since the last interaction of any kind, `d`, against the target `N`: **late** (red) when `d > N`; **soon** (yellow) when the person's heads-up is on and at most the settings' share (20% by default) of `N` is left, day `N` included; otherwise nothing. A target and no interaction yet: late, "never" on the right.
- The **Reach out** block, the same on the feed (above the days) and on Stats (where "Falling behind" was): section label "Reach out", person rows with "Every N days" under the name and the days since the last interaction bold on the right, in the status colour. Late first, then soon; within each by `d / N`, highest first, then by name. Everyone due is listed, never cut. Tap → the person's note. Nobody due → no block.

## Style system

- Every colour, size and radius is a CSS variable in `styles.css` mapped to Obsidian variables, as in Marble Habit Tracker; the same `tests/styles.test.ts` guard.
- Shared parts are plain classes reused across screens: the row, the circle, the capsule button, the fork row, the section label, the sheet header. A new control uses an existing class; only a new kind of object gets new CSS.

## Buttons (decided 2026-10-27)

Every button belongs to one of four families, and a family looks, hovers, presses and shows focus the same way everywhere:

1. **Filled round**: the one action of a screen, white on dark (dark on white in a light theme). The "+" (56 px) and ✓ (44 px). The grey stats button beside the "+" is its quiet sibling. The "+", the stats button and the undo line float over the list without a shadow: the stats button and the undo line stand out by a solid grey ground of their own (the surface in a dark theme, the capsules' grey made solid in a light one), the stats button a step greyer under the pointer.
2. **Ghost round**: an icon alone in a 44 px circle: ✕, back, the picker's month arrows, the search's clear. The trash can is this family in red; there is no other destructive style.
3. **Choice**: a capsule in a fork, or a round day or hour in a picker. The chosen one is filled like family 1.
4. **Text**: grey words with a small chevron (the date and the time under a title, "N more", "All N"), and the accent "Undo". A finger gets 44 px of height even where the line is shorter.

Rows are rows: the whole row is the button. On a computer every family has a hover (a quiet ground for 2–3 and rows, a slightly lighter fill for 1) and a focus ring for the keyboard; a phone has neither, only the press.

On a phone the page header's title stands in the middle, as on the boards; on a computer it reads left to right like the tab around it. The views keep their own 20 px gutters on a phone too. In the person's panel the recent rows are 44 px high on a phone, and the chart and the list take the panel's whole width.

## Motion (decided 2026-10-27)

Few and quiet, only transform and opacity, timed by the motion tokens in `styles.css`. Nothing moves when the system asks for reduced motion.

- A press shrinks a capsule, a round button or a picker cell a little.
- A page (Who, How, Edit) rises in; closing it brings the list back with a fade and the round buttons back with a small pop.
- A row just logged, changed or brought back by Undo rises in and glows for a moment, so you see what changed. Only rows that weren't there before move: a redraw after a change in the notes or more days added by scrolling moves nothing.
- On How, a fork that a choice brings (What for, Company, Length) rises in, and the capsule just chosen pops.
- The undo line rises in and sinks out.
- On Stats, the chart's bars grow when the view opens, a few milliseconds apart; picking a period lets its numbers and its list rise in. In the person's panel the chart grows when the note opens or the panel is unfolded.
- The search's ✕ fades in once something is typed.

`src/ui/motion.ts` decides what moves: `Arrivals` compares a redraw with the one before, `Debut` plays something once, and the class it puts on comes off when its animation ends, so a tab hidden and shown again doesn't replay it.
