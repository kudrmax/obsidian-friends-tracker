# Friends Tracker

Who you talked to and how, inside [Obsidian](https://obsidian.md). Every person is a note; every interaction is a line in its frontmatter.

- **The feed.** One list of what you logged, newest day first and, within a day, latest first by the time of day. Each row is a person, how you met (a text, a call or a meeting) and when. Tap a row to change or delete it.
- **Two taps to log.** The round "+" opens a search over your people (the ones you logged last come first), then one row of buttons per choice: how, and for a meeting whether it was one on one or in company and whether it took the whole day; for a call whether it was a talk or a shared activity. Last comes who started it, you or them: optional, so ✓ saves without it, and a second tap on the picked answer unpicks it. A person you don't have yet is added right from the search. The date and the time of day stand under the title, each a tap away from changing; a new interaction starts at now.
- **In the note.** A person's note carries a panel above its text, drawn like Obsidian's Properties: days since you last met and, when something came later, since your last contact of any kind, how often you want to be in touch, the usual gap, the past year against the year before, how often you start and how often they do, over every interaction where it is marked, since when you know each other, a chart by weeks, months or years with how many texts, calls and meetings it holds, the latest interactions. Tap one to change or delete it: Edit opens over the note in the same tab, and ✓, ✕ or the back arrow bring the note back.
- **Reach out.** Give a person a target in their note, "contact every 14 days". When the days since your last interaction of any kind come close to it, the person turns yellow; once they pass it, red. The ones to call stand at the top of the feed, the late first. Stats lists everyone with a target in the same order, so you see whom you gave which target; those on track are not coloured. A heads-up setting decides how close is close (20% of the target by default), and each person can do without the yellow stage. People without a target are never coloured or listed.
- **Stats.** How much you talk to people this week, month or year and whether that grows; who started, you or them, in percent of that period; everyone with a target and how long since you were last in touch; who you see most, each with how often you started.
- **Plain Markdown.** People are notes with a tag (or in a folder); interactions live in their frontmatter and sync with the vault.

```yaml
interactions:
  - date: 2026-10-26
    time: "18:40"
    kind: meeting
    company: one_on_one
    length: some_time
    initiated: me
contact_every: 14
heads_up: true
```

Every qualifier is written out; a record that lacks one is reported as unreadable rather than guessed. `time` is optional: records made before 0.2.0 have none and sort after the timed ones of their day. `initiated` (`me` or `them`) is optional too: a record without it is simply not marked, and the percentages count only the marked ones.

## Development

```bash
npm install
npm test
npm run build
```
