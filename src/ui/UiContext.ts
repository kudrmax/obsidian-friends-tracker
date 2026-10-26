import { FeedRow, PeopleService } from "../application/PeopleService";
import { PersonRepository } from "../application/ports";
import { PeopleSettings } from "../settings";
import { FullSheet, PageDescriptor, PageHost } from "./sheet";

export interface UiContext {
	readonly service: PeopleService;
	readonly repository: PersonRepository;
	settings(): PeopleSettings;
	openPerson(path: string): void;
	openFeed(): void;
	openStats(): void;
	/** Opens Who, with `query` already typed when coming back from How. */
	newInteraction(query?: string): void;
	/** Opens the How step straight away for a person already known; `query` is what Who had typed, for the way back. */
	logWith(person: { path: string; name: string }, query?: string): void;
	editInteraction(row: FeedRow): void;
	/** Shows the undo line over the feed for what was just logged. */
	offerUndo(offer: UndoOffer): void;
	/** Where a sheet opens: as a page in the Friends tab. */
	sheetHost(): PageHost;
	/** Rebuilds a sheet from what the tab's history kept of it; null when it no longer exists (a record deleted). */
	sheetFor(page: PageDescriptor): FullSheet | null;
}

export interface UndoOffer {
	readonly text: string;
	undo(): Promise<unknown>;
}
