import { reachRule } from "../settings";
import { moreButton, row, sectionLabel } from "./components";
import { everyDays, sinceDays } from "./format";
import { Arrivals, arrive } from "./motion";
import { UiContext } from "./UiContext";

const LIST_SHOWN = 5;

/** Whom to get in touch with: people whose target ran out or is about to. The same block on the feed and on Stats. */
export class ReachOutBlock {
	private open = false;

	constructor(
		private readonly ui: UiContext,
		private readonly redraw: () => void,
	) {}

	render(parent: HTMLElement, arrivals: Arrivals): void {
		const due = this.ui.service.reachOut(reachRule(this.ui.settings()));
		if (!due.length) return;
		sectionLabel(parent, "Reach out");
		for (const item of this.open ? due : due.slice(0, LIST_SHOWN)) {
			const line = row(parent, {
				circle: { initial: item.person.name.slice(0, 1).toUpperCase() },
				title: item.person.name,
				subtitle: everyDays(item.every),
				trailing: { text: sinceDays(item.days), strong: true, tone: item.status },
				onClick: () => this.ui.openPerson(item.path),
			});
			arrive(line, arrivals.offset(`reach:${item.path}`));
		}
		if (due.length <= LIST_SHOWN) return;
		moreButton(parent, this.open, this.open ? "Fewer" : `${due.length - LIST_SHOWN} more`, () => {
			this.open = !this.open;
			this.redraw();
		});
	}
}
