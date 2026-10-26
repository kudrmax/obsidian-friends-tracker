import { describe, expect, it } from "vitest";
import { DEFAULT_LABELS } from "../src/domain/Interaction";
import { DEFAULT_PROPERTY_NAMES } from "../src/infrastructure/PersonCodec";
import { DEFAULT_SETTINGS, loadSettings } from "../src/settings";

describe("loadSettings", () => {
	it("uses defaults for missing data", () => {
		expect(loadSettings(null)).toEqual({
			source: "tag",
			tag: "people-tracker",
			folder: "People",
			personBlock: true,
			properties: DEFAULT_PROPERTY_NAMES,
			labels: DEFAULT_LABELS,
			dayStartHour: 4,
		});
		expect(loadSettings(undefined)).toEqual(DEFAULT_SETTINGS);
	});

	it("falls back field by field on what it can't read", () => {
		const settings = loadSettings({ tag: 5, dayStartHour: "x", folder: "Friends", personBlock: false });
		expect(settings.tag).toBe("people-tracker");
		expect(settings.dayStartHour).toBe(4);
		expect(settings.folder).toBe("Friends");
		expect(settings.personBlock).toBe(false);
	});

	it("replaces only the labels and property names that are given", () => {
		const settings = loadSettings({ labels: { meeting: "Met" }, properties: { interactions: "met", kinds: { call: "phone" } } });
		expect(settings.labels).toEqual({ ...DEFAULT_LABELS, meeting: "Met" });
		expect(settings.properties.interactions).toBe("met");
		expect(settings.properties.kinds).toEqual({ ...DEFAULT_PROPERTY_NAMES.kinds, call: "phone" });
		expect(settings.properties.date).toBe("date");
	});

	it("strips the hash from the tag", () => {
		expect(loadSettings({ tag: "#friends" }).tag).toBe("friends");
	});
});
