# Time within a day — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Every interaction carries the time of day it happened; the feed orders a day's rows by it; How/Edit show and change it.

**Architecture:** A `LocalTime` value object in the domain; `Interaction` gains an optional `time`; the codec reads and writes `time: "HH:MM"`; `PeopleService.feed` orders a day's rows by time with the day's start hour from the clock; the UI gets a `TimePicker` modal next to `DatePicker`, a second subtle button in the sheet header and a grey time on feed rows.

**Tech Stack:** TypeScript, vitest, Obsidian API. **Spec:** `docs/superpowers/specs/2026-10-26-people-tracker-design.md`, section "Дополнение 2026-10-27".

## Global Constraints

- Nothing is implied: a record without `time` shows no time and is sorted last; the plugin never invents one.
- Every look value is a `--ft-*` token (tests/styles.test.ts).
- UI text in English; the property name `time` is a setting like the others.

## Tasks

### Task 1: `LocalTime`
- Create `src/domain/LocalTime.ts`: `LocalTime.of(hour, minute)`, `LocalTime.parse("HH:MM") | null`, `LocalTime.fromDate(Date)`, `hour`, `minute`, `toString()` → "HH:MM", `equals`, `compare(other)`, `minutesSince(startHour)` → minutes from the day's start (a time before the start hour wraps past midnight).
- Test `tests/LocalTime.test.ts`: parse accepts "08:05", rejects "8:05", "24:00", "18:60"; toString pads; `minutesSince(4)` of 01:30 is 21*60+30, of 04:00 is 0, of 23:00 is 19*60.

### Task 2: `Interaction.time`, `sameInteraction`, `Clock.now`
- `Interaction` variants gain `readonly time?: LocalTime`. `sameInteraction` also compares `time` (both absent, or equal).
- `Clock` gains `time(): LocalTime` and `dayStartHour(): number`; `DayStartClock` implements both.
- Tests: Interaction.test (same vs different time), Clock.test (`time()` is the wall clock, `dayStartHour()` follows the setting).

### Task 3: Codec
- `PropertyNames.time` ("time"); write `time` when present; read a string `HH:MM`, missing → no time, anything else → `PersonDecodeError("time: invalid …")`. settings `loadProperties` and `SettingsTab` `PROPERTY_KEYS` include it.
- Tests: round trip with and without time; invalid time refused; Settings test loads `time`.

### Task 4: Feed order within a day
- `PeopleService.feed`: rows of a day sorted by `time.minutesSince(clock.dayStartHour())` descending; rows without time after them, by name then index. Test clock stub gains `time`/`dayStartHour`.
- Test: 23:00 before 18:40; 01:30 above 23:00 with day start 4; untimed last.

### Task 5: How state and header
- `HowState.time?`; new How starts with `service.now()` time; `toInteraction`/`fromInteraction` carry it.
- `sheetHeader` subtitle becomes a row `.ft-sheet-subtitle` holding the date button and the time button ("No time" when absent).
- `TimePicker` modal (`src/ui/TimePicker.ts`): hours grid 6×4 of `.ft-picker-day`-styled round buttons, minutes grid of 12 (00…55); picking a minute closes; the picked hour/minute highlighted.
- Tests: howState carries time.

### Task 6: Feed row time
- `RowOptions.meta?: string` → `.ft-row-meta` (grey small tabular) before the chevron; FeedView passes the time.
- Styles: tokens only; `tests/styles.test.ts` green.

### Task 7: Docs, tryout, release
- README feature line; checklist entry; scratch Obsidian: log with time, edit time, feed order, phone layout; release 0.2.0; BRAT.
