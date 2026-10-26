import { describe, expect, it } from "vitest";
import { FullSheet, PageDescriptor, PageHolder, PageHost } from "../src/ui/sheet";
import type { App } from "obsidian";

function holder(log: string[]): PageHolder {
	return {
		showPage: () => log.push("show"),
		updatePage: () => log.push("update"),
		hidePage: () => log.push("hide"),
		previousPage: () => undefined,
		goBack: () => log.push("back"),
	};
}

class TestSheet extends FullSheet {
	constructor(host: PageHost) {
		super({} as App, () => host);
	}

	protected fill(): void {}

	descriptor(): PageDescriptor {
		return { kind: "who", query: "" };
	}

	dismiss(): void {
		this.close();
	}

	type(): void {
		this.changed();
	}
}

const content = { empty: () => undefined } as unknown as HTMLElement;
const tick = () => new Promise((resolve) => setTimeout(resolve));

describe("PageHost", () => {
	it("opens the Friends tab to show a page", async () => {
		const log: string[] = [];
		const host = new PageHost(async () => (log.push("open"), holder(log)));
		host.show(new TestSheet(host));
		await tick();
		expect(log).toEqual(["open", "show"]);
	});
});

describe("FullSheet", () => {
	const nowhere = new PageHost(async () => null);

	it("closes and updates through the holder it is mounted in, though it was never opened (rebuilt from the tab's history)", () => {
		const log: string[] = [];
		const sheet = new TestSheet(nowhere);
		sheet.mount(content, holder(log));
		sheet.type();
		sheet.close();
		expect(log).toEqual(["update", "hide"]);
	});

	it("steers nothing once taken down, so a write finishing late can't close the page that replaced it", () => {
		const log: string[] = [];
		const sheet = new TestSheet(nowhere);
		sheet.mount(content, holder(log));
		sheet.unmount();
		sheet.type();
		sheet.close();
		expect(log).toEqual([]);
	});
});
