import { Plugin, TFile } from "obsidian";
import { FeedRow, PeopleService } from "./application/PeopleService";
import { DayStartClock } from "./domain/Clock";
import { FrontmatterPersonRepository } from "./infrastructure/FrontmatterPersonRepository";
import { PeopleSettings, SettingsHost, loadSettings } from "./settings";
import { DayWatcher } from "./ui/DayWatcher";
import { EditSheet } from "./ui/EditSheet";
import { FEED_VIEW, FeedView } from "./ui/FeedView";
import { HowSheet } from "./ui/HowSheet";
import { PersonNotes } from "./ui/PersonNotes";
import { SettingsTab } from "./ui/SettingsTab";
import { FullSheet, PageDescriptor, PageHost } from "./ui/sheet";
import { STATS_VIEW, StatsView } from "./ui/StatsView";
import { UiContext, UndoOffer } from "./ui/UiContext";
import { WhoSheet } from "./ui/WhoSheet";

const DAY_CHECK_MS = 60_000;

export default class FriendsTrackerPlugin extends Plugin implements SettingsHost {
	config: PeopleSettings = loadSettings(null);
	private notes: PersonNotes | null = null;
	private repository: FrontmatterPersonRepository | null = null;
	/** People as of the last refresh, so a note that just stopped being a person (lost its tag) still refreshes the views. */
	private peoplePaths = new Set<string>();
	private listPaths: () => string[] = () => [];

	override async onload(): Promise<void> {
		this.config = loadSettings(await this.loadData());
		const repository = new FrontmatterPersonRepository(this.app, () => this.config, () => this.config.properties);
		this.repository = repository;
		const service = new PeopleService(repository, new DayStartClock(() => this.config.dayStartHour));
		const host = new PageHost(
			async () => {
				await this.openView(FEED_VIEW);
				return this.feedViews()[0] ?? null;
			},
			() => this.feedViews()[0] ?? null,
		);
		const ui: UiContext = {
			service,
			repository,
			settings: () => this.config,
			openPerson: (path) => void this.openPerson(path),
			openFeed: () => void this.openView(FEED_VIEW),
			openStats: () => void this.openHere(STATS_VIEW),
			newInteraction: (query) => new WhoSheet(this.app, ui, query).open(),
			logWith: (person, query) => new HowSheet(this.app, ui, person, undefined, query).open(),
			editInteraction: (row: FeedRow) => new EditSheet(this.app, ui, row).open(),
			offerUndo: (offer: UndoOffer) => this.feedViews().forEach((view) => view.offerUndo(offer)),
			sheetHost: () => host,
			sheetFor: (page: PageDescriptor): FullSheet | null => {
				if (page.kind === "who") return new WhoSheet(this.app, ui, page.query);
				if (page.kind === "how") return new HowSheet(this.app, ui, { path: page.path, name: page.name }, undefined, page.query);
				const entry = repository.get(page.path);
				const interaction = entry?.kind === "ok" ? entry.person.interactions()[page.index] : undefined;
				if (entry?.kind !== "ok" || !interaction) return null;
				return new EditSheet(this.app, ui, { path: page.path, name: entry.person.name, index: page.index, interaction });
			},
		};
		this.listPaths = () => repository.list().map((entry) => entry.path);
		this.peoplePaths = new Set(this.listPaths());
		const notes = this.addChild(new PersonNotes(this.app, ui));
		this.notes = notes;

		this.registerView(FEED_VIEW, (leaf) => new FeedView(leaf, ui));
		this.registerView(STATS_VIEW, (leaf) => new StatsView(leaf, ui));
		this.addRibbonIcon("users", "Friends", () => void this.openView(FEED_VIEW));
		this.addCommand({ id: "open", name: "Open friends", callback: () => void this.openView(FEED_VIEW) });
		this.addCommand({ id: "open-stats", name: "Open stats", callback: () => void this.openView(STATS_VIEW) });
		this.addCommand({ id: "new", name: "New interaction", callback: () => ui.newInteraction() });
		this.addCommand({
			id: "log-for-this-person",
			name: "Log an interaction with this person",
			checkCallback: (checking) => {
				const path = notes.activePerson();
				const entry = path ? repository.get(path) : undefined;
				if (!path || entry?.kind !== "ok") return false;
				if (!checking) ui.logWith({ path, name: entry.person.name });
				return true;
			},
		});
		this.addCommand({
			id: "toggle-person-block",
			name: "Show or hide the person block in people's notes",
			callback: () => {
				this.config.personBlock = !this.config.personBlock;
				void this.saveSettings();
			},
		});
		this.addSettingTab(new SettingsTab(this.app, this));

		const refreshIfPerson = (...paths: string[]) => {
			repository.invalidate();
			if (paths.some((path) => this.peoplePaths.has(path) || repository.contains(path))) this.refreshViews();
		};
		this.registerEvent(this.app.metadataCache.on("changed", (file) => refreshIfPerson(file.path)));
		/* Right after a start the cache is still filling, and a listing taken then would be empty for good. */
		this.registerEvent(this.app.metadataCache.on("resolved", () => {
			repository.invalidate();
			this.refreshViews();
		}));
		this.registerEvent(this.app.vault.on("delete", (file) => refreshIfPerson(file.path)));
		this.registerEvent(this.app.vault.on("rename", (file, oldPath) => refreshIfPerson(file.path, oldPath)));
		const watcher = new DayWatcher(service, () => this.refreshViews());
		this.registerInterval(window.setInterval(() => watcher.check(), DAY_CHECK_MS));
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.config);
		this.repository?.invalidate();
		this.refreshViews();
	}

	private feedViews(): FeedView[] {
		return this.app.workspace.getLeavesOfType(FEED_VIEW).flatMap((leaf) => (leaf.view instanceof FeedView ? [leaf.view] : []));
	}

	private statsViews(): StatsView[] {
		return this.app.workspace.getLeavesOfType(STATS_VIEW).flatMap((leaf) => (leaf.view instanceof StatsView ? [leaf.view] : []));
	}

	private refreshViews(): void {
		this.peoplePaths = new Set(this.listPaths());
		for (const view of this.feedViews()) view.refresh();
		for (const view of this.statsViews()) view.refresh();
		this.notes?.refresh();
	}

	/**
	 * Opens a view in the tab the plugin already holds (the feed or the stats), so the tab's back arrow leads back;
	 * a new tab only when the active tab is something else.
	 */
	private async openHere(type: string): Promise<void> {
		const active = this.app.workspace.getMostRecentLeaf();
		const ours = active && [FEED_VIEW, STATS_VIEW].includes(active.view.getViewType());
		const leaf = ours ? active : this.app.workspace.getLeaf("tab");
		await leaf.setViewState({ type, active: true });
		await this.app.workspace.revealLeaf(leaf);
	}

	private async openView(type: string): Promise<void> {
		const [existing] = this.app.workspace.getLeavesOfType(type);
		const leaf = existing ?? this.app.workspace.getLeaf("tab");
		if (!existing) await leaf.setViewState({ type, active: true });
		await this.app.workspace.revealLeaf(leaf);
	}

	/** Opens the note in the tab the tap came from, so back leads to the list it was tapped in. */
	private async openPerson(path: string): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) return;
		await this.app.workspace.getLeaf(false).openFile(file, { active: true });
	}
}
