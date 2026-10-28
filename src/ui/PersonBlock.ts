import { Notice, WorkspaceLeaf, setIcon } from "obsidian";
import { ForkOption, forkRow, moreButton } from "./components";
import { Interaction, describe } from "../domain/Interaction";
import { Person, TARGET_NOT_DAYS, Target } from "../domain/Person";
import { Contact, PersonStats } from "../domain/PersonStats";
import { reachStatus } from "../domain/Reach";
import { reachRule } from "../settings";
import { ChartRange, buckets } from "../domain/Stats";
import { dayCount, daysAgo, fullDate, readDays, shortDate } from "./format";
import { barChart } from "./MonthChart";
import { Debut } from "./motion";
import { UiContext } from "./UiContext";

const RECENT_SHOWN = 3;
const KIND_DOT: Record<Interaction["kind"], string> = { text: "ft-bar-text", call: "ft-bar-call", meeting: "ft-bar-meeting" };

const RANGES: readonly ForkOption<ChartRange>[] = [
	{ value: "weeks", text: "Weeks" },
	{ value: "months", text: "Months" },
	{ value: "years", text: "Years" },
];
const RANGE_NAME: Record<ChartRange, string> = { weeks: "by week", months: "by month", years: "by year" };

/** Panels the reader folded, and panels whose whole list is open, remembered while Obsidian is open. */
const folded = new Set<string>();
const opened = new Set<string>();
/** What a bar of the chart covers, the same for every person, remembered while Obsidian is open. */
let range: ChartRange = "months";

/**
 * The person's own panel in their note, next to Properties and drawn with its classes: when you last met and spoke,
 * the usual gap, the past year against the one before, a chart by weeks, months or years and the latest interactions,
 * above the note's text.
 */
export class PersonBlock {
	readonly el: HTMLElement;
	/** The chart grows when the panel first shows a person, and when it is unfolded. */
	private readonly debut = new Debut();
	/** A change came in while the target was being typed; the panel redraws once typing ends. */
	private stale = false;

	constructor(
		private readonly ui: UiContext,
		/** The note's tab, where Edit opens over the note. */
		private readonly leaf: WorkspaceLeaf,
		private path: string,
	) {
		this.el = createDiv();
		this.el.setAttribute("contenteditable", "false");
		for (const type of ["mousedown", "pointerdown", "click"]) this.el.addEventListener(type, (event) => event.stopPropagation());
	}

	get file(): string {
		return this.path;
	}

	moveTo(path: string): void {
		this.path = path;
		this.debut.restart();
		this.render();
	}

	render(): void {
		if (this.typing()) {
			this.stale = true;
			return;
		}
		this.stale = false;
		const panel = this.el;
		panel.empty();
		panel.className = "metadata-container ft-person-panel";
		panel.toggleClass("is-collapsed", folded.has(this.path));
		this.renderHeading(panel);
		if (folded.has(this.path)) return;
		const content = panel.createDiv("metadata-content");
		const entry = this.ui.repository.get(this.path);
		if (entry?.kind !== "ok") {
			content.createDiv({ cls: "ft-panel-quiet", text: entry?.kind === "broken" ? `Can't read this person: ${entry.problem}` : "Person not found" });
			return;
		}
		const rows = content.createDiv("metadata-properties");
		this.renderFacts(rows, entry.person, new PersonStats(entry.person, this.ui.service.today()));
		if (!entry.person.interactions().length) return;
		this.renderChart(rows, entry.person);
		this.renderRecent(rows, entry.person);
	}

	private renderHeading(panel: HTMLElement): void {
		const heading = panel.createDiv({ cls: "metadata-properties-heading", attr: { tabindex: "0" } });
		const fold = heading.createDiv({ cls: "collapse-indicator collapse-icon" });
		fold.toggleClass("is-collapsed", folded.has(this.path));
		setIcon(fold, "right-triangle");
		heading.createDiv({ cls: "metadata-properties-title", text: "Person" });
		heading.addEventListener("click", () => {
			if (folded.has(this.path)) {
				folded.delete(this.path);
				this.debut.restart();
			} else folded.add(this.path);
			this.render();
		});
	}

	/** One row of the panel, shaped like a property: icon and name on the left, the content on the right. */
	private property(rows: HTMLElement, icon: string, name: string, wide = false): HTMLElement {
		const item = rows.createDiv("metadata-property");
		item.toggleClass("is-wide", wide);
		const key = item.createDiv("metadata-property-key");
		setIcon(key.createSpan("metadata-property-icon"), icon);
		const label = key.createEl("input", { cls: "metadata-property-key-input", type: "text", attr: { readonly: "true", tabindex: "-1" } });
		label.value = name;
		return item.createDiv("metadata-property-value");
	}

	private text(rows: HTMLElement, icon: string, name: string, value: string): HTMLElement {
		return this.property(rows, icon, name).createDiv({ cls: "metadata-input-longtext", text: value });
	}

	/** The small numbers, one to a row; a row with nothing to say is left out, but for when you last met and the target. */
	private renderFacts(rows: HTMLElement, person: Person, stats: PersonStats): void {
		const met = stats.lastMeeting();
		const contact = stats.lastContact();
		const usual = stats.usualGap();
		const seen = this.text(rows, "clock", "last seen", met ? daysAgo(met.days) : "never");
		const spoke = contact && (!met || contact.days < met.days) ? this.text(rows, "message-circle", "last contact", daysAgo(contact.days)) : seen;
		const target = person.target();
		if (target) this.markStatus(spoke, target, contact);
		this.renderTarget(rows, person);
		if (usual !== undefined) this.text(rows, "align-justify", "usual gap", dayCount(usual));
		const first = stats.firstDate();
		if (!first) return;
		const year = stats.pastYear();
		const count = this.text(rows, "bar-chart-3", "past year", `${year.count} ${year.count === 1 ? "interaction" : "interactions"}`);
		if (year.delta) count.createSpan({ cls: `ft-delta ${year.delta > 0 ? "is-up" : "is-down"}`, text: `${year.delta > 0 ? "+" : "−"}${Math.abs(year.delta)}` });
		const started = stats.initiative();
		if (started) {
			this.text(rows, "arrow-up-right", "you start", `${started.mine}%`);
			this.text(rows, "arrow-down-left", "they start", `${started.theirs}%`);
		}
		this.text(rows, "calendar-plus", "since", fullDate(first));
	}

	/** The latest contact in the target's colour: yellow when it is about to run out, red when it has. */
	private markStatus(value: HTMLElement, target: Target, contact: Contact | undefined): void {
		const status = reachStatus(target, contact?.days, reachRule(this.ui.settings()));
		if (status === "ok") return;
		value.addClass(status === "late" ? "ft-overdue" : "ft-soon");
		const said = `${contact ? daysAgo(contact.days) : "never"}, every ${dayCount(target.every)}`;
		value.setAttribute("aria-label", said);
		value.setAttribute("title", said);
	}

	/** The target, typed in place, and with one the heads-up before it runs out. */
	private renderTarget(rows: HTMLElement, person: Person): void {
		/* The note it was drawn for: a save after the tab moved on still goes to this person. */
		const path = this.path;
		const target = person.target();
		const unread = person.unreadTarget();
		const shown = target ? dayCount(target.every) : unread === undefined ? "" : String(unread).trim();
		const input = this.property(rows, "repeat", "contact every").createDiv({
			cls: "metadata-input-longtext",
			text: shown,
			attr: { contenteditable: "true", spellcheck: "false", placeholder: "Empty", inputmode: "numeric" },
		});
		input.addEventListener("focus", () => {
			input.textContent = (input.textContent ?? "").replace(/\s+days?$/i, "");
		});
		input.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				event.preventDefault();
				input.blur();
			}
			if (event.key === "Escape") {
				input.textContent = shown;
				input.blur();
			}
		});
		input.addEventListener("blur", () => void this.saveTarget(path, input, shown, target));
		if (!target) return;
		const box = this.property(rows, "bell", "heads-up").createEl("input", {
			cls: "metadata-input-checkbox",
			type: "checkbox",
			attr: { title: "Turn yellow before the target runs out" },
		});
		box.checked = target.headsUp ?? this.ui.settings().headsUpForNew;
		box.addEventListener("change", () => void this.run(() => this.ui.service.setHeadsUp(path, box.checked)));
	}

	/**
	 * Saves what was typed; the panel redraws only when the note changed, so a click that ends the typing still lands.
	 * Anything else puts the field back as it was.
	 */
	private async saveTarget(path: string, input: HTMLElement, shown: string, target: Target | undefined): Promise<void> {
		const typed = (input.textContent ?? "").trim();
		const changed = typed !== shown && (await this.changeTarget(path, readDays(typed), target));
		if (changed || this.stale) this.render();
		else input.textContent = shown;
	}

	/** Whether the note was written. */
	private async changeTarget(path: string, days: number | "none" | null, target: Target | undefined): Promise<boolean> {
		if (days === null) {
			new Notice(TARGET_NOT_DAYS);
			return false;
		}
		if (days === "none") return this.run(() => this.ui.service.clearTarget(path));
		if (days === target?.every) return false;
		return this.run(() => this.ui.service.setTarget(path, days, this.ui.settings().headsUpForNew));
	}

	/** Whether the change went through; a refused one says why. */
	private async run(change: () => Promise<unknown>): Promise<boolean> {
		try {
			await change();
			return true;
		} catch (error) {
			new Notice(error instanceof Error ? error.message : String(error));
			return false;
		}
	}

	private typing(): boolean {
		const active = this.el.ownerDocument.activeElement;
		return active instanceof HTMLElement && active.isContentEditable && this.el.contains(active);
	}

	private renderChart(rows: HTMLElement, person: Person): void {
		const cell = this.property(rows, "calendar", RANGE_NAME[range], true);
		const box = cell.createDiv("ft-activity");
		const switcher = forkRow<ChartRange>(box, undefined, RANGES, range, (picked) => {
			if (picked === range) return;
			range = picked;
			this.debut.restart();
			this.render();
		});
		switcher.addClass("ft-range");
		const bars = buckets(person.interactions(), range, this.ui.service.today());
		barChart(box, bars, range, this.ui.settings().labels, { grow: this.debut.offset(), counts: true });
	}

	private renderRecent(rows: HTMLElement, person: Person): void {
		const interactions = person.interactions();
		if (!interactions.length) return;
		const cell = this.property(rows, "activity", "recent", true);
		const list = cell.createDiv("ft-recent");
		const open = opened.has(this.path);
		const today = this.ui.service.today();
		const labels = this.ui.settings().labels;
		interactions.slice(0, open ? interactions.length : RECENT_SHOWN).forEach((interaction, index) => {
			const line = list.createEl("button", { cls: "ft-recent-row", attr: { type: "button", "aria-label": "Edit this interaction" } });
			line.createSpan({ cls: "ft-recent-date", text: shortDate(interaction.date, today) });
			line.createSpan(`ft-dot ${interaction.kind === "meeting" && interaction.length === "whole_day" ? "ft-bar-whole" : KIND_DOT[interaction.kind]}`);
			line.createSpan({ text: describe(interaction, labels) });
			line.addEventListener("click", () => this.ui.editInteraction({ path: this.path, name: person.name, index, interaction }, this.leaf));
		});
		if (interactions.length <= RECENT_SHOWN) return;
		moreButton(list, open, open ? "Fewer" : `All ${interactions.length}`, () => {
			if (open) opened.delete(this.path);
			else opened.add(this.path);
			this.render();
		});
	}
}
