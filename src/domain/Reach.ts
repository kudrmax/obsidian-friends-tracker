import { LocalDate } from "./LocalDate";
import { Person, Target } from "./Person";
import { daysSince } from "./Stats";

export type ReachStatus = "ok" | "soon" | "late";

/** The settings every target is read with: how much of it is left when the heads-up comes, and the heads-up of a new target. */
export interface ReachRule {
	readonly headsUpPercent: number;
	readonly headsUpForNew: boolean;
}

/** A person with a target and where they stand on it. `days` is undefined for someone never contacted. */
export interface Tracked {
	readonly person: Person;
	readonly status: ReachStatus;
	readonly days: number | undefined;
	readonly every: number;
}

/** A person to get in touch with: the target ran out (late) or is about to (soon). */
export interface Due extends Tracked {
	readonly status: Exclude<ReachStatus, "ok">;
}

const PERCENT = 100;

/** Late past the target; soon over its last share, day `every` included, when the heads-up is on. */
export function reachStatus(target: Target, days: number | undefined, rule: ReachRule): ReachStatus {
	if (days === undefined || days > target.every) return "late";
	const headsUp = target.headsUp ?? rule.headsUpForNew;
	return headsUp && target.every - days <= (target.every * rule.headsUpPercent) / PERCENT ? "soon" : "ok";
}

const RANK: Record<ReachStatus, number> = { late: 0, soon: 1, ok: 2 };

/** Everyone with a target: the late first, then the soon, then the rest, each by how far along the target they are, then by name. */
export function tracked(people: readonly Person[], today: LocalDate, rule: ReachRule): Tracked[] {
	const all: Tracked[] = [];
	for (const person of people) {
		const target = person.target();
		if (!target) continue;
		const since = daysSince(person, today);
		const days = since === undefined ? undefined : Math.max(0, since);
		all.push({ person, status: reachStatus(target, days, rule), days, every: target.every });
	}
	const along = (item: Tracked): number => (item.days === undefined ? Infinity : item.days / item.every);
	return all.sort((a, b) => RANK[a.status] - RANK[b.status] || along(b) - along(a) || a.person.name.localeCompare(b.person.name));
}

/** People with a target who are late or soon, in the order of `tracked`. */
export function reachOut(people: readonly Person[], today: LocalDate, rule: ReachRule): Due[] {
	return tracked(people, today, rule).filter((item): item is Due => item.status !== "ok");
}
