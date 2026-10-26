import { App, Notice } from "obsidian";
import { PersonHit } from "../application/PeopleService";
import { icon, iconButton, row, sectionLabel, sheetHeader } from "./components";
import { shortDate } from "./format";
import { FullSheet } from "./sheet";
import { UiContext } from "./UiContext";

/** Step one of logging an interaction: who it was with. */
export class WhoSheet extends FullSheet {
	private query = "";
	private results: HTMLElement | null = null;

	constructor(
		app: App,
		private readonly ui: UiContext,
	) {
		super(app);
	}

	protected fill(content: HTMLElement): void {
		sheetHeader(content, { left: { icon: "x", label: "Cancel", onClick: () => this.close() }, title: "New interaction" });
		const body = content.createDiv("pt-sheet-body");
		const search = body.createDiv("pt-search");
		icon(search, "search");
		const input = search.createEl("input", { type: "text", attr: { placeholder: "Name", "aria-label": "Search people", autocapitalize: "words" } });
		const clear = iconButton(search, "x", "Clear", () => {
			input.value = "";
			this.query = "";
			input.focus();
			this.render();
		});
		clear.addClass("pt-search-clear");
		input.addEventListener("input", () => {
			this.query = input.value;
			this.render();
		});
		this.results = body.createDiv("pt-search-results");
		this.render();
		window.setTimeout(() => input.focus());
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

	private pick(person: { path: string; name: string }): void {
		this.close();
		this.ui.logWith(person);
	}

	private async create(name: string): Promise<void> {
		try {
			const path = await this.ui.service.createPerson(name);
			this.pick({ path, name });
		} catch (error) {
			new Notice(error instanceof Error ? error.message : String(error));
		}
	}
}
