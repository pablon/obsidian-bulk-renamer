import type { App } from 'obsidian';
import type BulkRenamePlugin from '../main';
import type { RenameEntry, PreviewStats, CollisionGroup } from '../types';

const PREVIEW_LIMIT = 200;

/** Status icons for each entry status */
const STATUS_ICONS: Record<string, string> = {
	pending: '✏️',
	skipped: '⚠️',
	collision: '❌',
};

/** CSS row classes for each entry status */
const STATUS_ROW_CLASSES: Record<string, string> = {
	pending: 'bulk-rename-row-rename',
	skipped: 'bulk-rename-row-skip',
	collision: 'bulk-rename-row-collision',
};

/**
 * Render the preview tab content into a container element.
 * Calls RenameEngine.preview() to get the rename map.
 */
export function renderPreviewTab(
	containerEl: HTMLDivElement,
	app: App,
	plugin: BulkRenamePlugin,
	entries: RenameEntry[],
	stats: PreviewStats,
	collisions: CollisionGroup[],
	onRefresh: () => void
): void {
	containerEl.empty();

	const refreshBtn = containerEl.createEl('button', {
		text: 'Refresh',
		cls: 'bulk-rename-refresh-btn',
	});
	refreshBtn.addEventListener('click', onRefresh);

	// ── Collision warning banner ────────────────────────────────────────────
	if (collisions.length > 0) {
		const banner = containerEl.createEl('div', { cls: 'bulk-rename-collision-banner' });
		banner.createEl('span', { text: '❌', cls: 'collision-icon' });
		const bannerText = banner.createEl('div');
		bannerText.createEl('strong', { text: `${collisions.length} collision(s) detected — execution blocked.` });
		bannerText.createEl('p', {
			text: 'Multiple files would normalize to the same name. Resolve manually before executing.',
		});
		for (const collision of collisions) {
			const detail = bannerText.createEl('p', { cls: 'collision-detail' });
			detail.createEl('code', { text: collision.target });
			detail.appendText(` ← ${collision.sources.join(', ')}`);
		}
	}

	// ── Stats bar ───────────────────────────────────────────────────────────
	const statsBar = containerEl.createEl('div', { cls: 'bulk-rename-stats' });

	const addStat = (label: string, value: number, extraCls?: string) => {
		const stat = statsBar.createEl('div', { cls: `bulk-rename-stat${extraCls ? ' ' + extraCls : ''}` });
		stat.createEl('span', { text: String(value), cls: 'bulk-rename-stat-value' });
		stat.createEl('span', { text: ` ${label}` });
	};

	addStat('to rename', stats.toRename, stats.toRename > 0 ? 'has-renames' : '');
	addStat('already normalized', stats.alreadyNormalized);
	addStat('skipped', stats.skipped);
	if (stats.collisions > 0) {
		addStat('collision(s)', stats.collisions, 'has-collisions');
	}

	// ── Empty state ─────────────────────────────────────────────────────────
	const pendingEntries = entries.filter(e => e.status === 'pending' || e.status === 'collision');
	if (pendingEntries.length === 0 && collisions.length === 0) {
		const empty = containerEl.createEl('div', { cls: 'bulk-rename-empty' });
		empty.createEl('div', { text: '✅', cls: 'bulk-rename-empty-icon' });
		empty.createEl('p', { text: 'All files are already normalized. Nothing to rename.' });
		return;
	}

	// ── Preview table ───────────────────────────────────────────────────────
	const tableWrapper = containerEl.createEl('div', { cls: 'bulk-rename-table-wrapper' });
	const table = tableWrapper.createEl('table', { cls: 'bulk-rename-table' });

	// Table header
	const thead = table.createEl('thead');
	const headerRow = thead.createEl('tr');
	headerRow.createEl('th', { text: '', cls: 'col-status' });
	headerRow.createEl('th', { text: 'Current path', cls: 'col-old-path' });
	headerRow.createEl('th', { text: 'New path', cls: 'col-new-path' });
	headerRow.createEl('th', { text: 'Reason', cls: 'col-reason' });

	// Table body — show pending + collision entries
	const tbody = table.createEl('tbody');
	const displayEntries = pendingEntries.slice(0, PREVIEW_LIMIT);

	for (const entry of displayEntries) {
		renderTableRow(tbody, entry);
	}

	// ── Pagination notice ───────────────────────────────────────────────────
	if (pendingEntries.length > PREVIEW_LIMIT) {
		const pagination = tableWrapper.createEl('div', { cls: 'bulk-rename-pagination' });
		pagination.appendText(`Showing ${PREVIEW_LIMIT} of ${pendingEntries.length} files. `);
		const showAllBtn = pagination.createEl('button', {
			text: 'Show all',
			cls: 'bulk-rename-show-all',
		});
		showAllBtn.addEventListener('click', () => {
			// Remove existing rows and re-render all
			tbody.empty();
			for (const entry of pendingEntries) {
				renderTableRow(tbody, entry);
			}
			pagination.remove();
		});
	}
}

/** Render a single table row for a rename entry */
function renderTableRow(tbody: HTMLElement, entry: RenameEntry): void {
	const rowCls = STATUS_ROW_CLASSES[entry.status] ?? 'bulk-rename-row-skip';
	const row = tbody.createEl('tr', { cls: rowCls });

	// Status icon
	const icon = STATUS_ICONS[entry.status] ?? '⚠️';
	row.createEl('td', { text: icon, cls: 'col-status' });

	// Old path
	row.createEl('td', { text: entry.oldPath, cls: 'col-old-path' });

	// New path (only show if different)
	const newPathCell = row.createEl('td', { cls: 'col-new-path' });
	if (entry.status === 'pending' || entry.status === 'collision') {
		newPathCell.setText(entry.newPath);
	} else {
		newPathCell.setText('—');
	}

	// Reason badges
	const reasonCell = row.createEl('td', { cls: 'col-reason' });
	if (entry.reason && entry.reason !== 'already-normalized' && entry.reason !== 'excluded') {
		const badgesEl = reasonCell.createEl('div', { cls: 'bulk-rename-reasons' });
		const reasons = entry.reason.split(', ');
		for (const reason of reasons) {
			const badgeCls = reason.includes('date') ? 'bulk-rename-badge badge-date'
				: reason.includes('lowercase') || reason.includes('case') ? 'bulk-rename-badge badge-case'
				: 'bulk-rename-badge';
			badgesEl.createEl('span', { text: reason, cls: badgeCls });
		}
	}
}
