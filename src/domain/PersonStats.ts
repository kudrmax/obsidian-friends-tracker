import { Kind } from "./Interaction";
import { LocalDate } from "./LocalDate";
import { Person } from "./Person";
import { totals, usualGap } from "./Stats";

/** A day of contact and how many days ago it was; a day after today counts as today. */
export interface Contact {
	readonly date: LocalDate;
	readonly days: number;
}

/** The small numbers of one person's panel: when you last met and spoke, the usual rhythm and how the year compares. */
export class PersonStats {
	constructor(
		private readonly person: Person,
		private readonly today: LocalDate,
	) {}

	lastContact(): Contact | undefined {
		return this.contact(this.newest(() => true));
	}

	lastMeeting(): Contact | undefined {
		return this.contact(this.newest((kind) => kind === "meeting"));
	}

	usualGap(): number | undefined {
		return usualGap(this.person, this.today);
	}

	/** The silence since the last contact of any kind has outlasted the usual gap. */
	isOverdue(): boolean {
		const last = this.lastContact();
		const usual = this.usualGap();
		return last !== undefined && usual !== undefined && last.days > usual;
	}

	/** Interactions in the last 365 days, and how many more than in the 365 before them. */
	pastYear(): { readonly count: number; readonly delta: number } {
		const year = totals([this.person], "year", this.today);
		return { count: year.interactions, delta: year.interactionsDelta };
	}

	firstDate(): LocalDate | undefined {
		return this.person.interactions().reduce<LocalDate | undefined>((first, i) => (first && !i.date.isBefore(first) ? first : i.date), undefined);
	}

	private newest(match: (kind: Kind) => boolean): LocalDate | undefined {
		return this.person
			.interactions()
			.filter((i) => match(i.kind))
			.reduce<LocalDate | undefined>((last, i) => (last && !i.date.isAfter(last) ? last : i.date), undefined);
	}

	private contact(date: LocalDate | undefined): Contact | undefined {
		return date && { date, days: Math.max(0, this.today.daysSince(date)) };
	}
}
