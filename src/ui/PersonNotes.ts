import { App, Component, MarkdownView, Menu, TAbstractFile, TFile, WorkspaceLeaf } from "obsidian";
import { PersonBlock } from "./PersonBlock";
import { UiContext } from "./UiContext";

const NOTE_CLASS = "ft-person-note";
/** A property the person block already shows, hidden from the note's Properties panel. */
const OWN_PROPERTY = "ft-own-property";
/** A Properties panel with nothing but the plugin's own properties, hidden whole. */
const ONLY_OWN = "ft-only-own";

interface Placed {
	readonly view: MarkdownView;
	readonly source: PersonBlock;
	readonly reading: PersonBlock;
	readonly observer: MutationObserver;
}

/**
 * Turns every person's note into a person page: the person block sits at the top of the note, in both editing and
 * reading mode, and the plugin's own properties are hidden from the Properties panel.
 */
export class PersonNotes extends Component {
	private readonly placed = new Map<WorkspaceLeaf, Placed>();

	constructor(
		private readonly app: App,
		private readonly ui: UiContext,
	) {
		super();
	}

	override onload(): void {
		const sync = () => this.sync();
		this.registerEvent(this.app.workspace.on("layout-change", sync));
		this.registerEvent(this.app.workspace.on("file-open", sync));
		this.registerEvent(this.app.workspace.on("active-leaf-change", sync));
		this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => this.fileMenu(menu, file)));
		this.app.workspace.onLayoutReady(sync);
		this.refresh();
	}

	override onunload(): void {
		for (const leaf of [...this.placed.keys()]) this.release(leaf);
	}

	/** Re-draws every person block and re-applies the hidden properties, after data or settings change. */
	refresh(): void {
		this.sync();
		for (const placed of this.placed.values()) {
			placed.source.render();
			placed.reading.render();
			this.hideOwnProperties(placed.view);
		}
	}

	activePerson(): string | null {
		const file = this.app.workspace.getActiveFile();
		return file && this.ui.repository.contains(file.path) ? file.path : null;
	}

	private sync(): void {
		const seen = new Set<WorkspaceLeaf>();
		this.app.workspace.iterateAllLeaves((leaf) => {
			const view = leaf.view;
			if (!(view instanceof MarkdownView) || !view.file) return;
			if (!this.ui.settings().personBlock || !this.ui.repository.contains(view.file.path)) return;
			seen.add(leaf);
			this.place(leaf, view, view.file.path);
		});
		for (const leaf of [...this.placed.keys()]) if (!seen.has(leaf)) this.release(leaf);
	}

	private place(leaf: WorkspaceLeaf, view: MarkdownView, path: string): void {
		let placed = this.placed.get(leaf);
		if (placed && placed.view !== view) {
			this.release(leaf);
			placed = undefined;
		}
		if (!placed) {
			const source = new PersonBlock(this.ui, leaf, path);
			const reading = new PersonBlock(this.ui, leaf, path);
			const observer = new MutationObserver(() => this.attach(view, source, reading));
			observer.observe(view.contentEl, { childList: true, subtree: true });
			placed = { view, source, reading, observer };
			this.placed.set(leaf, placed);
			source.render();
			reading.render();
		} else if (placed.source.file !== path) {
			placed.source.moveTo(path);
			placed.reading.moveTo(path);
		}
		view.containerEl.addClass(NOTE_CLASS);
		this.attach(view, placed.source, placed.reading);
	}

	private attach(view: MarkdownView, source: PersonBlock, reading: PersonBlock): void {
		const sizer = view.contentEl.querySelector<HTMLElement>(".markdown-source-view .cm-sizer");
		const content = sizer?.querySelector<HTMLElement>(":scope > .cm-contentContainer");
		if (sizer && content && source.el.nextElementSibling !== content) sizer.insertBefore(source.el, content);
		const header = view.contentEl.querySelector<HTMLElement>(".markdown-reading-view .markdown-preview-sizer > .mod-header");
		if (header && reading.el.parentElement !== header) header.appendChild(reading.el);
		this.hideOwnProperties(view);
	}

	/** Hides the interactions list, and the tags when they hold only the plugin's tag. */
	private hideOwnProperties(view: MarkdownView): void {
		const settings = this.ui.settings();
		const own = settings.properties.interactions.toLowerCase();
		const tag = settings.tag.toLowerCase();
		for (const container of view.contentEl.querySelectorAll<HTMLElement>(".metadata-container:not(.ft-person-panel)")) {
			const properties = [...container.querySelectorAll<HTMLElement>(".metadata-property")];
			for (const property of properties) {
				const key = (property.dataset.propertyKey ?? "").toLowerCase();
				const hidden = key === own || (key === "tags" && settings.source === "tag" && this.onlyOwnTag(property, tag));
				property.toggleClass(OWN_PROPERTY, hidden);
			}
			container.toggleClass(ONLY_OWN, properties.length > 0 && properties.every((property) => property.hasClass(OWN_PROPERTY)));
		}
	}

	private onlyOwnTag(property: HTMLElement, tag: string): boolean {
		const pills = [...property.querySelectorAll<HTMLElement>(".multi-select-pill-content")].map((pill) => pill.textContent?.trim().replace(/^#/, "").toLowerCase() ?? "");
		return pills.length > 0 && pills.every((pill) => pill === tag || pill.startsWith(`${tag}/`));
	}

	private release(leaf: WorkspaceLeaf): void {
		const placed = this.placed.get(leaf);
		if (!placed) return;
		placed.observer.disconnect();
		placed.source.el.remove();
		placed.reading.el.remove();
		placed.view.containerEl.removeClass(NOTE_CLASS);
		this.placed.delete(leaf);
	}

	private fileMenu(menu: Menu, file: TAbstractFile): void {
		if (!(file instanceof TFile) || !this.ui.repository.contains(file.path)) return;
		const entry = this.ui.repository.get(file.path);
		if (entry?.kind !== "ok") return;
		const person = entry.person;
		menu.addItem((item) =>
			item
				.setTitle("Log an interaction")
				.setIcon("users")
				.onClick(() => this.ui.logWith({ path: file.path, name: person.name })),
		);
		menu.addItem((item) => item.setTitle("Open friends").setIcon("list").onClick(() => this.ui.openFeed()));
	}
}
