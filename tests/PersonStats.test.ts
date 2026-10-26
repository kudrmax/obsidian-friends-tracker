import { describe, expect, it } from "vitest";
import { Interaction, Kind } from "../src/domain/Interaction";
import { LocalDate } from "../src/domain/LocalDate";
import { Person } from "../src/domain/Person";
import { PersonStats } from "../src/domain/PersonStats";
import { d } from "./support/dates";

const today = d("2026-10-26");
const ago = (days: number): LocalDate => today.addDays(-days);

function one(days: number, kind: Kind = "call"): Interaction {
	const date = ago(days);
	if (kind === "meeting") return { date, kind, company: "one_on_one", length: "some_time" };
	if (kind === "call") return { date, kind, purpose: "talk" };
	return { date, kind };
}

const stats = (...interactions: Interaction[]) =>
	new PersonStats(Person.restore({ name: "Seryozha", interactions: [...interactions].sort((a, b) => b.date.compare(a.date)) }), today);

describe("PersonStats", () => {
	it("knows nothing about a person with no interactions", () => {
		const empty = stats();
		expect(empty.lastContact()).toBeUndefined();
		expect(empty.lastMeeting()).toBeUndefined();
		expect(empty.usualGap()).toBeUndefined();
		expect(empty.firstDate()).toBeUndefined();
		expect(empty.isOverdue()).toBe(false);
		expect(empty.pastYear()).toEqual({ count: 0 });
	});

	it("tells the last meeting from the last contact of any kind", () => {
		const person = stats(one(3, "text"), one(10, "call"), one(41, "meeting"), one(60, "meeting"));
		expect(person.lastContact()).toEqual({ date: ago(3), days: 3 });
		expect(person.lastMeeting()).toEqual({ date: ago(41), days: 41 });
		expect(stats(one(3, "text"), one(5, "call")).lastMeeting()).toBeUndefined();
	});

	it("is overdue only once the silence is longer than the usual gap", () => {
		expect(stats(one(10), one(20), one(30)).isOverdue()).toBe(false);
		expect(stats(one(11), one(21), one(31)).isOverdue()).toBe(true);
		expect(stats(one(100), one(120)).isOverdue()).toBe(false);
	});

	it("compares the past year with the year before", () => {
		expect(stats(one(0), one(100), one(364), one(365)).pastYear()).toEqual({ count: 3, delta: 2 });
		expect(stats(one(400), one(500)).pastYear()).toEqual({ count: 0, delta: -2 });
	});

	it("has no year before to compare with for a person met within the past year", () => {
		expect(stats(one(0), one(100), one(364)).pastYear()).toEqual({ count: 3 });
		expect(stats(one(0), one(365)).pastYear()).toEqual({ count: 1, delta: 0 });
	});

	it("finds the first interaction", () => {
		expect(stats(one(3), one(900, "text"), one(41)).firstDate()).toEqual(ago(900));
	});

	it("counts a day after today as today", () => {
		expect(stats(one(-2)).lastContact()?.days).toBe(0);
	});
});
