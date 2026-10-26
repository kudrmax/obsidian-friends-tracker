import { App, Notice } from "obsidian";
import { PeopleService, PersonHit } from "../application/PeopleService";
import { icon, iconButton, row, sectionLabel, sheetHeader } from "./components";
import { shortDate } from "./format";
import { FullSheet, PageDescriptor } from "./sheet";
import { UiContext } from "./UiContext";
import { diag, writeLayoutDiagnostics } from "./diagnostics";

/** Step one of logging an interaction: who it was with. */
export class WhoSheet extends FullSheet {
	private query = "";
	private results: HTMLElement | null = null;

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

	protected fill(content: HTMLElement): void {
		sheetHeader(content, { left: { icon: "x", label: "Cancel", onClick: () => this.close() }, title: "New interaction" });
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
		for (const type of ["focus", "blur", "keydown", "beforeinput", "compositionstart", "compositionend", "change"]) {
			input.addEventListener(type, (event) => diag(`${type} value=${JSON.stringify(input.value)} ${"data" in event ? "data=" + JSON.stringify((event as InputEvent).data) : ""} ${"inputType" in event ? (event as InputEvent).inputType : ""}`));
		}
		input.addEventListener("input", (event) => {
			diag(`input value=${JSON.stringify(input.value)} query=${JSON.stringify(this.query)} inputType=${(event as InputEvent).inputType} data=${JSON.stringify((event as InputEvent).data)}`);
			if (input.value === this.query) return;
			this.query = input.value;
			this.changed();
			this.render();
		});
		this.results = body.createDiv("ft-search-results");
		diag(`fill: query=${JSON.stringify(this.query)} people=${this.ui.service.people().length} listed=${this.ui.repository.list().length} md=${this.app.vault.getMarkdownFiles().length} source=${this.ui.settings().source} tag=${this.ui.settings().tag}`);
		this.render();
		window.setTimeout(() => input.focus());
		/* temporary: the phone bug of 2026-10-27 */
		window.setTimeout(() => void writeLayoutDiagnostics(this.app, content), 1500);
		window.setTimeout(() => void writeLayoutDiagnostics(this.app, content), 5000);
	}

	private render(): void {
		const results = this.results;
		if (!results) return;
		results.empty();
		const typed = this.query.trim();
		let found: ReturnType<PeopleService["searchPeople"]>;
		try {
			found = this.ui.service.searchPeople(typed);
		} catch (error) {
			diag(`render THREW: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
			throw error;
		}
		diag(`render typed=${JSON.stringify(typed)} recent=${found.recent.length} everyone=${found.everyone.length} exact=${found.exact} attached=${results.isConnected}`);
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
		try {
			const path = await this.ui.service.createPerson(name);
			this.pick({ path, name });
		} catch (error) {
			new Notice(error instanceof Error ? error.message : String(error));
		}
	}
}
