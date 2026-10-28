import { describe, expect, it } from "vitest";
import { DomainError } from "../src/domain/DomainError";
import { LocalTime } from "../src/domain/LocalTime";
import { HowState, fromInteraction, isComplete, toInteraction, withInitiator, withKind } from "../src/ui/howState";
import { d } from "./support/dates";

const date = d("2026-10-26");

describe("a new interaction's state", () => {
	it("is complete for a text as soon as the kind is picked", () => {
		expect(isComplete({ date })).toBe(false);
		expect(isComplete({ date, kind: "text" })).toBe(true);
	});

	it("needs the purpose of a call", () => {
		expect(isComplete({ date, kind: "call" })).toBe(false);
		expect(isComplete({ date, kind: "call", purpose: "talk" })).toBe(true);
	});

	it("needs both the company and the length of a meeting", () => {
		expect(isComplete({ date, kind: "meeting", company: "group" })).toBe(false);
		expect(isComplete({ date, kind: "meeting", company: "group", length: "whole_day" })).toBe(true);
	});

	it("turns into an interaction only when complete", () => {
		const state: HowState = { date, kind: "meeting", company: "one_on_one", length: "some_time", purpose: "activity" };
		expect(toInteraction(state)).toEqual({ date, kind: "meeting", company: "one_on_one", length: "some_time" });
		expect(() => toInteraction({ date, kind: "call" })).toThrow(DomainError);
	});

	it("carries the time of day both ways, and no time when a record has none", () => {
		const time = LocalTime.of(18, 40);
		expect(toInteraction({ date, time, kind: "text" })).toEqual({ date, time, kind: "text" });
		expect(toInteraction({ date, kind: "call", purpose: "talk" })).toEqual({ date, kind: "call", purpose: "talk" });
		expect(fromInteraction({ date, time, kind: "meeting", company: "group", length: "whole_day" })).toEqual({ date, time, kind: "meeting", company: "group", length: "whole_day" });
		expect(fromInteraction({ date, kind: "text" }).time).toBeUndefined();
	});

	it("keeps the day and the time when the kind changes, and forgets the old kind's answers", () => {
		const time = LocalTime.of(9, 15);
		expect(withKind({ date, time, kind: "call", purpose: "activity" }, "meeting")).toEqual({ date, time, kind: "meeting" });
		expect(withKind({ date, kind: "text" }, "call")).toEqual({ date, kind: "call" });
	});

	it("leaves who started optional, keeps it across a change of kind and carries it both ways", () => {
		const state: HowState = { date, kind: "text", initiated: "me" };
		expect(isComplete({ date, kind: "text" })).toBe(true);
		expect(toInteraction(state)).toEqual({ date, kind: "text", initiated: "me" });
		expect(fromInteraction({ date, kind: "call", purpose: "talk", initiated: "them" })).toEqual({ date, kind: "call", purpose: "talk", initiated: "them" });
		expect(withKind(state, "call")).toEqual({ date, kind: "call", initiated: "me" });
	});

	it("picks who started, switches it, and unpicks it on a second tap of the same answer", () => {
		const picked = withInitiator({ date, kind: "text" }, "them");
		expect(picked).toEqual({ date, kind: "text", initiated: "them" });
		expect(withInitiator(picked, "me")).toEqual({ date, kind: "text", initiated: "me" });
		expect(withInitiator(picked, "them")).toEqual({ date, kind: "text" });
	});
});
