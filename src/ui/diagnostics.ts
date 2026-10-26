import { App } from "obsidian";

/** Temporary, for the phone bug of 2026-10-27: what the screen looks like while the keyboard is up. Removed once found. */
export async function writeLayoutDiagnostics(app: App, from: HTMLElement): Promise<void> {
	const lines: string[] = [`# Friends Tracker diagnostics (${new Date().toISOString()})`, ""];
	const vars = ["--keyboard-height", "--mobile-toolbar-height", "--view-top-spacing", "--view-bottom-spacing", "--safe-area-inset-top", "--safe-area-inset-bottom", "--header-height", "--view-header-height", "--navbar-height"];
	const root = getComputedStyle(document.documentElement);
	const body = getComputedStyle(document.body);
	for (const v of vars) lines.push(`${v}: root=${root.getPropertyValue(v).trim() || "-"} body=${body.getPropertyValue(v).trim() || "-"}`);
	lines.push(`window ${window.innerWidth}x${window.innerHeight}, visualViewport ${window.visualViewport?.width}x${window.visualViewport?.height} offsetTop=${window.visualViewport?.offsetTop}, screen ${screen.width}x${screen.height}, body classes: ${document.body.className}`);
	lines.push("");
	const describe = (label: string, el: Element | null): void => {
		if (!el) {
			lines.push(`- ${label}: none`);
			return;
		}
		const r = el.getBoundingClientRect();
		const s = getComputedStyle(el);
		lines.push(`- ${label} <${el.tagName.toLowerCase()}.${(el as HTMLElement).className.toString().replace(/\s+/g, ".")}> top=${r.top.toFixed(0)} h=${r.height.toFixed(0)} w=${r.width.toFixed(0)} | display=${s.display} position=${s.position} height=${s.height} maxH=${s.maxHeight} minH=${s.minHeight} flex=${s.flex} overflow=${s.overflowY} mt=${s.marginTop} mb=${s.marginBottom} pb=${s.paddingBottom} transform=${s.transform} z=${s.zIndex} bg=${s.backgroundColor}`);
	};
	let el: Element | null = from;
	const chain: Element[] = [];
	while (el && el !== document.body) {
		chain.unshift(el);
		el = el.parentElement;
	}
	describe("body", document.body);
	for (const node of chain) describe("ancestor", node);
	describe("results", from.querySelector(".ft-search-results"));
	describe("first row", from.querySelector(".ft-search-results .ft-row"));
	describe("mobile-toolbar", document.querySelector(".mobile-toolbar"));
	describe("mobile-navbar", document.querySelector(".mobile-navbar"));
	lines.push("");
	const results = from.querySelector(".ft-search-results");
	const x = Math.round(window.innerWidth / 2);
	for (const y of [results ? results.getBoundingClientRect().top + 30 : 300, window.innerHeight * 0.45, window.innerHeight * 0.6]) {
		const hit = document.elementFromPoint(x, y);
		lines.push(`- at (${x}, ${y.toFixed(0)}): ${hit ? `<${hit.tagName.toLowerCase()}.${(hit as HTMLElement).className.toString().replace(/\s+/g, ".")}>` : "nothing"}`);
	}
	const path = "Friends Tracker diagnostics.md";
	const existing = app.vault.getAbstractFileByPath(path);
	const text = lines.join("\n") + "\n";
	if (existing && "extension" in existing) await app.vault.modify(existing as never, text);
	else await app.vault.create(path, text);
}
