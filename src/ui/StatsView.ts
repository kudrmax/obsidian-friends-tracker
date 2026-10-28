import { ItemView, ViewStateResult, WorkspaceLeaf } from "obsidian";
import { Interaction } from "../domain/Interaction";
import { Person } from "../domain/Person";
import { Initiative, Often, Period, buckets, mostOften, periodInitiative, totals } from "../domain/Stats";
import { forkRow, row, sectionLabel } from "./components";
import { initiativeLine } from "./format";
import { barChart } from "./MonthChart";
import { ANIMATION, Arrivals, Debut, arrive, play } from "./motion";
import { ReachOutBlock } from "./reach";
import { TabHistory } from "./TabHistory";
import { UiContext } from "./UiContext";

export const STATS_VIEW = "friends-tracker-stats";
const PERIODS: readonly { value: Period; text: string }[] = [
	{ value: "week", text: "Week" },
	{ value: "month", text: "Month" },
	{ value: "year", text: "Year" },
];
const PERIOD_WORD: Record<Period, string> = { week: "this week", month: "this month", year: "this year" };
const LIST_SHOWN = 5;

/** How much you talk to people, whom to reach out to, and who you see most. */
export class StatsView extends ItemView {
	override navigation = true;
	private period: Period = "month";
	private body: HTMLElement | null = null;
	/** Where each person shown lives, so a tap opens the right note. */
	private paths = new Map<Person, string>();
	/** A period just picked: its numbers and its list rise in. */
	private readonly arrivals = new Arrivals();
	/** The chart grows once, when the view opens. */
	private readonly debut = new Debut();
	private readonly reachOut: ReachOutBlock;

	constructor(
		leaf: WorkspaceLeaf,
		private readonly ui: UiContext,
	) {
		super(leaf);
		this.reachOut = new ReachOutBlock(ui);
	}

	override getViewType(): string {
		return STATS_VIEW;
	}

	override getDisplayText(): string {
		return "Stats";
	}

	override getIcon(): string {
		return "bar-chart-3";
	}

	override getState(): Record<string, unknown> {
		return { period: this.period };
	}

	override async setState(state: unknown, result: ViewStateResult): Promise<void> {
		const period = (state as { period?: unknown } | null)?.period;
		if (period === "week" || period === "month" || period === "year") this.period = period;
		await super.setState(state, result);
		this.refresh();
	}

	override async onOpen(): Promise<void> {
		const root = this.contentEl;
		root.empty();
		root.addClass("friends-tracker", "ft-view", "ft-stats");
		const scroller = root.createDiv("ft-scroll");
		this.body = scroller.createDiv("ft-column");
		this.registerEvent(new TabHistory(this.app, this.leaf, STATS_VIEW).showOnPhone());
		this.debut.restart();
		this.refresh();
		play(scroller, "is-returning", ANIMATION.fadeIn);
	}

	override async onClose(): Promise<void> {
		this.contentEl.empty();
	}

	refresh(): void {
		const body = this.body;
		if (!body) return;
		body.empty();
		this.arrivals.begin();
		body.createEl("h1", { cls: "ft-title", text: "Stats" });
		const periods = forkRow<Period>(
			body,
			undefined,
			PERIODS,
			this.period,
			(period) => {
				this.period = period;
				void this.app.workspace.requestSaveLayout();
				this.refresh();
			},
			this.arrivals,
		);
		periods.addClass("ft-periods");
		const today = this.ui.service.today();
		this.paths = new Map(this.ui.repository.list().flatMap((entry) => (entry.kind === "ok" ? [[entry.person, entry.path] as const] : [])));
		const people = [...this.paths.keys()];
		this.renderNumbers(body, totals(people, this.period, today), periodInitiative(people, this.period, today));
		sectionLabel(body, "By month");
		const all: Interaction[] = people.flatMap((person) => [...person.interactions()]);
		barChart(body, buckets(all, "months", today), "months", this.ui.settings().labels, { grow: this.debut.offset() });
		this.reachOut.render(body, this.arrivals);
		this.renderOften(body, mostOften(people, this.period, today));
	}

	private renderNumbers(parent: HTMLElement, numbers: ReturnType<typeof totals>, started: Initiative | undefined): void {
		const grid = parent.createDiv("ft-numbers");
		arrive(grid, this.arrivals.offset(`numbers:${this.period}`));
		const cell = (value: string, delta: number, label: string) => {
			const item = grid.createDiv();
			const line = item.createDiv("ft-number-line");
			line.createSpan({ cls: "ft-number", text: value });
			if (delta !== 0) {
				const sign = line.createSpan({ cls: "ft-delta", text: `${delta > 0 ? "+" : "−"}${Math.abs(delta)}` });
				sign.addClass(delta > 0 ? "is-up" : "is-down");
			}
			item.createDiv({ cls: "ft-number-label", text: label });
		};
		cell(String(numbers.interactions), numbers.interactionsDelta, `interactions ${PERIOD_WORD[this.period]}`);
		cell(String(numbers.people), numbers.peopleDelta, "people");
		if (!started) return;
		cell(`${started.mine}%`, 0, "you started");
		cell(`${started.theirs}%`, 0, "they started");
	}

	private renderOften(parent: HTMLElement, often: Often[]): void {
		if (!often.length) return;
		sectionLabel(parent, `Most often ${PERIOD_WORD[this.period]}`);
		for (const item of often.slice(0, LIST_SHOWN)) {
			const line = row(parent, {
				circle: { initial: item.person.name.slice(0, 1).toUpperCase() },
				title: item.person.name,
				...(item.initiative ? { subtitle: initiativeLine(item.initiative, item.person.name) } : {}),
				trailing: { text: String(item.count), strong: true },
				onClick: () => this.openPerson(item.person),
			});
			arrive(line, this.arrivals.offset(`often:${this.period}:${item.person.name}`));
		}
	}

	/** Opens the person's note by name; the repository knows the path. */
	private openPerson(person: Person): void {
		const path = this.paths.get(person);
		if (path) this.ui.openPerson(path);
	}
}
