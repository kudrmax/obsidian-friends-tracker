import { describe, expect, it } from "vitest";
import { DEFAULT_LABELS } from "../src/domain/Interaction";
import { DEFAULT_PROPERTY_NAMES } from "../src/infrastructure/PersonCodec";
import { DEFAULT_SETTINGS, loadSettings, reachRule } from "../src/settings";

describe("loadSettings", () => {
	it("uses defaults for missing data", () => {
		expect(loadSettings(null)).toEqual({
			source: "tag",
			tag: "friend",
			folder: "Friends",
			personBlock: true,
			properties: DEFAULT_PROPERTY_NAMES,
			labels: DEFAULT_LABELS,
			dayStartHour: 4,
			headsUpPercent: 20,
			headsUpForNew: true,
		});
		expect(loadSettings(undefined)).toEqual(DEFAULT_SETTINGS);
	});

	it("falls back field by field on what it can't read", () => {
		const settings = loadSettings({ tag: 5, dayStartHour: "x", folder: "Friends", personBlock: false });
		expect(settings.tag).toBe("friend");
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

	it("takes a heads-up share of 1 to 99 whole percent", () => {
		expect(loadSettings({ headsUpPercent: 1 }).headsUpPercent).toBe(1);
		expect(loadSettings({ headsUpPercent: 99 }).headsUpPercent).toBe(99);
		for (const wrong of [0, 100, 12.5, "30"]) expect(loadSettings({ headsUpPercent: wrong }).headsUpPercent).toBe(20);
	});

	it("reads the heads-up for new targets", () => {
		expect(loadSettings({ headsUpForNew: false }).headsUpForNew).toBe(false);
	});

	it("reads the target's property names", () => {
		expect(DEFAULT_PROPERTY_NAMES.contactEvery).toBe("contact_every");
		expect(DEFAULT_PROPERTY_NAMES.headsUp).toBe("heads_up");
		expect(loadSettings({ properties: { contactEvery: "every" } }).properties.contactEvery).toBe("every");
	});

	it("gives the target's rule", () => {
		expect(reachRule(loadSettings({ headsUpPercent: 30, headsUpForNew: false }))).toEqual({ headsUpPercent: 30, headsUpForNew: false });
	});
});
