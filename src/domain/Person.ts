import { DomainError } from "./DomainError";
import { Interaction, sameInteraction } from "./Interaction";
import { LocalDate } from "./LocalDate";

const FORBIDDEN_NAME_CHARS = /[\\/:*?"<>|#^[\]]/;

/** Fields of a stored interaction the plugin doesn't know; kept so a note loses nothing when it is written back. */
export type Extras = Readonly<Record<string, unknown>>;

export interface PersonState {
	readonly name: string;
	/** From newest to oldest; within a day, in the order they were added. */
	readonly interactions: readonly Interaction[];
	/** extras[i] belongs to interactions[i]. */
	readonly extras?: readonly Extras[];
}

export class Person {
	private constructor(
		private readonly state: PersonState,
		private readonly extra: readonly Extras[],
	) {}

	static restore(state: PersonState): Person {
		const name = state.name.trim();
		if (!name) throw new DomainError("Give the person a name");
		if (FORBIDDEN_NAME_CHARS.test(name)) throw new DomainError('A name can\'t contain \\ / : * ? " < > | # ^ [ ]');
		const extras = state.interactions.map((_, index) => state.extras?.[index] ?? {});
		return new Person({ name, interactions: state.interactions }, extras);
	}

	static create(name: string): Person {
		return Person.restore({ name, interactions: [] });
	}

	get name(): string {
		return this.state.name;
	}

	interactions(): readonly Interaction[] {
		return this.state.interactions;
	}

	extras(): readonly Extras[] {
		return this.extra;
	}

	/** Where the latest copy of this interaction sits: the last of its day's equals, which is the one added last. */
	indexOfLatest(interaction: Interaction): number {
		for (let index = this.state.interactions.length - 1; index >= 0; index--) {
			if (sameInteraction(this.state.interactions[index], interaction)) return index;
		}
		return -1;
	}

	lastDate(): LocalDate | undefined {
		return this.state.interactions[0]?.date;
	}

	add(interaction: Interaction, today: LocalDate): Person {
		if (interaction.date.isAfter(today)) throw new DomainError("Can't log a day in the future");
		const at = this.state.interactions.findIndex((other) => other.date.isBefore(interaction.date));
		const index = at < 0 ? this.state.interactions.length : at;
		return this.with(this.splice(index, 0, interaction, {}));
	}

	/** Changes the interaction at `index`; it keeps its place while its day stays, and its extras either way. */
	replaceAt(index: number, expected: Interaction, next: Interaction, today: LocalDate): Person {
		if (next.date.isAfter(today)) throw new DomainError("Can't log a day in the future");
		this.expect(index, expected);
		const extras = this.extra[index] ?? {};
		if (next.date.equals(expected.date)) return this.with(this.splice(index, 1, next, extras));
		const without = this.with(this.splice(index, 1));
		const at = without.state.interactions.findIndex((other) => other.date.isBefore(next.date));
		return without.with(without.splice(at < 0 ? without.state.interactions.length : at, 0, next, extras));
	}

	removeAt(index: number, expected: Interaction): Person {
		this.expect(index, expected);
		return this.with(this.splice(index, 1));
	}

	private expect(index: number, expected: Interaction): void {
		const actual = this.state.interactions[index];
		if (!actual || !sameInteraction(actual, expected)) throw new DomainError("Interaction changed, open it again");
	}

	private splice(index: number, remove: number, interaction?: Interaction, extras?: Extras): { interactions: Interaction[]; extras: Extras[] } {
		const interactions = [...this.state.interactions];
		const all = [...this.extra];
		if (interaction && extras) {
			interactions.splice(index, remove, interaction);
			all.splice(index, remove, extras);
		} else {
			interactions.splice(index, remove);
			all.splice(index, remove);
		}
		return { interactions, extras: all };
	}

	private with(next: { interactions: Interaction[]; extras: Extras[] }): Person {
		return new Person({ ...this.state, interactions: next.interactions }, next.extras);
	}
}
