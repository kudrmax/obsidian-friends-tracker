import { DomainError } from "../domain/DomainError";
import { Company, Interaction, Kind, Length, Purpose } from "../domain/Interaction";
import { LocalDate } from "../domain/LocalDate";

/** What the How screen has picked so far. */
export interface HowState {
	readonly date: LocalDate;
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
	if (state.kind === "text") return { date: state.date, kind: "text" };
	if (state.kind === "call" && state.purpose) return { date: state.date, kind: "call", purpose: state.purpose };
	if (state.kind === "meeting" && state.company && state.length) return { date: state.date, kind: "meeting", company: state.company, length: state.length };
	throw new DomainError("Pick an answer on every row");
}

/** The state that edits an existing interaction. */
export function fromInteraction(interaction: Interaction): HowState {
	switch (interaction.kind) {
		case "text":
			return { date: interaction.date, kind: "text" };
		case "call":
			return { date: interaction.date, kind: "call", purpose: interaction.purpose };
		case "meeting":
			return { date: interaction.date, kind: "meeting", company: interaction.company, length: interaction.length };
	}
}
