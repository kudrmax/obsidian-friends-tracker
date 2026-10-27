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
 * The sheet a step of the tab's history shows: the one just opened when it is that page, else one rebuilt from the
 * page's description; none for the list, and none when what the page is about is gone, so the list shows instead.
 */
export function sheetForPage(page: PageDescriptor | null, opened: FullSheet | null, rebuild: (page: PageDescriptor) => FullSheet | null): FullSheet | null {
	if (!page) return null;
	const sheet = opened && samePage(opened.descriptor(), page) ? opened : rebuild(page);
	return sheet && !sheet.isGone() ? sheet : null;
}

/** Something that holds a sheet as a page in place of its own content: the Friends view. */
export interface PageHolder {
	showPage(sheet: FullSheet): void;
	updatePage(sheet: FullSheet): void;
	/** Takes the pages down and shows the list again. */
	hidePage(): void;
	/** The page the tab's back arrow leads to: a page, null for the list, undefined for anything else or nothing. */
	previousPage(): PageDescriptor | null | undefined;
	/** One step back, as the tab's back arrow. */
	goBack(): void;
}

/**
 * A screen of its own: Who, How and Edit. It is a page inside the Friends tab, on a phone and a computer alike, so the
 * tab's back and forward arrows walk through it. The sheet only fills its content and asks to be closed; the holder it
 * is mounted in does the rest, whether the sheet was just opened or rebuilt from the tab's history.
 */
export abstract class FullSheet {
	private holder: PageHolder | null = null;
	private content: HTMLElement | null = null;

	protected constructor(
		protected readonly app: App,
		private readonly hosts: () => PageHost,
	) {}

	protected abstract fill(content: HTMLElement): void;

	/** The page this sheet is, for the tab's history. */
	abstract descriptor(): PageDescriptor;

	/** The way out the header's left button offers; Escape takes it too. */
	abstract dismiss(): void;

	open(): void {
		this.hosts().show(this);
	}

	/** Back to the list. A sheet that no longer shows has nothing to close. */
	close(): void {
		this.holder?.hidePage();
	}

	/** The page's description changed (what was typed, say): the tab's history should remember it as it is now. */
	protected changed(): void {
		this.holder?.updatePage(this);
	}

	/** The page the tab's back arrow leads to from here; undefined when it leads out of the Friends pages. */
	protected previousPage(): PageDescriptor | null | undefined {
		return this.holder?.previousPage();
	}

	protected goBack(): void {
		this.holder?.goBack();
	}

	/** What the page is about no longer exists, like a person whose note was deleted. Never, unless a sheet says otherwise. */
	isGone(): boolean {
		return false;
	}

	/** The people changed while the sheet shows: redraw what depends on them. Nothing, unless a sheet says otherwise. */
	refresh(): void {}

	/** A note was renamed or moved while the sheet shows. Nothing, unless the sheet is about that note. */
	moved(_from: string, _to: string): void {}

	/** Draws the sheet afresh from what it holds. */
	protected redraw(): void {
		if (this.content) this.mount(this.content, this.holder ?? undefined);
	}

	/** The holder calls this with the element the sheet owns while it is shown. */
	mount(content: HTMLElement, holder: PageHolder | undefined): void {
		this.holder = holder ?? null;
		this.content = content;
		content.empty();
		this.fill(content);
	}

	/** The holder took the page down: whatever the sheet still finishes (a write under way) no longer steers the tab. */
	unmount(): void {
		this.holder = null;
		this.content = null;
	}
}

/** Opens sheets as pages in the Friends tab, opening that tab when it isn't there. */
export class PageHost {
	constructor(private readonly open: () => Promise<PageHolder | null>) {}

	show(sheet: FullSheet): void {
		void this.open().then((holder) => holder?.showPage(sheet));
	}
}
