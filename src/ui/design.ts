/**
 * The measures the code lays screens out with. Each one is also a token in styles.css, named in
 * DESIGN_TOKENS; tests/styles.test.ts fails when the two differ, so they change together.
 */
export const DESIGN = {
	/** One row of a list: a circle, a name and its line, a chevron. */
	row: 60,
	/** The chart of months: its fullest month reaches this high. */
	chart: 64,
} as const;

export type DesignMeasure = keyof typeof DESIGN;

export const DESIGN_TOKENS: Readonly<Record<DesignMeasure, string>> = {
	row: "--pt-row",
	chart: "--pt-chart",
};
