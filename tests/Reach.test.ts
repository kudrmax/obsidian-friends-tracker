import { describe, expect, it } from "vitest";
import { Interaction } from "../src/domain/Interaction";
import { Person, Target } from "../src/domain/Person";
import { ReachRule, reachOut, reachStatus, tracked } from "../src/domain/Reach";
import { d } from "./support/dates";

const today = d("2026-10-26");
const rule: ReachRule = { headsUpPercent: 20, headsUpForNew: true };
const text = (days: number): Interaction => ({ date: today.addDays(-days), kind: "text" });

function person(name: string, target?: Target, days?: number): Person {
	return Person.restore({ name, interactions: days === undefined ? [] : [text(days)], target });
}

describe("reachStatus", () => {
	it("is soon over the last share of the target, day N included, and late after it", () => {
		const every14 = { every: 14 };
		expect(reachStatus(every14, 0, rule)).toBe("ok");
		expect(reachStatus(every14, 11, rule)).toBe("ok");
		expect(reachStatus(every14, 12, rule)).toBe("soon");
		expect(reachStatus(every14, 14, rule)).toBe("soon");
		expect(reachStatus(every14, 15, rule)).toBe("late");
	});

	it("is late for a person never contacted", () => {
		expect(reachStatus({ every: 14 }, undefined, rule)).toBe("late");
	});

	it("skips the soon stage when the person's heads-up is off", () => {
		expect(reachStatus({ every: 14, headsUp: false }, 14, rule)).toBe("ok");
		expect(reachStatus({ every: 14, headsUp: false }, 15, rule)).toBe("late");
	});

	it("takes the heads-up for new targets when the person has none written", () => {
		expect(reachStatus({ every: 14 }, 13, { headsUpPercent: 20, headsUpForNew: false })).toBe("ok");
		expect(reachStatus({ every: 14, headsUp: true }, 13, { headsUpPercent: 20, headsUpForNew: false })).toBe("soon");
	});

	it("holds at the ends of the percent range", () => {
		expect(reachStatus({ every: 100 }, 98, { headsUpPercent: 1, headsUpForNew: true })).toBe("ok");
		expect(reachStatus({ every: 100 }, 99, { headsUpPercent: 1, headsUpForNew: true })).toBe("soon");
		expect(reachStatus({ every: 100 }, 0, { headsUpPercent: 99, headsUpForNew: true })).toBe("ok");
		expect(reachStatus({ every: 100 }, 1, { headsUpPercent: 99, headsUpForNew: true })).toBe("soon");
	});
});

describe("reachOut", () => {
	it("lists the late, then the soon, the furthest along first, and only people with a target", () => {
		const people = [
			person("A", { every: 30 }, 41),
			person("B", { every: 14 }, 16),
			person("C", { every: 7 }, 6),
			person("D", { every: 10 }),
			person("E", undefined, 300),
			person("F", { every: 14 }, 3),
		];
		const due = reachOut(people, today, rule);
		expect(due.map((item) => item.person.name)).toEqual(["D", "A", "B", "C"]);
		expect(due.map((item) => item.status)).toEqual(["late", "late", "late", "soon"]);
		expect(due.map((item) => item.days)).toEqual([undefined, 41, 16, 6]);
		expect(due.map((item) => item.every)).toEqual([10, 30, 14, 7]);
	});

	it("orders equals by name", () => {
		const due = reachOut([person("Vova", { every: 10 }, 20), person("Anya", { every: 5 }, 10)], today, rule);
		expect(due.map((item) => item.person.name)).toEqual(["Anya", "Vova"]);
	});

	it("counts a day after today as today", () => {
		expect(reachOut([person("Pasha", { every: 7 }, -1)], today, rule)).toEqual([]);
	});
});

describe("tracked", () => {
	it("lists everyone with a target: the late, then the soon, then the rest, each the furthest along first", () => {
		const people = [
			person("A", { every: 30 }, 12),
			person("B", { every: 14 }, 16),
			person("C", { every: 7 }, 6),
			person("D", { every: 60 }, 9),
			person("E", undefined, 300),
		];
		const all = tracked(people, today, rule);
		expect(all.map((item) => item.person.name)).toEqual(["B", "C", "A", "D"]);
		expect(all.map((item) => item.status)).toEqual(["late", "soon", "ok", "ok"]);
		expect(all.map((item) => item.days)).toEqual([16, 6, 12, 9]);
	});

	it("orders equals on track by name", () => {
		const all = tracked([person("Vova", { every: 10 }, 2), person("Anya", { every: 20 }, 4)], today, rule);
		expect(all.map((item) => item.person.name)).toEqual(["Anya", "Vova"]);
	});
});
