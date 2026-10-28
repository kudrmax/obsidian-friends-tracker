import { DEFAULT_LABELS, Labels } from "./domain/Interaction";
import { ReachRule } from "./domain/Reach";
import { DEFAULT_PROPERTY_NAMES, PropertyNames } from "./infrastructure/PersonCodec";

export interface PeopleSettings {
	source: "tag" | "folder";
	tag: string;
	/** Where new people are saved, and in folder mode where people are found; "/" is the vault root. */
	folder: string;
	personBlock: boolean;
	properties: PropertyNames;
	labels: Labels;
	/** The hour a new day starts; an interaction logged past midnight but before it counts for the day before. */
	dayStartHour: number;
	/** A person with a target turns yellow when this share of it, in whole percent, is left. */
	headsUpPercent: number;
	/** The heads-up a person gets with a new target. */
	headsUpForNew: boolean;
}

export const DEFAULT_SETTINGS: PeopleSettings = {
	source: "tag",
	tag: "friend",
	folder: "Friends",
	personBlock: true,
	properties: DEFAULT_PROPERTY_NAMES,
	labels: DEFAULT_LABELS,
	dayStartHour: 4,
	headsUpPercent: 20,
	headsUpForNew: true,
};

export const MAX_DAY_START = 12;
export const MIN_HEADS_UP = 1;
export const MAX_HEADS_UP = 99;

export interface SettingsHost {
	config: PeopleSettings;
	saveSettings(): Promise<void>;
}

export function loadSettings(data: unknown): PeopleSettings {
	const raw = (typeof data === "object" && data !== null ? data : {}) as Partial<Record<keyof PeopleSettings, unknown>>;
	const flag = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);
	const integer = (value: unknown, min: number, max: number, fallback: number) =>
		typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : fallback;
	return {
		source: raw.source === "folder" ? "folder" : "tag",
		tag: text(raw.tag, DEFAULT_SETTINGS.tag).replace(/^#/, ""),
		folder: text(raw.folder, DEFAULT_SETTINGS.folder),
		personBlock: flag(raw.personBlock, DEFAULT_SETTINGS.personBlock),
		properties: loadProperties(raw.properties),
		labels: loadTexts(raw.labels, DEFAULT_LABELS),
		dayStartHour: integer(raw.dayStartHour, 0, MAX_DAY_START, DEFAULT_SETTINGS.dayStartHour),
		headsUpPercent: integer(raw.headsUpPercent, MIN_HEADS_UP, MAX_HEADS_UP, DEFAULT_SETTINGS.headsUpPercent),
		headsUpForNew: flag(raw.headsUpForNew, DEFAULT_SETTINGS.headsUpForNew),
	};
}

export function reachRule(settings: PeopleSettings): ReachRule {
	return { headsUpPercent: settings.headsUpPercent, headsUpForNew: settings.headsUpForNew };
}

function text(value: unknown, fallback: string): string {
	return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

/** Every key of `fallbacks`, taken from `value` where it holds non-empty text. */
function loadTexts<T extends Record<string, string>>(value: unknown, fallbacks: T): T {
	const raw = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
	return Object.fromEntries(Object.entries(fallbacks).map(([key, fallback]) => [key, text(raw[key], fallback)])) as T;
}

function loadProperties(value: unknown): PropertyNames {
	const raw = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
	return {
		interactions: text(raw.interactions, DEFAULT_PROPERTY_NAMES.interactions),
		date: text(raw.date, DEFAULT_PROPERTY_NAMES.date),
		time: text(raw.time, DEFAULT_PROPERTY_NAMES.time),
		kind: text(raw.kind, DEFAULT_PROPERTY_NAMES.kind),
		company: text(raw.company, DEFAULT_PROPERTY_NAMES.company),
		length: text(raw.length, DEFAULT_PROPERTY_NAMES.length),
		purpose: text(raw.purpose, DEFAULT_PROPERTY_NAMES.purpose),
		contactEvery: text(raw.contactEvery, DEFAULT_PROPERTY_NAMES.contactEvery),
		headsUp: text(raw.headsUp, DEFAULT_PROPERTY_NAMES.headsUp),
		kinds: loadTexts(raw.kinds, DEFAULT_PROPERTY_NAMES.kinds),
		companies: loadTexts(raw.companies, DEFAULT_PROPERTY_NAMES.companies),
		lengths: loadTexts(raw.lengths, DEFAULT_PROPERTY_NAMES.lengths),
		purposes: loadTexts(raw.purposes, DEFAULT_PROPERTY_NAMES.purposes),
	};
}
