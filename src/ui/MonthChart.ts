import { Labels } from "../domain/Interaction";
import { MonthBar } from "../domain/Stats";
import { DESIGN } from "./design";
import { monthLetter } from "./format";

const LAYERS = ["text", "call", "meeting", "wholeDay"] as const;
type Layer = (typeof LAYERS)[number];
const LAYER_CLASS: Record<Layer, string> = { text: "pt-bar-text", call: "pt-bar-call", meeting: "pt-bar-meeting", wholeDay: "pt-bar-whole" };

/**
 * Each month's four layers in pixels, the fullest month reaching `max`: a layer's share of its month's total, floored
 * so a month never overshoots.
 */
export function barHeights(bars: readonly MonthBar[], max: number): number[][] {
	const total = (bar: MonthBar) => LAYERS.reduce((sum, layer) => sum + bar[layer], 0);
	const fullest = Math.max(0, ...bars.map(total));
	return bars.map((bar) => {
		if (fullest === 0) return LAYERS.map(() => 0);
		return LAYERS.map((layer) => Math.floor((bar[layer] * max) / fullest));
	});
}

/** Twelve months as stacked bars, their letters under them and a legend of the layers. */
export function monthChart(parent: HTMLElement, bars: readonly MonthBar[], labels: Labels): HTMLElement {
	const el = parent.createDiv("pt-month-chart");
	const chart = el.createDiv("pt-chart");
	const heights = barHeights(bars, DESIGN.chart);
	bars.forEach((bar, index) => {
		const column = chart.createDiv("pt-bar");
		LAYERS.forEach((layer, at) => {
			const height = heights[index][at];
			if (height <= 0) return;
			const piece = column.createSpan(LAYER_CLASS[layer]);
			piece.style.setProperty("height", `${height}px`);
		});
		column.setAttribute("aria-label", `${bar.year}-${bar.month}: ${bar.text + bar.call + bar.meeting + bar.wholeDay}`);
	});
	const months = el.createDiv("pt-months");
	for (const bar of bars) months.createSpan({ text: monthLetter(bar.month) });
	const legend = el.createDiv("pt-legend");
	const item = (layer: Layer, text: string) => {
		const entry = legend.createSpan();
		entry.createSpan(`pt-swatch ${LAYER_CLASS[layer]}`);
		entry.appendText(text);
	};
	item("text", labels.text);
	item("call", labels.call);
	item("meeting", labels.meeting);
	item("wholeDay", labels.whole_day);
	return el;
}
