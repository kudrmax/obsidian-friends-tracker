import { describe, expect, it } from "vitest";
import { MonthBar } from "../src/domain/Stats";
import { barHeights } from "../src/ui/MonthChart";

const bar = (text: number, call: number, meeting: number, wholeDay: number): MonthBar => ({ year: 2026, month: 1, text, call, meeting, wholeDay });

describe("barHeights", () => {
	it("gives an empty month no height and the fullest month the whole chart", () => {
		const heights = barHeights([bar(0, 0, 0, 0), bar(2, 1, 1, 0)], 64);
		expect(heights[0]).toEqual([0, 0, 0, 0]);
		expect(heights[1].reduce((a, b) => a + b)).toBe(64);
	});

	it("keeps the layers in proportion, in whole pixels, never over the chart", () => {
		const heights = barHeights([bar(1, 1, 1, 1), bar(4, 2, 1, 1)], 64);
		expect(heights[1]).toEqual([32, 16, 8, 8]);
		expect(heights[0]).toEqual([8, 8, 8, 8]);
		for (const month of barHeights([bar(1, 0, 0, 0), bar(3, 3, 1, 0)], 50)) {
			expect(month.every(Number.isInteger)).toBe(true);
			expect(month.reduce((a, b) => a + b)).toBeLessThanOrEqual(50);
		}
	});
});
