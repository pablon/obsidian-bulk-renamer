import { App, Modal } from 'obsidian';

/**
 * A confirmation dialog that returns a Promise<boolean>.
 * true = user confirmed, false = user cancelled.
 */
export class ConfirmDialog extends Modal {
	private resolve: (value: boolean) => void = () => {};
	private message: string;
	private count?: number;
	private confirmText: string;

	constructor(app: App, message: string, confirmText: string, count?: number) {
		super(app);
		this.message = message;
		this.count = count;
		this.confirmText = confirmText;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('bulk-rename-confirm-modal');

		this.setTitle('Confirm bulk rename');

		const body = contentEl.createEl('div', { cls: 'bulk-rename-confirm-body' });
		const p = body.createEl('p');
		p.appendText('This will rename ');
		if (this.count !== undefined) {
			p.createEl('strong', { text: `${this.count} file(s)`, cls: 'bulk-rename-confirm-count' });
		}
		p.appendText(`. ${this.message}`)

		const actions = contentEl.createEl('div', { cls: 'bulk-rename-confirm-actions' });

		// Cancel button
		const cancelBtn = actions.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => {
			this.resolve(false);
			this.close();
		});

		// Confirm button (CTA)
		const confirmBtn = actions.createEl('button', {
			text: this.confirmText,
			cls: 'mod-cta',
		});
		confirmBtn.addEventListener('click', () => {
			this.resolve(true);
			this.close();
		});
	}

	onClose() {
		this.contentEl.empty();
		// Resolve with false if closed without clicking (e.g. Escape key)
		this.resolve(false);
	}

	/** Open the dialog and return a promise that resolves when user responds */
	confirm(): Promise<boolean> {
		return new Promise((resolve) => {
			this.resolve = resolve;
			this.open();
		});
	}
}
