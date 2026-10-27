import { App, Notice } from "obsidian";
import { PersonHit } from "../application/PeopleService";
import { icon, iconButton, row, sectionLabel, sheetHeader } from "./components";
import { shortDate } from "./format";
import { FullSheet, PageDescriptor } from "./sheet";
import { UiContext } from "./UiContext";

/** Step one of logging an interaction: who it was with. */
export class WhoSheet extends FullSheet {
	private query = "";
	private results: HTMLElement | null = null;
	/** A note is being created: a second tap must not try to create it again. */
	private creating = false;

	constructor(
		app: App,
		private readonly ui: UiContext,
		initialQuery = "",
	) {
		super(app, () => ui.sheetHost());
		this.query = initialQuery;
	}

	descriptor(): PageDescriptor {
		return { kind: "who", query: this.query };
	}

	dismiss(): void {
		this.close();
	}

	protected fill(content: HTMLElement): void {
		sheetHeader(content, { left: { icon: "x", label: "Cancel", onClick: () => this.dismiss() }, title: "New interaction" });
		const body = content.createDiv("ft-sheet-body");
		const search = body.createDiv("ft-search");
		icon(search, "search");
		const input = search.createEl("input", { type: "text", attr: { placeholder: "Name", "aria-label": "Search people", autocapitalize: "none", autocorrect: "off", spellcheck: "false", autocomplete: "off" } });
		input.value = this.query;
		const clear = iconButton(search, "x", "Clear", () => {
			input.value = "";
			this.query = "";
			input.focus();
			this.render();
		});
		clear.addClass("ft-search-clear");
		input.addEventListener("input", () => {
			if (input.value === this.query) return;
			this.query = input.value;
			this.changed();
			this.render();
		});
		this.results = body.createDiv("ft-search-results");
		this.render();
		window.setTimeout(() => input.focus());
	}

	/** The notes changed (or the cache only now read them): the same search over the people as they are now. */
	override refresh(): void {
		this.render();
	}

	private render(): void {
		const results = this.results;
		if (!results) return;
		results.empty();
		const typed = this.query.trim();
		const found = this.ui.service.searchPeople(typed);
		if (typed && !found.exact) {
			row(results, {
				circle: { icon: "plus", strong: true },
				title: `Add “${typed}”`,
				subtitle: "New person",
				onClick: () => void this.create(typed),
			});
		}
		if (found.recent.length) {
			sectionLabel(results, "Recent");
			for (const hit of found.recent) this.renderHit(results, hit);
		}
		if (found.everyone.length) {
			sectionLabel(results, "Everyone");
			for (const hit of found.everyone) this.renderHit(results, hit);
		}
	}

	private renderHit(parent: HTMLElement, hit: PersonHit): void {
		const today = this.ui.service.today();
		if (hit.problem !== undefined) {
			const problem = hit.problem;
			row(parent, {
				circle: { initial: hit.name.slice(0, 1).toUpperCase() },
				title: this.highlight(hit.name),
				subtitle: `Can't read: ${problem}`,
				onClick: () => new Notice(`${hit.name} can't be read: ${problem}`),
			}).addClass("is-broken");
			return;
		}
		row(parent, {
			circle: { initial: hit.name.slice(0, 1).toUpperCase() },
			title: this.highlight(hit.name),
			subtitle: hit.last ? shortDate(hit.last, today) : "No interactions yet",
			onClick: () => this.pick({ path: hit.path, name: hit.name }),
		});
	}

	/** The name with the typed part in bold. */
	private highlight(name: string): HTMLElement {
		const el = createSpan();
		const needle = this.query.trim().toLowerCase();
		const at = needle ? name.toLowerCase().indexOf(needle) : -1;
		if (at < 0) {
			el.setText(name);
			return el;
		}
		el.appendText(name.slice(0, at));
		el.createEl("b", { text: name.slice(at, at + needle.length) });
		el.appendText(name.slice(at + needle.length));
		return el;
	}

	/** How takes this page's place; the tab's history keeps Who behind it. */
	private pick(person: { path: string; name: string }): void {
		this.ui.logWith(person, this.query);
	}

	private async create(name: string): Promise<void> {
		if (this.creating) return;
		this.creating = true;
		try {
			const path = await this.ui.service.createPerson(name);
			this.pick({ path, name });
		} catch (error) {
			new Notice(error instanceof Error ? error.message : String(error));
		} finally {
			this.creating = false;
		}
	}
}
