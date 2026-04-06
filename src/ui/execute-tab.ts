import { Notice } from 'obsidian';
import type { App } from 'obsidian';
import type BulkRenamePlugin from '../main';
import type { RenameEntry, CollisionGroup } from '../types';
import { RenameEngine } from '../engine/rename-engine';
import { buildRollbackMap, saveRollbackMap } from '../engine/rollback';
import { ConfirmDialog } from './confirm-dialog';

/**
 * Render the execute tab content.
 * Shows summary, warnings, execute button, and progress during execution.
 */
export function renderExecuteTab(
	containerEl: HTMLDivElement,
	app: App,
	plugin: BulkRenamePlugin,
	entries: RenameEntry[],
	collisions: CollisionGroup[],
): void {
	containerEl.empty();

	const pendingEntries = entries.filter((e) => e.status === 'pending');
	const hasCollisions = collisions.length > 0;
	const hasFiles = pendingEntries.length > 0;

	const executeSection = containerEl.createEl('div', { cls: 'bulk-rename-execute' });

	// ── Summary ─────────────────────────────────────────────────────────────
	const summary = executeSection.createEl('div', { cls: 'bulk-rename-execute-summary' });
	if (!hasFiles && !hasCollisions) {
		summary.createEl('p', { text: 'All files are already normalized. Nothing to rename.' });
	} else if (hasCollisions) {
		summary.createEl('p', {
			text: `❌ Cannot execute: ${collisions.length} collision(s) detected. Resolve them in the Preview tab first.`,
		});
	} else {
		const p = summary.createEl('p');
		p.appendText('About to rename ');
		p.createEl('strong', { text: `${pendingEntries.length} file(s)` });
		p.appendText('.');
	}

	// ── Warning banners ──────────────────────────────────────────────────────
	if (hasFiles && !hasCollisions) {
		const warn1 = executeSection.createEl('div', { cls: 'bulk-rename-warning-banner' });
		warn1.createEl('span', { text: '⚠️ ' });
		warn1.appendText('Disable sync (Obsidian Sync, iCloud, Dropbox) before proceeding.');

		const warn2 = executeSection.createEl('div', { cls: 'bulk-rename-warning-banner' });
		warn2.createEl('span', { text: '💾 ' });
		warn2.appendText('Backup your vault first: git commit or copy the vault folder.');
	}

	// ── Execute button ───────────────────────────────────────────────────────
	const actionsEl = executeSection.createEl('div', { cls: 'bulk-rename-execute-actions' });
	const executeBtn = actionsEl.createEl('button', {
		text: hasFiles ? `Rename ${pendingEntries.length} file(s)` : 'Nothing to rename',
		cls: 'mod-cta bulk-rename-execute-btn',
	});

	if (!hasFiles || hasCollisions) {
		executeBtn.disabled = true;
	}

	executeBtn.addEventListener('click', () => {
		handleExecute(containerEl, executeSection, app, plugin, pendingEntries).catch(err => {
			new Notice(`Bulk Renamer & Organizer: Error during execution: ${err instanceof Error ? err.message : String(err)}`);
		});
	});
}

/** Handle the execute flow: confirm → save rollback → rename → show results */
async function handleExecute(
	containerEl: HTMLDivElement,
	executeSection: HTMLElement,
	app: App,
	plugin: BulkRenamePlugin,
	pendingEntries: RenameEntry[],
): Promise<void> {
	// Show confirmation dialog
	const confirmed = await new ConfirmDialog(
		app,
		`All internal links will be updated automatically. A rollback map will be saved so you can undo with the "Undo last bulk rename" command.`,
		`Rename ${pendingEntries.length} file(s)`,
		pendingEntries.length,
	).confirm();

	if (!confirmed) return;

	// Save rollback map BEFORE any renames
	const rollbackMap = buildRollbackMap(pendingEntries);
	await saveRollbackMap(plugin, rollbackMap);

	// Replace execute section with progress UI
	executeSection.empty();
	const progressSection = executeSection.createEl('div', { cls: 'bulk-rename-progress' });

	const progressBarWrapper = progressSection.createEl('div', { cls: 'bulk-rename-progress-bar-wrapper' });
	const progressBarFill = progressBarWrapper.createEl('div', { cls: 'bulk-rename-progress-bar-fill' });

	const progressText = progressSection.createEl('div', { cls: 'bulk-rename-progress-text' });
	const progressCount = progressText.createEl('span', { text: '0 / ' + pendingEntries.length });
	const progressPct = progressText.createEl('span', { text: '0%' });

	const progressFile = progressSection.createEl('div', {
		text: 'Starting...',
		cls: 'bulk-rename-progress-file',
	});

	// Execute renames
	const engine = new RenameEngine();
	const results = await engine.executeWithRateLimit(
		app,
		pendingEntries,
		plugin.settings,
		(current, total, filePath) => {
			const pct = Math.round((current / total) * 100);
			progressBarFill.style.width = `${pct}%`;
			progressCount.setText(`${current} / ${total}`);
			progressPct.setText(`${pct}%`);
			progressFile.setText(filePath);
		},
	);

	// Show results
	executeSection.empty();
	const resultsEl = executeSection.createEl('div', { cls: 'bulk-rename-results' });

	const renamed = results.filter((r) => r.entry.status === 'renamed').length;
	const failed = results.filter((r) => r.entry.status === 'failed').length;

	resultsEl.createEl('div', {
		text: failed === 0 ? '✅ Rename complete!' : `⚠️ Rename complete with ${failed} error(s)`,
		cls: 'bulk-rename-results-header',
	});

	const statsEl = resultsEl.createEl('div', { cls: 'bulk-rename-results-stats' });

	const addResultStat = (value: number, label: string, cls: string) => {
		const stat = statsEl.createEl('div', { cls: 'bulk-rename-result-stat' });
		stat.createEl('div', { text: String(value), cls: `bulk-rename-result-stat-value ${cls}` });
		stat.createEl('div', { text: label, cls: 'bulk-rename-result-stat-label' });
	};

	addResultStat(renamed, 'renamed', 'success');
	if (failed > 0) {
		addResultStat(failed, 'failed', 'failure');

		// Show failed files
		const failedList = resultsEl.createEl('div');
		failedList.createEl('p', { text: 'Failed files:' });
		for (const result of results) {
			if (result.entry.status === 'failed') {
				const item = failedList.createEl('p', { cls: 'col-old-path' });
				item.createEl('code', { text: result.entry.oldPath });
				if (result.error) {
					item.appendText(` — ${result.error}`);
				}
			}
		}
	}

	// Rollback map expander
	const expander = resultsEl.createEl('div', { cls: 'bulk-rename-rollback-expander' });
	const toggleBtn = expander.createEl('button', {
		cls: 'bulk-rename-rollback-toggle',
	});
	toggleBtn.createEl('span', { text: 'View rollback map (save this for manual undo)' });
	toggleBtn.createEl('span', { text: '▼' });

	const rollbackContent = expander.createEl('div', { cls: 'bulk-rename-rollback-content' });
	rollbackContent.createEl('pre', {
		text: JSON.stringify(rollbackMap, null, 2),
		cls: 'bulk-rename-rollback-json',
	});

	toggleBtn.addEventListener('click', () => {
		rollbackContent.classList.toggle('is-open');
	});

	if (failed === 0) {
		new Notice(`Bulk Renamer & Organizer: ${renamed} file(s) renamed successfully.`);
	} else {
		new Notice(`Bulk Renamer & Organizer: ${renamed} renamed, ${failed} failed. Check the Execute tab for details.`);
	}
}
