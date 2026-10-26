const TIME = /^(\d{2}):(\d{2})$/;
const MINUTES_A_DAY = 24 * 60;
const pad = (value: number) => String(value).padStart(2, "0");

/** A time of day to the minute, with no date and no zone: what the clock on the wall showed. */
export class LocalTime {
	private constructor(private readonly minutes: number) {}

	static of(hour: number, minute: number): LocalTime {
		return new LocalTime(hour * 60 + minute);
	}

	/** "HH:MM", two digits each; anything else is not a time. */
	static parse(text: string): LocalTime | null {
		const match = TIME.exec(text);
		if (!match) return null;
		const hour = Number(match[1]);
		const minute = Number(match[2]);
		if (hour > 23 || minute > 59) return null;
		return LocalTime.of(hour, minute);
	}

	static fromDate(date: Date): LocalTime {
		return LocalTime.of(date.getHours(), date.getMinutes());
	}

	get hour(): number {
		return Math.floor(this.minutes / 60);
	}

	get minute(): number {
		return this.minutes % 60;
	}

	equals(other: LocalTime): boolean {
		return this.minutes === other.minutes;
	}

	compare(other: LocalTime): number {
		return this.minutes - other.minutes;
	}

	/** Minutes since the day began at `startHour`: a time before that hour belongs to the end of the day. */
	minutesSince(startHour: number): number {
		return (this.minutes - startHour * 60 + MINUTES_A_DAY) % MINUTES_A_DAY;
	}

	toString(): string {
		return `${pad(this.hour)}:${pad(this.minute)}`;
	}
}
