import { App, setIcon } from "obsidian";
import { Interaction, describe } from "../domain/Interaction";
import { Person } from "../domain/Person";
import { byMonth, daysSince, usualGap } from "../domain/Stats";
import { EditSheet } from "./EditSheet";
import { daysAgo, shortDate } from "./format";
import { monthChart } from "./MonthChart";
import { UiContext } from "./UiContext";

const RECENT_SHOWN = 3;
const KIND_DOT: Record<Interaction["kind"], string> = { text: "pt-bar-text", call: "pt-bar-call", meeting: "pt-bar-meeting" };

/** Panels the reader folded, and panels whose whole list is open, remembered while Obsidian is open. */
const folded = new Set<string>();
const opened = new Set<string>();

/**
 * The person's own panel in their note, next to Properties and drawn with its classes: when you last met, the usual
 * gap, a year of months and the latest interactions, above the note's text.
 */
export class PersonBlock {
	readonly el: HTMLElement;

	constructor(
		private readonly app: App,
		private readonly ui: UiContext,
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
		this.render();
	}

	render(): void {
		const panel = this.el;
		panel.empty();
		panel.className = "metadata-container pt-person-panel";
		panel.toggleClass("is-collapsed", folded.has(this.path));
		this.renderHeading(panel);
		if (folded.has(this.path)) return;
		const content = panel.createDiv("metadata-content");
		const entry = this.ui.repository.get(this.path);
		if (entry?.kind !== "ok") {
			content.createDiv({ cls: "pt-panel-quiet", text: entry?.kind === "broken" ? `Can't read this person: ${entry.problem}` : "Person not found" });
			return;
		}
		const rows = content.createDiv("metadata-properties");
		this.renderNumbers(rows, entry.person);
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
			if (folded.has(this.path)) folded.delete(this.path);
			else folded.add(this.path);
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

	private text(rows: HTMLElement, icon: string, name: string, value: string): void {
		this.property(rows, icon, name).createDiv({ cls: "metadata-input-longtext", text: value });
	}

	private renderNumbers(rows: HTMLElement, person: Person): void {
		const today = this.ui.service.today();
		const since = daysSince(person, today);
		const gap = usualGap(person, today);
		const thisYear = person.interactions().filter((i) => !i.date.isBefore(today.addDays(-364))).length;
		this.text(rows, "clock", "last seen", since === undefined ? "never" : daysAgo(since));
		this.text(rows, "align-justify", "usual gap", gap === undefined ? "—" : `${gap} ${gap === 1 ? "day" : "days"}`);
		this.text(rows, "bar-chart-3", "this year", `${thisYear} ${thisYear === 1 ? "interaction" : "interactions"}`);
	}

	private renderChart(rows: HTMLElement, person: Person): void {
		const cell = this.property(rows, "calendar", "by month", true);
		monthChart(cell, byMonth(person.interactions(), this.ui.service.today()), this.ui.settings().labels);
	}

	private renderRecent(rows: HTMLElement, person: Person): void {
		const interactions = person.interactions();
		if (!interactions.length) return;
		const cell = this.property(rows, "activity", "recent", true);
		const list = cell.createDiv("pt-recent");
		const open = opened.has(this.path);
		const today = this.ui.service.today();
		const labels = this.ui.settings().labels;
		interactions.slice(0, open ? interactions.length : RECENT_SHOWN).forEach((interaction, index) => {
			const line = list.createEl("button", { cls: "pt-recent-row", attr: { type: "button", "aria-label": "Edit this interaction" } });
			line.createSpan({ cls: "pt-recent-date", text: shortDate(interaction.date, today) });
			line.createSpan(`pt-dot ${interaction.kind === "meeting" && interaction.length === "whole_day" ? "pt-bar-whole" : KIND_DOT[interaction.kind]}`);
			line.createSpan({ text: describe(interaction, labels) });
			line.addEventListener("click", () => new EditSheet(this.app, this.ui, { path: this.path, name: person.name, index, interaction }).open());
		});
		if (interactions.length <= RECENT_SHOWN) return;
		const more = list.createEl("button", { cls: "pt-more", attr: { type: "button", "aria-expanded": String(open) } });
		setIcon(more.createSpan("pt-icon"), open ? "chevron-down" : "chevron-right");
		more.createSpan({ text: open ? "Fewer" : `All ${interactions.length}` });
		more.addEventListener("click", () => {
			if (open) opened.delete(this.path);
			else opened.add(this.path);
			this.render();
		});
	}
}
