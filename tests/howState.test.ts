import { describe, expect, it } from "vitest";
import { DomainError } from "../src/domain/DomainError";
import { HowState, isComplete, toInteraction } from "../src/ui/howState";
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
});
