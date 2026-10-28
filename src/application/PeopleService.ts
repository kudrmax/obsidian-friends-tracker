import { Clock } from "../domain/Clock";
import { Interaction } from "../domain/Interaction";
import { LocalDate } from "../domain/LocalDate";
import { LocalTime } from "../domain/LocalTime";
import { Person } from "../domain/Person";
import { Due, ReachRule, reachOut } from "../domain/Reach";
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
	/** By time of day, latest first (the small hours before the day's start count as its end); rows without a time last, by name. */
	readonly rows: FeedRow[];
}

export interface PersonHit {
	readonly path: string;
	readonly name: string;
	readonly last: LocalDate | undefined;
	/** Why the person's note can't be read, when it can't. */
	readonly problem?: string;
}

/** A person after an interaction was added, and where in their list it landed. */
export interface Added {
	readonly person: Person;
	readonly index: number;
}

export interface SearchResult {
	/** People with interactions, the one logged last first. */
	readonly recent: PersonHit[];
	/** People without interactions, by name. */
	readonly everyone: PersonHit[];
	/** Whether someone has exactly the name that was typed. */
	readonly exact: boolean;
}

/** A person to get in touch with, and where their note is. */
export interface ReachRow extends Due {
	readonly path: string;
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

	/** The time of day right now, for a new record. */
	now(): LocalTime {
		return this.clock.time();
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
		const startHour = this.clock.dayStartHour();
		const later = (row: FeedRow): number => (row.interaction.time ? row.interaction.time.minutesSince(startHour) : -1);
		return [...byDay.entries()]
			.map(([key, rows]) => ({ date: LocalDate.parse(key) as LocalDate, rows: rows.sort((a, b) => later(b) - later(a)) }))
			.sort((a, b) => b.date.compare(a.date));
	}

	searchPeople(query: string): SearchResult {
		const needle = query.trim().toLowerCase();
		const hits: PersonHit[] = this.repository.list().flatMap((entry) => {
			const name = entry.kind === "ok" ? entry.person.name : entry.name;
			if (needle && !name.toLowerCase().includes(needle)) return [];
			if (entry.kind === "broken") return [{ path: entry.path, name, last: undefined, problem: entry.problem }];
			return [{ path: entry.path, name, last: entry.person.lastDate() }];
		});
		const recent = hits.filter((hit) => hit.last).sort((a, b) => (b.last as LocalDate).compare(a.last as LocalDate) || byName(a, b));
		const everyone = hits.filter((hit) => !hit.last).sort(byName);
		const exact = hits.some((hit) => hit.name.toLowerCase() === needle);
		return { recent, everyone, exact };
	}

	async addInteraction(path: string, interaction: Interaction): Promise<Added> {
		const person = await this.repository.update(path, (current) => current.add(interaction, this.today()));
		return { person, index: person.indexOfLatest(interaction) };
	}

	replaceInteraction(path: string, index: number, expected: Interaction, next: Interaction): Promise<Person> {
		return this.repository.update(path, (person) => person.replaceAt(index, expected, next, this.today()));
	}

	removeInteraction(path: string, index: number, expected: Interaction): Promise<Person> {
		return this.repository.update(path, (person) => person.removeAt(index, expected));
	}

	/** People whose target ran out or is about to, the most pressing first. */
	reachOut(rule: ReachRule): ReachRow[] {
		const paths = new Map<Person, string>();
		for (const entry of this.repository.list()) if (entry.kind === "ok") paths.set(entry.person, entry.path);
		return reachOut([...paths.keys()], this.today(), rule).map((due) => ({ ...due, path: paths.get(due.person) as string }));
	}

	setTarget(path: string, every: number, headsUpForNew: boolean): Promise<Person> {
		return this.repository.update(path, (person) => person.withTarget(every, headsUpForNew));
	}

	clearTarget(path: string): Promise<Person> {
		return this.repository.update(path, (person) => person.withoutTarget());
	}

	setHeadsUp(path: string, on: boolean): Promise<Person> {
		return this.repository.update(path, (person) => person.withHeadsUp(on));
	}

	createPerson(name: string): Promise<string> {
		return this.repository.create(Person.create(name));
	}
}
