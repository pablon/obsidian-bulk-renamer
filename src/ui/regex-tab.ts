import { Notice } from 'obsidian';
import type { App } from 'obsidian';
import type BulkRenamePlugin from '../main';
import type { RenameEntry } from '../types';
import { buildRegexRenameMap, parseRegexPattern } from '../core/regex-replace';
import { detectCollisions } from '../core/collisions';
import { RenameEngine } from '../engine/rename-engine';
import { buildRollbackMap, saveRollbackMap } from '../engine/rollback';
import { ConfirmDialog } from './confirm-dialog';

export function renderRegexTab(
	containerEl: HTMLDivElement,
	app: App,
	plugin: BulkRenamePlugin,
): void {
	containerEl.empty();

	const formEl = containerEl.createEl('div', { cls: 'bulk-rename-regex-form' });

	const patternSetting = formEl.createEl('div', { cls: 'bulk-rename-regex-field' });
	patternSetting.createEl('label', { text: 'Pattern (regex)', cls: 'bulk-rename-regex-label' });
	const patternInput = patternSetting.createEl('input', {
		type: 'text',
		placeholder: 'e.g. ^(\\d{4})-(\\d{2})-(\\d{2})',
		cls: 'bulk-rename-regex-input',
	});

	const replaceSetting = formEl.createEl('div', { cls: 'bulk-rename-regex-field' });
	replaceSetting.createEl('label', { text: 'Replacement', cls: 'bulk-rename-regex-label' });
	const replaceInput = replaceSetting.createEl('input', {
		type: 'text',
		placeholder: 'e.g. $1$2$3',
		cls: 'bulk-rename-regex-input',
	});

	const flagsEl = formEl.createEl('div', { cls: 'bulk-rename-regex-flags' });
	flagsEl.createEl('span', { text: 'Flags:', cls: 'bulk-rename-regex-label' });

	const globalCheck = flagsEl.createEl('label', { cls: 'bulk-rename-regex-flag-label' });
	const globalInput = globalCheck.createEl('input', { type: 'checkbox' });
	globalInput.checked = true;
	globalCheck.appendText(' Global (g)');

	const caseCheck = flagsEl.createEl('label', { cls: 'bulk-rename-regex-flag-label' });
	const caseInput = caseCheck.createEl('input', { type: 'checkbox' });
	caseCheck.appendText(' Case insensitive (i)');

	const previewBtn = formEl.createEl('button', {
		text: 'Preview changes',
		cls: 'mod-cta bulk-rename-regex-preview-btn',
	});

	const errorEl = containerEl.createEl('div', { cls: 'bulk-rename-regex-error' });

	const resultsContainer = containerEl.createEl('div', { cls: 'bulk-rename-regex-results' });

	previewBtn.addEventListener('click', () => {
		errorEl.classList.remove('is-visible');
		resultsContainer.empty();

		const patternStr = patternInput.value.trim();
		const replacementStr = replaceInput.value;

		if (!patternStr) {
			errorEl.classList.add('is-visible');
			errorEl.setText('Enter a regex pattern.');
			return;
		}

		let flags = '';
		if (globalInput.checked) flags += 'g';
		if (caseInput.checked) flags += 'i';

		const regex = parseRegexPattern(patternStr, flags);
		if (!regex) {
			errorEl.classList.add('is-visible');
			errorEl.setText(`Invalid regex pattern: ${patternStr}`);
			return;
		}

		const files = app.vault.getMarkdownFiles().map(f => ({
			path: f.path,
			basename: f.basename,
		}));

		const { entries, stats } = buildRegexRenameMap(files, regex, replacementStr, plugin.settings);

		const pendingEntries = entries.filter(e => e.status === 'pending');
		const collisions = detectCollisions(pendingEntries);
		stats.collisions = collisions.length;

		if (collisions.length > 0) {
			const collidingPaths = new Set(collisions.flatMap(c => c.sources));
			for (const entry of entries) {
				if (collidingPaths.has(entry.oldPath)) {
					entry.status = 'collision';
				}
			}
		}

		const statsBar = resultsContainer.createEl('div', { cls: 'bulk-rename-stats' });
		const addStat = (label: string, value: number, extraCls?: string) => {
			const stat = statsBar.createEl('div', { cls: `bulk-rename-stat${extraCls ? ' ' + extraCls : ''}` });
			stat.createEl('span', { text: String(value), cls: 'bulk-rename-stat-value' });
			stat.createEl('span', { text: ` ${label}` });
		};
		addStat('matches', stats.toRename, stats.toRename > 0 ? 'has-renames' : '');
		addStat('unchanged', stats.alreadyNormalized);
		addStat('skipped', stats.skipped);
		if (stats.collisions > 0) addStat('collision(s)', stats.collisions, 'has-collisions');

		if (collisions.length > 0) {
			const banner = resultsContainer.createEl('div', { cls: 'bulk-rename-collision-banner' });
			banner.createEl('span', { text: '❌', cls: 'collision-icon' });
			const bannerText = banner.createEl('div');
			bannerText.createEl('strong', { text: `${collisions.length} collision(s) detected.` });
		}

		if (pendingEntries.length === 0 && collisions.length === 0) {
			resultsContainer.createEl('p', { text: 'No files match the pattern.', cls: 'bulk-rename-empty' });
			return;
		}

		const tableWrapper = resultsContainer.createEl('div', { cls: 'bulk-rename-table-wrapper' });
		const table = tableWrapper.createEl('table', { cls: 'bulk-rename-table' });
		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		headerRow.createEl('th', { text: '', cls: 'col-status' });
		headerRow.createEl('th', { text: 'Current path', cls: 'col-old-path' });
		headerRow.createEl('th', { text: 'New path', cls: 'col-new-path' });

		const displayEntries = entries.filter(e => e.status === 'pending' || e.status === 'collision');
		const tbody = table.createEl('tbody');
		const limit = Math.min(displayEntries.length, 200);
		for (let idx = 0; idx < limit; idx++) {
			const entry = displayEntries[idx];
			if (!entry) continue;
			const rowCls = entry.status === 'collision' ? 'bulk-rename-row-collision' : 'bulk-rename-row-rename';
			const row = tbody.createEl('tr', { cls: rowCls });
			row.createEl('td', { text: entry.status === 'collision' ? '❌' : '✏️', cls: 'col-status' });
			row.createEl('td', { text: entry.oldPath, cls: 'col-old-path' });
			row.createEl('td', { text: entry.newPath, cls: 'col-new-path' });
		}

		if (displayEntries.length > 200) {
			tableWrapper.createEl('div', {
				text: `Showing 200 of ${displayEntries.length} files.`,
				cls: 'bulk-rename-pagination',
			});
		}

		const hasCollisions = collisions.length > 0;
		const renamedPending = entries.filter(e => e.status === 'pending');
		const actionsEl = resultsContainer.createEl('div', { cls: 'bulk-rename-execute-actions' });
		const execBtn = actionsEl.createEl('button', {
			text: `Rename ${renamedPending.length} file(s)`,
			cls: 'mod-cta bulk-rename-execute-btn',
		});
		if (hasCollisions || renamedPending.length === 0) execBtn.disabled = true;

		execBtn.addEventListener('click', () => {
			handleRegexExecute(resultsContainer, app, plugin, renamedPending).catch(err => {
				new Notice(`Error: ${err instanceof Error ? err.message : String(err)}`);
			});
		});
	});
}

async function handleRegexExecute(
	containerEl: HTMLElement,
	app: App,
	plugin: BulkRenamePlugin,
	pendingEntries: RenameEntry[],
): Promise<void> {
	const confirmed = await new ConfirmDialog(
		app,
		`All internal links will be updated automatically. A rollback map will be saved for undo.`,
		`Rename ${pendingEntries.length} file(s)`,
		pendingEntries.length,
	).confirm();
	if (!confirmed) return;

	const rollbackMap = buildRollbackMap(pendingEntries);
	await saveRollbackMap(plugin, rollbackMap);

	containerEl.empty();
	const progressSection = containerEl.createEl('div', { cls: 'bulk-rename-progress' });
	const progressBarWrapper = progressSection.createEl('div', { cls: 'bulk-rename-progress-bar-wrapper' });
	const progressBarFill = progressBarWrapper.createEl('div', { cls: 'bulk-rename-progress-bar-fill' });
	const progressText = progressSection.createEl('div', { cls: 'bulk-rename-progress-text' });
	const progressCount = progressText.createEl('span', { text: `0 / ${pendingEntries.length}` });
	const progressPct = progressText.createEl('span', { text: '0%' });
	const progressFile = progressSection.createEl('div', { text: 'Starting...', cls: 'bulk-rename-progress-file' });

	const engine = new RenameEngine();
	const results = await engine.executeWithRateLimit(app, pendingEntries, plugin.settings, (current, total, filePath) => {
		const pct = Math.round((current / total) * 100);
		progressBarFill.style.width = `${pct}%`;
		progressCount.setText(`${current} / ${total}`);
		progressPct.setText(`${pct}%`);
		progressFile.setText(filePath);
	});

	containerEl.empty();
	const renamed = results.filter(r => r.entry.status === 'renamed').length;
	const failed = results.filter(r => r.entry.status === 'failed').length;

	const resultsEl = containerEl.createEl('div', { cls: 'bulk-rename-results' });
	resultsEl.createEl('div', {
		text: failed === 0 ? '✅ Rename complete!' : `⚠️ ${renamed} renamed, ${failed} failed.`,
		cls: 'bulk-rename-results-header',
	});

	if (failed === 0) {
		new Notice(`${renamed} file(s) renamed successfully.`);
	} else {
		new Notice(`${renamed} renamed, ${failed} failed.`);
	}
}
