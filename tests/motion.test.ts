import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ANIMATION, Arrivals, Debut, ENTRANCE_WINDOW_MS } from "../src/ui/motion";

/** A clock the test moves by hand. */
class Hands {
	now = 0;
	readonly clock = () => this.now;
}

describe("the animations the code plays", () => {
	it("are all keyframes in styles.css", () => {
		const css = readFileSync(join(__dirname, "..", "styles.css"), "utf8");
		const missing = Object.values(ANIMATION).filter((name) => !new RegExp(`@keyframes ${name}\\s*\\{`).test(css));
		expect(missing).toEqual([]);
	});
});

describe("Arrivals", () => {
	const draw = (arrivals: Arrivals, keys: string[], quiet = false) => {
		arrivals.begin();
		return keys.map((key) => arrivals.offset(key, quiet));
	};

	it("lets nothing arrive on the first draw, and only what is new on the next", () => {
		const hands = new Hands();
		const arrivals = new Arrivals(hands.clock);
		expect(draw(arrivals, ["a", "b"])).toEqual([null, null]);
		expect(draw(arrivals, ["c", "a", "b"])).toEqual([0, null, null]);
	});

	it("doesn't count an empty first draw", () => {
		const arrivals = new Arrivals(new Hands().clock);
		expect(draw(arrivals, [])).toEqual([]);
		expect(draw(arrivals, ["a", "b"])).toEqual([null, null]);
	});

	it("continues an entrance across a redraw, and drops it after its window", () => {
		const hands = new Hands();
		const arrivals = new Arrivals(hands.clock);
		draw(arrivals, ["a"]);
		draw(arrivals, ["a", "b"]);
		hands.now = 5;
		expect(draw(arrivals, ["a", "b"])).toEqual([null, 5]);
		hands.now = ENTRANCE_WINDOW_MS;
		expect(draw(arrivals, ["a", "b"])).toEqual([null, null]);
	});

	it("notes quiet keys without letting them arrive", () => {
		const arrivals = new Arrivals(new Hands().clock);
		draw(arrivals, ["a"]);
		expect(draw(arrivals, ["a", "b"], true)).toEqual([null, null]);
		expect(draw(arrivals, ["a", "b"])).toEqual([null, null]);
	});

	it("lets a key that went away and came back arrive again", () => {
		const hands = new Hands();
		const arrivals = new Arrivals(hands.clock);
		draw(arrivals, ["a", "b"]);
		draw(arrivals, ["a"]);
		hands.now = ENTRANCE_WINDOW_MS * 2;
		expect(draw(arrivals, ["a", "b"])).toEqual([null, 0]);
	});
});

describe("Debut", () => {
	it("plays from the first draw, continues within its window, and starts over after a restart", () => {
		const hands = new Hands();
		const debut = new Debut(hands.clock);
		expect(debut.offset()).toBe(0);
		hands.now = 30;
		expect(debut.offset()).toBe(30);
		hands.now = ENTRANCE_WINDOW_MS;
		expect(debut.offset()).toBeNull();
		debut.restart();
		expect(debut.offset()).toBe(0);
	});
});
