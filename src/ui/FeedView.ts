import { ItemView, Notice, ViewStateResult, WorkspaceLeaf } from "obsidian";
import { FeedDay, FeedRow } from "../application/PeopleService";
import { describe } from "../domain/Interaction";
import { LocalDate } from "../domain/LocalDate";
import { KIND_ICONS, dayHeader, fab, row } from "./components";
import { nextPage, pagesAvailable, pagesShown } from "./feed";
import { FullSheet, PageDescriptor, PageHolder, samePage } from "./sheet";
import { dayDate, dayName } from "./format";
import { TabHistory } from "./TabHistory";
import { UiContext, UndoOffer } from "./UiContext";

export const FEED_VIEW = "friends-tracker-feed";
/** How close to the bottom, in rows, the list gets before the next page is added. */
const ROWS_BEFORE_END = 5;
/** How long the undo line stays. */
export const UNDO_MS = 5000;

/** The main screen: every interaction logged, grouped by day, newest first, with the "+" to log another. */
export class FeedView extends ItemView implements PageHolder {
	/** A view Obsidian keeps history for, so its back and forward arrows walk the pages. */
	override navigation = true;
	private shown: FeedDay[] = [];
	private list: HTMLElement | null = null;
	private scroller: HTMLElement | null = null;
	private undoEl: HTMLElement | null = null;
	private undoTimer: number | null = null;
	private page: HTMLElement | null = null;
	/** The sheet shown as the page, so a change in the notes reaches it too. */
	private sheet: FullSheet | null = null;
	/** What the tab's history knows the shown page as; null while the list shows. */
	private pageState: PageDescriptor | null = null;
	/** The sheet whose page was just asked for, so setState shows that very instance. */
	private pending: FullSheet | null = null;
	private readonly history: TabHistory;

	constructor(
		leaf: WorkspaceLeaf,
		private readonly ui: UiContext,
	) {
		super(leaf);
		this.history = new TabHistory(leaf, FEED_VIEW);
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
		this.registerEvent(this.history.onChange(() => this.showHistory()));
		this.refresh();
	}

	override async onClose(): Promise<void> {
		this.clearUndo();
		this.takeDown();
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
		this.sheet?.refresh();
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

	override getState(): Record<string, unknown> {
		return { page: this.pageState };
	}

	/**
	 * The tab's state says which page shows; every change of it is a step in the tab's history, so Obsidian's back and
	 * forward walk the pages. A sheet just opened is taken as it is; one coming back from history is rebuilt.
	 */
	override async setState(state: unknown, result: ViewStateResult): Promise<void> {
		const page = ((state as { page?: unknown } | null)?.page ?? null) as PageDescriptor | null;
		await super.setState(state, result);
		if (samePage(page, this.pageState)) return;
		/* A change of page is a step in the tab's history, unless it asks to replace the step it is on. */
		result.history = (state as { replace?: unknown } | null)?.replace !== true;
		const pending = this.pending;
		this.pending = null;
		const sheet = page ? (pending && samePage(pending.descriptor(), page) ? pending : this.ui.sheetFor(page)) : null;
		if (sheet) this.put(sheet);
		else this.takeDown();
	}

	/* A sheet takes the tab over: the list steps aside until the sheet closes. */
	showPage(sheet: FullSheet): void {
		this.pending = sheet;
		void this.leaf.setViewState({ type: FEED_VIEW, active: true, state: { page: sheet.descriptor() } });
	}

	updatePage(sheet: FullSheet): void {
		if (this.pageState) this.pageState = sheet.descriptor();
	}

	/**
	 * Back to the list the pages were opened over, forgetting them, so the back arrow never leads into a sheet already
	 * done with. A page with no list behind it (restored on start) is replaced by the list.
	 */
	hidePage(): void {
		if (!this.pageState) return;
		void this.leavePages();
	}

	private async leavePages(): Promise<void> {
		if (!(await this.history.backToList()) && this.pageState) {
			await this.leaf.setViewState({ type: FEED_VIEW, active: true, state: { page: null, replace: true } });
			this.history.dropForward();
		}
	}

	/**
	 * The phone's back and forward buttons are drawn from the tab's history only when the active tab changes; the pages
	 * change it within the same tab, so say so, or the buttons look disabled with pages behind them.
	 */
	private showHistory(): void {
		if (this.app.workspace.getMostRecentLeaf() === this.leaf) this.app.workspace.trigger("active-leaf-change", this.leaf);
	}

	previousPage(): PageDescriptor | null | undefined {
		return this.history.previous();
	}

	goBack(): void {
		void this.history.back();
	}

	private put(sheet: FullSheet): void {
		this.sheet?.unmount();
		this.page?.remove();
		this.page = this.contentEl.createDiv("ft-page");
		this.contentEl.addClass("has-page");
		this.pageState = sheet.descriptor();
		this.sheet = sheet;
		sheet.mount(this.page, this);
	}

	private takeDown(): void {
		this.sheet?.unmount();
		this.page?.remove();
		this.page = null;
		this.sheet = null;
		this.pageState = null;
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
			meta: entry.interaction.time?.toString(),
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
