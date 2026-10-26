import { describe, expect, it } from "vitest";
import { PeopleService } from "../src/application/PeopleService";
import { DayStartClock } from "../src/domain/Clock";
import { DomainError } from "../src/domain/DomainError";
import { Interaction } from "../src/domain/Interaction";
import { LocalDate } from "../src/domain/LocalDate";
import { Person } from "../src/domain/Person";
import { InMemoryPersonRepository } from "./support/InMemoryPersonRepository";
import { d } from "./support/dates";

const today = d("2026-10-26");
const ago = (days: number): LocalDate => today.addDays(-days);
const call = (date: LocalDate): Interaction => ({ date, kind: "call", purpose: "talk" });
const text = (date: LocalDate): Interaction => ({ date, kind: "text" });
const clock = { today: () => today };

async function setUp(people: Record<string, Interaction[]>): Promise<{ service: PeopleService; repository: InMemoryPersonRepository }> {
	const repository = new InMemoryPersonRepository();
	for (const [name, interactions] of Object.entries(people)) {
		await repository.create(Person.restore({ name, interactions: [...interactions].sort((a, b) => b.date.compare(a.date)) }));
	}
	return { service: new PeopleService(repository, clock), repository };
}

describe("feed", () => {
	it("groups the last 30 days' interactions by day, newest first, and pages further back", async () => {
		const { service } = await setUp({ Misha: [call(today), text(ago(2)), call(ago(45))] });
		const first = service.feed(30);
		expect(first.map((day) => String(day.date))).toEqual([String(today), String(ago(2))]);
		expect(service.feed(30, ago(2))).toEqual([]);
		expect(service.feed(30, ago(32)).map((day) => String(day.date))).toEqual([String(ago(45))]);
	});

	it("shows two calls with one person on one day as two rows, each with its position", async () => {
		const { service } = await setUp({ Misha: [call(today), call(today)] });
		const rows = service.feed(30)[0].rows;
		expect(rows.map((row) => row.index)).toEqual([0, 1]);
		expect(rows.every((row) => row.name === "Misha")).toBe(true);
	});
});

describe("searchPeople", () => {
	it("puts the people logged last first, then everyone else by name, and knows an exact match", async () => {
		const { service } = await setUp({ Seryozha: [call(ago(7))], Senya: [call(ago(24))], Ksenia: [call(ago(73))], Aleseya: [], Boris: [] });
		const found = service.searchPeople("se");
		expect(found.recent.map((hit) => hit.name)).toEqual(["Seryozha", "Senya", "Ksenia"]);
		expect(found.everyone.map((hit) => hit.name)).toEqual(["Aleseya"]);
		expect(found.exact).toBe(false);
		expect(service.searchPeople("Senya").exact).toBe(true);
		expect(service.searchPeople("").recent.map((hit) => hit.name)).toEqual(["Seryozha", "Senya", "Ksenia"]);
		expect(service.searchPeople("").everyone.map((hit) => hit.name)).toEqual(["Aleseya", "Boris"]);
	});

	it("shows a person it can't read with the problem, never as someone without interactions", async () => {
		const { service, repository } = await setUp({ Anya: [] });
		repository.entries.set("People/Bob.md", { kind: "broken", path: "People/Bob.md", name: "Bob", problem: "date: invalid date" });
		const found = service.searchPeople("");
		expect(found.everyone.map((hit) => [hit.name, hit.problem])).toEqual([
			["Anya", undefined],
			["Bob", "date: invalid date"],
		]);
	});
});

describe("changing interactions", () => {
	it("refuses a day in the future", async () => {
		const { service } = await setUp({ Misha: [] });
		await expect(service.addInteraction("People/Misha.md", text(today.addDays(1)))).rejects.toThrow(DomainError);
	});

	it("refuses to replace an interaction that has changed since it was opened", async () => {
		const { service, repository } = await setUp({ Misha: [call(today)] });
		await expect(service.replaceInteraction("People/Misha.md", 0, text(today), text(ago(1)))).rejects.toThrow(DomainError);
		expect(repository.person("People/Misha.md").interactions()).toEqual([call(today)]);
	});

	it("tells where the new interaction landed, so undo removes exactly it", async () => {
		const { service, repository } = await setUp({ Misha: [call(today)] });
		const added = await service.addInteraction("People/Misha.md", call(today));
		expect(added.index).toBe(1);
		await service.removeInteraction("People/Misha.md", added.index, call(today));
		expect(repository.person("People/Misha.md").interactions()).toEqual([call(today)]);
		const older = await service.addInteraction("People/Misha.md", text(ago(3)));
		expect(older.index).toBe(1);
	});

	it("creates a person and logs with them", async () => {
		const { service } = await setUp({});
		const path = await service.createPerson("Seva");
		await service.addInteraction(path, call(today));
		expect(service.people().map((person) => person.name)).toEqual(["Seva"]);
	});
});

describe("today", () => {
	it("is still yesterday before the day's start hour", () => {
		const service = new PeopleService(new InMemoryPersonRepository(), new DayStartClock(() => 4, () => new Date(2026, 9, 26, 3, 59)));
		expect(String(service.today())).toBe("2026-10-25");
	});
});
