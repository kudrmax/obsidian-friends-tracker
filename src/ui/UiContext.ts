import { FeedRow, PeopleService } from "../application/PeopleService";
import { PersonRepository } from "../application/ports";
import { PeopleSettings } from "../settings";
import { SheetHost } from "./sheet";

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
	/** Where a sheet opens: a modal on a phone, a page in the People tab on a computer. */
	sheetHost(): SheetHost;
}

export interface UndoOffer {
	readonly text: string;
	undo(): Promise<unknown>;
}
