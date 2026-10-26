import { App, Notice } from "obsidian";
import { Company, KINDS, Kind, Labels, Length, Purpose, describe } from "../domain/Interaction";
import { LocalDate } from "../domain/LocalDate";
import { DatePicker } from "./DatePicker";
import { TimePicker } from "./TimePicker";
import { LocalTime } from "../domain/LocalTime";
import { KIND_ICONS, QUALIFIER_ICONS, forkRow, iconButton, row, sheetHeader, subtleButton } from "./components";
import { longDate } from "./format";
import { HowState, isComplete, toInteraction, withKind } from "./howState";
import { FullSheet, PageDescriptor } from "./sheet";
import { UiContext } from "./UiContext";

export interface HowPerson {
	readonly path: string;
	readonly name: string;
}

/** The forks the How screen asks, for a state: the kind, then what the kind needs. */
export function renderForks(parent: HTMLElement, state: HowState, labels: Labels, onChange: (next: HowState) => void): void {
	forkRow<Kind>(parent, "How", KINDS.map((kind) => ({ value: kind, text: labels[kind], icon: KIND_ICONS[kind] })), state.kind, (kind) => onChange(withKind(state, kind)));
	if (state.kind === "call") {
		const purposes: Purpose[] = ["talk", "activity"];
		forkRow<Purpose>(parent, "What for", purposes.map((value) => ({ value, text: labels[value], icon: QUALIFIER_ICONS[value] })), state.purpose, (purpose) => onChange({ ...state, purpose }));
	}
	if (state.kind === "meeting") {
		const companies: Company[] = ["one_on_one", "group"];
		forkRow<Company>(parent, "Company", companies.map((value) => ({ value, text: labels[value], icon: QUALIFIER_ICONS[value] })), state.company, (company) => onChange({ ...state, company }));
		const lengths: Length[] = ["some_time", "whole_day"];
		forkRow<Length>(parent, "Length", lengths.map((value) => ({ value, text: labels[value], icon: QUALIFIER_ICONS[value] })), state.length, (length) => onChange({ ...state, length }));
	}
}

/** Step two of logging an interaction: how, and what the how asks, then ✓. */
export class HowSheet extends FullSheet {
	protected state: HowState;
	private forks: HTMLElement | null = null;
	private save: HTMLButtonElement | null = null;
	private dateButton: HTMLButtonElement | null = null;
	private timeButton: HTMLButtonElement | null = null;
	/** A write is under way: a second tap must not start another. */
	private busy = false;

	constructor(
		app: App,
		protected readonly ui: UiContext,
		protected readonly person: HowPerson,
		initial?: HowState,
		/** What was typed on Who, so going back shows the same list. */
		protected readonly query = "",
	) {
		super(app, () => ui.sheetHost());
		this.state = initial ?? { date: ui.service.today(), time: ui.service.now() };
	}

	descriptor(): PageDescriptor {
		return { kind: "how", path: this.person.path, name: this.person.name, query: this.query };
	}

	protected get title(): string {
		return "New interaction";
	}

	protected get backIcon(): "x" | "chevron-left" {
		return "chevron-left";
	}

	protected back(): void {
		this.ui.newInteraction(this.query);
	}

	protected fill(content: HTMLElement): void {
		sheetHeader(content, {
			left: { icon: this.backIcon, label: "Back", onClick: () => this.back() },
			title: this.title,
			subtitle: (parent) => {
				const line = parent.createDiv("ft-sheet-subtitle");
				this.dateButton = subtleButton(line, this.dateText(), "Change the date", () => this.pickDate());
				this.timeButton = subtleButton(line, this.timeText(), "Change the time", () => this.pickTime());
			},
			right: (parent) => {
				this.rightActions(parent);
				this.save = iconButton(parent, "check", "Save", () => void this.submit(), true);
			},
		});
		const body = content.createDiv("ft-sheet-body");
		row(body, {
			circle: { initial: this.person.name.slice(0, 1).toUpperCase() },
			title: this.person.name,
			trailing: "chevron",
			onClick: () => this.ui.openPerson(this.person.path),
		});
		this.forks = body.createDiv("ft-forks");
		this.render();
	}

	/** What stands left of ✓ in the header; nothing on a new interaction. */
	protected rightActions(_parent: HTMLElement): void {}

	protected async submit(): Promise<void> {
		if (!isComplete(this.state)) return;
		await this.run(async () => {
			const interaction = toInteraction(this.state);
			const added = await this.ui.service.addInteraction(this.person.path, interaction);
			this.ui.offerUndo({
				text: `${this.person.name}: ${describe(interaction, this.ui.settings().labels)}`,
				undo: () => this.ui.service.removeInteraction(this.person.path, added.index, interaction),
			});
		});
	}

	/** Runs an action that writes the note, with ✓ held down meanwhile; on success the sheet closes, on failure it stays with a notice. */
	protected async run(action: () => Promise<unknown>): Promise<void> {
		if (this.busy) return;
		this.busy = true;
		if (this.save) this.save.disabled = true;
		try {
			await action();
			this.close();
		} catch (error) {
			new Notice(error instanceof Error ? error.message : String(error));
			if (this.save) this.save.disabled = !isComplete(this.state);
		} finally {
			this.busy = false;
		}
	}

	private render(): void {
		const forks = this.forks;
		if (!forks) return;
		forks.empty();
		renderForks(forks, this.state, this.ui.settings().labels, (next) => {
			this.state = next;
			this.render();
		});
		if (this.save) this.save.disabled = !isComplete(this.state);
		this.dateButton?.querySelector("span")?.setText(this.dateText());
		this.timeButton?.querySelector("span")?.setText(this.timeText());
	}

	/** "18:40", or "No time" for a record made before times were kept. */
	private timeText(): string {
		return this.state.time ? this.state.time.toString() : "No time";
	}

	private pickTime(): void {
		new TimePicker(this.app, this.state.time, this.ui.service.now(), (time: LocalTime) => {
			this.state = { ...this.state, time };
			this.render();
		}).open();
	}

	private dateText(): string {
		return longDate(this.state.date, this.ui.service.today());
	}

	private pickDate(): void {
		new DatePicker(this.app, this.state.date, this.ui.service.today(), (date: LocalDate) => {
			this.state = { ...this.state, date };
			this.render();
		}).open();
	}
}
