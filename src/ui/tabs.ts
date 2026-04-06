/** Tab configuration */
export interface TabConfig {
	id: string;
	label: string;
}

/**
 * Create a tab bar with clickable tabs.
 * Returns a function to programmatically switch tabs.
 */
export function createTabBar(
	containerEl: HTMLElement,
	tabs: TabConfig[],
	onTabChange: (tabId: string) => void,
): (tabId: string) => void {
	const tabBar = containerEl.createEl('div', { cls: 'bulk-rename-tabs' });
	const tabButtons = new Map<string, HTMLButtonElement>();

	for (const tab of tabs) {
		const btn = tabBar.createEl('button', {
			text: tab.label,
			cls: 'bulk-rename-tab',
		});
		btn.addEventListener('click', () => {
			activateTab(tab.id);
			onTabChange(tab.id);
		});
		tabButtons.set(tab.id, btn);
	}

	function activateTab(tabId: string) {
		for (const [id, btn] of tabButtons) {
			btn.classList.toggle('is-active', id === tabId);
		}
	}

	// Activate first tab by default
	const firstTab = tabs[0];
	if (firstTab) {
		activateTab(firstTab.id);
	}

	return activateTab;
}

/**
 * Create a tab content container.
 * Returns the div element for the tab's content.
 */
export function createTabContent(
	containerEl: HTMLElement,
	tabId: string,
	isActive = false,
): HTMLDivElement {
	const div = containerEl.createEl('div', {
		cls: `bulk-rename-tab-content${isActive ? ' is-active' : ''}`,
	});
	div.dataset['tabId'] = tabId;
	return div;
}
