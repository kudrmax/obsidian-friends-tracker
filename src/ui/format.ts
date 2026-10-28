import { LocalDate, Weekday } from "../domain/LocalDate";
import { ChartRange, Initiative } from "../domain/Stats";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAY_NAMES: Record<Weekday, string> = {
	mon: "Monday",
	tue: "Tuesday",
	wed: "Wednesday",
	thu: "Thursday",
	fri: "Friday",
	sat: "Saturday",
	sun: "Sunday",
};

const dayMonth = (date: LocalDate, today: LocalDate): string =>
	`${date.day} ${MONTHS[date.month - 1]}${date.year === today.year ? "" : ` ${date.year}`}`;

/** "Today", "Yesterday", else the weekday: the left side of a day's header in the feed. */
export function dayName(date: LocalDate, today: LocalDate): string {
	if (date.equals(today)) return "Today";
	if (date.equals(today.addDays(-1))) return "Yesterday";
	return WEEKDAY_NAMES[date.weekday()];
}

/** The right side of a day's header: with the weekday when the left side doesn't say it. */
export function dayDate(date: LocalDate, today: LocalDate): string {
	const named = date.equals(today) || date.equals(today.addDays(-1));
	return named ? `${WEEKDAY_NAMES[date.weekday()].slice(0, 3)}, ${dayMonth(date, today)}` : dayMonth(date, today);
}

/** "19 Oct" this year, "Mar 2025" another year: a date beside a name. */
export function shortDate(date: LocalDate, today: LocalDate): string {
	return date.year === today.year ? `${date.day} ${MONTHS[date.month - 1]}` : `${MONTHS[date.month - 1]} ${date.year}`;
}

/** "Today", "Yesterday", else "Sunday, 19 Oct": the date under a sheet's title. */
export function longDate(date: LocalDate, today: LocalDate): string {
	const name = dayName(date, today);
	return name === "Today" || name === "Yesterday" ? name : `${name}, ${dayMonth(date, today)}`;
}

export function daysAgo(days: number): string {
	if (days === 0) return "today";
	return `${days} ${days === 1 ? "day" : "days"} ago`;
}

/** "1 day", "16 days". */
export function dayCount(days: number): string {
	return `${days} ${days === 1 ? "day" : "days"}`;
}

/** A target under a person's name: "Every 7 days". */
export function everyDays(days: number): string {
	return `Every ${dayCount(days)}`;
}

/** The days since the last interaction, or "never" for someone not contacted yet. */
export function sinceDays(days: number | undefined): string {
	return days === undefined ? "never" : dayCount(days);
}

/** What was typed as a target: whole days, "none" for an empty field, null for anything else. */
export function readDays(text: string): number | "none" | null {
	const typed = text.trim();
	if (!typed) return "none";
	const match = /^(\d+)(\s+days?)?$/i.exec(typed);
	const days = match ? Number(match[1]) : 0;
	return days >= 1 ? days : null;
}

export function monthLetter(month: number): string {
	return MONTHS[month - 1][0];
}

/** "12 Mar 2023", always with the year: a date that may lie years back. */
export function fullDate(date: LocalDate): string {
	return `${date.day} ${MONTHS[date.month - 1]} ${date.year}`;
}

/** The years a chart can name in full; more of them are shortened to "’24" to fit. */
const FULL_YEARS_SHOWN = 6;

/** What stands under a chart's bar: the Monday's day for a week, the month's letter, the year. */
export function barLabel(from: LocalDate, range: ChartRange, bars: number): string {
	if (range === "weeks") return String(from.day);
	if (range === "months") return monthLetter(from.month);
	return bars <= FULL_YEARS_SHOWN ? String(from.year) : `’${String(from.year).slice(-2)}`;
}

/** "You 70% · Dima 30%": who starts, you first. */
export function initiativeLine(initiative: Initiative, name: string): string {
	return `You ${initiative.mine}% · ${name} ${initiative.theirs}%`;
}
