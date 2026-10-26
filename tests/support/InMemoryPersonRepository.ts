import { PersonEntry, PersonRepository } from "../../src/application/ports";
import { DomainError } from "../../src/domain/DomainError";
import { Person } from "../../src/domain/Person";

export class InMemoryPersonRepository implements PersonRepository {
	readonly entries = new Map<string, PersonEntry>();

	contains(path: string): boolean {
		return this.entries.has(path);
	}

	list(): PersonEntry[] {
		return [...this.entries.values()];
	}

	get(path: string): PersonEntry | undefined {
		return this.entries.get(path);
	}

	async update(path: string, change: (person: Person) => Person): Promise<Person> {
		const entry = this.entries.get(path);
		if (!entry) throw new DomainError("Person not found");
		if (entry.kind === "broken") throw new DomainError(`Person can't be read: ${entry.problem}`);
		const person = change(entry.person);
		this.entries.set(path, { kind: "ok", path, person });
		return person;
	}

	async create(person: Person): Promise<string> {
		const path = `People/${person.name}.md`;
		if (this.entries.has(path)) throw new DomainError(`Person "${person.name}" already exists`);
		this.entries.set(path, { kind: "ok", path, person });
		return path;
	}

	person(path: string): Person {
		const entry = this.entries.get(path);
		if (entry?.kind !== "ok") throw new Error(`No readable person at ${path}`);
		return entry.person;
	}
}
