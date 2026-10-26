import { ItemView, WorkspaceLeaf } from "obsidian";
import { FeedDay, FeedRow } from "../application/PeopleService";
import { describe } from "../domain/Interaction";
import { KIND_ICONS, dayHeader, fab, iconButton, row } from "./components";
import { PAGE_DAYS, nextPage } from "./feed";
import { dayDate, dayName } from "./format";
import { UiContext } from "./UiContext";

export const FEED_VIEW = "people-tracker-feed";
/** How close to the bottom, in rows, the list gets before the next page is added. */
const ROWS_BEFORE_END = 5;
/** How long the undo line stays. */
export const UNDO_MS = 5000;

export interface UndoOffer {
	readonly text: string;
	undo(): Promise<unknown>;
}

/** The main screen: every interaction logged, grouped by day, newest first, with the "+" to log another. */
export class FeedView extends ItemView {
	private shown: FeedDay[] = [];
	private list: HTMLElement | null = null;
	private scroller: HTMLElement | null = null;
	private undoEl: HTMLElement | null = null;
	private undoTimer: number | null = null;

	constructor(
		leaf: WorkspaceLeaf,
		private readonly ui: UiContext,
	) {
		super(leaf);
	}

	override getViewType(): string {
		return FEED_VIEW;
	}

	override getDisplayText(): string {
		return "People";
	}

	override getIcon(): string {
		return "users";
	}

	override async onOpen(): Promise<void> {
		const root = this.contentEl;
		root.empty();
		root.addClass("people-tracker", "pt-view", "pt-feed");
		const header = root.createDiv("pt-sheet-header pt-feed-header");
		header.createDiv("pt-sheet-left");
		header.createDiv("pt-sheet-middle");
		iconButton(header.createDiv("pt-sheet-right"), "bar-chart-3", "Stats", () => this.ui.openStats());
		this.scroller = root.createDiv("pt-scroll");
		const column = this.scroller.createDiv("pt-column");
		column.createEl("h1", { cls: "pt-title", text: "People" });
		this.list = column.createDiv("pt-feed-list");
		this.scroller.addEventListener("scroll", () => this.maybeLoadMore());
		root.createDiv("pt-fade");
		fab(root, "Log an interaction", () => this.ui.newInteraction());
		this.refresh();
	}

	override async onClose(): Promise<void> {
		this.clearUndo();
		this.contentEl.empty();
	}

	/** Redraws the feed from the notes, keeping as many pages as were open. */
	refresh(): void {
		if (!this.list) return;
		const pages = Math.max(1, this.pagesShown());
		this.shown = [];
		for (let page = 0; page < pages; page++) this.shown = nextPage(this.shown, this.ui.service, this.ui.service.today(), page);
		this.render();
	}

	/** Offers to undo what was just logged, for a few seconds, over the "+". */
	offerUndo(offer: UndoOffer): void {
		this.clearUndo();
		const line = this.contentEl.createDiv({ cls: "pt-undo", attr: { role: "status" } });
		line.createSpan({ cls: "pt-undo-text", text: offer.text });
		line.createEl("button", { cls: "pt-undo-button", text: "Undo" }).addEventListener("click", () => {
			this.clearUndo();
			void offer.undo();
		});
		line.addEventListener("click", (event) => {
			if (event.target === line) this.clearUndo();
		});
		this.undoEl = line;
		this.undoTimer = window.setTimeout(() => this.clearUndo(), UNDO_MS);
	}

	private clearUndo(): void {
		if (this.undoTimer !== null) window.clearTimeout(this.undoTimer);
		this.undoTimer = null;
		this.undoEl?.remove();
		this.undoEl = null;
	}

	private pagesShown(): number {
		const last = this.shown[this.shown.length - 1];
		if (!last) return 0;
		const days = this.ui.service.today().daysSince(last.date);
		return Math.floor(days / PAGE_DAYS) + 1;
	}

	private render(): void {
		const list = this.list;
		if (!list) return;
		list.empty();
		const today = this.ui.service.today();
		if (!this.shown.length) {
			list.createDiv({ cls: "pt-empty", text: "No interactions yet" });
			return;
		}
		for (const day of this.shown) {
			const group = list.createDiv("pt-group");
			dayHeader(group, dayName(day.date, today), dayDate(day.date, today));
			for (const entry of day.rows) this.renderRow(group, entry);
		}
	}

	private renderRow(parent: HTMLElement, entry: FeedRow): void {
		const kind = entry.interaction.kind;
		row(parent, {
			circle: { icon: KIND_ICONS[kind], accent: kind === "meeting" },
			title: entry.name,
			subtitle: describe(entry.interaction, this.ui.settings().labels),
			trailing: "chevron",
			onClick: () => this.ui.editInteraction(entry),
		});
	}

	private maybeLoadMore(): void {
		const scroller = this.scroller;
		if (!scroller || !this.shown.length) return;
		const rowHeight = scroller.querySelector<HTMLElement>(".pt-row")?.offsetHeight ?? 0;
		const left = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
		if (left > rowHeight * ROWS_BEFORE_END) return;
		const before = this.shown.length;
		this.shown = nextPage(this.shown, this.ui.service, this.ui.service.today());
		if (this.shown.length !== before) this.render();
	}
}
