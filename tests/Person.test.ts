import { describe, expect, it } from "vitest";
import { DomainError } from "../src/domain/DomainError";
import { Interaction } from "../src/domain/Interaction";
import { Person } from "../src/domain/Person";
import { d } from "./support/dates";

const today = d("2026-10-26");
const call = (date: string): Interaction => ({ date: d(date), kind: "call", purpose: "talk" });
const text = (date: string): Interaction => ({ date: d(date), kind: "text" });

describe("Person", () => {
	it("needs a name a file can carry", () => {
		expect(() => Person.restore({ name: " ", interactions: [] })).toThrow(DomainError);
		expect(() => Person.restore({ name: "a/b", interactions: [] })).toThrow(DomainError);
		expect(Person.create("Seryozha").name).toBe("Seryozha");
	});

	it("puts a new interaction first and keeps two of the same day in the order they were added", () => {
		const person = Person.create("Misha").add(text("2026-10-24"), today).add(call("2026-10-24"), today);
		expect(person.interactions()).toEqual([text("2026-10-24"), call("2026-10-24")]);
		const older = person.add(call("2026-10-21"), today);
		expect(older.interactions().map((i) => String(i.date))).toEqual(["2026-10-24", "2026-10-24", "2026-10-21"]);
	});

	it("refuses a day in the future", () => {
		expect(() => Person.create("Misha").add(text("2026-10-27"), today)).toThrow(DomainError);
	});

	it("replaces an interaction only when the one at that position is the one expected", () => {
		const person = Person.create("Misha").add(call("2026-10-24"), today);
		expect(() => person.replaceAt(0, text("2026-10-24"), text("2026-10-23"), today)).toThrow("Interaction changed");
		expect(person.replaceAt(0, call("2026-10-24"), text("2026-10-23"), today).interactions()).toEqual([text("2026-10-23")]);
	});

	it("removes exactly one of two equal interactions", () => {
		const person = Person.create("Misha").add(call("2026-10-24"), today).add(call("2026-10-24"), today);
		expect(person.removeAt(1, call("2026-10-24")).interactions()).toEqual([call("2026-10-24")]);
		expect(() => person.removeAt(1, text("2026-10-24"))).toThrow(DomainError);
	});

	it("knows the day of its latest interaction", () => {
		expect(Person.create("Misha").lastDate()).toBeUndefined();
		expect(String(Person.create("Misha").add(call("2026-10-21"), today).add(text("2026-10-24"), today).lastDate())).toBe("2026-10-24");
	});

	it("carries the fields it does not know alongside each interaction", () => {
		const person = Person.restore({ name: "Misha", interactions: [text("2026-10-24"), call("2026-10-21")], extras: [{ mood: "good" }, {}] });
		expect(person.extras()).toEqual([{ mood: "good" }, {}]);
		expect(person.removeAt(0, text("2026-10-24")).extras()).toEqual([{}]);
		expect(person.add(call("2026-10-25"), today).extras()).toEqual([{}, { mood: "good" }, {}]);
	});
});
