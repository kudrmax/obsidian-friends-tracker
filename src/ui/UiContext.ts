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
}
