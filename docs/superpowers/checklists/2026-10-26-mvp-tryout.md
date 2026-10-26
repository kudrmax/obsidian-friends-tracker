# MVP tryout — 2026-10-27

Scratch Obsidian 1.14.4 with its own profile and a scratch vault of 151 people (`#friend`), 30 of them with 5–40 interactions over the last year, one note broken on purpose (`Broken Bob.md`: `date: 2026-13-40`, `kind: hug`). Branch build `feature/mvp` in `.obsidian/plugins/friends-tracker/`. Driven over the debugging port, phone view 390×874 with `app.emulateMobile(true)`, then desktop 1200×820.

| Check | Phone | Desktop | Notes |
|---|---|---|---|
| Feed: days and rows as `Main.dc.html` | ✓ | ✓ | Obsidian's mobile button styles had painted every row grey: selectors now carry `.friends-tracker`. The "+" sits above Obsidian's bottom bar. |
| "+" → Who: Add / Recent / Everyone as `Who.dc.html`, match in bold | ✓ | ✓ (560 px column) | Obsidian's own modal header and close button hidden. |
| Pick a person → How: Text saves with ✓ alone; Call needs What for; Meeting needs Company and Length | ✓ | — | ✓ stays disabled until every fork has an answer. |
| Date under the title; picker refuses future days | ✓ | — | 27–31 Oct disabled on 26 Oct. |
| The new interaction lands first in the feed and in the note's frontmatter | ✓ | — | `date / kind / company: group / length: whole_day`. |
| Undo line after saving | ✓ | — | |
| Tap a row → Edit: answers filled, trash and ✓ in the header, date of the record | ✓ | — | |
| Person note: block inside Properties, `interactions` and `tags` hidden | ✓ | ✓ | Chart was empty (height read from CSS before the panel was in the DOM): now from `DESIGN.chart`. The Properties container with only the plugin's rows is hidden with a six-class selector, Obsidian's editing-mode rule weighs five. |
| "All N" expands the recent list | ✓ | — | |
| Broken person: quiet line with the problem, note untouched, absent from the feed | ✓ | — | |
| Stats: period, numbers with deltas, chart, Falling behind, Most often | ✓ | — | The view never opened: a private `open(name)` shadowed `View.open(containerEl)`; renamed. |
| "Log an interaction with this person" command from a person's note | ✓ | — | |
| 151 people: feed and search open without a noticeable delay | ✓ | ✓ | |
| Day starts at 4:00: at 00:xx on 27 Oct, "Today" is Mon 26 Oct | ✓ | — | Happened to be true on the laptop's clock during the tryout. |

Left for Max to click through in the scratch Obsidian (it stays open): the same list by hand, especially the feel of the forks on a phone and the person block next to a note's real properties.

## After Max's look (2026-10-27)

- Rows and buttons were squircles: Obsidian 1.14 sets `corner-shape`; every circle and capsule now says `round`.
- The phone's input chrome and the modal's own header were showing: stripped.
- The stats button moved next to the "+" as a quiet round button; no drop shadows anywhere.
- Who, How and Edit are pages inside the Friends tab on both platforms, and the tab's own back and forward arrows walk through them (the views are `navigation` views; the page is the tab's state). The typed search comes back with the page.
- Renamed to Friends Tracker: id `friends-tracker`, tag `#friend`, folder `Friends`, classes `ft-`.

## 0.1.1 (2026-10-27)

- Stats opens in the Friends tab itself, so the tab's back arrow leads to the feed; its own drawn back arrow is gone. A person tapped in Stats, in the feed's Edit page or on How opens in that same tab, and back leads to where it was tapped.
- Typing in the search no longer re-opens and re-reveals the Friends tab on every character (the page host updates the tab already showing the page); the search field asks the phone for no capitals and no autocorrect; the person line on How and Edit leads to the note.
- Every qualifier is written out (`company: one_on_one`, `length: some_time`, `purpose: talk` too); a record missing one is unreadable, nothing is guessed. Max's notes from 0.1.0 were migrated by a one-off script outside the plugin.
- Checked in the scratch Obsidian, phone layout and desktop: feed ↔ Stats ↔ person note, feed → Who (typed query) → How → person note, back and forward through all of it, Edit from a feed row. Not checked: the phone's own keyboard (the reported "+" and caps bugs could not be reproduced in the emulated phone; the likely causes were removed).

## 0.2.0 (2026-10-27): the time of day

- Checked in the scratch Obsidian on the desktop: a new interaction opens with the current time under the title; the time picker (24 round hours, 12 round minutes in fives) changes it and closes on the minute; the note gets `time: "09:15"`; the feed shows the time before the chevron and orders the day 01:30 → 23:00 → 09:15 with day start 4, the untimed rows last; Edit shows the record's time; changing the kind keeps the time (found and fixed during the tryout).
- Not checked on the phone layout: the picker is a plain modal like the date picker, so the same rules apply.

