import { describe, expect, it } from "vitest";
import { HistoryEntry, pageAt, stepsToList } from "../src/ui/TabHistory";

const FEED = "feed";
const list: HistoryEntry = { state: { type: FEED, state: { page: null } } };
const who: HistoryEntry = { state: { type: FEED, state: { page: { kind: "who", query: "an" } } } };
const how: HistoryEntry = { state: { type: FEED, state: { page: { kind: "how", path: "Anna.md", name: "Anna", query: "an" } } } };
const note: HistoryEntry = { state: { type: "markdown", state: {} } };

describe("pageAt", () => {
	it("reads the page of a step in the Friends view, null for its list", () => {
		expect(pageAt(who, FEED)).toEqual({ kind: "who", query: "an" });
		expect(pageAt({ state: { type: FEED, state: {} } }, FEED)).toBeNull();
	});

	it("knows nothing of another view's step, or of no step", () => {
		expect(pageAt(note, FEED)).toBeUndefined();
		expect(pageAt(undefined, FEED)).toBeUndefined();
	});
});

describe("stepsToList", () => {
	it("counts the pages back to the list they were opened over", () => {
		expect(stepsToList([note, list], FEED)).toBe(1);
		expect(stepsToList([note, list, who], FEED)).toBe(2);
		expect(stepsToList([list, who, how], FEED)).toBe(3);
	});

	it("finds no list when the pages were restored on start or sit over another view", () => {
		expect(stepsToList([], FEED)).toBeNull();
		expect(stepsToList([who], FEED)).toBeNull();
		expect(stepsToList([list, note, who], FEED)).toBeNull();
	});
});
