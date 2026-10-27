import { FeedDay, FeedRow, PeopleService } from "../application/PeopleService";
import { LocalDate } from "../domain/LocalDate";

/** How many calendar days one page of the feed covers. */
export const PAGE_DAYS = 30;

/** How many pages there are at all: down to the day of the oldest interaction, none when there is none. */
export function pagesAvailable(oldest: LocalDate | undefined, today: LocalDate): number {
	if (!oldest) return 0;
	return Math.floor(today.daysSince(oldest) / PAGE_DAYS) + 1;
}

/** The feed with one more page of days added at its end. */
export function nextPage(shown: FeedDay[], service: Pick<PeopleService, "feed">, today: LocalDate, pages = pagesShown(shown, today)): FeedDay[] {
	const before = pages === 0 ? undefined : today.addDays(-(pages * PAGE_DAYS) + 1);
	return [...shown, ...service.feed(PAGE_DAYS, before)];
}

/** How many pages `shown` must cover for its last day to be on one, given pages are cut from today. */
export function pagesShown(shown: FeedDay[], today: LocalDate): number {
	const last = shown[shown.length - 1];
	if (!last) return 0;
	return Math.floor(today.daysSince(last.date) / PAGE_DAYS) + 1;
}

/** What a row of the feed is, in words that stay the same across redraws: the person, the moment and the how. */
export function rowKey(row: FeedRow): string {
	const interaction = row.interaction;
	const how =
		interaction.kind === "call" ? [interaction.purpose] : interaction.kind === "meeting" ? [interaction.company, interaction.length] : [];
	return [row.path, String(interaction.date), interaction.time ? String(interaction.time) : "", interaction.kind, ...how].join("|");
}

/** The keys of a day's rows; two same rows on a day are told apart by their order. */
export function rowKeys(rows: readonly FeedRow[]): string[] {
	const seen = new Map<string, number>();
	return rows.map((row) => {
		const key = rowKey(row);
		const count = seen.get(key) ?? 0;
		seen.set(key, count + 1);
		return count === 0 ? key : `${key}#${count}`;
	});
}
