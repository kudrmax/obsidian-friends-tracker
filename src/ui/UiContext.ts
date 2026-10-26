import { FeedRow, PeopleService } from "../application/PeopleService";
import { PersonRepository } from "../application/ports";
import { PeopleSettings } from "../settings";

export interface UiContext {
	readonly service: PeopleService;
	readonly repository: PersonRepository;
	settings(): PeopleSettings;
	openPerson(path: string): void;
	openStats(): void;
	newInteraction(): void;
	/** Opens the How step straight away for a person already known. */
	logWith(person: { path: string; name: string }): void;
	editInteraction(row: FeedRow): void;
	/** Shows the undo line over the feed for what was just logged. */
	offerUndo(offer: UndoOffer): void;
}

export interface UndoOffer {
	readonly text: string;
	undo(): Promise<unknown>;
}
