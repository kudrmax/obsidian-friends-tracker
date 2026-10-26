import { App, Modal } from "obsidian";

/** A screen of its own: the whole display on a phone, a column on a computer. Its header and body are the subclass's. */
export abstract class FullSheet extends Modal {
	protected constructor(app: App) {
		super(app);
	}

	protected abstract fill(content: HTMLElement): void;

	override onOpen(): void {
		this.modalEl.addClass("pt-sheet", "people-tracker");
		this.contentEl.empty();
		this.fill(this.contentEl);
	}

	override onClose(): void {
		this.contentEl.empty();
	}
}
