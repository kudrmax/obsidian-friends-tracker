import { ItemView, ViewStateResult, WorkspaceLeaf } from "obsidian";
import { Interaction } from "../domain/Interaction";
import { Person } from "../domain/Person";
import { Behind, Often, Period, byMonth, fallingBehind, mostOften, totals } from "../domain/Stats";
import { forkRow, moreButton, row, sectionLabel } from "./components";
import { monthChart } from "./MonthChart";
import { UiContext } from "./UiContext";

export const STATS_VIEW = "friends-tracker-stats";
const PERIODS: readonly { value: Period; text: string }[] = [
	{ value: "week", text: "Week" },
	{ value: "month", text: "Month" },
	{ value: "year", text: "Year" },
];
const PERIOD_WORD: Record<Period, string> = { week: "this week", month: "this month", year: "this year" };
const LIST_SHOWN = 5;

/** How much you talk to people, who you are falling behind with, and who you see most. */
export class StatsView extends ItemView {
	override navigation = true;
	private period: Period = "month";
	private behindOpen = false;
	private body: HTMLElement | null = null;
	/** Where each person shown lives, so a tap opens the right note. */
	private paths = new Map<Person, string>();

	constructor(
		leaf: WorkspaceLeaf,
		private readonly ui: UiContext,
	) {
		super(leaf);
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
		this.refresh();
	}

	override async onClose(): Promise<void> {
		this.contentEl.empty();
	}

	refresh(): void {
		const body = this.body;
		if (!body) return;
		body.empty();
		body.createEl("h1", { cls: "ft-title", text: "Stats" });
		const periods = forkRow<Period>(body, undefined, PERIODS, this.period, (period) => {
			this.period = period;
			void this.app.workspace.requestSaveLayout();
			this.refresh();
		});
		periods.addClass("ft-periods");
		const today = this.ui.service.today();
		this.paths = new Map(this.ui.repository.list().flatMap((entry) => (entry.kind === "ok" ? [[entry.person, entry.path] as const] : [])));
		const people = [...this.paths.keys()];
		this.renderNumbers(body, totals(people, this.period, today));
		sectionLabel(body, "By month");
		const all: Interaction[] = people.flatMap((person) => [...person.interactions()]);
		monthChart(body, byMonth(all, today), this.ui.settings().labels);
		this.renderBehind(body, fallingBehind(people, today));
		this.renderOften(body, mostOften(people, this.period, today));
	}

	private renderNumbers(parent: HTMLElement, numbers: ReturnType<typeof totals>): void {
		const grid = parent.createDiv("ft-numbers");
		const cell = (value: number, delta: number, label: string) => {
			const item = grid.createDiv();
			const line = item.createDiv("ft-number-line");
			line.createSpan({ cls: "ft-number", text: String(value) });
			if (delta !== 0) {
				const sign = line.createSpan({ cls: "ft-delta", text: `${delta > 0 ? "+" : "−"}${Math.abs(delta)}` });
				sign.addClass(delta > 0 ? "is-up" : "is-down");
			}
			item.createDiv({ cls: "ft-number-label", text: label });
		};
		cell(numbers.interactions, numbers.interactionsDelta, `interactions ${PERIOD_WORD[this.period]}`);
		cell(numbers.people, numbers.peopleDelta, "people");
	}

	private renderBehind(parent: HTMLElement, behind: Behind[]): void {
		if (!behind.length) return;
		sectionLabel(parent, "Falling behind");
		const shown = this.behindOpen ? behind : behind.slice(0, LIST_SHOWN);
		for (const item of shown) {
			row(parent, {
				circle: { initial: item.person.name.slice(0, 1).toUpperCase() },
				title: item.person.name,
				subtitle: `Usually every ${item.usual} ${item.usual === 1 ? "day" : "days"}`,
				trailing: { text: `${item.days} days`, strong: true },
				onClick: () => this.openPerson(item.person),
			});
		}
		if (behind.length <= LIST_SHOWN) return;
		moreButton(parent, this.behindOpen, this.behindOpen ? "Fewer" : `${behind.length - LIST_SHOWN} more`, () => {
			this.behindOpen = !this.behindOpen;
			this.refresh();
		});
	}

	private renderOften(parent: HTMLElement, often: Often[]): void {
		if (!often.length) return;
		sectionLabel(parent, `Most often ${PERIOD_WORD[this.period]}`);
		for (const item of often.slice(0, LIST_SHOWN)) {
			row(parent, {
				circle: { initial: item.person.name.slice(0, 1).toUpperCase() },
				title: item.person.name,
				trailing: { text: String(item.count), strong: true },
				onClick: () => this.openPerson(item.person),
			});
		}
	}

	/** Opens the person's note by name; the repository knows the path. */
	private openPerson(person: Person): void {
		const path = this.paths.get(person);
		if (path) this.ui.openPerson(path);
	}
}
