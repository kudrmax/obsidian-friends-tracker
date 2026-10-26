import { DomainError } from "../domain/DomainError";
import { Company, Interaction, Kind, Length, Purpose } from "../domain/Interaction";
import { LocalDate } from "../domain/LocalDate";
import { LocalTime } from "../domain/LocalTime";

/** What the How screen has picked so far. */
export interface HowState {
	readonly date: LocalDate;
	/** The time of day; a record made before times were kept has none until one is picked. */
	readonly time?: LocalTime;
	readonly kind?: Kind;
	readonly company?: Company;
	readonly length?: Length;
	readonly purpose?: Purpose;
}

/** Whether every fork the kind asks for has an answer. */
export function isComplete(state: HowState): boolean {
	switch (state.kind) {
		case "text":
			return true;
		case "call":
			return state.purpose !== undefined;
		case "meeting":
			return state.company !== undefined && state.length !== undefined;
		default:
			return false;
	}
}

export function toInteraction(state: HowState): Interaction {
	const moment = state.time ? { date: state.date, time: state.time } : { date: state.date };
	if (state.kind === "text") return { ...moment, kind: "text" };
	if (state.kind === "call" && state.purpose) return { ...moment, kind: "call", purpose: state.purpose };
	if (state.kind === "meeting" && state.company && state.length) return { ...moment, kind: "meeting", company: state.company, length: state.length };
	throw new DomainError("Pick an answer on every row");
}

/** The same day and time with another kind: the kind's own answers start over, the moment stays. */
export function withKind(state: HowState, kind: Kind): HowState {
	return state.time ? { date: state.date, time: state.time, kind } : { date: state.date, kind };
}

/** The state that edits an existing interaction. */
export function fromInteraction(interaction: Interaction): HowState {
	const moment = interaction.time ? { date: interaction.date, time: interaction.time } : { date: interaction.date };
	switch (interaction.kind) {
		case "text":
			return { ...moment, kind: "text" };
		case "call":
			return { ...moment, kind: "call", purpose: interaction.purpose };
		case "meeting":
			return { ...moment, kind: "meeting", company: interaction.company, length: interaction.length };
	}
}
