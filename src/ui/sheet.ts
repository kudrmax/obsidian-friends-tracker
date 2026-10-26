import { App } from "obsidian";

/** What a page is, in words a tab's history can keep and rebuild the sheet from. */
export type PageDescriptor =
	| { readonly kind: "who"; readonly query: string }
	| { readonly kind: "how"; readonly path: string; readonly name: string; readonly query: string }
	| { readonly kind: "edit"; readonly path: string; readonly index: number };

export function samePage(a: PageDescriptor | null, b: PageDescriptor | null): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * A screen of its own: Who, How and Edit. It is a page inside the Friends tab, on a phone and a computer alike, so the
 * tab's back and forward arrows walk through it. The sheet only fills its content and asks to be closed; the page
 * holder does the rest.
 */
export abstract class FullSheet {
	private host: PageHost | null = null;

	protected constructor(
		protected readonly app: App,
		private readonly hosts: () => PageHost,
	) {}

	protected abstract fill(content: HTMLElement): void;

	/** The page this sheet is, for the tab's history. */
	abstract descriptor(): PageDescriptor;

	open(): void {
		this.host = this.hosts();
		this.host.show(this);
	}

	close(): void {
		this.host?.hide(this);
		this.host = null;
	}

	/** The page's description changed (what was typed, say): the tab's history should remember it as it is now. */
	protected changed(): void {
		this.host?.update(this);
	}

	/** The people changed while the sheet shows: redraw what depends on them. Nothing, unless a sheet says otherwise. */
	refresh(): void {}

	/** The holder calls this with the element the sheet owns while it is shown. */
	mount(content: HTMLElement): void {
		content.empty();
		this.fill(content);
	}
}

/** Something that can hold a sheet as a page in place of its own content: the Friends view. */
export interface PageHolder {
	showPage(sheet: FullSheet): void;
	updatePage(sheet: FullSheet): void;
	hidePage(): void;
}

/**
 * Opens sheets as pages in the Friends tab. Showing a page opens that tab when it isn't there; an update or a close
 * concerns the tab already showing the page and touches nothing else, so typing never re-opens or re-focuses the tab.
 */
export class PageHost {
	constructor(
		private readonly open: () => Promise<PageHolder | null>,
		private readonly current: () => PageHolder | null,
	) {}

	show(sheet: FullSheet): void {
		void this.open().then((holder) => holder?.showPage(sheet));
	}

	update(sheet: FullSheet): void {
		this.current()?.updatePage(sheet);
	}

	hide(_sheet: FullSheet): void {
		this.current()?.hidePage();
	}
}
