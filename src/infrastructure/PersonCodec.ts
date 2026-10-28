import { DomainError } from "../domain/DomainError";
import { Company, Initiator, Interaction, Kind, Length, Purpose } from "../domain/Interaction";
import { LocalDate } from "../domain/LocalDate";
import { LocalTime } from "../domain/LocalTime";
import { Extras, Person, Target } from "../domain/Person";

export type Frontmatter = Record<string, unknown>;

export class PersonDecodeError extends Error {}

/** The frontmatter property and the values each part of an interaction is stored under. */
export interface PropertyNames {
	readonly interactions: string;
	readonly date: string;
	readonly time: string;
	readonly kind: string;
	readonly company: string;
	readonly length: string;
	readonly purpose: string;
	readonly initiated: string;
	readonly contactEvery: string;
	readonly headsUp: string;
	readonly kinds: Readonly<Record<Kind, string>>;
	readonly companies: Readonly<Record<Company, string>>;
	readonly lengths: Readonly<Record<Length, string>>;
	readonly purposes: Readonly<Record<Purpose, string>>;
	readonly initiators: Readonly<Record<Initiator, string>>;
}

export const DEFAULT_PROPERTY_NAMES: PropertyNames = {
	interactions: "interactions",
	date: "date",
	time: "time",
	kind: "kind",
	company: "company",
	length: "length",
	purpose: "purpose",
	initiated: "initiated",
	contactEvery: "contact_every",
	headsUp: "heads_up",
	kinds: { text: "text", call: "call", meeting: "meeting" },
	companies: { one_on_one: "one_on_one", group: "group" },
	lengths: { some_time: "some_time", whole_day: "whole_day" },
	purposes: { talk: "talk", activity: "activity" },
	initiators: { me: "me", them: "them" },
};

export function decodePerson(name: string, frontmatter: Frontmatter | null | undefined, keys: PropertyNames = DEFAULT_PROPERTY_NAMES): Person {
	try {
		const read = list(frontmatter ?? {}, keys.interactions).map((item) => readInteraction(item, keys));
		const note = frontmatter ?? {};
		const target = readTarget(note, keys);
		const sorted = [...read.keys()].sort((a, b) => read[b].interaction.date.compare(read[a].interaction.date) || a - b);
		return Person.restore({
			name,
			interactions: sorted.map((index) => read[index].interaction),
			extras: sorted.map((index) => read[index].extras),
			target,
			unreadTarget: target || note[keys.contactEvery] === undefined || note[keys.contactEvery] === null ? undefined : note[keys.contactEvery],
		});
	} catch (error) {
		if (error instanceof DomainError) throw new PersonDecodeError(error.message);
		throw error;
	}
}

export function encodePerson(person: Person, frontmatter: Frontmatter, keys: PropertyNames = DEFAULT_PROPERTY_NAMES): void {
	const extras = person.extras();
	const items = person.interactions().map((interaction, index) => ({ ...extras[index], ...writeInteraction(interaction, keys) }));
	if (items.length) frontmatter[keys.interactions] = items;
	else delete frontmatter[keys.interactions];
	writeTarget(person, frontmatter, keys);
}

/** A whole number of days, at least one, as a number or as the text Properties may save it as; anything else is no target. */
function readTarget(frontmatter: Frontmatter, keys: PropertyNames): Target | undefined {
	const raw = frontmatter[keys.contactEvery];
	const every = typeof raw === "string" && /^\s*\d+\s*$/.test(raw) ? Number(raw) : raw;
	if (typeof every !== "number" || !Number.isInteger(every) || every < 1) return undefined;
	const headsUp = frontmatter[keys.headsUp];
	return { every, headsUp: typeof headsUp === "boolean" ? headsUp : undefined };
}

/** Writes what the person holds; a value that couldn't be read, and a heads-up never set, stay as the note has them. */
function writeTarget(person: Person, frontmatter: Frontmatter, keys: PropertyNames): void {
	const target = person.target();
	if (target) {
		frontmatter[keys.contactEvery] = target.every;
		if (target.headsUp !== undefined) frontmatter[keys.headsUp] = target.headsUp;
	} else if (person.unreadTarget() === undefined) {
		delete frontmatter[keys.contactEvery];
		delete frontmatter[keys.headsUp];
	}
}

function writeInteraction(interaction: Interaction, keys: PropertyNames): Frontmatter {
	const out: Frontmatter = { [keys.date]: interaction.date.toString() };
	if (interaction.time) out[keys.time] = interaction.time.toString();
	out[keys.kind] = keys.kinds[interaction.kind];
	if (interaction.kind === "meeting") {
		out[keys.company] = keys.companies[interaction.company];
		out[keys.length] = keys.lengths[interaction.length];
	}
	if (interaction.kind === "call") out[keys.purpose] = keys.purposes[interaction.purpose];
	if (interaction.initiated) out[keys.initiated] = keys.initiators[interaction.initiated];
	return out;
}

function readInteraction(item: unknown, keys: PropertyNames): { interaction: Interaction; extras: Extras } {
	if (!isRecord(item)) throw new PersonDecodeError(`${keys.interactions}: expected entries with a date and a kind`);
	const date = readDate(item[keys.date], keys.date);
	const time = readTime(item[keys.time], keys.time);
	const kind = readValue<Kind>(item[keys.kind], keys.kinds, keys.kind);
	if (kind === undefined) throw new PersonDecodeError(`${keys.kind}: missing`);
	/* Who started it is the one optional mark: a record without it is simply not marked. */
	const initiated = readValue<Initiator>(item[keys.initiated], keys.initiators, keys.initiated);
	const own = new Set([keys.date, keys.time, keys.kind, keys.initiated]);
	const moment = { date, ...(time ? { time } : {}), ...(initiated ? { initiated } : {}) };
	/* A qualifier is spelled out every time: a record that leaves one out says nothing, and is not guessed at. */
	const qualifier = <T extends string>(key: string, values: Readonly<Record<T, string>>): T => {
		own.add(key);
		const value = readValue<T>(item[key], values, key);
		if (value === undefined) throw new PersonDecodeError(`${key}: missing on a ${keys.kinds[kind]}`);
		return value;
	};
	const stray = (key: string): void => {
		if (item[key] !== undefined) throw new PersonDecodeError(`${key}: not for a ${keys.kinds[kind]}`);
	};
	let interaction: Interaction;
	if (kind === "meeting") {
		stray(keys.purpose);
		interaction = { ...moment, kind, company: qualifier<Company>(keys.company, keys.companies), length: qualifier<Length>(keys.length, keys.lengths) };
	} else if (kind === "call") {
		stray(keys.company);
		stray(keys.length);
		interaction = { ...moment, kind, purpose: qualifier<Purpose>(keys.purpose, keys.purposes) };
	} else {
		stray(keys.company);
		stray(keys.length);
		stray(keys.purpose);
		interaction = { ...moment, kind };
	}
	const extras = Object.fromEntries(Object.entries(item).filter(([key]) => !own.has(key)));
	return { interaction, extras };
}

function readValue<T extends string>(value: unknown, values: Readonly<Record<T, string>>, key: string): T | undefined {
	if (value === undefined || value === null) return undefined;
	const found = (Object.entries(values) as [T, string][]).find(([, stored]) => stored === value);
	if (!found) throw new PersonDecodeError(`${key}: unknown value ${JSON.stringify(value)}`);
	return found[0];
}

/** "HH:MM" text; nothing when the record has no time; anything else is a problem, never a guess. */
function readTime(value: unknown, where: string): LocalTime | undefined {
	if (value === undefined || value === null) return undefined;
	const time = typeof value === "string" ? LocalTime.parse(value.trim()) : null;
	if (!time) throw new PersonDecodeError(`${where}: invalid time ${JSON.stringify(value)}`);
	return time;
}

function readDate(value: unknown, where: string): LocalDate {
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return LocalDate.of(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
	}
	const date = typeof value === "string" ? LocalDate.parse(value.trim()) : null;
	if (!date) throw new PersonDecodeError(`${where}: invalid date ${JSON.stringify(value) ?? "nothing"}`);
	return date;
}

function list(frontmatter: Frontmatter, key: string): unknown[] {
	const value = frontmatter[key];
	if (value === undefined || value === null) return [];
	if (!Array.isArray(value)) throw new PersonDecodeError(`${key}: expected a list`);
	return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);
}
