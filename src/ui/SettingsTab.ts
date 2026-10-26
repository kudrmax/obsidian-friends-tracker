import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { Company, Kind, Labels, Length, Purpose } from "../domain/Interaction";
import { PropertyNames } from "../infrastructure/PersonCodec";
import { DEFAULT_SETTINGS, MAX_DAY_START, PeopleSettings, SettingsHost } from "../settings";
import { FolderSuggest, TagSuggest } from "./suggest";

const LABEL_NAMES: ReadonlyArray<{ key: keyof Labels; name: string }> = [
	{ key: "text", name: "Text" },
	{ key: "call", name: "Call" },
	{ key: "meeting", name: "Meeting" },
	{ key: "one_on_one", name: "Meeting, one on one" },
	{ key: "group", name: "Meeting, in company" },
	{ key: "some_time", name: "Meeting, some time" },
	{ key: "whole_day", name: "Meeting, whole day" },
	{ key: "talk", name: "Call, talk" },
	{ key: "activity", name: "Call, shared activity" },
];

type PropertyKey = Exclude<keyof PropertyNames, "kinds" | "companies" | "lengths" | "purposes">;
const PROPERTY_KEYS: ReadonlyArray<{ key: PropertyKey; name: string }> = [
	{ key: "interactions", name: "Interactions list" },
	{ key: "date", name: "Date" },
	{ key: "kind", name: "Kind" },
	{ key: "company", name: "Company" },
	{ key: "length", name: "Length" },
	{ key: "purpose", name: "Purpose" },
];

export class SettingsTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly host: Plugin & SettingsHost,
	) {
		super(app, host);
	}

	override display(): void {
		const { containerEl } = this;
		containerEl.empty();
		this.people(containerEl);
		this.note(containerEl);
		this.day(containerEl);
		this.labels(containerEl);
		this.properties(containerEl);
	}

	private people(containerEl: HTMLElement): void {
		const settings = this.host.config;
		new Setting(containerEl).setName("Friends").setHeading();
		new Setting(containerEl)
			.setName("Find friends by")
			.setDesc("A note is a friend when it has the tag, or when it lives in the folder.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("tag", "Tag")
					.addOption("folder", "Folder")
					.setValue(settings.source)
					.onChange(async (value) => {
						await this.save((next) => (next.source = value === "folder" ? "folder" : "tag"));
						this.display();
					}),
			);
		if (settings.source === "tag") {
			new Setting(containerEl)
				.setName("Tag")
				.setDesc("Notes with this tag, or a tag nested under it, are friends.")
				.addText((text) => {
					const save = (value: string) => void this.save((next) => (next.tag = value.trim().replace(/^#/, "") || DEFAULT_SETTINGS.tag));
					text.setPlaceholder(`#${DEFAULT_SETTINGS.tag}`).setValue(`#${settings.tag}`).onChange(save);
					new TagSuggest(this.app, text.inputEl, save);
				});
		}
		new Setting(containerEl)
			.setName(settings.source === "tag" ? "New friends are saved to" : "Folder")
			.setDesc(
				settings.source === "tag"
					? "The folder where a person added from the search gets their note."
					: "Every note in this folder is a friend, and new friends are saved here. Subfolders are ignored.",
			)
			.addText((text) => {
				const save = (value: string) => {
					if (value.trim()) void this.save((next) => (next.folder = value.trim()));
				};
				text.setPlaceholder(DEFAULT_SETTINGS.folder).setValue(settings.folder).onChange(save);
				new FolderSuggest(this.app, text.inputEl, save);
			});
	}

	private note(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("Person block in the note")
			.setDesc("Shows the last interaction, the usual gap, the months and the latest interactions above a person's note, drawn like its Properties.")
			.addToggle((toggle) => toggle.setValue(this.host.config.personBlock).onChange((value) => void this.save((next) => (next.personBlock = value))));
	}

	private day(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("Day starts at")
			.setDesc("An interaction logged after midnight but before this hour counts for the day before.")
			.addSlider((slider) =>
				slider
					.setLimits(0, MAX_DAY_START, 1)
					.setValue(this.host.config.dayStartHour)
					.setDynamicTooltip()
					.onChange((value) => void this.save((next) => (next.dayStartHour = value))),
			);
	}

	private labels(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Labels").setDesc("What each kind of interaction and its choices are called on screen.").setHeading();
		for (const { key, name } of LABEL_NAMES) {
			new Setting(containerEl).setName(name).addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.labels[key])
					.setValue(this.host.config.labels[key])
					.onChange((value) => void this.save((next) => (next.labels = { ...next.labels, [key]: value.trim() || DEFAULT_SETTINGS.labels[key] }))),
			);
		}
	}

	private properties(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("Property names")
			.setDesc("The frontmatter keys and values interactions are stored under. Changing them does not rewrite existing notes.")
			.setHeading();
		for (const { key, name } of PROPERTY_KEYS) {
			new Setting(containerEl).setName(name).addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.properties[key])
					.setValue(this.host.config.properties[key])
					.onChange((value) => void this.save((next) => (next.properties = { ...next.properties, [key]: value.trim() || DEFAULT_SETTINGS.properties[key] }))),
			);
		}
		this.values(containerEl, "Kind values", "kinds", ["text", "call", "meeting"]);
		this.values(containerEl, "Company values", "companies", ["one_on_one", "group"]);
		this.values(containerEl, "Length values", "lengths", ["some_time", "whole_day"]);
		this.values(containerEl, "Purpose values", "purposes", ["talk", "activity"]);
	}

	private values<K extends "kinds" | "companies" | "lengths" | "purposes">(
		containerEl: HTMLElement,
		title: string,
		group: K,
		keys: ReadonlyArray<Kind | Company | Length | Purpose>,
	): void {
		for (const key of keys) {
			const values = this.host.config.properties[group] as Record<string, string>;
			const fallback = (DEFAULT_SETTINGS.properties[group] as Record<string, string>)[key];
			new Setting(containerEl).setName(`${title}: ${this.host.config.labels[key]}`).addText((text) =>
				text
					.setPlaceholder(fallback)
					.setValue(values[key])
					.onChange((value) => void this.save((next) => (next.properties = { ...next.properties, [group]: { ...next.properties[group], [key]: value.trim() || fallback } }))),
			);
		}
	}

	private async save(change: (settings: PeopleSettings) => void): Promise<void> {
		change(this.host.config);
		await this.host.saveSettings();
	}
}
