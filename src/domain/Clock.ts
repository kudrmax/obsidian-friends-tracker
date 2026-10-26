import { LocalDate } from "./LocalDate";
import { LocalTime } from "./LocalTime";

export interface Clock {
	today(): LocalDate;
	/** The time of day on the wall clock. */
	time(): LocalTime;
	/** The hour a day begins at; the hours before it still belong to the day before. */
	dayStartHour(): number;
}

/** A day that starts at `startHour` instead of midnight: past midnight but before that hour it is still the day before. */
export class DayStartClock implements Clock {
	constructor(
		private readonly startHour: () => number,
		private readonly now: () => Date = () => new Date(),
	) {}

	today(): LocalDate {
		const now = this.now();
		const date = LocalDate.fromDate(now);
		return now.getHours() < this.startHour() ? date.addDays(-1) : date;
	}

	time(): LocalTime {
		return LocalTime.fromDate(this.now());
	}

	dayStartHour(): number {
		return this.startHour();
	}
}
