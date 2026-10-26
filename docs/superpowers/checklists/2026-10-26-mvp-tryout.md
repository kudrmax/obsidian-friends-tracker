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
