import { describe, expect, it } from "vitest";
import { LocalTime } from "../src/domain/LocalTime";

describe("LocalTime", () => {
	it("parses HH:MM and nothing looser", () => {
		expect(String(LocalTime.parse("08:05"))).toBe("08:05");
		expect(String(LocalTime.parse("23:59"))).toBe("23:59");
		expect(LocalTime.parse("8:05")).toBeNull();
		expect(LocalTime.parse("24:00")).toBeNull();
		expect(LocalTime.parse("18:60")).toBeNull();
		expect(LocalTime.parse("18:40:00")).toBeNull();
	});

	it("prints with two digits each", () => {
		expect(String(LocalTime.of(9, 7))).toBe("09:07");
		expect(String(LocalTime.fromDate(new Date(2026, 9, 26, 18, 40)))).toBe("18:40");
	});

	it("compares and equals by the minute", () => {
		expect(LocalTime.of(18, 40).compare(LocalTime.of(9, 0))).toBeGreaterThan(0);
		expect(LocalTime.of(9, 0).compare(LocalTime.of(9, 0))).toBe(0);
		expect(LocalTime.of(9, 0).equals(LocalTime.of(9, 0))).toBe(true);
		expect(LocalTime.of(9, 0).equals(LocalTime.of(9, 1))).toBe(false);
	});

	it("counts minutes from the day's start hour, so a small hour is late in the day", () => {
		expect(LocalTime.of(4, 0).minutesSince(4)).toBe(0);
		expect(LocalTime.of(23, 0).minutesSince(4)).toBe(19 * 60);
		expect(LocalTime.of(1, 30).minutesSince(4)).toBe(21 * 60 + 30);
		expect(LocalTime.of(0, 0).minutesSince(0)).toBe(0);
	});
});
