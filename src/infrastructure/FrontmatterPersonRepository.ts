import { App, TFile, TFolder, getAllTags, normalizePath } from "obsidian";
import { PeopleScope, PersonEntry, PersonRepository } from "../application/ports";
import { DomainError } from "../domain/DomainError";
import { Person } from "../domain/Person";
import { Frontmatter, PersonDecodeError, PropertyNames, decodePerson, encodePerson } from "./PersonCodec";

export class FrontmatterPersonRepository implements PersonRepository {
	constructor(
		private readonly app: App,
		private readonly scope: () => PeopleScope,
		private readonly keys: () => PropertyNames,
	) {}

	contains(path: string): boolean {
		if (!path.endsWith(".md")) return false;
		if (this.scope().source === "folder") return normalizePath(path.slice(0, Math.max(0, path.lastIndexOf("/")))) === this.folderPath();
		const file = this.app.vault.getAbstractFileByPath(path);
		return file instanceof TFile && this.hasTag(file);
	}

	list(): PersonEntry[] {
		if (this.scope().source === "tag") return this.app.vault.getMarkdownFiles().filter((file) => this.hasTag(file)).map((file) => this.read(file));
		const folder = this.folder();
		if (!folder) return [];
		return folder.children
			.filter((child): child is TFile => child instanceof TFile && child.extension === "md")
			.map((file) => this.read(file));
	}

	get(path: string): PersonEntry | undefined {
		const file = this.app.vault.getAbstractFileByPath(path);
		return file instanceof TFile ? this.read(file) : undefined;
	}

	async update(path: string, change: (person: Person) => Person): Promise<Person> {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) throw new DomainError("Person not found");
		let updated: Person | undefined;
		await this.app.fileManager.processFrontMatter(file, (frontmatter: Frontmatter) => {
			updated = change(this.decodeFresh(file, frontmatter));
			encodePerson(updated, frontmatter, this.keys());
		});
		if (!updated) throw new DomainError("Person not found");
		return updated;
	}

	async create(person: Person): Promise<string> {
		const folder = this.folderPath();
		const path = normalizePath(`${folder}/${person.name}.md`);
		if (this.app.vault.getAbstractFileByPath(path)) throw new DomainError(`Person "${person.name}" already exists`);
		if (!this.folder()) await this.app.vault.createFolder(folder);
		const file = await this.app.vault.create(path, "");
		await this.app.fileManager.processFrontMatter(file, (frontmatter: Frontmatter) => {
			encodePerson(person, frontmatter, this.keys());
			if (this.scope().source === "tag") frontmatter.tags = [this.tagName()];
		});
		return path;
	}

	private folderPath(): string {
		return normalizePath(this.scope().folder);
	}

	private folder(): TFolder | null {
		if (this.folderPath() === "/") return this.app.vault.getRoot();
		const folder = this.app.vault.getAbstractFileByPath(this.folderPath());
		return folder instanceof TFolder ? folder : null;
	}

	private tagName(): string {
		return this.scope().tag.replace(/^#/, "").trim();
	}

	/** The tag itself or any tag nested under it, like #people-tracker/family. */
	private hasTag(file: TFile): boolean {
		const wanted = `#${this.tagName()}`.toLowerCase();
		const cache = this.app.metadataCache.getFileCache(file);
		const tags = (cache && getAllTags(cache)) ?? [];
		return tags.some((tag) => {
			const lower = tag.toLowerCase();
			return lower === wanted || lower.startsWith(`${wanted}/`);
		});
	}

	private decodeFresh(file: TFile, frontmatter: Frontmatter): Person {
		try {
			return decodePerson(file.basename, frontmatter, this.keys());
		} catch (error) {
			if (error instanceof PersonDecodeError) throw new DomainError(`Person can't be read: ${error.message}`);
			throw error;
		}
	}

	private read(file: TFile): PersonEntry {
		try {
			const person = decodePerson(file.basename, this.app.metadataCache.getFileCache(file)?.frontmatter, this.keys());
			return { kind: "ok", path: file.path, person };
		} catch (error) {
			if (error instanceof PersonDecodeError) return { kind: "broken", path: file.path, name: file.basename, problem: error.message };
			throw error;
		}
	}
}
