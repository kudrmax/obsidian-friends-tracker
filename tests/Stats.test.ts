import { describe, expect, it } from "vitest";
import { Interaction, Kind } from "../src/domain/Interaction";
import { LocalDate } from "../src/domain/LocalDate";
import { Person } from "../src/domain/Person";
import { buckets, countKinds, daysSince, fallingBehind, mostOften, sum, totals, usualGap } from "../src/domain/Stats";
import { d } from "./support/dates";

const today = d("2026-10-26");
const ago = (days: number): LocalDate => today.addDays(-days);

function one(date: LocalDate, kind: Kind = "call", wholeDay = false): Interaction {
	if (kind === "meeting") return { date, kind, company: "one_on_one", length: wholeDay ? "whole_day" : "some_time" };
	if (kind === "call") return { date, kind, purpose: "talk" };
	return { date, kind };
}

/** A person with one call on each of these days ago. */
function person(name: string, daysAgo: readonly number[]): Person {
	return Person.restore({ name, interactions: [...daysAgo].sort((a, b) => a - b).map((days) => one(ago(days))) });
}

describe("daysSince", () => {
	it("counts the days from the latest interaction", () => {
		expect(daysSince(person("Seryozha", [41, 60]), today)).toBe(41);
		expect(daysSince(person("Nobody", []), today)).toBeUndefined();
	});
});

describe("usualGap", () => {
	it("is the median gap between days with an interaction over the last year", () => {
		expect(usualGap(person("Seryozha", [3, 22, 41, 60]), today)).toBe(19);
		expect(usualGap(person("Anya", [1, 5, 25, 37]), today)).toBe(12);
	});

	it("needs three days with an interaction and counts a day once", () => {
		expect(usualGap(person("Two", [3, 22]), today)).toBeUndefined();
		expect(usualGap(person("Twice", [3, 3, 22]), today)).toBeUndefined();
	});

	it("looks back one year only", () => {
		expect(usualGap(person("Old", [3, 22, 400, 420]), today)).toBeUndefined();
	});
});

describe("countKinds", () => {
	it("counts whole days apart from meetings, and calls whatever they were for", () => {
		const activity: Interaction = { date: today, kind: "call", purpose: "activity" };
		expect(countKinds([one(today, "meeting", true), one(today, "meeting"), one(today), activity, one(today, "text")])).toEqual({ text: 1, call: 2, meeting: 1, wholeDay: 1 });
		expect(countKinds([])).toEqual({ text: 0, call: 0, meeting: 0, wholeDay: 0 });
	});

	it("adds counts up layer by layer", () => {
		expect(sum([{ text: 1, call: 2, meeting: 3, wholeDay: 4 }, { text: 1, call: 0, meeting: 1, wholeDay: 0 }])).toEqual({ text: 2, call: 2, meeting: 4, wholeDay: 4 });
	});
});

const span = (bucket: { from: LocalDate; to: LocalDate }) => [bucket.from.toString(), bucket.to.toString()];

describe("buckets", () => {
	it("gives twelve months ending with the current one, whole days apart from meetings", () => {
		const bars = buckets([one(d("2026-10-20"), "meeting", true), one(d("2026-10-02"), "meeting"), one(d("2025-11-15"), "text"), one(d("2025-10-31"), "call")], "months", today);
		expect(bars).toHaveLength(12);
		expect(bars[0]).toEqual({ from: d("2025-11-01"), to: d("2025-11-30"), text: 1, call: 0, meeting: 0, wholeDay: 0 });
		expect(bars[11]).toEqual({ from: d("2026-10-01"), to: d("2026-10-31"), text: 0, call: 0, meeting: 1, wholeDay: 1 });
	});

	it("ends a leap February on the 29th", () => {
		expect(span(buckets([], "months", d("2028-03-10"))[10])).toEqual(["2028-02-01", "2028-02-29"]);
	});

	it("gives twelve weeks from Monday, the current one last", () => {
		const bars = buckets([one(d("2026-10-25")), one(d("2026-08-09")), one(d("2026-08-10"))], "weeks", today);
		expect(bars).toHaveLength(12);
		expect(span(bars[11])).toEqual(["2026-10-26", "2026-11-01"]);
		expect(span(bars[0])).toEqual(["2026-08-10", "2026-08-16"]);
		expect(bars[10].call).toBe(1);
		expect(bars[0].call).toBe(1);
		expect(sum(bars).call).toBe(2);
	});

	it("gives the years from the first interaction on, an empty year included", () => {
		const bars = buckets([one(d("2023-05-01")), one(d("2026-01-01"))], "years", today);
		expect(bars.map(span)).toEqual([
			["2023-01-01", "2023-12-31"],
			["2024-01-01", "2024-12-31"],
			["2025-01-01", "2025-12-31"],
			["2026-01-01", "2026-12-31"],
		]);
		expect(bars.map((bar) => bar.call)).toEqual([1, 0, 0, 1]);
	});

	it("gives the current year alone when nothing was logged, and twelve years at most", () => {
		expect(buckets([], "years", today).map(span)).toEqual([["2026-01-01", "2026-12-31"]]);
		const bars = buckets([one(d("2010-06-01")), one(d("2015-06-01"))], "years", today);
		expect(bars).toHaveLength(12);
		expect(bars[0].from.toString()).toBe("2015-01-01");
		expect(sum(bars).call).toBe(1);
	});
});

describe("totals", () => {
	it("counts interactions and people in the period against the one before", () => {
		const people = [
			Person.restore({ name: "A", interactions: [one(ago(1)), one(ago(2)), one(ago(31))] }),
			Person.restore({ name: "B", interactions: [one(ago(0))] }),
			Person.restore({ name: "C", interactions: [one(ago(45)), one(ago(50))] }),
		];
		expect(totals(people, "month", today)).toEqual({ interactions: 3, people: 2, interactionsDelta: 0, peopleDelta: 0 });
		expect(totals(people, "week", today)).toEqual({ interactions: 3, people: 2, interactionsDelta: 3, peopleDelta: 2 });
	});
});

describe("fallingBehind", () => {
	it("lists people past their usual gap, the most overdue first", () => {
		const people = [
			person("Dima", [17, 27, 37, 47]),
			person("Seryozha", [41, 60, 79, 98]),
			person("Anya", [23, 35, 47, 59]),
			person("Katya", [1, 3, 5, 7]),
			person("Two", [50, 90]),
		];
		expect(fallingBehind(people, today).map((b) => [b.person.name, b.days, b.usual])).toEqual([
			["Seryozha", 41, 19],
			["Anya", 23, 12],
			["Dima", 17, 10],
		]);
	});
});

describe("mostOften", () => {
	it("ranks people by interactions in the period, then by name", () => {
		const people = [
			Person.restore({ name: "Pasha", interactions: [one(ago(1)), one(ago(2)), one(ago(60))] }),
			Person.restore({ name: "Katya", interactions: [one(ago(1)), one(ago(1)), one(ago(2))] }),
			Person.restore({ name: "Lyosha", interactions: [one(ago(3)), one(ago(4))] }),
			Person.restore({ name: "Quiet", interactions: [one(ago(40))] }),
		];
		expect(mostOften(people, "month", today).map((o) => [o.person.name, o.count])).toEqual([
			["Katya", 3],
			["Lyosha", 2],
			["Pasha", 2],
		]);
	});
});
