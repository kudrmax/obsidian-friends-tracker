/** How long after its first draw a redraw still continues an entrance rather than dropping it; longer than any entrance. */
export const ENTRANCE_WINDOW_MS = 1500;
/** How long a leaving element may take before it is removed anyway, as in a hidden tab, where nothing animates. */
const LEAVE_LIMIT_MS = 400;

/** The @keyframes in styles.css, by what they do. */
export const ANIMATION = {
	arrive: "ft-arrive",
	leave: "ft-leave",
	fadeIn: "ft-fade-in",
	pop: "ft-pop",
	comeBack: "ft-come-back",
	grow: "ft-grow",
	glow: "ft-glow",
} as const;

export type Animation = (typeof ANIMATION)[keyof typeof ANIMATION];

export type Clock = () => number;
const performanceClock: Clock = () => performance.now();

/**
 * Which keys of a list drawn afresh each time are new since the draw before, and how far into its entrance each one is,
 * so only what changed moves. The first draw has no arrivals, and an empty first draw (the notes not read yet) doesn't count.
 */
export class Arrivals {
	private known: ReadonlySet<string> | null = null;
	private drawing = new Set<string>();
	private readonly arrivedAt = new Map<string, number>();

	constructor(private readonly clock: Clock = performanceClock) {}

	/** Starts a draw: what the last draw showed becomes what is known. */
	begin(): void {
		if (this.known !== null || this.drawing.size > 0) this.known = this.drawing;
		this.drawing = new Set();
	}

	/** How many milliseconds into its entrance a key drawn now is; null when it stands still. A quiet key is noted without arriving. */
	offset(key: string, quiet = false): number | null {
		this.drawing.add(key);
		const now = this.clock();
		if (!quiet && this.known !== null && !this.known.has(key) && !this.arrivedAt.has(key)) this.arrivedAt.set(key, now);
		const at = this.arrivedAt.get(key);
		if (at === undefined) return null;
		if (now - at >= ENTRANCE_WINDOW_MS) {
			this.arrivedAt.delete(key);
			return null;
		}
		return now - at;
	}
}

/** A one-time entrance for something drawn afresh often, like the chart: it plays from the first draw after a restart, and a redraw within its window continues it. */
export class Debut {
	private at: number | null = null;

	constructor(private readonly clock: Clock = performanceClock) {}

	restart(): void {
		this.at = null;
	}

	offset(): number | null {
		const now = this.clock();
		if (this.at === null) this.at = now;
		const elapsed = now - this.at;
		return elapsed < ENTRANCE_WINDOW_MS ? elapsed : null;
	}
}

/** Puts `cls` on for one run of the animation `ending`, then takes it off, so a tab hidden and shown again doesn't replay it. */
export function play(el: HTMLElement, cls: string, ending: Animation): void {
	if (el.hasClass(cls)) {
		el.removeClass(cls);
		void el.offsetWidth;
	}
	el.addClass(cls);
	const done = (event: AnimationEvent) => {
		if (event.target !== el || event.animationName !== ending) return;
		el.removeEventListener("animationend", done);
		el.removeClass(cls);
	};
	el.addEventListener("animationend", done);
}

/** Plays an element's arrival from `offset` milliseconds in; nothing when the offset is null. */
export function arrive(el: HTMLElement, offset: number | null, ending: Animation = ANIMATION.arrive): void {
	if (offset === null) return;
	el.style.setProperty("--ft-motion-offset", `${Math.round(offset)}ms`);
	play(el, "is-arriving", ending);
}

/** Lets an element leave, then removes it; at once when nothing animates. */
export function leave(el: HTMLElement): void {
	el.addClass("is-leaving");
	const gone = () => el.remove();
	if (getComputedStyle(el).animationName === "none") return gone();
	el.addEventListener("animationend", gone, { once: true });
	window.setTimeout(gone, LEAVE_LIMIT_MS);
}
