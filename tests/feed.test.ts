import { describe, expect, it } from "vitest";
import { FeedDay } from "../src/application/PeopleService";
import { LocalDate } from "../src/domain/LocalDate";
import { PAGE_DAYS, nextPage } from "../src/ui/feed";
import { d } from "./support/dates";

const today = d("2026-10-26");

/** A service whose feed has one text with Misha on every day. */
const everyDay = {
	feed(days: number, before?: LocalDate): FeedDay[] {
		const to = before ? before.addDays(-1) : today;
		return Array.from({ length: days }, (_, i) => ({ date: to.addDays(-i), rows: [{ path: "People/Misha.md", name: "Misha", index: i, interaction: { date: to.addDays(-i), kind: "text" as const } }] }));
	},
};

describe("nextPage", () => {
	it("starts at today and then continues from the last day shown, without repeating a day", () => {
		const first = nextPage([], everyDay, today);
		expect(first).toHaveLength(PAGE_DAYS);
		expect(String(first[0].date)).toBe("2026-10-26");
		const second = nextPage(first, everyDay, today);
		expect(second).toHaveLength(2 * PAGE_DAYS);
		expect(String(second[PAGE_DAYS].date)).toBe(String(today.addDays(-PAGE_DAYS)));
		const third = nextPage(second, everyDay, today);
		expect(String(third[2 * PAGE_DAYS].date)).toBe(String(today.addDays(-2 * PAGE_DAYS)));
		expect(new Set(third.map((day) => String(day.date))).size).toBe(third.length);
	});
});
