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

        const promptContainer = contentEl.createDiv('modal-content');
        promptContainer.style.padding = '0 25px';

        const descEl = promptContainer.createEl('p', {
            text: 'Enter your instructions for the AI summarizer',
            cls: 'setting-item-description'
        });
        descEl.style.marginBottom = '12px';

        const textAreaContainer = promptContainer.createDiv('textarea-container');
        textAreaContainer.style.marginBottom = '20px';

        const textArea = textAreaContainer.createEl('textarea', {
            cls: 'prompt-textarea'
        });
        textArea.value = this.prompt;
        textArea.style.width = '100%';
        textArea.style.height = '400px';
        textArea.style.fontSize = '14px';
        textArea.style.lineHeight = '1.5';
        textArea.style.padding = '10px';
        textArea.style.border = 'var(--background-modifier-border) 1px solid';
        textArea.style.borderRadius = '4px';
        textArea.style.backgroundColor = 'var(--background-primary)';
        textArea.style.color = 'var(--text-normal)';
        textArea.addEventListener('input', (e) => {
            this.prompt = (e.target as HTMLTextAreaElement).value;
        });

        const buttonContainer = contentEl.createDiv('modal-button-container');
        buttonContainer.style.padding = '15px 25px';
        buttonContainer.style.borderTop = '1px solid var(--background-modifier-border)';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.gap = '10px';

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