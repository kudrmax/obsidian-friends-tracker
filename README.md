# Friends Tracker

Who you talked to and how, inside [Obsidian](https://obsidian.md). Every person is a note; every interaction is a line in its frontmatter.

- **The feed.** One list of what you logged, newest day first and, within a day, latest first by the time of day. Each row is a person, how you met (a text, a call or a meeting) and when. Tap a row to change or delete it.
- **Two taps to log.** The round "+" opens a search over your people (the ones you logged last come first), then one row of buttons per choice: how, and for a meeting whether it was one on one or in company and whether it took the whole day; for a call whether it was a talk or a shared activity. A person you don't have yet is added right from the search. The date and the time of day stand under the title, each a tap away from changing; a new interaction starts at now.
- **In the note.** A person's note carries a panel above its text, drawn like Obsidian's Properties: days since you last met and, when something came later, since your last contact of any kind (in red once the silence is longer than usual), the usual gap, the past year against the year before, since when you know each other, a chart by weeks, months or years with how many texts, calls and meetings it holds, the latest interactions. Tap one to change or delete it: Edit opens over the note in the same tab, and ✓, ✕ or the back arrow bring the note back.
- **Stats.** How much you talk to people this week, month or year and whether that grows; who you are falling behind with against your usual rhythm; who you see most.
- **Plain Markdown.** People are notes with a tag (or in a folder); interactions live in their frontmatter and sync with the vault.

```yaml
interactions:
  - date: 2026-10-26
    time: "18:40"
    kind: meeting
    company: one_on_one
    length: some_time
```

Every qualifier is written out; a record that lacks one is reported as unreadable rather than guessed. `time` is optional: records made before 0.2.0 have none and sort after the timed ones of their day.

## Development

```bash
npm install
npm test
npm run build
```
