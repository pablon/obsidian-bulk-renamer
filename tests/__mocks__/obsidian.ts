// Mock Obsidian API for testing
// Core modules (src/core/) don't import obsidian, so this is mainly for engine tests

export class TFile {
	path: string;
	basename: string;
	name: string;
	extension: string;
	stat: { ctime: number; mtime: number; size: number };
	parent: { path: string } | null;

	constructor(path: string, ctime = Date.now()) {
		this.path = path;
		const parts = path.split('/');
		this.name = parts[parts.length - 1] ?? '';
		const dotIdx = this.name.lastIndexOf('.');
		this.basename = dotIdx > 0 ? this.name.slice(0, dotIdx) : this.name;
		this.extension = dotIdx > 0 ? this.name.slice(dotIdx + 1) : '';
		this.stat = { ctime, mtime: ctime, size: 0 };
		this.parent = parts.length > 1 ? { path: parts.slice(0, -1).join('/') } : null;
	}
}

export class TAbstractFile {
	path: string;
	name: string;
	constructor(path: string) {
		this.path = path;
		const parts = path.split('/');
		this.name = parts[parts.length - 1] ?? '';
	}
}

export class TFolder extends TAbstractFile {
	children: TAbstractFile[] = [];
	isRoot() { return this.path === '/'; }
}

export class Notice {
	constructor(public message: string, public timeout?: number) {}
	setMessage(msg: string) { this.message = msg; return this; }
	hide() {}
}

export class Plugin {
	app: App;
	manifest: { id: string; name: string; version: string };
	constructor() {
		this.app = new App();
		this.manifest = { id: 'test', name: 'Test', version: '1.0.0' };
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async loadData(): Promise<unknown> { return null; }
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async saveData(_data: unknown): Promise<void> {}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	addCommand(_cmd: unknown) {}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	addSettingTab(_tab: unknown) {}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	registerEvent(_evt: unknown) {}
}

export class App {
	vault: Vault;
	fileManager: FileManager;
	workspace: Workspace;
	constructor() {
		this.vault = new Vault();
		this.fileManager = new FileManager();
		this.workspace = new Workspace();
	}
}

export class Vault {
	private files: TFile[] = [];
	getMarkdownFiles(): TFile[] { return this.files; }
	getAbstractFileByPath(path: string): TFile | null {
		return this.files.find(f => f.path === path) ?? null;
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async rename(_file: TAbstractFile, _newPath: string): Promise<void> {}
	setFiles(files: TFile[]) { this.files = files; }
}

export class FileManager {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async renameFile(_file: TAbstractFile, _newPath: string): Promise<void> {}
}

export class Workspace {
	getActiveFile(): TFile | null { return null; }
}

export class Modal {
	app: App;
	contentEl: HTMLElement;
	constructor(app: App) {
		this.app = app;
		this.contentEl = document.createElement('div');
	}
	open() {}
	close() {}
	onOpen() {}
	onClose() {}
}

export class PluginSettingTab {
	app: App;
	containerEl: HTMLElement;
	constructor(app: App, _plugin: unknown) {
		this.app = app;
		this.containerEl = document.createElement('div');
	}
	display() {}
	hide() {}
}

export class Setting {
	private el: HTMLElement;
	constructor(containerEl: HTMLElement) {
		const createEl = (containerEl as Record<string, unknown>).createEl;
		this.el = typeof createEl === 'function' 
			? (createEl as (tag: string) => HTMLElement)('div')
			: document.createElement('div');
	}
	setName(_name: string) { return this; }
	setDesc(_desc: string) { return this; }
	addText(_cb: (text: { setPlaceholder: (s: string) => Record<string, unknown>; setValue: (s: string) => Record<string, unknown>; onChange: (cb: (v: string) => void) => Record<string, unknown>; inputEl: HTMLInputElement }) => void) { return this; }
	addToggle(_cb: (toggle: { setValue: (v: boolean) => Record<string, unknown>; onChange: (cb: (v: boolean) => void) => Record<string, unknown> }) => void) { return this; }
	addDropdown(_cb: (dd: { addOption: (v: string, l: string) => Record<string, unknown>; setValue: (v: string) => Record<string, unknown>; onChange: (cb: (v: string) => void) => Record<string, unknown> }) => void) { return this; }
	addSlider(_cb: (sl: { setLimits: (min: number, max: number, step: number) => Record<string, unknown>; setValue: (v: number) => Record<string, unknown>; setDynamicTooltip: () => Record<string, unknown>; onChange: (cb: (v: number) => void) => Record<string, unknown> }) => void) { return this; }
	addButton(_cb: (btn: { setButtonText: (t: string) => Record<string, unknown>; setCta: () => Record<string, unknown>; onClick: (cb: () => void) => Record<string, unknown> }) => void) { return this; }
	addTextArea(_cb: (ta: { setPlaceholder: (s: string) => Record<string, unknown>; setValue: (s: string) => Record<string, unknown>; onChange: (cb: (v: string) => void) => Record<string, unknown>; inputEl: HTMLTextAreaElement }) => void) { return this; }
	then(_cb: (setting: this) => void) { return this; }
}
