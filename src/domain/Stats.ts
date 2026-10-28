import { Interaction } from "./Interaction";
import { LocalDate } from "./LocalDate";
import { Person } from "./Person";

/** The last 7, 30 or 365 days, today included. */
export type Period = "week" | "month" | "year";
export const PERIOD_DAYS: Readonly<Record<Period, number>> = { week: 7, month: 30, year: 365 };

const YEAR_DAYS = 365;
const PERCENT = 100;
/** Bars in a chart, at most. */
export const BARS_SHOWN = 12;
const WEEK_DAYS = 7;
/** Days with an interaction needed before the usual gap means anything. */
const MIN_DAYS_FOR_GAP = 3;

export function daysSince(person: Person, today: LocalDate): number | undefined {
	const last = person.lastDate();
	return last ? today.daysSince(last) : undefined;
}

/** The median gap, in days, between days with an interaction over the last year; undefined under three such days. */
export function usualGap(person: Person, today: LocalDate): number | undefined {
	const since = today.addDays(-(YEAR_DAYS - 1));
	const days = [...new Set(person.interactions().map((i) => i.date.toString()))]
		.map((text) => LocalDate.parse(text))
		.filter((date): date is LocalDate => date !== null && !date.isBefore(since))
		.sort((a, b) => a.compare(b));
	if (days.length < MIN_DAYS_FOR_GAP) return undefined;
	const gaps = days.slice(1).map((date, index) => date.daysSince(days[index])).sort((a, b) => a - b);
	const middle = Math.floor(gaps.length / 2);
	const median = gaps.length % 2 ? gaps[middle] : (gaps[middle - 1] + gaps[middle]) / 2;
	return Math.round(median);
}

/** Interactions by how they went: meetings that took the whole day apart from the other meetings. */
export interface KindCounts {
	readonly text: number;
	readonly call: number;
	readonly meeting: number;
	readonly wholeDay: number;
}

type Tally = { -readonly [K in keyof KindCounts]: number };

const NONE: KindCounts = { text: 0, call: 0, meeting: 0, wholeDay: 0 };

export function countKinds(interactions: readonly Interaction[]): KindCounts {
	const counts: Tally = { ...NONE };
	for (const interaction of interactions) {
		if (interaction.kind === "meeting" && interaction.length === "whole_day") counts.wholeDay++;
		else counts[interaction.kind]++;
	}
	return counts;
}

export function sum(all: readonly KindCounts[]): KindCounts {
	const total: Tally = { ...NONE };
	for (const counts of all) for (const key of Object.keys(total) as (keyof KindCounts)[]) total[key] += counts[key];
	return total;
}

/** What one bar of a chart covers. */
export type ChartRange = "weeks" | "months" | "years";
export const CHART_RANGES: readonly ChartRange[] = ["weeks", "months", "years"];

/** One bar: the interactions from `from` to `to`, both included. */
export interface Bucket extends KindCounts {
	readonly from: LocalDate;
	readonly to: LocalDate;
}

/**
 * The bars of a chart, oldest first, the one holding today last: twelve weeks from Monday, twelve calendar months, or
 * the years from the first interaction's on, the last twelve at most.
 */
export function buckets(interactions: readonly Interaction[], range: ChartRange, today: LocalDate): Bucket[] {
	return spans(interactions, range, today).map(({ from, to }) => ({
		from,
		to,
		...countKinds(interactions.filter((i) => !i.date.isBefore(from) && !i.date.isAfter(to))),
	}));
}

function spans(interactions: readonly Interaction[], range: ChartRange, today: LocalDate): { from: LocalDate; to: LocalDate }[] {
	const back = (count: number) => Array.from({ length: count }, (_, index) => count - 1 - index);
	if (range === "weeks") {
		const monday = today.startOfWeek();
		return back(BARS_SHOWN).map((weeks) => ({ from: monday.addDays(-WEEK_DAYS * weeks), to: monday.addDays(-WEEK_DAYS * weeks + WEEK_DAYS - 1) }));
	}
	if (range === "months") {
		return back(BARS_SHOWN).map((months) => ({
			from: LocalDate.of(today.year, today.month - months, 1),
			to: LocalDate.of(today.year, today.month - months + 1, 1).addDays(-1),
		}));
	}
	const first = Math.min(today.year, ...interactions.map((i) => i.date.year));
	const years = Math.min(BARS_SHOWN, today.year - first + 1);
	return back(years).map((ago) => ({ from: LocalDate.of(today.year - ago, 1, 1), to: LocalDate.of(today.year - ago, 12, 31) }));
}

export interface PeriodTotals {
	readonly interactions: number;
	readonly people: number;
	readonly interactionsDelta: number;
	readonly peopleDelta: number;
}

function within(person: Person, from: LocalDate, to: LocalDate): readonly Interaction[] {
	return person.interactions().filter((i) => !i.date.isBefore(from) && !i.date.isAfter(to));
}

function count(people: readonly Person[], from: LocalDate, to: LocalDate): { interactions: number; people: number } {
	let interactions = 0;
	let withSome = 0;
	for (const person of people) {
		const hits = within(person, from, to).length;
		interactions += hits;
		if (hits) withSome++;
	}
	return { interactions, people: withSome };
}

export function totals(people: readonly Person[], period: Period, today: LocalDate): PeriodTotals {
	const days = PERIOD_DAYS[period];
	const current = count(people, today.addDays(-(days - 1)), today);
	const previous = count(people, today.addDays(-(2 * days - 1)), today.addDays(-days));
	return {
		interactions: current.interactions,
		people: current.people,
		interactionsDelta: current.interactions - previous.interactions,
		peopleDelta: current.people - previous.people,
	};
}

/** Who started the interactions where it is marked, in whole percent that add up to 100. */
export interface Initiative {
	readonly mine: number;
	readonly theirs: number;
}

/** Who started, over the interactions where it is marked; nothing when none is. */
export function initiative(interactions: readonly Interaction[]): Initiative | undefined {
	const marked = interactions.filter((i) => i.initiated !== undefined);
	if (!marked.length) return undefined;
	const mine = Math.round((PERCENT * marked.filter((i) => i.initiated === "me").length) / marked.length);
	return { mine, theirs: PERCENT - mine };
}

/** Who started, over everyone's interactions in the period. */
export function periodInitiative(people: readonly Person[], period: Period, today: LocalDate): Initiative | undefined {
	const from = today.addDays(-(PERIOD_DAYS[period] - 1));
	return initiative(people.flatMap((person) => within(person, from, today)));
}

export interface Often {
	readonly person: Person;
	readonly count: number;
	/** Who started, over the period. */
	readonly initiative?: Initiative;
}

export function mostOften(people: readonly Person[], period: Period, today: LocalDate): Often[] {
	const from = today.addDays(-(PERIOD_DAYS[period] - 1));
	return people
		.map((person) => {
			const hits = within(person, from, today);
			return { person, count: hits.length, initiative: initiative(hits) };
		})
		.filter((often) => often.count > 0)
		.sort((a, b) => b.count - a.count || a.person.name.localeCompare(b.person.name));
}
