import { describe, expect, it } from "vitest";
import { FeedDay } from "../src/application/PeopleService";
import { LocalDate } from "../src/domain/LocalDate";
import { FeedRow } from "../src/application/PeopleService";
import { LocalTime } from "../src/domain/LocalTime";
import { PAGE_DAYS, nextPage, pagesAvailable, rowKey, rowKeys } from "../src/ui/feed";
import { d } from "./support/dates";

const today = d("2026-10-26");

/** A service whose feed has one text with Misha on every day. */
const everyDay = {
	feed(days: number, before?: LocalDate): FeedDay[] {
		const to = before ? before.addDays(-1) : today;
		return Array.from({ length: days }, (_, i) => ({ date: to.addDays(-i), rows: [{ path: "People/Misha.md", name: "Misha", index: i, interaction: { date: to.addDays(-i), kind: "text" as const } }] }));
	},
};

describe("pagesAvailable", () => {
	it("counts the pages down to the oldest interaction, none without one", () => {
		expect(pagesAvailable(undefined, today)).toBe(0);
		expect(pagesAvailable(today, today)).toBe(1);
		expect(pagesAvailable(today.addDays(-29), today)).toBe(1);
		expect(pagesAvailable(today.addDays(-30), today)).toBe(2);
		expect(pagesAvailable(today.addDays(-200), today)).toBe(7);
	});
});

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

describe("rowKey", () => {
	const misha = (interaction: FeedRow["interaction"], index = 0): FeedRow => ({ path: "People/Misha.md", name: "Misha", index, interaction });

	it("stays the same for the same record, wherever it stands in the person's list", () => {
		expect(rowKey(misha({ date: today, kind: "text" }, 0))).toBe(rowKey(misha({ date: today, kind: "text" }, 3)));
	});

	it("changes with the person, the day, the time, the kind and its answers", () => {
		const base = rowKey(misha({ date: today, time: LocalTime.of(18, 40), kind: "call", purpose: "talk" }));
		const others = [
			{ path: "People/Anya.md", name: "Anya", index: 0, interaction: { date: today, time: LocalTime.of(18, 40), kind: "call" as const, purpose: "talk" as const } },
			misha({ date: today.addDays(-1), time: LocalTime.of(18, 40), kind: "call", purpose: "talk" }),
			misha({ date: today, time: LocalTime.of(18, 45), kind: "call", purpose: "talk" }),
			misha({ date: today, kind: "call", purpose: "talk" }),
			misha({ date: today, time: LocalTime.of(18, 40), kind: "call", purpose: "activity" }),
			misha({ date: today, time: LocalTime.of(18, 40), kind: "meeting", company: "group", length: "some_time" }),
		];
		for (const other of others) expect(rowKey(other)).not.toBe(base);
	});

	it("tells two same records on a day apart", () => {
		const keys = rowKeys([misha({ date: today, kind: "text" }, 0), misha({ date: today, kind: "text" }, 1)]);
		expect(new Set(keys).size).toBe(2);
		expect(keys[0]).toBe(rowKey(misha({ date: today, kind: "text" })));
	});
});
