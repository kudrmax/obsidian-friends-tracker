import { setIcon } from "obsidian";
import { Company, Kind, Length, Purpose } from "../domain/Interaction";
import { ANIMATION, Arrivals, arrive } from "./motion";

/** Lucide icons the screens use, by name. */
export type IconName =
	| "message-circle"
	| "phone"
	| "users"
	| "user"
	| "clock"
	| "sun"
	| "gamepad-2"
	| "message-square"
	| "bar-chart-3"
	| "plus"
	| "check"
	| "x"
	| "chevron-left"
	| "chevron-right"
	| "chevron-down"
	| "trash-2"
	| "search"
	| "calendar"
	| "align-justify"
	| "activity";

export const KIND_ICONS: Readonly<Record<Kind, IconName>> = { text: "message-circle", call: "phone", meeting: "users" };
export const QUALIFIER_ICONS: Readonly<Record<Company | Length | Purpose, IconName>> = {
	one_on_one: "user",
	group: "users",
	some_time: "clock",
	whole_day: "sun",
	talk: "message-square",
	activity: "gamepad-2",
};

export function icon(parent: HTMLElement, name: IconName): HTMLElement {
	const holder = parent.createSpan("ft-icon");
	setIcon(holder, name);
	return holder;
}

export type CircleContent = { readonly initial: string } | { readonly icon: IconName; readonly accent?: boolean; readonly strong?: boolean };

/** The 40 px circle at a row's left: a person's initial, or the icon of an interaction's kind. */
export function circle(parent: HTMLElement, content: CircleContent): HTMLElement {
	const el = parent.createSpan("ft-circle");
	if ("initial" in content) el.setText(content.initial);
	else {
		el.toggleClass("is-accent", content.accent === true);
		el.toggleClass("is-strong", content.strong === true);
		icon(el, content.icon);
	}
	return el;
}

export interface RowOptions {
	readonly circle: CircleContent;
	readonly title: string | HTMLElement;
	readonly subtitle?: string;
	readonly trailing?: "chevron" | { readonly text: string; readonly strong?: boolean };
	/** A quiet fact on the right, before the chevron: the time of day. */
	readonly meta?: string;
	readonly onClick?: () => void;
	readonly label?: string;
}

/** One row of any list: the circle, a name with its line under it, and what stands on the right. */
export function row(parent: HTMLElement, options: RowOptions): HTMLElement {
	const el = options.onClick
		? parent.createEl("button", { cls: "ft-row", attr: { type: "button", ...(options.label ? { "aria-label": options.label } : {}) } })
		: parent.createDiv("ft-row");
	circle(el, options.circle);
	const text = el.createSpan("ft-row-text");
	const title = text.createSpan("ft-row-title");
	if (typeof options.title === "string") title.setText(options.title);
	else title.append(options.title);
	if (options.subtitle !== undefined) text.createSpan({ cls: "ft-row-sub", text: options.subtitle });
	if (options.meta !== undefined) el.createSpan({ cls: "ft-row-meta", text: options.meta });
	if (options.trailing === "chevron") icon(el, "chevron-right").addClass("ft-row-chevron");
	else if (options.trailing) {
		const value = el.createSpan({ cls: "ft-row-value", text: options.trailing.text });
		value.toggleClass("is-strong", options.trailing.strong === true);
	}
	if (options.onClick) el.addEventListener("click", options.onClick);
	return el;
}

/** A day's header in the feed: its name and its date on one line. */
export function dayHeader(parent: HTMLElement, name: string, date: string): HTMLElement {
	const el = parent.createDiv("ft-day");
	el.createSpan({ cls: "ft-day-name", text: name });
	el.createSpan({ cls: "ft-day-date", text: date });
	return el;
}

export function sectionLabel(parent: HTMLElement, text: string): HTMLElement {
	return parent.createDiv({ cls: "ft-section", text });
}

export interface ForkOption<T extends string> {
	readonly value: T;
	readonly text: string;
	readonly icon?: IconName;
}

/** A fork: a label and one row of equal capsules, the chosen one filled. With `arrivals`, a fork just asked rises in and a capsule just chosen pops. */
export function forkRow<T extends string>(
	parent: HTMLElement,
	label: string | undefined,
	options: readonly ForkOption<T>[],
	selected: T | undefined,
	onPick: (value: T) => void,
	arrivals?: Arrivals,
): HTMLElement {
	const el = parent.createDiv("ft-fork");
	if (arrivals) arrive(el, arrivals.offset(`fork:${label ?? ""}`));
	if (label) el.createDiv({ cls: "ft-section", text: label });
	const buttons = el.createDiv("ft-fork-row");
	for (const option of options) {
		const button = buttons.createEl("button", { cls: "ft-capsule", attr: { type: "button", "aria-pressed": String(option.value === selected) } });
		button.toggleClass("is-on", option.value === selected);
		if (arrivals && option.value === selected) arrive(button, arrivals.offset(`on:${label ?? ""}=${option.value}`), ANIMATION.pop);
		if (option.icon) icon(button, option.icon);
		button.createSpan({ text: option.text });
		button.addEventListener("click", () => onPick(option.value));
	}
	return el;
}

/** A 44 px round button with an icon: plain, or filled white for the one action that saves. */
export function iconButton(parent: HTMLElement, name: IconName, label: string, onClick: () => void, filled = false): HTMLButtonElement {
	const button = parent.createEl("button", { cls: "ft-icon-button", attr: { type: "button", "aria-label": label } });
	button.toggleClass("is-filled", filled);
	icon(button, name);
	button.addEventListener("click", onClick);
	return button;
}

export interface SheetHeaderOptions {
	readonly left: { readonly icon: "x" | "chevron-left"; readonly label: string; readonly onClick: () => void };
	readonly title: string;
	/** What stands under the title, like the date; a button when it can be tapped. */
	readonly subtitle?: (parent: HTMLElement) => void;
	readonly right?: (parent: HTMLElement) => void;
}

/** A sheet's top line: a way out on the left, the title in the middle, the actions on the right. */
export function sheetHeader(parent: HTMLElement, options: SheetHeaderOptions): HTMLElement {
	const el = parent.createDiv("ft-sheet-header");
	const left = el.createDiv("ft-sheet-left");
	iconButton(left, options.left.icon, options.left.label, options.left.onClick);
	const middle = el.createDiv("ft-sheet-middle");
	middle.createSpan({ cls: "ft-sheet-title", text: options.title });
	if (options.subtitle) options.subtitle(middle);
	const right = el.createDiv("ft-sheet-right");
	if (options.right) options.right(right);
	return el;
}

/** The round "+" over the feed, or a quieter round button beside it. */
export function fab(parent: HTMLElement, label: string, onClick: () => void, name: IconName = "plus"): HTMLButtonElement {
	const button = parent.createEl("button", { cls: "ft-fab", attr: { type: "button", "aria-label": label } });
	icon(button, name);
	button.addEventListener("click", onClick);
	return button;
}

/** The quiet button under a cut list that shows the rest, or folds it again. */
export function moreButton(parent: HTMLElement, open: boolean, text: string, onClick: () => void): HTMLButtonElement {
	const button = parent.createEl("button", { cls: "ft-more", attr: { type: "button", "aria-expanded": String(open) } });
	icon(button, open ? "chevron-down" : "chevron-right");
	button.createSpan({ text });
	button.addEventListener("click", onClick);
	return button;
}

/** A text under a title that opens something when tapped, drawn as grey text with a small chevron. */
export function subtleButton(parent: HTMLElement, text: string, label: string, onClick: () => void): HTMLButtonElement {
	const button = parent.createEl("button", { cls: "ft-subtle", attr: { type: "button", "aria-label": label } });
	button.createSpan({ text });
	icon(button, "chevron-down");
	button.addEventListener("click", onClick);
	return button;
}
