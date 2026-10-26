import { Labels } from "../domain/Interaction";
import { BARS_SHOWN, Bucket, ChartRange, KindCounts, sum } from "../domain/Stats";
import { DESIGN } from "./design";
import { barLabel } from "./format";
import { ANIMATION, play } from "./motion";

const LAYERS = ["text", "call", "meeting", "wholeDay"] as const;
type Layer = (typeof LAYERS)[number];
const LAYER_CLASS: Record<Layer, string> = { text: "ft-bar-text", call: "ft-bar-call", meeting: "ft-bar-meeting", wholeDay: "ft-bar-whole" };

/** The least a layer with anything in it is drawn at, so a quiet bar still shows. */
const MIN_LAYER = 1;

/**
 * Each bar's four layers in pixels, the fullest bar reaching `max`: a layer's share of its bar's total, floored so a
 * bar never overshoots, but never under a pixel while it holds something.
 */
export function barHeights(bars: readonly KindCounts[], max: number): number[][] {
	const total = (bar: KindCounts) => LAYERS.reduce((sum, layer) => sum + bar[layer], 0);
	const fullest = Math.max(0, ...bars.map(total));
	return bars.map((bar) => {
		if (fullest === 0) return LAYERS.map(() => 0);
		return LAYERS.map((layer) => (bar[layer] === 0 ? 0 : Math.max(MIN_LAYER, Math.floor((bar[layer] * max) / fullest))));
	});
}

/** The bars and, after them, empty places up to `slots`, so a chart of a few years keeps its bars as wide as twelve months'. */
export function padSlots<T>(items: readonly T[], slots: number): (T | null)[] {
	return [...items, ...Array.from({ length: Math.max(0, slots - items.length) }, () => null)];
}

export interface ChartOptions {
	/** The bars grow from this many milliseconds in; they stand still when null. */
	readonly grow?: number | null;
	/** Each layer's count over the bars shown, next to its name in the legend. */
	readonly counts?: boolean;
}

/** Stacked bars in twelve places, their labels under them and a legend of the layers. */
export function barChart(parent: HTMLElement, bars: readonly Bucket[], range: ChartRange, labels: Labels, options: ChartOptions = {}): HTMLElement {
	const el = parent.createDiv("ft-month-chart");
	const chart = el.createDiv("ft-chart");
	const marks = el.createDiv("ft-months");
	const heights = barHeights(bars, DESIGN.chart);
	const grow = options.grow ?? null;
	padSlots(bars, BARS_SHOWN).forEach((bar, index) => {
		const column = chart.createDiv("ft-bar");
		const mark = marks.createSpan();
		if (!bar) return;
		mark.setText(barLabel(bar.from, range, bars.length));
		LAYERS.forEach((layer, at) => {
			const height = heights[index][at];
			if (height <= 0) return;
			const piece = column.createSpan(LAYER_CLASS[layer]);
			piece.style.setProperty("height", `${height}px`);
		});
		column.setAttribute("aria-label", `${bar.from.toString()} – ${bar.to.toString()}: ${bar.text + bar.call + bar.meeting + bar.wholeDay}`);
		if (grow !== null) {
			column.style.setProperty("--ft-bar-index", String(index));
			column.style.setProperty("--ft-motion-offset", `${Math.round(grow)}ms`);
			play(column, "is-growing", ANIMATION.grow);
		}
	});
	const legend = el.createDiv("ft-legend");
	const total = sum(bars);
	const item = (layer: Layer, text: string) => {
		const entry = legend.createSpan();
		entry.createSpan(`ft-swatch ${LAYER_CLASS[layer]}`);
		entry.appendText(text);
		if (options.counts) entry.createSpan({ cls: "ft-legend-count", text: String(total[layer]) });
	};
	item("text", labels.text);
	item("call", labels.call);
	item("meeting", labels.meeting);
	item("wholeDay", labels.whole_day);
	return el;
}
