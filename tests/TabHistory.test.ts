import { describe, expect, it } from "vitest";
import { HistoryEntry, pageAt, underPages } from "../src/ui/TabHistory";

const FEED = "feed";
const list: HistoryEntry = { state: { type: FEED, state: { page: null } } };
const who: HistoryEntry = { state: { type: FEED, state: { page: { kind: "who", query: "an" } } } };
const how: HistoryEntry = { state: { type: FEED, state: { page: { kind: "how", path: "Anna.md", name: "Anna", query: "an" } } } };
const note: HistoryEntry = { state: { type: "markdown", state: {} } };
const stats: HistoryEntry = { state: { type: "stats", state: {} } };

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

describe("underPages", () => {
	it("counts the pages back to the list they were opened over", () => {
		expect(underPages([note, list], FEED)).toEqual({ steps: 1, list: true });
		expect(underPages([note, list, who], FEED)).toEqual({ steps: 2, list: true });
		expect(underPages([list, who, how], FEED)).toEqual({ steps: 3, list: true });
	});

	it("counts the pages back to the note they were opened over, whatever came before it", () => {
		expect(underPages([note], FEED)).toEqual({ steps: 1, list: false });
		expect(underPages([list, stats, note], FEED)).toEqual({ steps: 1, list: false });
		expect(underPages([list, note, who], FEED)).toEqual({ steps: 2, list: false });
	});

	it("finds nothing when the pages were restored on start", () => {
		expect(underPages([], FEED)).toBeNull();
		expect(underPages([who], FEED)).toBeNull();
		expect(underPages([who, how], FEED)).toBeNull();
	});
});
