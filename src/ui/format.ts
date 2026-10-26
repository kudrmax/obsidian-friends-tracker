import { LocalDate, Weekday } from "../domain/LocalDate";

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

export function monthLetter(month: number): string {
	return MONTHS[month - 1][0];
}
