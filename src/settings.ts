import { App, PluginSettingTab, Setting } from 'obsidian';
import type BulkRenamePlugin from './main';
import type { TimestampFormat } from './types';

/**
 * Render the settings UI into any container element.
 * Used by both the PluginSettingTab and the modal's Settings tab.
 */
export function renderSettings(containerEl: HTMLElement, plugin: BulkRenamePlugin): void {
	containerEl.empty();

	// ── Normalization Pipeline ──────────────────────────────────────────────
	containerEl.createEl('h3', { text: 'Normalization pipeline' });
	containerEl.createEl('p', {
		text: 'Control which transformations are applied to filenames. Steps always run in this fixed order.',
		cls: 'setting-item-description',
	});

	new Setting(containerEl)
		.setName('Lowercase filenames')
		.setDesc('Convert all characters to lowercase.')
		.addToggle(toggle =>
			toggle
				.setValue(plugin.settings.lowercase)
				.onChange(async value => {
					plugin.settings.lowercase = value;
					await plugin.saveSettings();
				})
		);

	new Setting(containerEl)
		.setName('Strip accent marks')
		.setDesc('Remove diacritical marks from characters.')
		.addToggle(toggle =>
			toggle
				.setValue(plugin.settings.stripAccents)
				.onChange(async value => {
					plugin.settings.stripAccents = value;
					await plugin.saveSettings();
				})
		);

	new Setting(containerEl)
		.setName('Spaces and underscores to dashes')
		.setDesc('Replace spaces and underscores with dashes (e.g. "my note" → "my-note")')
		.addToggle(toggle =>
			toggle
				.setValue(plugin.settings.spacesToDashes)
				.onChange(async value => {
					plugin.settings.spacesToDashes = value;
					await plugin.saveSettings();
				})
		);

	new Setting(containerEl)
		.setName('Dots to dashes')
		.setDesc('Replace dots with dashes (e.g. "red.es" → "red-es")')
		.addToggle(toggle =>
			toggle
				.setValue(plugin.settings.dotsToHyphens)
				.onChange(async value => {
					plugin.settings.dotsToHyphens = value;
					await plugin.saveSettings();
				})
		);

	new Setting(containerEl)
		.setName('Strip special characters')
		.setDesc('Remove all characters not in [a-z0-9-] (e.g. "@", "&", "!")')
		.addToggle(toggle =>
			toggle
				.setValue(plugin.settings.stripSpecialChars)
				.onChange(async value => {
					plugin.settings.stripSpecialChars = value;
					await plugin.saveSettings();
				})
		);

	new Setting(containerEl)
		.setName('Collapse consecutive dashes')
		.setDesc('Replace multiple consecutive dashes with a single dash (e.g. "a---b" → "a-b")')
		.addToggle(toggle =>
			toggle
				.setValue(plugin.settings.collapseDashes)
				.onChange(async value => {
					plugin.settings.collapseDashes = value;
					await plugin.saveSettings();
				})
		);

	// ── Date Prefix ─────────────────────────────────────────────────────────
	containerEl.createEl('h3', { text: 'Date prefix' });
	containerEl.createEl('p', {
		text: 'Determine how date prefixes are added to filenames.',
		cls: 'setting-item-description',
	});

	new Setting(containerEl)
		.setName('Date prefix')
		.setDesc('How to determine the date prefix for renamed files')
		.addDropdown(dropdown =>
			dropdown
				.addOption('trailing-or-ctime', 'Use trailing date, or file creation time')
				.addOption('trailing-only', 'Use trailing date only (skip if none found)')
				.addOption('none', 'Never add date prefix')
				.setValue(plugin.settings.datePrefix)
				.onChange(async value => {
					plugin.settings.datePrefix = value as 'trailing-or-ctime' | 'trailing-only' | 'none';
					await plugin.saveSettings();
				})
		);

	new Setting(containerEl)
		.setName('Timestamp format')
		.setDesc('Format for date prefixes added to filenames.')
		.addDropdown(dropdown =>
			dropdown
				.addOption('YYYY-MM-DD', 'Date only (e.g. 2025-01-15)')
				.addOption('YYYYMMDD', 'Compact date (e.g. 20250115)')
				.addOption('YYMMDD', 'Short date (e.g. 250115)')
				.addOption('YYYYMMDD-HHMM', 'Date with time (e.g. 20250115-1430)')
				.addOption('YYMMDD-HHMMSS', 'Short date with seconds (e.g. 250115-143022)')
				.setValue(plugin.settings.timestampFormat)
				.onChange(async value => {
					plugin.settings.timestampFormat = value as TimestampFormat;
					await plugin.saveSettings();
				})
		);

	// ── Exclusions ───────────────────────────────────────────────────────────
	containerEl.createEl('h3', { text: 'Exclusions' });
	containerEl.createEl('p', {
		text: 'Files and directories to skip during bulk rename. Root-level files are always excluded.',
		cls: 'setting-item-description',
	});

	new Setting(containerEl)
		.setName('Excluded directories')
		.setDesc('Comma-separated list of directories to skip (include trailing slash, e.g. "attachments/").')
		.addText(text =>
			text
				.setPlaceholder('E.g. attachments/')
				.setValue(plugin.settings.excludedDirs.join(', '))
				.onChange(async value => {
					plugin.settings.excludedDirs = value
						.split(',')
						.map(s => s.trim())
						.filter(s => s.length > 0);
					await plugin.saveSettings();
				})
		);

	new Setting(containerEl)
		.setName('Excluded files')
		.setDesc('Comma-separated list of files to skip (e.g. "agents.md").')
		.addText(text =>
			text
				.setPlaceholder('E.g. Agents.md')
				.setValue(plugin.settings.excludedFilePatterns.join(', '))
				.onChange(async value => {
					plugin.settings.excludedFilePatterns = value
						.split(',')
						.map(s => s.trim())
						.filter(s => s.length > 0);
					await plugin.saveSettings();
				})
		);

	new Setting(containerEl)
		.setName('Templates directory')
		.setDesc('Files in this directory get normalization but no date prefix (e.g. "templates/").')
		.addText(text =>
			text
				.setPlaceholder('E.g. templates/')
				.setValue(plugin.settings.templatesDir)
				.onChange(async value => {
					plugin.settings.templatesDir = value.trim();
					await plugin.saveSettings();
				})
		);

	// ── Advanced ─────────────────────────────────────────────────────────────
	containerEl.createEl('h3', { text: 'Advanced' });

	new Setting(containerEl)
		.setName('Rate limit delay (ms)')
		.setDesc('Milliseconds to pause between rename batches. Increase if you experience issues.')
		.addSlider(slider =>
			slider
				.setLimits(50, 500, 50)
				.setValue(plugin.settings.rateLimitMs)
				.setDynamicTooltip()
				.onChange(async value => {
					plugin.settings.rateLimitMs = value;
					await plugin.saveSettings();
				})
		);

	new Setting(containerEl)
		.setName('Rate limit batch size')
		.setDesc('Number of files to rename before pausing.')
		.addSlider(slider =>
			slider
				.setLimits(5, 50, 5)
				.setValue(plugin.settings.rateLimitBatch)
				.setDynamicTooltip()
				.onChange(async value => {
					plugin.settings.rateLimitBatch = value;
					await plugin.saveSettings();
				})
		);
}

/**
 * Plugin settings tab shown in Obsidian Settings → Community Plugins → Bulk Renamer & Organizer.
 */
export class BulkRenameSettingTab extends PluginSettingTab {
	plugin: BulkRenamePlugin;

	constructor(app: App, plugin: BulkRenamePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		renderSettings(this.containerEl, this.plugin);
	}
}
