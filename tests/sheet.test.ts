import { describe, expect, it } from "vitest";
import { PageHolder, PageHost } from "../src/ui/sheet";
import type { FullSheet } from "../src/ui/sheet";

function holder(log: string[]): PageHolder {
	return {
		showPage: () => log.push("show"),
		updatePage: () => log.push("update"),
		hidePage: () => log.push("hide"),
	};
}

const sheet = {} as FullSheet;
const tick = () => new Promise((resolve) => setTimeout(resolve));

describe("PageHost", () => {
	it("opens the Friends tab to show a page", async () => {
		const log: string[] = [];
		const host = new PageHost(
			async () => (log.push("open"), holder(log)),
			() => null,
		);
		host.show(sheet);
		await tick();
		expect(log).toEqual(["open", "show"]);
	});

	it("updates and hides on the tab already showing the page, without opening or revealing anything", async () => {
		const log: string[] = [];
		const host = new PageHost(
			async () => (log.push("open"), holder(log)),
			() => holder(log),
		);
		host.update(sheet);
		host.hide(sheet);
		await tick();
		expect(log).toEqual(["update", "hide"]);
	});

	it("has nothing to update or hide when no Friends tab shows a page", async () => {
		const log: string[] = [];
		const host = new PageHost(
			async () => (log.push("open"), holder(log)),
			() => null,
		);
		host.update(sheet);
		host.hide(sheet);
		await tick();
		expect(log).toEqual([]);
	});
});
