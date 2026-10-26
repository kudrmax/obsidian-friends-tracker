import { App, Modal } from "obsidian";

/**
 * A screen of its own: Who, How and Edit. On a phone it is a modal over the whole display; on a computer it is a page
 * inside the People tab. Which one is the host's business; the sheet only fills its content and asks to be closed.
 */
export abstract class FullSheet {
	private host: SheetHost | null = null;

	protected constructor(
		protected readonly app: App,
		private readonly hosts: () => SheetHost,
	) {}

	protected abstract fill(content: HTMLElement): void;

	open(): void {
		this.host = this.hosts();
		this.host.show(this);
	}

	close(): void {
		this.host?.hide(this);
		this.host = null;
	}

	/** The host calls this with the element the sheet owns while it is shown. */
	mount(content: HTMLElement): void {
		content.empty();
		this.fill(content);
	}
}

export interface SheetHost {
	show(sheet: FullSheet): void;
	hide(sheet: FullSheet): void;
}

/** A phone's host: Obsidian's modal, stretched over the whole display by the styles. */
export class ModalHost implements SheetHost {
	private readonly open = new Map<FullSheet, Modal>();

	constructor(private readonly app: App) {}

	show(sheet: FullSheet): void {
		const modal = new (class extends Modal {
			override onOpen(): void {
				this.modalEl.addClass("pt-sheet", "people-tracker");
				sheet.mount(this.contentEl);
			}

			override onClose(): void {
				this.contentEl.empty();
			}
		})(this.app);
		this.open.set(sheet, modal);
		modal.open();
	}

	hide(sheet: FullSheet): void {
		this.open.get(sheet)?.close();
		this.open.delete(sheet);
	}
}

/** Something that can hold a sheet as a page in place of its own content: the People view on a computer. */
export interface PageHolder {
	showPage(render: (content: HTMLElement) => void): void;
	hidePage(): void;
}

/** A computer's host: the sheet becomes a page inside the People tab, which it gets opened for that. */
export class PageHost implements SheetHost {
	constructor(private readonly holder: () => Promise<PageHolder | null>) {}

	show(sheet: FullSheet): void {
		void this.holder().then((holder) => holder?.showPage((content) => sheet.mount(content)));
	}

	hide(_sheet: FullSheet): void {
		void this.holder().then((holder) => holder?.hidePage());
	}
}
