import { Person } from "../domain/Person";

export type PersonEntry =
	| { readonly kind: "ok"; readonly path: string; readonly person: Person }
	| { readonly kind: "broken"; readonly path: string; readonly name: string; readonly problem: string };

export interface PersonRepository {
	/** Whether the note at this path is a person, i.e. carries the tag or lives in the folder. */
	contains(path: string): boolean;
	list(): PersonEntry[];
	get(path: string): PersonEntry | undefined;
	update(path: string, change: (person: Person) => Person): Promise<Person>;
	create(person: Person): Promise<string>;
}

/** Which notes are people: every note carrying a tag, or every note in a folder. New people go to the folder either way; "/" is the vault root. */
export interface PeopleScope {
	readonly source: "tag" | "folder";
	readonly tag: string;
	readonly folder: string;
}
