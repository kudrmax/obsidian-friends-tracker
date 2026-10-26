import { App, Modal } from "obsidian";
import { LocalDate, WEEKDAYS } from "../domain/LocalDate";
import { iconButton } from "./components";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

/** One month at a time; a day after `max` can't be picked. */
export class DatePicker extends Modal {
	private year: number;
	private month: number;

	constructor(
		app: App,
		private readonly value: LocalDate,
		private readonly max: LocalDate,
		private readonly onPick: (date: LocalDate) => void,
	) {
		super(app);
		this.year = value.year;
		this.month = value.month;
	}

	override onOpen(): void {
		this.modalEl.addClass("ft-picker", "ft-date-picker", "friends-tracker");
		this.render();
	}

	override onClose(): void {
		this.contentEl.empty();
	}

	private render(): void {
		const root = this.contentEl;
		root.empty();
		const head = root.createDiv("ft-picker-head");
		iconButton(head, "chevron-left", "Previous month", () => this.step(-1));
		head.createSpan({ cls: "ft-picker-title", text: `${MONTH_NAMES[this.month - 1]} ${this.year}` });
		const next = iconButton(head, "chevron-right", "Next month", () => this.step(1));
		next.disabled = this.year > this.max.year || (this.year === this.max.year && this.month >= this.max.month);
		const grid = root.createDiv("ft-picker-grid");
		for (const letter of WEEKDAY_LETTERS) grid.createSpan({ cls: "ft-picker-weekday", text: letter });
		const first = LocalDate.of(this.year, this.month, 1);
		const lead = WEEKDAYS.indexOf(first.weekday());
		for (let i = 0; i < lead; i++) grid.createSpan();
		for (let date = first; date.month === this.month; date = date.addDays(1)) {
			const day = date;
			const button = grid.createEl("button", { cls: "ft-picker-cell", text: String(day.day), attr: { type: "button" } });
			button.toggleClass("is-picked", day.equals(this.value));
			button.toggleClass("is-today", day.equals(this.max));
			button.disabled = day.isAfter(this.max);
			button.addEventListener("click", () => {
				this.onPick(day);
				this.close();
			});
		}
	}

	private step(months: number): void {
		const index = this.year * 12 + (this.month - 1) + months;
		this.year = Math.floor(index / 12);
		this.month = (index % 12) + 1;
		this.render();
	}
}
