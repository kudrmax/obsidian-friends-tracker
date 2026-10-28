import { reachRule } from "../settings";
import { row, sectionLabel } from "./components";
import { everyDays, sinceDays } from "./format";
import { Arrivals, arrive } from "./motion";
import { UiContext } from "./UiContext";

/** Whom to get in touch with: everyone whose target ran out or is about to. The same block on the feed and on Stats. */
export class ReachOutBlock {
	constructor(private readonly ui: UiContext) {}

	render(parent: HTMLElement, arrivals: Arrivals): void {
		const due = this.ui.service.reachOut(reachRule(this.ui.settings()));
		if (!due.length) return;
		sectionLabel(parent, "Reach out");
		for (const item of due) {
			const line = row(parent, {
				circle: { initial: item.person.name.slice(0, 1).toUpperCase() },
				title: item.person.name,
				subtitle: everyDays(item.every),
				trailing: { text: sinceDays(item.days), strong: true, tone: item.status },
				onClick: () => this.ui.openPerson(item.path),
			});
			arrive(line, arrivals.offset(`reach:${item.path}`));
		}
	}
}
