import { Notice, Plugin } from 'obsidian';
import { BulkRenameSettings, DEFAULT_SETTINGS, PluginData } from './types';
import { BulkRenameSettingTab } from './settings';
import { loadRollbackMap, clearRollbackMap, executeUndo } from './engine/rollback';
import { BulkRenameModal } from './ui/bulk-rename-modal';
import { ConfirmDialog } from './ui/confirm-dialog';

export default class BulkRenamePlugin extends Plugin {
	settings: BulkRenameSettings;

	async onload() {
		await this.loadSettings();

		// Ensure the vault's config directory is always excluded (it may differ from .obsidian/)
		const configDir = this.app.vault.configDir + '/';
		if (!this.settings.excludedDirs.includes(configDir)) {
			this.settings.excludedDirs = [configDir, ...this.settings.excludedDirs];
		}

		this.addSettingTab(new BulkRenameSettingTab(this.app, this));

		this.addCommand({
			id: 'open-bulk-rename',
			name: 'Open preview',
			callback: () => {
				new BulkRenameModal(this.app, this).open();
			},
		});

		this.addCommand({
			id: 'undo-bulk-rename',
			name: 'Undo last rename',
			callback: async () => {
				await this.undoLastRename();
			},
		});
	}

	onunload() {
		// No cleanup needed — no intervals or DOM events registered
	}

	async loadSettings() {
		const data = await this.loadData() as PluginData | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data?.settings ?? {});
	}

	async saveSettings() {
		const data = await this.loadData() as PluginData | null ?? {} as PluginData;
		await this.saveData({ ...data, settings: this.settings });
	}

	private async undoLastRename() {
		const map = await loadRollbackMap(this);
		if (!map || Object.keys(map).length === 0) {
			new Notice('No rename to undo.');
			return;
		}

		const count = Object.keys(map).length;

		const confirmed = await new ConfirmDialog(
			this.app,
			`This will restore <strong>${count} file(s)</strong> to their previous names. All internal links will be updated.`,
			`Restore ${count} file(s)`,
		).confirm();

		if (!confirmed) return;

		new Notice(`Undoing ${count} rename(s)...`);

		let restored = 0;
		let failed = 0;

		const results = await executeUndo(this.app, map, (_current, _total, _filePath) => {
			// Progress is tracked via results — no modal progress bar here
		});

		for (const result of results) {
			if (result.entry.status === 'renamed') {
				restored++;
			} else {
				failed++;
			}
		}

		if (failed === 0) {
			await clearRollbackMap(this);
			new Notice(`Restored ${restored} file(s) successfully.`);
		} else {
			new Notice(`Restored ${restored}, failed ${failed}. Rollback map preserved for retry.`);
		}
	}
}
