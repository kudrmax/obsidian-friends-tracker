import { FeedDay, PeopleService } from "../application/PeopleService";
import { LocalDate } from "../domain/LocalDate";

/** How many calendar days one page of the feed covers. */
export const PAGE_DAYS = 30;

/** The pages shown so far: the feed reaches back this many calendar days from today. */
export interface Paged {
	readonly days: FeedDay[];
	readonly pages: number;
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
