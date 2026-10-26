import { describe, expect, it } from "vitest";
import { KindCounts } from "../src/domain/Stats";
import { barHeights, padSlots } from "../src/ui/MonthChart";

const bar = (text: number, call: number, meeting: number, wholeDay: number): KindCounts => ({ text, call, meeting, wholeDay });

describe("barHeights", () => {
	it("gives an empty month no height and the fullest month the whole chart", () => {
		const heights = barHeights([bar(0, 0, 0, 0), bar(2, 1, 1, 0)], 64);
		expect(heights[0]).toEqual([0, 0, 0, 0]);
		expect(heights[1].reduce((a, b) => a + b)).toBe(64);
	});

	it("never lets a month with interactions vanish", () => {
		const heights = barHeights([bar(1, 0, 0, 0), bar(60, 0, 0, 0)], 64);
		expect(heights[0]).toEqual([1, 0, 0, 0]);
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

describe("padSlots", () => {
	it("fills the places after a few bars with empty ones", () => {
		expect(padSlots([1, 2, 3, 4], 12)).toEqual([1, 2, 3, 4, null, null, null, null, null, null, null, null]);
	});

	it("never cuts a full chart", () => {
		const twelve = Array.from({ length: 12 }, (_, index) => index);
		expect(padSlots(twelve, 12)).toEqual(twelve);
	});
});
