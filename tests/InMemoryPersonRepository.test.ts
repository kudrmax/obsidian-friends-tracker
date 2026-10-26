import { describe, expect, it } from "vitest";
import { DomainError } from "../src/domain/DomainError";
import { Person } from "../src/domain/Person";
import { InMemoryPersonRepository } from "./support/InMemoryPersonRepository";
import { d } from "./support/dates";

describe("InMemoryPersonRepository", () => {
	it("refuses a second person with the same name", async () => {
		const repository = new InMemoryPersonRepository();
		await repository.create(Person.create("Misha"));
		await expect(repository.create(Person.create("Misha"))).rejects.toThrow(DomainError);
	});

	it("hands back the changed person and keeps it", async () => {
		const repository = new InMemoryPersonRepository();
		const path = await repository.create(Person.create("Misha"));
		const changed = await repository.update(path, (person) => person.add({ date: d("2026-10-24"), kind: "text" }, d("2026-10-26")));
		expect(changed.interactions()).toHaveLength(1);
		expect(repository.person(path).interactions()).toHaveLength(1);
		expect(repository.contains(path)).toBe(true);
	});
});
