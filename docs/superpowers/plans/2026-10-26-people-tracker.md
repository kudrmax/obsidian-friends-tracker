# People Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Плагин Obsidian, в котором каждый человек — заметка, каждое взаимодействие — запись в её frontmatter, а лента, два шага добавления, правка, блок в заметке и статистика выглядят ровно как согласованные макеты.

**Architecture:** Повтор устройства Marble Habit Tracker: `domain` (чистые типы и статистика), `application` (сервис и порт репозитория), `infrastructure` (кодек frontmatter и репозиторий поверх Obsidian), `ui` (view-ы, шторки, блок в заметке). Данные только во frontmatter заметок, настройки в `data.json`. Один `styles.css` с токенами и тест, который не пускает голые значения в правила.

**Tech Stack:** TypeScript 7, esbuild, vitest 5, obsidian API 1.13. Без зависимостей кроме dev.

**Spec:** `docs/superpowers/specs/2026-10-26-people-tracker-design.md` и `docs/design/README.md` (макеты в `docs/design/canvas/`). Где они расходятся, правы макеты.

## Global Constraints

- Интерфейс целиком на английском; подписи форматов и уточнений по умолчанию: Text, Call, Meeting; One on one, In company; Some time, Whole day; Talk, Shared activity.
- Данные только во frontmatter заметки человека, свойство `interactions` (§4 спеки); запись через `app.fileManager.processFrontMatter`, чтение списков через `metadataCache`.
- Неизвестные ключи frontmatter и неизвестные поля записи сохраняются как есть.
- Люди: по тегу `#people-tracker` (вложенные теги считаются) или по папке, по умолчанию тег; новые заметки в папке `People`.
- Блок в заметке собирается из классов Obsidian `metadata-container`, `metadata-properties-heading`, `metadata-property`, `metadata-property-key`, `metadata-property-icon`, `metadata-property-key-input`, `metadata-property-value`, `metadata-input-longtext`; свой CSS только для графика и списка.
- `styles.css`: все значения в токенах `--pt-…` в блоке `body { … }`, правила читают только `var(--pt-…)`; `tests/styles.test.ts` падает на голое число, цвет или радиус в правиле и на неиспользуемый токен.
- Всё круглое: круг `--pt-radius-circle`, что шире чем выше — капсула `--pt-radius-capsule`.
- Телефон первым: все экраны рисуются под 390 pt, десктоп — тот же экран в широкой вкладке, колонка `--pt-column: 640px`.
- Сборка никогда не копируется в `~/Obsidian`; проба в отдельном Obsidian со scratch-vault (CLAUDE.md плагина).
- Коммиты на ветке, не на `main`: ветка `feature/mvp` от `main`.

## Review Focus

1. Заметка человека с `interactions`, где одна запись битая (дата `2026-13-40` или `kind: hug`): человек показывается приглушённым с причиной, плагин в заметку не пишет. Тест в Task 3.
2. Правка записи, когда заметка изменилась между открытием шторки и сохранением (позиция занята другой записью): правка отклоняется с Notice, ничего не перезаписано. Тест в Task 6.
3. Две одинаковые записи в один день (два созвона): обе остаются, в ленте две строки, удаление убирает ровно одну. Тест в Task 2 и Task 6.
4. Переход суток в 4:00 (`dayStartHour`): в 3:59 «Today» в ленте и в шторке — вчерашняя календарная дата; дата будущего дня в календаре не выбирается. Тест в Task 6.
5. 150 людей и 3000 записей: лента строит только первую порцию (30 дней), `searchPeople` не читает тела файлов, только кэш метаданных. Тест на порцию в Task 6; на производительность — ручная проба в Task 15.

---

### Task 1: Каркас проекта

**Files:**
- Create: `package.json`, `tsconfig.json`, `esbuild.config.mjs`, `vitest.config.mts`, `manifest.json`, `versions.json`, `src/main.ts`, `styles.css`, `src/ui/design.ts`, `tests/styles.test.ts`, `CLAUDE.md`, `README.md`
- Test: `tests/styles.test.ts`

**Interfaces:**
- Produces: `npm test`, `npm run build`, `npm run dev`; плагин id `people-tracker`, name `People Tracker`, `minAppVersion` `1.7.2`, версия `0.1.0`.

- [ ] **Step 1: Ветка**

```bash
git checkout -b feature/mvp main
```

- [ ] **Step 2: Скопировать конфиги из `../obsidian-marble-habit-tracker`**

`package.json` (имя `obsidian-people-tracker`, те же devDependencies и scripts), `tsconfig.json`, `esbuild.config.mjs`, `vitest.config.mts` без изменений. `manifest.json`: id `people-tracker`, name `People Tracker`, description «Who you talked to and how. Every person is a note, every interaction a line in its frontmatter.», author `kudrmax`, `isDesktopOnly: false`. `versions.json`: `{"0.1.0": "1.7.2"}`.

- [ ] **Step 3: `tests/styles.test.ts` и `src/ui/design.ts`**

Скопировать `tests/styles.test.ts` привычек, заменив префикс `--th-` на `--pt-` и имя класса-корня `tiny-habits` на `people-tracker`. `src/ui/design.ts` экспортирует `DESIGN` и `DESIGN_TOKENS` в той же форме, что у привычек, пока с одной парой: `row: 60` ↔ `--pt-row`.

- [ ] **Step 4: `styles.css` с токенами макетов**

Блок `body { … }` с токенами (значения из макетов, цвета через переменные Obsidian): `--pt-bg: var(--background-primary)`, `--pt-surface: var(--background-secondary)`, `--pt-text: var(--text-normal)`, `--pt-muted: var(--text-muted)`, `--pt-faint: var(--text-faint)`, `--pt-line: var(--background-modifier-border)`, `--pt-accent: var(--interactive-accent)`, `--pt-accent-tint: hsla(var(--interactive-accent-hsl), 0.16)`, `--pt-on-accent: var(--text-on-accent)`, `--pt-strong: var(--text-normal)`, `--pt-on-strong: var(--background-primary)`, `--pt-fill: rgba(118, 118, 128, 0.16)`, `--pt-danger: var(--color-red)`, `--pt-up: var(--color-green)`; `--pt-radius-circle: 50%`, `--pt-radius-capsule: 999px`; `--pt-gutter: 20px`, `--pt-column: 640px`, `--pt-row: 60px`, `--pt-circle: 40px`, `--pt-button: 44px`, `--pt-fab: 56px`, `--pt-search: 40px`, `--pt-chevron: 14px`, `--pt-icon: 20px`, `--pt-icon-button: 22px`, `--pt-icon-capsule: 16px`; `--pt-font-title: 30px`, `--pt-font-header: 17px`, `--pt-font-body: 17px`, `--pt-font-capsule: 15px`, `--pt-font-small: 13px`, `--pt-font-micro: 10px`, `--pt-font-number: 32px`; `--pt-leading-body: 22px`, `--pt-leading-small: 17px`; `--pt-space-1/2/4/6/8/12/16/20/24/28/36/40`; `--pt-weight-regular/medium/semibold/bold` через `--font-*` Obsidian; `--pt-fast: 150ms ease`. Пока без правил компонентов.

- [ ] **Step 5: `src/main.ts` — пустой плагин**

`export default class PeopleTrackerPlugin extends Plugin { override async onload(): Promise<void> {} }`.

- [ ] **Step 6: `CLAUDE.md` и `README.md`**

`CLAUDE.md`: разделы «One design system», «Trying a build», «User-facing text stays true» как у привычек, с заменой имён (`--pt-`, `people-tracker`, папка плагина `.obsidian/plugins/people-tracker/`). `README.md`: что делает плагин в четырёх пунктах (feed, add in two taps, person block, stats) и раздел Development с тремя командами.

- [ ] **Step 7: Проверить**

Run: `npm install && npm test && npm run build`
Expected: `styles.test.ts` PASS, `main.js` собран.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "Scaffold the plugin"
```

---

### Task 2: Домен — даты, записи, человек

**Files:**
- Create: `src/domain/LocalDate.ts`, `src/domain/Clock.ts`, `src/domain/DomainError.ts`, `src/domain/Interaction.ts`, `src/domain/Person.ts`
- Test: `tests/LocalDate.test.ts`, `tests/Clock.test.ts`, `tests/Interaction.test.ts`, `tests/Person.test.ts`

**Interfaces:**
- Produces:
  - `LocalDate`, `Clock`, `DayStartClock`, `DomainError` — скопированы из привычек вместе с их тестами (`tests/LocalDate.test.ts`, `tests/Clock.test.ts`).
  - `src/domain/Interaction.ts`:
    ```ts
    export type Kind = "text" | "call" | "meeting";
    export const KINDS: readonly Kind[];
    export type Company = "one_on_one" | "group";
    export type Length = "some_time" | "whole_day";
    export type Purpose = "talk" | "activity";
    export type Interaction =
      | { readonly date: LocalDate; readonly kind: "text" }
      | { readonly date: LocalDate; readonly kind: "call"; readonly purpose: Purpose }
      | { readonly date: LocalDate; readonly kind: "meeting"; readonly company: Company; readonly length: Length };
    export function sameInteraction(a: Interaction, b: Interaction): boolean;
    /** Слово-подпись записи для ленты и списков: "Meeting, one on one", "Call, shared activity", "Text". */
    export function describe(interaction: Interaction, labels: Labels): string;
    ```
    `Labels` — `Record<Kind | Company | Length | Purpose, string>`; `DEFAULT_LABELS` с английскими подписями из Global Constraints. `describe` не упоминает значения по умолчанию (`one_on_one` упоминается, `some_time` и `talk` — нет): «Meeting, one on one», «Meeting, in company, whole day», «Call», «Call, shared activity», «Text».
  - `src/domain/Person.ts`:
    ```ts
    /** extras[i] — поля записи interactions[i], которых кодек не знает; переживают encode. */
    export interface PersonState { readonly name: string; readonly interactions: readonly Interaction[]; readonly extras?: readonly Record<string, unknown>[] }
    export class Person {
      static restore(state: PersonState): Person;        // имя не пустое и без \ / : * ? " < > | # ^ [ ]
      static create(name: string): Person;
      get name(): string;
      /** От новых к старым, внутри дня в порядке добавления. */
      interactions(): readonly Interaction[];
      lastDate(): LocalDate | undefined;
      add(interaction: Interaction, today: LocalDate): Person;   // DomainError на дату после today
      replaceAt(index: number, expected: Interaction, next: Interaction, today: LocalDate): Person; // DomainError "Interaction changed" если на index не expected
      removeAt(index: number, expected: Interaction): Person;
    }
    ```

- [ ] **Step 1: Скопировать `LocalDate`, `Clock`, `DomainError` и их тесты из привычек**

Run: `npm test` — Expected: PASS.

- [ ] **Step 2: Тест `tests/Interaction.test.ts`**

```ts
it("describes a meeting with only the non-default qualifiers", () => {
  expect(describe({ date: d("2026-10-24"), kind: "meeting", company: "one_on_one", length: "some_time" }, DEFAULT_LABELS)).toBe("Meeting, one on one");
  expect(describe({ date: d("2026-10-24"), kind: "meeting", company: "group", length: "whole_day" }, DEFAULT_LABELS)).toBe("Meeting, in company, whole day");
  expect(describe({ date: d("2026-10-24"), kind: "call", purpose: "talk" }, DEFAULT_LABELS)).toBe("Call");
  expect(describe({ date: d("2026-10-24"), kind: "call", purpose: "activity" }, DEFAULT_LABELS)).toBe("Call, shared activity");
  expect(describe({ date: d("2026-10-24"), kind: "text" }, DEFAULT_LABELS)).toBe("Text");
});
```
`d` — helper из `tests/support/dates.ts` (скопировать из привычек).

- [ ] **Step 3: Run — FAIL (module not found). Реализовать `Interaction.ts`. Run — PASS.**

- [ ] **Step 4: Тест `tests/Person.test.ts`**

Кейсы с assert'ами:
- `add` ставит запись первой, две записи одного дня остаются обе в порядке добавления;
- `add` с датой после `today` бросает `DomainError`;
- `replaceAt(0, other, next)` бросает `DomainError("Interaction changed")`, когда на позиции не `other`;
- `removeAt` при двух одинаковых записях убирает ровно одну;
- `restore` с именем `a/b` бросает `DomainError`;
- `lastDate()` у пустого — `undefined`, иначе дата первой записи.

- [ ] **Step 5: Run — FAIL. Реализовать `Person.ts`. Run — PASS.**

- [ ] **Step 6: Commit** `git add -A && git commit -m "Add the domain: dates, interactions, person"`

---

### Task 3: Кодек frontmatter

**Files:**
- Create: `src/infrastructure/PersonCodec.ts`
- Test: `tests/PersonCodec.test.ts`

**Interfaces:**
- Consumes: `Person`, `Interaction` (Task 2).
- Produces:
  ```ts
  export type Frontmatter = Record<string, unknown>;
  export class PersonDecodeError extends Error {}
  export interface PropertyNames { readonly interactions: string; readonly date: string; readonly kind: string; readonly company: string; readonly length: string; readonly purpose: string; readonly kinds: Record<Kind, string>; readonly companies: Record<Company, string>; readonly lengths: Record<Length, string>; readonly purposes: Record<Purpose, string> }
  export const DEFAULT_PROPERTY_NAMES: PropertyNames; // interactions, date, kind, company, length, purpose; значения как в типах
  export function decodePerson(name: string, frontmatter: Frontmatter | null | undefined, keys?: PropertyNames): Person;
  export function encodePerson(person: Person, frontmatter: Frontmatter, keys?: PropertyNames): void;
  ```

- [ ] **Step 1: Тест `tests/PersonCodec.test.ts`**

- round trip примера из §4 спеки (3 записи) даёт тот же YAML-объект: у `meeting` поля `company: group`, `length: whole_day`; у `call` `purpose: activity`; у `text` только `date` и `kind`;
- запись `meeting` с `one_on_one`/`some_time` кодируется без `company` и `length`; `call` с `talk` — без `purpose`;
- отсутствующие `company`/`length`/`purpose` читаются как значения по умолчанию;
- `date` как объект `Date` (так отдаёт metadataCache) читается;
- неизвестное поле записи (`mood: good`) и неизвестный ключ frontmatter (`tags`) переживают `encodePerson` после `decodePerson`;
- `kind: hug` → `PersonDecodeError` с текстом, содержащим `hug`; `date: 2026-13-40` → `PersonDecodeError`; `company` у `text` → `PersonDecodeError`;
- `frontmatter` без `interactions` → человек без записей (не ошибка);
- запись кладётся по дате от новых к старым.

- [ ] **Step 2: Run — FAIL. Реализовать `PersonCodec.ts` по образцу `HabitCodec.ts` (функции `list`, `readDate`, `put`, `nonEmpty` переносятся). Run — PASS.**

Неизвестные поля записи: кодек кладёт их в `extras[i]` (Task 2) и при `encode` копирует обратно поверх своих полей; `add`/`replaceAt`/`removeAt` у `Person` держат `extras` параллельно `interactions`.

- [ ] **Step 3: Commit** `git commit -am "Encode and decode a person's frontmatter"`

---

### Task 4: Репозиторий и порт

**Files:**
- Create: `src/application/ports.ts`, `src/infrastructure/FrontmatterPersonRepository.ts`, `tests/support/InMemoryPersonRepository.ts`
- Test: `tests/InMemoryPersonRepository.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type PersonEntry = { kind: "ok"; path: string; person: Person } | { kind: "broken"; path: string; name: string; problem: string };
  export interface PersonRepository {
    contains(path: string): boolean;
    list(): PersonEntry[];
    get(path: string): PersonEntry | undefined;
    update(path: string, change: (person: Person) => Person): Promise<Person>;
    create(person: Person): Promise<string>;   // DomainError "… already exists"
  }
  export interface PeopleScope { readonly source: "tag" | "folder"; readonly tag: string; readonly folder: string }
  ```
  `FrontmatterPersonRepository(app, scope: () => PeopleScope, keys: () => PropertyNames)` — копия `FrontmatterHabitRepository` с подстановкой кодека; в режиме тега новой заметке ставится `tags: [tag]`. `InMemoryPersonRepository` — копия `InMemoryHabitRepository` из привычек.

- [ ] **Step 1: Тест InMemory-репозитория: `create` дважды одно имя → `DomainError`; `update` возвращает изменённого человека и `get` отдаёт его.**
- [ ] **Step 2: Реализовать оба репозитория. Run — PASS. `npm run build` — компилируется.**
- [ ] **Step 3: Commit** `git commit -am "Add the person repository"`

---

### Task 5: Статистика

**Files:**
- Create: `src/domain/Stats.ts`
- Test: `tests/Stats.test.ts`

**Interfaces:**
- Consumes: `Person`, `Interaction`, `LocalDate`.
- Produces:
  ```ts
  export type Period = "week" | "month" | "year";       // 7, 30, 365 дней включая today
  export function daysSince(person: Person, today: LocalDate): number | undefined;
  /** Медиана перерывов между днями с записью за последние 365 дней; undefined, если таких дней меньше трёх. Округление до целого. */
  export function usualGap(person: Person, today: LocalDate): number | undefined;
  export interface MonthBar { readonly year: number; readonly month: number; readonly text: number; readonly call: number; readonly meeting: number; readonly wholeDay: number }
  /** 12 календарных месяцев, последний — текущий; whole_day считается отдельно от meeting. */
  export function byMonth(interactions: readonly Interaction[], today: LocalDate): MonthBar[];
  export interface PeriodTotals { readonly interactions: number; readonly people: number; readonly interactionsDelta: number; readonly peopleDelta: number }
  export function totals(people: readonly Person[], period: Period, today: LocalDate): PeriodTotals;
  export interface Behind { readonly person: Person; readonly days: number; readonly usual: number }
  /** days > usual, сортировка по days/usual по убыванию. */
  export function fallingBehind(people: readonly Person[], today: LocalDate): Behind[];
  export interface Often { readonly person: Person; readonly count: number }
  export function mostOften(people: readonly Person[], period: Period, today: LocalDate): Often[]; // count > 0, по убыванию, затем по имени
  ```

- [ ] **Step 1: Тесты со значениями макета**

- `usualGap`: дни с записью `[t-60, t-41, t-22, t-3]` (today = t) → перерывы 19, 19, 19 → 19; два дня → `undefined`; две записи в один день — один день;
- `daysSince` для последней записи 41 день назад → 41; без записей → `undefined`;
- `byMonth` на today = 2026-10-26 даёт 12 элементов, первый 2025-11, последний 2026-10; `meeting` с `whole_day` идёт в `wholeDay`, не в `meeting`;
- `totals("month")`: 23 записи у 11 человек за 30 дней, 19 у 13 за предыдущие 30 → `{23, 11, +4, −2}`; сегодняшний день входит;
- `fallingBehind`: Seryozha 41/19, Anya 23/12, Dima 17/10 → порядок Seryozha (2.16), Anya (1.92), Dima (1.7); человек с двумя днями за год не попадает; человек с days ≤ usual не попадает;
- `mostOften("month")`: Katya 9, Pasha 5, Lyosha 4.

- [ ] **Step 2: Run — FAIL. Реализовать. Run — PASS.**
- [ ] **Step 3: Commit** `git commit -am "Add the statistics"`

---

### Task 6: Сервис

**Files:**
- Create: `src/application/PeopleService.ts`
- Test: `tests/PeopleService.test.ts`

**Interfaces:**
- Consumes: `PersonRepository`, `Clock`, `Stats`.
- Produces:
  ```ts
  export interface FeedRow { readonly path: string; readonly name: string; readonly index: number; readonly interaction: Interaction }
  export interface FeedDay { readonly date: LocalDate; readonly rows: FeedRow[] }   // rows: по людям в порядке имени, внутри человека в порядке добавления
  export interface SearchResult { readonly recent: PersonHit[]; readonly everyone: PersonHit[]; readonly exact: boolean }
  export interface PersonHit { readonly path: string; readonly name: string; readonly last: LocalDate | undefined }
  export class PeopleService {
    constructor(repository: PersonRepository, clock: Clock);
    today(): LocalDate;
    /** Дни с записями, от новых к старым, начиная с `before` (не включая) или с today; не больше `days` календарных дней. */
    feed(days: number, before?: LocalDate): FeedDay[];
    /** recent: люди с записями, по дате последней от новых; everyone: остальные по имени; при query фильтр подстрокой без регистра. exact — есть человек с таким именем. */
    searchPeople(query: string): SearchResult;
    addInteraction(path: string, interaction: Interaction): Promise<Person>;
    replaceInteraction(path: string, index: number, expected: Interaction, next: Interaction): Promise<Person>;
    removeInteraction(path: string, index: number, expected: Interaction): Promise<Person>;
    createPerson(name: string): Promise<string>;   // path
    people(): Person[];                            // только ok-записи
  }
  ```

- [ ] **Step 1: Тесты**

- `feed(30)` с записями за today, t-2, t-45 возвращает два дня; `feed(30, t-2)` — день t-45;
- `feed` отдаёт две строки для двух созвонов одного человека в один день с `index` 0 и 1;
- `searchPeople("se")` с Seryozha (last t-7), Senya (last t-24), Ksenia (last t-73), Aleseya (без записей) → recent `[Seryozha, Senya, Ksenia]`, everyone `[Aleseya]`, `exact: false`; `searchPeople("Senya")` → `exact: true`; `searchPeople("")` → все люди с записями в recent;
- `addInteraction` с датой после today → `DomainError`;
- `replaceInteraction` с устаревшим `expected` → `DomainError` и запись не изменилась (StaleReadRepository из привычек не нужен: достаточно InMemory с другой записью на позиции);
- `DayStartClock` с `startHour: 4` и `now` = 03:59 → `today()` вчерашняя дата.

- [ ] **Step 2: Run — FAIL. Реализовать. Run — PASS.**
- [ ] **Step 3: Commit** `git commit -am "Add the people service"`

---

### Task 7: Настройки и вкладка настроек

**Files:**
- Create: `src/settings.ts`, `src/ui/SettingsTab.ts`
- Test: `tests/Settings.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface PeopleSettings { source: "tag" | "folder"; tag: string; folder: string; personBlock: boolean; properties: PropertyNames; labels: Labels; dayStartHour: number }
  export const DEFAULT_SETTINGS: PeopleSettings; // tag "people-tracker", folder "People", personBlock true, dayStartHour 4
  export function loadSettings(raw: unknown): PeopleSettings;  // неизвестное/битое → значение по умолчанию, поле за полем
  export interface SettingsHost { config: PeopleSettings; saveSettings(): Promise<void> }
  export class SettingsTab extends PluginSettingTab { constructor(app: App, host: SettingsHost & Plugin) }
  ```
  Вкладка: People (source dropdown, tag, folder), Person block toggle, Day starts at (0–12), Labels (десять текстовых полей), Property names (шесть полей и четыре группы значений). Описания — по одному предложению, что настройка меняет.

- [ ] **Step 1: Тест: `loadSettings(null)` = DEFAULT; `loadSettings({tag: 5, dayStartHour: "x"})` → tag и dayStartHour по умолчанию; `loadSettings({labels: {meeting: "Met"}})` → только `meeting` заменён.**
- [ ] **Step 2: Реализовать. Run — PASS.**
- [ ] **Step 3: Commit** `git commit -am "Add settings"`

---

### Task 8: Общие части интерфейса и их CSS

**Files:**
- Create: `src/ui/components.ts`, `src/ui/format.ts`
- Modify: `styles.css`, `src/ui/design.ts`
- Test: `tests/format.test.ts`, `tests/styles.test.ts` (уже есть)

**Interfaces:**
- Produces (`components.ts`, все возвращают `HTMLElement` и ставят классы `pt-…`):
  ```ts
  export function circle(parent: HTMLElement, content: { initial: string } | { icon: IconName; accent?: boolean }): HTMLElement; // .pt-circle, .is-accent
  export function row(parent: HTMLElement, opts: { circle: Parameters<typeof circle>[1]; title: string; subtitle?: string; trailing?: "chevron" | { text: string; strong?: boolean }; onClick?: () => void }): HTMLElement; // .pt-row 60px
  export function dayHeader(parent: HTMLElement, dayName: string, date: string): HTMLElement; // .pt-day
  export function sectionLabel(parent: HTMLElement, text: string): HTMLElement; // .pt-section
  export function forkRow<T extends string>(parent: HTMLElement, label: string, options: readonly { value: T; text: string; icon?: IconName }[], selected: T | undefined, onPick: (value: T) => void): HTMLElement; // .pt-fork, кнопки .pt-capsule.is-on
  export function iconButton(parent: HTMLElement, icon: IconName, label: string, onClick: () => void, filled?: boolean): HTMLButtonElement; // .pt-icon-button, .is-filled (белый круг ✓)
  export function sheetHeader(parent: HTMLElement, opts: { left: { icon: "x" | "chevron-left"; onClick: () => void }; title: string; subtitle?: HTMLElement; right?: HTMLElement[] }): HTMLElement; // grid 1fr auto 1fr
  export function fab(parent: HTMLElement, onClick: () => void): HTMLButtonElement; // .pt-fab
  export type IconName = "message-circle" | "phone" | "users" | "user" | "clock" | "sun" | "gamepad-2" | "message-square" | "bar-chart-3" | "plus" | "check" | "x" | "chevron-left" | "chevron-right" | "chevron-down" | "trash-2" | "search" | "calendar";
  ```
  Иконки формата: text `message-circle`, call `phone`, meeting `users`; уточнений: one_on_one `user`, group `users`, some_time `clock`, whole_day `sun`, talk `message-square`, activity `gamepad-2`. `KIND_ICONS: Record<Kind, IconName>`, `QUALIFIER_ICONS`.
- Produces (`format.ts`):
  ```ts
  export function dayName(date: LocalDate, today: LocalDate): string;   // "Today", "Yesterday", иначе "Friday"
  export function dayDate(date: LocalDate, today: LocalDate): string;   // "Sun, 26 Oct" для today/yesterday, иначе "24 Oct"; другой год — "24 Oct 2025"
  export function shortDate(date: LocalDate, today: LocalDate): string; // "19 Oct", другой год "Mar 2025"
  export function longDate(date: LocalDate, today: LocalDate): string;  // "Today" | "Yesterday" | "Sunday, 19 Oct"
  export function daysAgo(days: number): string;                       // "41 days ago", "1 day ago", "today"
  ```

- [ ] **Step 1: Тест `tests/format.test.ts` на каждую функцию с датами из макетов (today = 2026-10-26).**
- [ ] **Step 2: Реализовать `format.ts`. Run — PASS.**
- [ ] **Step 3: CSS компонентов в `styles.css`**

Правила по макетам (все значения через токены): `.pt-row` высота `--pt-row`, gap `--pt-space-12`; `.pt-circle` `--pt-circle`, фон `--pt-surface`, `.is-accent` фон `--pt-accent-tint` и цвет `--pt-accent`; `.pt-row-title` `--pt-font-body`/`--pt-leading-body`; `.pt-row-sub` `--pt-font-small`/`--pt-leading-small` цвет `--pt-muted`; `.pt-day` строка 28px: имя `--pt-font-capsule` semibold, дата `--pt-font-small` muted, gap `--pt-space-8`; группа дней: `margin-top --pt-space-12`, `padding-top --pt-space-12`, `border-top` `--pt-line` кроме первой; `.pt-section` 36px, `--pt-font-small` semibold muted, выравнивание по низу; `.pt-capsule` высота `--pt-button`, радиус капсула, фон `--pt-fill`, `.is-on` фон `--pt-strong` цвет `--pt-on-strong`; `.pt-fork` gap `--pt-space-8`, label над строкой; `.pt-icon-button` 44px, `.is-filled` круг `--pt-strong`; `.pt-fab` `--pt-fab`, тень в токене `--pt-fab-shadow`; `.pt-fade` градиент над `+`; `.pt-search` высота `--pt-search`, капсула, фон `--pt-surface`; `.pt-title` `--pt-font-title` bold; `.pt-number` `--pt-font-number` bold; `.pt-delta.is-up` `--pt-up`, `.is-down` `--pt-danger`; `.pt-danger` цвет `--pt-danger`. На телефоне (`.is-mobile .people-tracker`) системный шрифт `--pt-font-phone`.

- [ ] **Step 4: `npm test` — `styles.test.ts` PASS (ни одного голого значения, ни одного лишнего токена).**
- [ ] **Step 5: Commit** `git commit -am "Add the shared interface parts and their styles"`

---

### Task 9: Лента (главный экран)

**Files:**
- Create: `src/ui/FeedView.ts`, `src/ui/UiContext.ts`, `src/ui/feed.ts`
- Test: `tests/feed.test.ts`

**Interfaces:**
- Consumes: `PeopleService.feed`, `components`, `format`.
- Produces:
  ```ts
  export const FEED_VIEW = "people-tracker-feed";
  export interface UiContext { service: PeopleService; repository: PersonRepository; settings: () => PeopleSettings; openPerson(path: string): void; openStats(): void; newInteraction(): void; editInteraction(row: FeedRow): void }
  export class FeedView extends ItemView { constructor(leaf: WorkspaceLeaf, ui: UiContext); refresh(): void }
  // feed.ts — чистая часть, тестируется:
  export const PAGE_DAYS = 30;
  export function nextPage(days: FeedDay[], service: Pick<PeopleService, "feed">): FeedDay[]; // дописывает следующую порцию от последней даты
  ```
  Вёрстка по `Main.dc.html`: шапка с кнопкой статистики (иконка `bar-chart-3`), заголовок «People», группы дней `dayHeader` + `row` (круг с иконкой формата, `is-accent` для meeting; title имя; subtitle `describe(interaction)`; trailing chevron; onClick → `ui.editInteraction(row)`), `fab` → `ui.newInteraction()`, `.pt-fade` снизу. Подгрузка: при прокрутке до низа — `nextPage`. Пустая лента: строка «No interactions yet» muted и `fab`.

- [ ] **Step 1: Тест `nextPage`: после двух страниц по 30 дней третья начинается с даты на 60 дней раньше и не дублирует дни.**
- [ ] **Step 2: Реализовать `feed.ts`, Run — PASS; реализовать `FeedView.ts`; `npm run build`.**
- [ ] **Step 3: Commit** `git commit -am "Add the feed view"`

---

### Task 10: Новое взаимодействие — «Кто» и «Как»

**Files:**
- Create: `src/ui/WhoSheet.ts`, `src/ui/HowSheet.ts`, `src/ui/DatePicker.ts`, `src/ui/sheet.ts`
- Test: `tests/howState.test.ts`

**Interfaces:**
- Consumes: `PeopleService.searchPeople/createPerson/addInteraction`, `components`, `format`.
- Produces:
  ```ts
  // sheet.ts: общий каркас полноэкранной шторки на Modal, класс .pt-sheet .people-tracker, без кнопок Obsidian снизу
  export abstract class FullSheet extends Modal { protected abstract fill(body: HTMLElement): void }
  export class WhoSheet extends FullSheet { constructor(app: App, ui: UiContext) }
  export interface HowState { date: LocalDate; kind?: Kind; company?: Company; length?: Length; purpose?: Purpose }
  export function isComplete(state: HowState): boolean;     // text: kind; call: + purpose; meeting: + company + length
  export function toInteraction(state: HowState): Interaction; // DomainError если не complete
  export class HowSheet extends FullSheet { constructor(app: App, ui: UiContext, person: { path: string; name: string }, initial?: HowState) }
  export class DatePicker extends Modal { constructor(app: App, value: LocalDate, max: LocalDate, onPick: (date: LocalDate) => void) } // месяц сеткой, будущие дни недоступны
  ```
  `WhoSheet` по `Who.dc.html`: `sheetHeader` (✕, «New interaction»), `.pt-search` с автофокусом, первая строка `row` с кругом `plus` (белый, класс `.is-strong`) «Add “<query>”» / «New person» — только когда `query` непустой и `!exact`; секции `Recent` и `Everyone` из `searchPeople(query)`; subtitle строки — `shortDate(last)` или «No interactions yet»; совпадение подстроки в имени жирным (`<b>` внутри title). Тап по строке → `new HowSheet(...)`, шторка «Кто» закрывается. «Add» → `createPerson` → `HowSheet`.
  `HowSheet` по `How*.dc.html`: `sheetHeader` (chevron-left назад к Who, «New interaction», subtitle — кнопка `longDate(date) ▾` → `DatePicker`; справа `iconButton check` filled, disabled пока `!isComplete`), `row` человека без subtitle, `forkRow("How", KINDS)`, затем в зависимости от kind: call → `forkRow("What for", [talk, activity])`; meeting → `forkRow("Company", …)` и `forkRow("Length", …)`. ✓ → `addInteraction` → закрыть. В ленте над `+` на пять секунд появляется строка `.pt-undo` «<name>, <describe>» с кнопкой Undo (копия `undoLine` привычек с теми же токенами), Undo вызывает `removeInteraction` для только что добавленной записи (index 0 у этого человека, expected — она же).

- [ ] **Step 1: Тест `isComplete`/`toInteraction`: text сразу complete; call без purpose — нет; meeting с company без length — нет; `toInteraction` на неполном бросает `DomainError`.**
- [ ] **Step 2: Реализовать `sheet.ts`, `DatePicker.ts`, `WhoSheet.ts`, `HowSheet.ts`; `npm test`, `npm run build`.**
- [ ] **Step 3: CSS шторки в `styles.css`: `.pt-sheet` на весь экран на телефоне (как `.th-sheet` привычек), на десктопе модалка шириной `--pt-column`; `.pt-sheet-header` grid `1fr auto 1fr`; `tests/styles.test.ts` PASS.**
- [ ] **Step 4: Commit** `git commit -am "Add the new interaction flow"`

---

### Task 11: Правка записи

**Files:**
- Create: `src/ui/EditSheet.ts`
- Modify: `src/ui/HowSheet.ts` (вынести общую вёрстку форков в `renderForks(body, state, onChange)`)

**Interfaces:**
- Consumes: `PeopleService.replaceInteraction/removeInteraction`, `HowState`.
- Produces: `export class EditSheet extends FullSheet { constructor(app: App, ui: UiContext, row: FeedRow) }` по `Edit.dc.html`: заголовок «Edit interaction», subtitle дата записи (кнопка → DatePicker), слева ✕, справа `iconButton trash-2` (цвет `--pt-danger`, без заливки) и ✓ filled. Trash → `removeInteraction(path, index, expected)` → закрыть. ✓ → `replaceInteraction` → закрыть; `DomainError` → `Notice`, шторка остаётся.

- [ ] **Step 1: Реализовать; `npm run build`.**
- [ ] **Step 2: Commit** `git commit -am "Add editing an interaction"`

---

### Task 12: Блок в заметке человека

**Files:**
- Create: `src/ui/PersonNotes.ts`, `src/ui/PersonBlock.ts`, `src/ui/MonthChart.ts`
- Test: `tests/MonthChart.test.ts`

**Interfaces:**
- Consumes: `Stats.daysSince/usualGap/byMonth`, `describe`, `format`.
- Produces:
  - `PersonNotes` — копия `HabitNotes` привычек: ставит `PersonBlock` над заметкой в обоих режимах, прячет свои свойства (`properties.interactions` и `tags`, если в нём только тег плагина) классами `pt-own-property` / `pt-only-own`, пункт меню файла «Log an interaction» → `HowSheet` для этого человека, `activePerson(): string | null`.
  - `PersonBlock { el: HTMLElement; render(): void; moveTo(path): void }` — панель `metadata-container pt-person-panel` с заголовком `metadata-properties-heading` «Person» (сворачивается, как у привычек) и строками через `property(rows, icon, name)` ровно как в `HabitBlock`: `last seen` (icon `clock`) → `daysAgo`; `usual gap` (`align-justify`) → «19 days» или «—»; `this year` (`bar-chart-3`) → «47 interactions»; `by month` (`calendar`) → `MonthChart`; `recent` (`activity`) → три строки `pt-recent-row` (grid `--pt-recent-date` 52px, точка 10px цвета формата, `describe`), кнопка «All N» раскрывает все. Для `by month` и `recent` значение идёт под ключом на всю ширину (`.pt-person-panel .metadata-property.is-wide { flex-direction: column }`). Битый человек: одна строка `pt-panel-quiet` «Can't read this person: <problem>».
  - `MonthChart`: `export function monthChart(parent: HTMLElement, bars: MonthBar[]): HTMLElement` — 12 столбиков из слоёв text/call/meeting/wholeDay (классы `.pt-bar-text` и т.д., цвета токены `--pt-chart-text: var(--pt-faint)`, `--pt-chart-call: color-mix(in srgb, var(--pt-accent) 60%, var(--pt-surface))`, `--pt-chart-meeting: var(--pt-accent)`, `--pt-chart-whole: color-mix(in srgb, var(--pt-accent) 40%, white)`), высота слоя пропорциональна максимуму месяца, подписи месяцев одной буквой, легенда из четырёх подписей; `export function barHeights(bars: MonthBar[], max: number): number[][]` — чистая часть для теста.

- [ ] **Step 1: Тест `barHeights`: месяц с суммой 0 → нули; максимум даёт `max` px суммарно; пропорции слоёв сохраняются (целые px, сумма не больше max).**
- [ ] **Step 2: Реализовать `MonthChart`, Run — PASS; `PersonBlock`, `PersonNotes`; CSS только для `.pt-person-panel .is-wide`, `.pt-recent-row`, графика и легенды, через токены `--pt-property-padding: var(--input-padding)`, `--pt-property-text: var(--metadata-input-text-color)`, `--pt-property-font: var(--metadata-input-font-size)`; `pt-own-property`/`pt-only-own` → `display: none`.**
- [ ] **Step 3: `npm test` (styles), `npm run build`. Commit** `git commit -am "Add the person block inside Properties"`

---

### Task 13: Статистика

**Files:**
- Create: `src/ui/StatsView.ts`

**Interfaces:**
- Consumes: `Stats.totals/byMonth/fallingBehind/mostOften`, `components`, `monthChart`.
- Produces: `export const STATS_VIEW = "people-tracker-stats"; export class StatsView extends ItemView { constructor(leaf, ui: UiContext); refresh(): void }` по `Stats.dc.html`: шапка с chevron-left (закрывает view), `.pt-title` «Stats», `forkRow` без label для периода (Week/Month/Year, по умолчанию month, запоминается в `ui.settings()`? — нет: в состоянии view, `getState/setState`), два `.pt-number` с `.pt-delta`, `sectionLabel("By month")` + `monthChart(byMonth(all))`, `sectionLabel("Falling behind")` + до пяти `row` (initial, name, subtitle «Usually every N days», trailing `{text: "N days", strong}`), кнопка «N more» раскрывает; `sectionLabel("Most often this <period>")` + до пяти `row` с trailing count. Тап по строке → `ui.openPerson(path)`.

- [ ] **Step 1: Реализовать; `npm run build`.**
- [ ] **Step 2: Commit** `git commit -am "Add the stats view"`

---

### Task 14: Сборка плагина в `main.ts`

**Files:**
- Modify: `src/main.ts`
- Test: `tests/Settings.test.ts` (уже есть)

**Interfaces:**
- Consumes: всё выше.
- Produces: `PeopleTrackerPlugin implements SettingsHost`: `loadSettings(await loadData())`, репозиторий + `DayStartClock(() => config.dayStartHour)` + `PeopleService`, `UiContext` (`openPerson` открывает заметку, `openStats` открывает/активирует `STATS_VIEW`, `newInteraction` → `WhoSheet`, `editInteraction` → `EditSheet`), `registerView(FEED_VIEW)`, `registerView(STATS_VIEW)`, ribbon `users` «People», команды `open` «Open people», `open-stats` «Open stats», `new` «New interaction», `log-for-this-person` «Log an interaction with this person» (checkCallback по `notes.activePerson()`), `toggle-person-block`; `addSettingTab`; события `metadataCache.changed`, `vault.delete`, `vault.rename` → `refreshViews()` если путь в области плагина; `DayWatcher` раз в минуту → `refreshViews()`. `saveSettings()` сохраняет и обновляет view-ы.

- [ ] **Step 1: Реализовать; `npm test && npm run build`.**
- [ ] **Step 2: Commit** `git commit -am "Wire the plugin together"`

---

### Task 15: Проба сборки в отдельном Obsidian

**Files:**
- Create: `docs/superpowers/checklists/2026-10-26-mvp-tryout.md`

- [ ] **Step 1: Scratch-vault**

По `CLAUDE.md`: отдельный профиль Obsidian, vault с 150 заметками-людьми с тегом `#people-tracker` (сгенерировать скриптом в scratchpad, у 30 из них по 5–40 записей за год, у одной — битая запись), `data.json` по умолчанию, сборка в `.obsidian/plugins/people-tracker/`.

- [ ] **Step 2: Пройти чек-лист самому через debugging port, в phone view (390×844, `app.emulateMobile(true)`) и desktop view**

Чек-лист (записать в файл с результатами): лента показывает дни и строки как `Main.dc.html`; «+» → «Кто» → ввод «Se» → Add/Recent/Everyone как `Who.dc.html`; выбор человека → «Как» → Text сохраняется одним ✓; Call требует What for; Meeting требует Company и Length; дата под заголовком меняется на вчера; запись появляется в ленте сверху; тап по строке → правка, смена формата, удаление корзиной; заметка человека: блок внутри Properties неотличим от соседних свойств, `interactions` скрыто, «All N» раскрывает; битый человек показан приглушённо и не перезаписан; статистика: период, числа, график, Falling behind, Most often; 150 людей: лента и поиск открываются без заметной задержки; переход суток в 4:00 (сдвинуть часы в scratch) — «Today» вчерашний.

- [ ] **Step 3: Оставить scratch Obsidian открытым для Макса с чек-листом; записать, что не прошло, и исправить в отдельных коммитах.**

- [ ] **Step 4: Commit** `git add docs && git commit -m "Record the MVP tryout"`
