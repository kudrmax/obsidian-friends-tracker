import { App, Modal } from "obsidian";
import { LocalTime } from "../domain/LocalTime";
import { sectionLabel } from "./components";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MINUTE_STEP = 5;
const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, index) => index * MINUTE_STEP);
const pad = (value: number) => String(value).padStart(2, "0");

/** The hours as round buttons, then the minutes in fives; tapping a minute is the pick. */
export class TimePicker extends Modal {
	private hour: number;
	private minute: number;

	constructor(
		app: App,
		value: LocalTime | undefined,
		fallback: LocalTime,
		private readonly onPick: (time: LocalTime) => void,
	) {
		super(app);
		const start = value ?? fallback;
		this.hour = start.hour;
		this.minute = start.minute;
	}

	override onOpen(): void {
		this.modalEl.addClass("ft-picker", "ft-time-picker", "friends-tracker");
		this.render();
	}

	override onClose(): void {
		this.contentEl.empty();
	}

	private render(): void {
		const root = this.contentEl;
		root.empty();
		root.createDiv("ft-picker-head").createSpan({ cls: "ft-picker-title", text: `${pad(this.hour)}:${pad(this.minute)}` });
		sectionLabel(root, "Hour");
		const hours = root.createDiv("ft-picker-grid ft-picker-hours");
		for (const hour of HOURS) {
			const button = hours.createEl("button", { cls: "ft-picker-cell", text: pad(hour), attr: { type: "button" } });
			button.toggleClass("is-picked", hour === this.hour);
			button.addEventListener("click", () => {
				this.hour = hour;
				this.render();
			});
		}
		sectionLabel(root, "Minute");
		const minutes = root.createDiv("ft-picker-grid ft-picker-minutes");
		for (const minute of MINUTES) {
			const button = minutes.createEl("button", { cls: "ft-picker-cell", text: pad(minute), attr: { type: "button" } });
			button.toggleClass("is-picked", minute === this.minute);
			button.addEventListener("click", () => {
				this.onPick(LocalTime.of(this.hour, minute));
				this.close();
			});
		}
	}
}
