import { FeedDay, PeopleService } from "../application/PeopleService";
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
function pagesShown(shown: FeedDay[], today: LocalDate): number {
	const last = shown[shown.length - 1];
	if (!last) return 0;
	return Math.floor(today.daysSince(last.date) / PAGE_DAYS) + 1;
}
