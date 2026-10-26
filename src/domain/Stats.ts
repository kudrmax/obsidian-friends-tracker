import { Interaction } from "./Interaction";
import { LocalDate } from "./LocalDate";
import { Person } from "./Person";

/** The last 7, 30 or 365 days, today included. */
export type Period = "week" | "month" | "year";
export const PERIOD_DAYS: Readonly<Record<Period, number>> = { week: 7, month: 30, year: 365 };

const YEAR_DAYS = 365;
const MONTHS_SHOWN = 12;
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

export interface MonthBar {
	readonly year: number;
	readonly month: number;
	readonly text: number;
	readonly call: number;
	readonly meeting: number;
	/** Meetings that took the whole day, counted here instead of under meeting. */
	readonly wholeDay: number;
}

/** Twelve calendar months, the current one last. */
export function byMonth(interactions: readonly Interaction[], today: LocalDate): MonthBar[] {
	const bars: MonthBar[] = [];
	for (let back = MONTHS_SHOWN - 1; back >= 0; back--) {
		const index = today.year * 12 + (today.month - 1) - back;
		bars.push({ year: Math.floor(index / 12), month: (index % 12) + 1, text: 0, call: 0, meeting: 0, wholeDay: 0 });
	}
	const counts = bars.map((bar) => ({ ...bar }));
	for (const interaction of interactions) {
		const at = counts.find((bar) => bar.year === interaction.date.year && bar.month === interaction.date.month);
		if (!at) continue;
		if (interaction.kind === "meeting" && interaction.length === "whole_day") at.wholeDay++;
		else at[interaction.kind]++;
	}
	return counts;
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

export interface Behind {
	readonly person: Person;
	readonly days: number;
	readonly usual: number;
}

/** People whose silence has outlasted their usual gap, the most overdue first. */
export function fallingBehind(people: readonly Person[], today: LocalDate): Behind[] {
	const behind: Behind[] = [];
	for (const person of people) {
		const days = daysSince(person, today);
		const usual = usualGap(person, today);
		if (days === undefined || usual === undefined || days <= usual) continue;
		behind.push({ person, days, usual });
	}
	return behind.sort((a, b) => b.days / b.usual - a.days / a.usual || a.person.name.localeCompare(b.person.name));
}

export interface Often {
	readonly person: Person;
	readonly count: number;
}

export function mostOften(people: readonly Person[], period: Period, today: LocalDate): Often[] {
	const from = today.addDays(-(PERIOD_DAYS[period] - 1));
	return people
		.map((person) => ({ person, count: within(person, from, today).length }))
		.filter((often) => often.count > 0)
		.sort((a, b) => b.count - a.count || a.person.name.localeCompare(b.person.name));
}
