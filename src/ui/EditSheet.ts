import { App } from "obsidian";
import { FeedRow } from "../application/PeopleService";
import { describe } from "../domain/Interaction";
import { iconButton } from "./components";
import { fromInteraction, isComplete, toInteraction } from "./howState";
import { HowSheet } from "./HowSheet";
import { PageDescriptor } from "./sheet";
import { UiContext } from "./UiContext";

/** The How screen over an interaction already logged: its answers filled in, a trash can beside ✓. */
export class EditSheet extends HowSheet {
	constructor(
		app: App,
		ui: UiContext,
		private readonly row: FeedRow,
	) {
		super(app, ui, { path: row.path, name: row.name }, fromInteraction(row.interaction));
	}

	override descriptor(): PageDescriptor {
		return { kind: "edit", path: this.row.path, index: this.row.index };
	}

	protected override get title(): string {
		return "Edit interaction";
	}

	protected override get backIcon(): "x" | "chevron-left" {
		return "x";
	}

	override dismiss(): void {
		this.close();
	}

	protected override rightActions(parent: HTMLElement): void {
		iconButton(parent, "trash-2", "Delete interaction", () => void this.remove()).addClass("is-danger");
	}

	protected override async submit(): Promise<void> {
		if (!isComplete(this.state)) return;
		await this.run(() => this.ui.service.replaceInteraction(this.row.path, this.row.index, this.row.interaction, toInteraction(this.state)));
	}

	private async remove(): Promise<void> {
		await this.run(async () => {
			await this.ui.service.removeInteraction(this.row.path, this.row.index, this.row.interaction);
			this.ui.offerUndo({
				text: `Deleted ${this.row.name}: ${describe(this.row.interaction, this.ui.settings().labels)}`,
				undo: () => this.ui.service.addInteraction(this.row.path, this.row.interaction),
			});
		});
	}
}
