import { ItemView, Notice, WorkspaceLeaf } from "obsidian";
import { FeedDay, FeedRow } from "../application/PeopleService";
import { describe } from "../domain/Interaction";
import { LocalDate } from "../domain/LocalDate";
import { KIND_ICONS, dayHeader, fab, row } from "./components";
import { nextPage, pagesAvailable, pagesShown } from "./feed";
import { PageHolder } from "./sheet";
import { dayDate, dayName } from "./format";
import { UiContext, UndoOffer } from "./UiContext";

export const FEED_VIEW = "friends-tracker-feed";
/** How close to the bottom, in rows, the list gets before the next page is added. */
const ROWS_BEFORE_END = 5;
/** How long the undo line stays. */
export const UNDO_MS = 5000;

/** The main screen: every interaction logged, grouped by day, newest first, with the "+" to log another. */
export class FeedView extends ItemView implements PageHolder {
	private shown: FeedDay[] = [];
	private list: HTMLElement | null = null;
	private scroller: HTMLElement | null = null;
	private undoEl: HTMLElement | null = null;
	private undoTimer: number | null = null;
	private page: HTMLElement | null = null;

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
		return "Friends";
	}

	override getIcon(): string {
		return "users";
	}

	override async onOpen(): Promise<void> {
		const root = this.contentEl;
		root.empty();
		root.addClass("friends-tracker", "ft-view", "ft-feed");
		this.scroller = root.createDiv("ft-scroll");
		const column = this.scroller.createDiv("ft-column");
		column.createEl("h1", { cls: "ft-title", text: "Friends" });
		this.list = column.createDiv("ft-feed-list");
		this.scroller.addEventListener("scroll", () => this.maybeLoadMore());
		root.createDiv("ft-fade");
		fab(root, "Stats", () => this.ui.openStats(), "bar-chart-3").addClass("is-quiet");
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
		this.pagesLoaded = pages;
		this.render();
		this.fillScreen();
	}

	/** How many pages the notes hold at all. */
	private pagesInAll(): number {
		const today = this.ui.service.today();
		const oldest = this.ui.service
			.people()
			.map((person) => person.interactions()[person.interactions().length - 1]?.date)
			.filter((date): date is LocalDate => date !== undefined)
			.reduce<LocalDate | undefined>((earliest, date) => (!earliest || date.isBefore(earliest) ? date : earliest), undefined);
		return pagesAvailable(oldest, today);
	}

	/** A sparse feed may not reach the bottom of the screen, so no scroll ever asks for more: keep adding pages until it does. */
	private fillScreen(): void {
		const scroller = this.scroller;
		/* A view that isn't laid out yet measures as empty; it asks again once it is drawn. */
		if (!scroller || scroller.clientHeight === 0) {
			if (scroller) window.requestAnimationFrame(() => this.fillScreenNow());
			return;
		}
		this.fillScreenNow();
	}

	private fillScreenNow(): void {
		const scroller = this.scroller;
		if (!scroller || scroller.clientHeight === 0) return;
		while (scroller.scrollHeight <= scroller.clientHeight && this.loadMore()) {
			/* each page drawn makes the list taller, until there are no pages left */
		}
	}

	/** Adds the next page when there is one; says whether it did. */
	private loadMore(): boolean {
		const pages = this.pagesShown();
		if (pages >= this.pagesInAll()) return false;
		this.shown = nextPage(this.shown, this.ui.service, this.ui.service.today(), pages);
		this.pagesLoaded = pages + 1;
		this.render();
		return true;
	}

	/** On a computer a sheet takes the tab over: the list steps aside until the sheet closes. */
	showPage(render: (content: HTMLElement) => void): void {
		this.hidePage();
		this.page = this.contentEl.createDiv("ft-page");
		this.contentEl.addClass("has-page");
		render(this.page);
	}

	hidePage(): void {
		this.page?.remove();
		this.page = null;
		this.contentEl.removeClass("has-page");
	}

	/** Offers to undo what was just logged, for a few seconds, over the "+". */
	offerUndo(offer: UndoOffer): void {
		this.clearUndo();
		const line = this.contentEl.createDiv({ cls: "ft-undo", attr: { role: "status" } });
		line.createSpan({ cls: "ft-undo-text", text: offer.text });
		line.createEl("button", { cls: "ft-undo-button", text: "Undo" }).addEventListener("click", () => {
			this.clearUndo();
			offer.undo().catch((error: unknown) => new Notice(error instanceof Error ? error.message : String(error)));
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

	/** The pages drawn so far; a page with no days still counts, so an empty stretch isn't asked for again. */
	private pagesLoaded = 0;

	private pagesShown(): number {
		return Math.max(pagesShown(this.shown, this.ui.service.today()), this.pagesLoaded);
	}

	private render(): void {
		const list = this.list;
		if (!list) return;
		list.empty();
		const today = this.ui.service.today();
		if (!this.shown.length) {
			list.createDiv({ cls: "ft-empty", text: "No interactions yet" });
			return;
		}
		for (const day of this.shown) {
			const group = list.createDiv("ft-group");
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
		if (!scroller) return;
		const rowHeight = scroller.querySelector<HTMLElement>(".ft-row")?.offsetHeight ?? 0;
		const left = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
		if (left > rowHeight * ROWS_BEFORE_END) return;
		this.loadMore();
	}
}
