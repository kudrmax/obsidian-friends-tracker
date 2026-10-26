import { describe, expect, it } from "vitest";
import { DEFAULT_LABELS, describe as describeInteraction, sameInteraction } from "../src/domain/Interaction";
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
});
