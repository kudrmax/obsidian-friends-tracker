import { Labels } from "../domain/Interaction";
import { MonthBar } from "../domain/Stats";
import { DESIGN } from "./design";
import { monthLetter } from "./format";

const LAYERS = ["text", "call", "meeting", "wholeDay"] as const;
type Layer = (typeof LAYERS)[number];
const LAYER_CLASS: Record<Layer, string> = { text: "ft-bar-text", call: "ft-bar-call", meeting: "ft-bar-meeting", wholeDay: "ft-bar-whole" };

/** The least a layer with anything in it is drawn at, so a quiet month still shows. */
const MIN_LAYER = 1;

/**
 * Each month's four layers in pixels, the fullest month reaching `max`: a layer's share of its month's total, floored
 * so a month never overshoots, but never under a pixel while it holds something.
 */
export function barHeights(bars: readonly MonthBar[], max: number): number[][] {
	const total = (bar: MonthBar) => LAYERS.reduce((sum, layer) => sum + bar[layer], 0);
	const fullest = Math.max(0, ...bars.map(total));
	return bars.map((bar) => {
		if (fullest === 0) return LAYERS.map(() => 0);
		return LAYERS.map((layer) => (bar[layer] === 0 ? 0 : Math.max(MIN_LAYER, Math.floor((bar[layer] * max) / fullest))));
	});
}

/** Twelve months as stacked bars, their letters under them and a legend of the layers. */
export function monthChart(parent: HTMLElement, bars: readonly MonthBar[], labels: Labels): HTMLElement {
	const el = parent.createDiv("ft-month-chart");
	const chart = el.createDiv("ft-chart");
	const heights = barHeights(bars, DESIGN.chart);
	bars.forEach((bar, index) => {
		const column = chart.createDiv("ft-bar");
		LAYERS.forEach((layer, at) => {
			const height = heights[index][at];
			if (height <= 0) return;
			const piece = column.createSpan(LAYER_CLASS[layer]);
			piece.style.setProperty("height", `${height}px`);
		});
		column.setAttribute("aria-label", `${bar.year}-${bar.month}: ${bar.text + bar.call + bar.meeting + bar.wholeDay}`);
	});
	const months = el.createDiv("ft-months");
	for (const bar of bars) months.createSpan({ text: monthLetter(bar.month) });
	const legend = el.createDiv("ft-legend");
	const item = (layer: Layer, text: string) => {
		const entry = legend.createSpan();
		entry.createSpan(`ft-swatch ${LAYER_CLASS[layer]}`);
		entry.appendText(text);
	};
	item("text", labels.text);
	item("call", labels.call);
	item("meeting", labels.meeting);
	item("wholeDay", labels.whole_day);
	return el;
}
