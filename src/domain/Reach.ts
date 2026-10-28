import { LocalDate } from "./LocalDate";
import { Person, Target } from "./Person";
import { daysSince } from "./Stats";

export type ReachStatus = "ok" | "soon" | "late";

/** The settings every target is read with: how much of it is left when the heads-up comes, and the heads-up of a new target. */
export interface ReachRule {
	readonly headsUpPercent: number;
	readonly headsUpForNew: boolean;
}

/** A person to get in touch with: the target ran out (late) or is about to (soon). `days` is undefined for someone never contacted. */
export interface Due {
	readonly person: Person;
	readonly status: Exclude<ReachStatus, "ok">;
	readonly days: number | undefined;
	readonly every: number;
}

const PERCENT = 100;

/** Late past the target; soon over its last share, day `every` included, when the heads-up is on. */
export function reachStatus(target: Target, days: number | undefined, rule: ReachRule): ReachStatus {
	if (days === undefined || days > target.every) return "late";
	const headsUp = target.headsUp ?? rule.headsUpForNew;
	return headsUp && target.every - days <= (target.every * rule.headsUpPercent) / PERCENT ? "soon" : "ok";
}

/** People with a target who are late or soon: the late first, then by how far along the target they are, then by name. */
export function reachOut(people: readonly Person[], today: LocalDate, rule: ReachRule): Due[] {
	const due: Due[] = [];
	for (const person of people) {
		const target = person.target();
		if (!target) continue;
		const since = daysSince(person, today);
		const days = since === undefined ? undefined : Math.max(0, since);
		const status = reachStatus(target, days, rule);
		if (status !== "ok") due.push({ person, status, days, every: target.every });
	}
	const along = (item: Due): number => (item.days === undefined ? Infinity : item.days / item.every);
	const rank = (item: Due): number => (item.status === "late" ? 0 : 1);
	return due.sort((a, b) => rank(a) - rank(b) || along(b) - along(a) || a.person.name.localeCompare(b.person.name));
}
