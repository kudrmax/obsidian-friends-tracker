import { describe, expect, it } from "vitest";
import { DEFAULT_LABELS, describe as describeInteraction, sameInteraction } from "../src/domain/Interaction";
import { LocalTime } from "../src/domain/LocalTime";
import { d } from "./support/dates";

const date = d("2026-10-24");

describe("describe", () => {
	it("names a meeting with only the qualifiers that are not the usual ones", () => {
		expect(describeInteraction({ date, kind: "meeting", company: "one_on_one", length: "some_time" }, DEFAULT_LABELS)).toBe("Meeting, one on one");
		expect(describeInteraction({ date, kind: "meeting", company: "group", length: "whole_day" }, DEFAULT_LABELS)).toBe("Meeting, in company, whole day");
	});

	it("names a call by its purpose only when it was a shared activity", () => {
		expect(describeInteraction({ date, kind: "call", purpose: "talk" }, DEFAULT_LABELS)).toBe("Call");
		expect(describeInteraction({ date, kind: "call", purpose: "activity" }, DEFAULT_LABELS)).toBe("Call, shared activity");
	});

	it("names a text by its kind alone", () => {
		expect(describeInteraction({ date, kind: "text" }, DEFAULT_LABELS)).toBe("Text");
	});
});

describe("sameInteraction", () => {
	it("compares date, kind and every qualifier", () => {
		expect(sameInteraction({ date, kind: "call", purpose: "talk" }, { date, kind: "call", purpose: "talk" })).toBe(true);
		expect(sameInteraction({ date, kind: "call", purpose: "talk" }, { date, kind: "call", purpose: "activity" })).toBe(false);
		expect(sameInteraction({ date, kind: "text" }, { date: d("2026-10-23"), kind: "text" })).toBe(false);
	});

	it("tells two records of a day apart by their time", () => {
		const at = (time?: LocalTime) => ({ date, kind: "text" as const, ...(time ? { time } : {}) });
		expect(sameInteraction(at(LocalTime.of(18, 40)), at(LocalTime.of(18, 40)))).toBe(true);
		expect(sameInteraction(at(LocalTime.of(18, 40)), at(LocalTime.of(9, 0)))).toBe(false);
		expect(sameInteraction(at(LocalTime.of(18, 40)), at())).toBe(false);
		expect(sameInteraction(at(), at())).toBe(true);
	});

	it("tells two records apart by who started them, marked or not", () => {
		expect(sameInteraction({ date, kind: "text", initiated: "me" }, { date, kind: "text", initiated: "me" })).toBe(true);
		expect(sameInteraction({ date, kind: "text", initiated: "me" }, { date, kind: "text", initiated: "them" })).toBe(false);
		expect(sameInteraction({ date, kind: "text", initiated: "me" }, { date, kind: "text" })).toBe(false);
	});
});
