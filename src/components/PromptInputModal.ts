import { App, Modal, Setting } from 'obsidian';

export class PromptInputModal extends Modal {
    private prompt: string;
    private onSubmit: (prompt: string | null) => void;

    constructor(app: App, defaultPrompt: string, onSubmit: (prompt: string | null) => void) {
        super(app);
        this.prompt = defaultPrompt;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.addClass('prompt-input-modal');
        
        const headerEl = contentEl.createDiv('modal-header');
        headerEl.createEl('h2', { text: 'Customize Summary Prompt' });

        const promptContainer = contentEl.createDiv('modal-content prompt-container');

        const descEl = promptContainer.createEl('p', {
            text: 'Enter your instructions for the AI summarizer',
            cls: 'setting-item-description prompt-description'
        });

        const textAreaContainer = promptContainer.createDiv('textarea-container');

        const textArea = textAreaContainer.createEl('textarea', {
            cls: 'prompt-textarea'
        });
        textArea.value = this.prompt;
        textArea.addEventListener('input', (e) => {
            const target = e.target;
            if (target instanceof HTMLTextAreaElement) {
                this.prompt = target.value;
            }
        });

        const buttonContainer = contentEl.createDiv('modal-button-container');

        const defaultButton = buttonContainer.createEl('button', {
            text: 'Use Default',
            cls: 'mod-muted'
        });
        defaultButton.addEventListener('click', () => {
            this.onSubmit(null);
            this.close();
        });

        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel',
            cls: 'mod-muted'
        });
        cancelButton.addEventListener('click', () => {
            this.close();
        });

        const confirmButton = buttonContainer.createEl('button', {
            text: 'Confirm',
            cls: 'mod-cta'
        });
        confirmButton.addEventListener('click', () => {
            this.onSubmit(this.prompt);
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 