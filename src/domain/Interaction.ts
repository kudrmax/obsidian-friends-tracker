import { LocalDate } from "./LocalDate";

/** How two people were in touch: by text, by call, or face to face, in order of depth. */
export type Kind = "text" | "call" | "meeting";
export const KINDS: readonly Kind[] = ["text", "call", "meeting"];

export type Company = "one_on_one" | "group";
export type Length = "some_time" | "whole_day";
export type Purpose = "talk" | "activity";

export type Interaction =
	| { readonly date: LocalDate; readonly kind: "text" }
	| { readonly date: LocalDate; readonly kind: "call"; readonly purpose: Purpose }
	| { readonly date: LocalDate; readonly kind: "meeting"; readonly company: Company; readonly length: Length };

export type Qualifier = Company | Length | Purpose;

/** What each kind and qualifier is called on screen. */
export type Labels = Readonly<Record<Kind | Qualifier, string>>;

export const DEFAULT_LABELS: Labels = {
	text: "Text",
	call: "Call",
	meeting: "Meeting",
	one_on_one: "One on one",
	group: "In company",
	some_time: "Some time",
	whole_day: "Whole day",
	talk: "Talk",
	activity: "Shared activity",
};

export function sameInteraction(a: Interaction, b: Interaction): boolean {
	if (!a.date.equals(b.date) || a.kind !== b.kind) return false;
	if (a.kind === "call" && b.kind === "call") return a.purpose === b.purpose;
	if (a.kind === "meeting" && b.kind === "meeting") return a.company === b.company && a.length === b.length;
	return true;
}

/** The kind, then the qualifiers that are not the usual ones, all in one line: "Meeting, in company, whole day". */
export function describe(interaction: Interaction, labels: Labels): string {
	const parts = [labels[interaction.kind]];
	if (interaction.kind === "meeting") {
		parts.push(labels[interaction.company].toLowerCase());
		if (interaction.length === "whole_day") parts.push(labels.whole_day.toLowerCase());
	}
	if (interaction.kind === "call" && interaction.purpose === "activity") parts.push(labels.activity.toLowerCase());
	return parts.join(", ");
}
