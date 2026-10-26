import { describe, expect, it } from "vitest";
import { Interaction } from "../src/domain/Interaction";
import { Person } from "../src/domain/Person";
import { DEFAULT_PROPERTY_NAMES, Frontmatter, PersonDecodeError, decodePerson, encodePerson } from "../src/infrastructure/PersonCodec";
import { LocalTime } from "../src/domain/LocalTime";
import { d } from "./support/dates";

const sample: Frontmatter = {
	interactions: [
		{ date: "2026-10-24", kind: "meeting", company: "group", length: "whole_day" },
		{ date: "2026-10-24", kind: "call", purpose: "activity" },
		{ date: "2026-10-21", kind: "text" },
	],
};

const roundTrip = (frontmatter: Frontmatter): Frontmatter => {
	const out: Frontmatter = { ...frontmatter };
	encodePerson(decodePerson("Misha", frontmatter), out);
	return out;
};

describe("decodePerson", () => {
	it("reads the spec's example from newest to oldest", () => {
		const person = decodePerson("Misha", sample);
		expect(person.name).toBe("Misha");
		expect(person.interactions()).toEqual<Interaction[]>([
			{ date: d("2026-10-24"), kind: "meeting", company: "group", length: "whole_day" },
			{ date: d("2026-10-24"), kind: "call", purpose: "activity" },
			{ date: d("2026-10-21"), kind: "text" },
		]);
	});

	it("refuses a record that leaves a qualifier out instead of guessing it", () => {
		expect(() => decodePerson("Misha", { interactions: [{ date: "2026-10-24", kind: "meeting", company: "one_on_one" }] })).toThrow(/length: missing/);
		expect(() => decodePerson("Misha", { interactions: [{ date: "2026-10-24", kind: "meeting", length: "some_time" }] })).toThrow(/company: missing/);
		expect(() => decodePerson("Misha", { interactions: [{ date: "2026-10-23", kind: "call" }] })).toThrow(/purpose: missing/);
	});

	it("reads the time of day when a record has one, and leaves it unknown when it hasn't", () => {
		const person = decodePerson("Misha", { interactions: [{ date: "2026-10-24", kind: "text", time: "18:40" }, { date: "2026-10-23", kind: "text" }] });
		expect(String(person.interactions()[0].time)).toBe("18:40");
		expect(person.interactions()[1].time).toBeUndefined();
	});

	it("refuses a time it can't read", () => {
		expect(() => decodePerson("Misha", { interactions: [{ date: "2026-10-24", kind: "text", time: "6pm" }] })).toThrow(/time: invalid/);
		expect(() => decodePerson("Misha", { interactions: [{ date: "2026-10-24", kind: "text", time: 1120 }] })).toThrow(PersonDecodeError);
	});

	it("reads a date the metadata cache turned into a Date", () => {
		const person = decodePerson("Misha", { interactions: [{ date: new Date(Date.UTC(2026, 9, 24)), kind: "text" }] });
		expect(String(person.interactions()[0].date)).toBe("2026-10-24");
	});

	it("sorts what it reads by date, newest first, keeping the order within a day", () => {
		const person = decodePerson("Misha", {
			interactions: [
				{ date: "2026-10-21", kind: "text" },
				{ date: "2026-10-24", kind: "text" },
				{ date: "2026-10-24", kind: "call", purpose: "talk" },
			],
		});
		expect(person.interactions().map((i) => `${i.date} ${i.kind}`)).toEqual(["2026-10-24 text", "2026-10-24 call", "2026-10-21 text"]);
	});

	it("is a person with no interactions when the property is missing", () => {
		expect(decodePerson("Misha", { tags: ["friend"] }).interactions()).toEqual([]);
	});

	it("refuses what it can't read, naming the problem", () => {
		expect(() => decodePerson("Misha", { interactions: [{ date: "2026-10-24", kind: "hug" }] })).toThrow(/hug/);
		expect(() => decodePerson("Misha", { interactions: [{ date: "2026-13-40", kind: "text" }] })).toThrow(PersonDecodeError);
		expect(() => decodePerson("Misha", { interactions: [{ date: "2026-10-24", kind: "text", company: "group" }] })).toThrow(PersonDecodeError);
		expect(() => decodePerson("Misha", { interactions: "yes" })).toThrow(PersonDecodeError);
	});
});

describe("encodePerson", () => {
	it("writes the spec's example back as it was", () => {
		expect(roundTrip(sample)).toEqual(sample);
	});

	it("spells out every qualifier, the usual ones too", () => {
		const out: Frontmatter = {};
		encodePerson(Person.restore({ name: "Misha", interactions: [{ date: d("2026-10-24"), kind: "meeting", company: "one_on_one", length: "some_time" }, { date: d("2026-10-23"), kind: "call", purpose: "talk" }] }), out);
		expect(out.interactions).toEqual([
			{ date: "2026-10-24", kind: "meeting", company: "one_on_one", length: "some_time" },
			{ date: "2026-10-23", kind: "call", purpose: "talk" },
		]);
	});

	it("writes the time as HH:MM text and leaves it out when there is none", () => {
		const out: Frontmatter = {};
		encodePerson(Person.restore({ name: "Misha", interactions: [{ date: d("2026-10-24"), kind: "text", time: LocalTime.of(18, 40) }, { date: d("2026-10-23"), kind: "text" }] }), out);
		expect(out.interactions).toEqual([{ date: "2026-10-24", kind: "text", time: "18:40" }, { date: "2026-10-23", kind: "text" }]);
	});

	it("keeps unknown fields of an interaction and unknown keys of the note", () => {
		const out = roundTrip({ tags: ["friend"], interactions: [{ date: "2026-10-24", kind: "text", mood: "good" }] });
		expect(out.tags).toEqual(["friend"]);
		expect(out.interactions).toEqual([{ date: "2026-10-24", kind: "text", mood: "good" }]);
	});

	it("removes the property when there are no interactions", () => {
		const out: Frontmatter = { interactions: [] };
		encodePerson(Person.create("Misha"), out);
		expect("interactions" in out).toBe(false);
	});

	it("writes under the names from the settings", () => {
		const keys = { ...DEFAULT_PROPERTY_NAMES, interactions: "met", kinds: { ...DEFAULT_PROPERTY_NAMES.kinds, meeting: "irl" } };
		const out: Frontmatter = {};
		encodePerson(Person.restore({ name: "Misha", interactions: [{ date: d("2026-10-24"), kind: "meeting", company: "group", length: "some_time" }] }), out, keys);
		expect(out.met).toEqual([{ date: "2026-10-24", kind: "irl", company: "group", length: "some_time" }]);
		expect(decodePerson("Misha", out, keys).interactions()[0].kind).toBe("meeting");
	});
});
