import { App, EventRef, Events, WorkspaceLeaf } from "obsidian";
import { PageDescriptor } from "./sheet";

/** One step of a tab's history, as Obsidian keeps it: the view's type and the state it gave. */
export interface HistoryEntry {
	readonly state?: { readonly type?: string; readonly state?: { readonly page?: PageDescriptor | null } };
}

interface LeafHistory {
	readonly backHistory: HistoryEntry[];
	forwardHistory: HistoryEntry[];
	go(steps: number): Promise<void>;
}

/** The page a step of history shows in a view of `type`: a page, null for the list, undefined for another view. */
export function pageAt(entry: HistoryEntry | undefined, type: string): PageDescriptor | null | undefined {
	if (entry?.state?.type !== type) return undefined;
	return entry.state.state?.page ?? null;
}

/** How many steps back the list under the pages is; null when the history behind holds no list of this view. */
export function stepsToList(back: readonly HistoryEntry[], type: string): number | null {
	for (let steps = 1; steps <= back.length; steps++) {
		const page = pageAt(back[back.length - steps], type);
		if (page === undefined) return null;
		if (page === null) return steps;
	}
	return null;
}

/**
 * The back and forward history of the Friends tab. Obsidian keeps it on the leaf without a public API, so every use
 * checks it is there, and the callers fall back to plain navigation when it isn't.
 */
export class TabHistory {
	constructor(
		private readonly app: App,
		private readonly leaf: WorkspaceLeaf,
		private readonly type: string,
	) {}

	/**
	 * The phone draws its back and forward buttons from the tab's history only when the active tab changes. The pages
	 * and the switch between the feed and the stats change it within the same tab, so this says so on every change, or
	 * the buttons look disabled with steps behind them.
	 */
	showOnPhone(): EventRef {
		return (this.leaf as Events).on("history-change", () => {
			if (this.app.workspace.getMostRecentLeaf() === this.leaf) this.app.workspace.trigger("active-leaf-change", this.leaf);
		});
	}

	/** The page the back arrow leads to: a page, null for the list, undefined for anything else or nothing. */
	previous(): PageDescriptor | null | undefined {
		const history = this.history();
		return history ? pageAt(history.backHistory[history.backHistory.length - 1], this.type) : undefined;
	}

	async back(): Promise<void> {
		await this.history()?.go(-1);
	}

	/**
	 * Steps back to the list the pages were opened over and forgets them, as a finished sheet should be: neither back
	 * nor forward leads into it again. False when there is no such list to go back to.
	 */
	async backToList(): Promise<boolean> {
		const history = this.history();
		const steps = history ? stepsToList(history.backHistory, this.type) : null;
		if (!history || steps === null) return false;
		await history.go(-steps);
		this.dropForward();
		return true;
	}

	/** Forgets the steps ahead: the pages they lead to are done with. */
	dropForward(): void {
		const history = this.history();
		if (!history?.forwardHistory.length) return;
		history.forwardHistory = [];
		(this.leaf as Events).trigger("history-change");
	}

	private history(): LeafHistory | null {
		const history = (this.leaf as unknown as { history?: Partial<LeafHistory> }).history;
		return history && Array.isArray(history.backHistory) && Array.isArray(history.forwardHistory) && typeof history.go === "function" ? (history as LeafHistory) : null;
	}
}
