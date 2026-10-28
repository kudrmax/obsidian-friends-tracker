import { TargetRow } from "../application/PeopleService";
import { reachRule } from "../settings";
import { row, sectionLabel } from "./components";
import { everyDays, sinceDays } from "./format";
import { Arrivals, arrive } from "./motion";
import { UiContext } from "./UiContext";

/** A list of people against their targets: "Every N days" under the name, the days since the last contact on the right, coloured when due. */
abstract class TargetBlock {
	protected abstract readonly label: string;
	protected abstract readonly key: string;

	constructor(protected readonly ui: UiContext) {}

	protected abstract rows(): TargetRow[];

	render(parent: HTMLElement, arrivals: Arrivals): void {
		const rows = this.rows();
		if (!rows.length) return;
		sectionLabel(parent, this.label);
		for (const item of rows) {
			const line = row(parent, {
				circle: { initial: item.person.name.slice(0, 1).toUpperCase() },
				title: item.person.name,
				subtitle: everyDays(item.every),
				trailing: { text: sinceDays(item.days), strong: true, ...(item.status === "ok" ? {} : { tone: item.status }) },
				onClick: () => this.ui.openPerson(item.path),
			});
			arrive(line, arrivals.offset(`${this.key}:${item.path}`));
		}
	}
}

/** Whom to get in touch with: everyone whose target ran out or is about to. On the feed. */
export class ReachOutBlock extends TargetBlock {
	protected readonly label = "Reach out";
	protected readonly key = "reach";

	protected rows(): TargetRow[] {
		return this.ui.service.reachOut(reachRule(this.ui.settings()));
	}
}

/** Everyone with a target, the due ones first and in their colour. On Stats. */
export class ContactEveryBlock extends TargetBlock {
	protected readonly label = "Contact every";
	protected readonly key = "target";

	protected rows(): TargetRow[] {
		return this.ui.service.targets(reachRule(this.ui.settings()));
	}
}
