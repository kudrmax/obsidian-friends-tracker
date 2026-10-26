import { Clock } from "../domain/Clock";
import { Interaction } from "../domain/Interaction";
import { LocalDate } from "../domain/LocalDate";
import { Person } from "../domain/Person";
import { PersonRepository } from "./ports";

export interface FeedRow {
	readonly path: string;
	readonly name: string;
	/** The interaction's position in the person's list, which the edit sheet needs to find it again. */
	readonly index: number;
	readonly interaction: Interaction;
}

export interface FeedDay {
	readonly date: LocalDate;
	/** By person name, then in the order the person's interactions were added. */
	readonly rows: FeedRow[];
}

export interface PersonHit {
	readonly path: string;
	readonly name: string;
	readonly last: LocalDate | undefined;
}

export interface SearchResult {
	/** People with interactions, the one logged last first. */
	readonly recent: PersonHit[];
	/** People without interactions, by name. */
	readonly everyone: PersonHit[];
	/** Whether someone has exactly the name that was typed. */
	readonly exact: boolean;
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

export class PeopleService {
	constructor(
		private readonly repository: PersonRepository,
		private readonly clock: Clock,
	) {}

	today(): LocalDate {
		return this.clock.today();
	}

	people(): Person[] {
		return this.repository.list().flatMap((entry) => (entry.kind === "ok" ? [entry.person] : []));
	}

	/** Days with interactions, newest first, over `days` calendar days ending before `before` (or on today). */
	feed(days: number, before?: LocalDate): FeedDay[] {
		const to = before ? before.addDays(-1) : this.today();
		const from = to.addDays(-(days - 1));
		const byDay = new Map<string, FeedRow[]>();
		const entries = this.repository
			.list()
			.flatMap((entry) => (entry.kind === "ok" ? [entry] : []))
			.sort((a, b) => byName(a.person, b.person));
		for (const { path, person } of entries) {
			person.interactions().forEach((interaction, index) => {
				if (interaction.date.isBefore(from) || interaction.date.isAfter(to)) return;
				const key = interaction.date.toString();
				const rows = byDay.get(key) ?? [];
				rows.push({ path, name: person.name, index, interaction });
				byDay.set(key, rows);
			});
		}
		return [...byDay.entries()]
			.map(([key, rows]) => ({ date: LocalDate.parse(key) as LocalDate, rows }))
			.sort((a, b) => b.date.compare(a.date));
	}

	searchPeople(query: string): SearchResult {
		const needle = query.trim().toLowerCase();
		const hits: PersonHit[] = this.repository.list().flatMap((entry) => {
			const name = entry.kind === "ok" ? entry.person.name : entry.name;
			if (needle && !name.toLowerCase().includes(needle)) return [];
			return [{ path: entry.path, name, last: entry.kind === "ok" ? entry.person.lastDate() : undefined }];
		});
		const recent = hits.filter((hit) => hit.last).sort((a, b) => (b.last as LocalDate).compare(a.last as LocalDate) || byName(a, b));
		const everyone = hits.filter((hit) => !hit.last).sort(byName);
		const exact = hits.some((hit) => hit.name.toLowerCase() === needle);
		return { recent, everyone, exact };
	}

	addInteraction(path: string, interaction: Interaction): Promise<Person> {
		return this.repository.update(path, (person) => person.add(interaction, this.today()));
	}

	replaceInteraction(path: string, index: number, expected: Interaction, next: Interaction): Promise<Person> {
		return this.repository.update(path, (person) => person.replaceAt(index, expected, next, this.today()));
	}

	removeInteraction(path: string, index: number, expected: Interaction): Promise<Person> {
		return this.repository.update(path, (person) => person.removeAt(index, expected));
	}

	createPerson(name: string): Promise<string> {
		return this.repository.create(Person.create(name));
	}
}
