import { describe, expect, it } from "vitest";
import { barLabel, dayDate, dayName, daysAgo, everyDays, fullDate, initiativeLine, longDate, monthLetter, readDays, shortDate, sinceDays } from "../src/ui/format";
import { d } from "./support/dates";

const today = d("2026-10-26");

describe("the feed's day headers", () => {
	it("name today and yesterday, then the weekday", () => {
		expect(dayName(today, today)).toBe("Today");
		expect(dayName(d("2026-10-25"), today)).toBe("Yesterday");
		expect(dayName(d("2026-10-24"), today)).toBe("Saturday");
	});

	it("date today and yesterday with the weekday, other days without, another year with it", () => {
		expect(dayDate(today, today)).toBe("Mon, 26 Oct");
		expect(dayDate(d("2026-10-25"), today)).toBe("Sun, 25 Oct");
		expect(dayDate(d("2026-10-24"), today)).toBe("24 Oct");
		expect(dayDate(d("2025-10-24"), today)).toBe("24 Oct 2025");
	});
});

describe("short and long dates", () => {
	it("shortens to day and month within the year, to month and year outside it", () => {
		expect(shortDate(d("2026-10-19"), today)).toBe("19 Oct");
		expect(shortDate(d("2025-03-02"), today)).toBe("Mar 2025");
	});

	it("spells out a day under a sheet's title", () => {
		expect(longDate(today, today)).toBe("Today");
		expect(longDate(d("2026-10-25"), today)).toBe("Yesterday");
		expect(longDate(d("2026-10-19"), today)).toBe("Monday, 19 Oct");
		expect(longDate(d("2025-10-19"), today)).toBe("Sunday, 19 Oct 2025");
	});
});

describe("counts", () => {
	it("says how long ago", () => {
		expect(daysAgo(41)).toBe("41 days ago");
		expect(daysAgo(1)).toBe("1 day ago");
		expect(daysAgo(0)).toBe("today");
	});

	it("gives a month its letter", () => {
		expect(monthLetter(1)).toBe("J");
		expect(monthLetter(10)).toBe("O");
	});
});

describe("a chart's labels", () => {
	it("give a week its Monday's day, a month its letter, a year its number", () => {
		expect(barLabel(d("2026-10-19"), "weeks", 12)).toBe("19");
		expect(barLabel(d("2026-03-01"), "months", 12)).toBe("M");
		expect(barLabel(d("2024-01-01"), "years", 6)).toBe("2024");
		expect(barLabel(d("2024-01-01"), "years", 7)).toBe("’24");
	});

	it("write a date years back in full", () => {
		expect(fullDate(d("2023-03-12"))).toBe("12 Mar 2023");
	});
});

describe("the Reach out rows", () => {
	it("say the target under the name", () => {
		expect(everyDays(1)).toBe("Every 1 day");
		expect(everyDays(7)).toBe("Every 7 days");
	});

	it("say the days since the last interaction, or never", () => {
		expect(sinceDays(undefined)).toBe("never");
		expect(sinceDays(0)).toBe("0 days");
		expect(sinceDays(1)).toBe("1 day");
		expect(sinceDays(16)).toBe("16 days");
	});
});

describe("the contact every field", () => {
	it("reads whole days, with or without the word", () => {
		expect(readDays("7")).toBe(7);
		expect(readDays(" 14 days ")).toBe(14);
		expect(readDays("1 day")).toBe(1);
	});

	it("reads an empty field as no target", () => {
		expect(readDays("  ")).toBe("none");
	});

	it("refuses what isn't a whole number of days, one or more", () => {
		for (const wrong of ["0", "-3", "1.5", "abc", "7 weeks"]) expect(readDays(wrong)).toBeNull();
	});
});

describe("who starts", () => {
	it("puts you first, then the person, in percent", () => {
		expect(initiativeLine({ mine: 70, theirs: 30 }, "Dima")).toBe("You 70% · Dima 30%");
	});
});
