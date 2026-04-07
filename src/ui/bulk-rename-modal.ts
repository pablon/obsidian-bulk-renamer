import { App, Modal } from 'obsidian';
import type BulkRenamePlugin from '../main';
import type { RenameEntry, CollisionGroup, PreviewStats } from '../types';
import { RenameEngine } from '../engine/rename-engine';
import { renderSettings } from '../settings';
import { createTabBar, createTabContent } from './tabs';
import { renderPreviewTab } from './preview-tab';
import { renderExecuteTab } from './execute-tab';
import { renderRegexTab } from './regex-tab';

export class BulkRenameModal extends Modal {
	private plugin: BulkRenamePlugin;
	private tabContents = new Map<string, HTMLDivElement>();
	private activateTab: (tabId: string) => void = () => {};
	
	private entries: RenameEntry[] = [];
	private collisions: CollisionGroup[] = [];
	private stats: PreviewStats = { toRename: 0, alreadyNormalized: 0, skipped: 0, collisions: 0 };

	constructor(app: App, plugin: BulkRenamePlugin) {
		super(app);
		this.plugin = plugin;
	}

	private runPreview() {
		const engine = new RenameEngine();
		const results = engine.preview(this.app, this.plugin.settings);
		this.entries = results.entries;
		this.collisions = results.collisions;
		this.stats = results.stats;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('bulk-rename-modal');

		this.setTitle('Bulk renamer');
		
		this.runPreview();

		const tabs = [
			{ id: 'preview', label: 'Preview' },
			{ id: 'execute', label: 'Execute' },
			{ id: 'regex', label: 'Find and replace' },
			{ id: 'settings', label: 'Settings' },
		];

		this.activateTab = createTabBar(contentEl, tabs, (tabId) => {
			this.showTab(tabId);
		});

		// Create tab content containers
		for (const tab of tabs) {
			const content = createTabContent(contentEl, tab.id, tab.id === 'preview');
			this.tabContents.set(tab.id, content);
		}

		// Render settings tab content immediately (it's static)
		const settingsContent = this.tabContents.get('settings');
		if (settingsContent) {
			settingsContent.addClass('bulk-rename-settings-tab');
			renderSettings(settingsContent, this.plugin);
		}

		// Preview and Execute tabs
		const previewContent = this.tabContents.get('preview');
		if (previewContent) {
			renderPreviewTab(previewContent, this.app, this.plugin, this.entries, this.stats, this.collisions, () => {
				this.runPreview();
				this.onOpen();
			});
		}

		const executeContent = this.tabContents.get('execute');
		if (executeContent) {
			renderExecuteTab(executeContent, this.app, this.plugin, this.entries, this.collisions);
		}

		const regexContent = this.tabContents.get('regex');
		if (regexContent) {
			renderRegexTab(regexContent, this.app, this.plugin);
		}

		this.showTab('preview');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
		this.tabContents.clear();
	}

	private showTab(tabId: string) {
		for (const [id, content] of this.tabContents) {
			content.classList.toggle('is-active', id === tabId);
		}
		this.activateTab(tabId);
	}

	/** Switch to a specific tab programmatically */
	switchToTab(tabId: string) {
		this.showTab(tabId);
	}
}
