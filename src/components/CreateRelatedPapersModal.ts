import { App, Modal, Setting } from 'obsidian';

export class CreateRelatedPapersModal extends Modal {
    private onSubmit: (result: boolean) => void;

    constructor(app: App, onSubmit: (result: boolean) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const {contentEl} = this;

        contentEl.createEl("h1", {text: "Create Related Paper Files"});

        new Setting(contentEl)
            .setName("Would you like to create new files for related papers?")
            .addButton((btn) =>
                btn
                    .setButtonText("Yes")
                    .setCta()
                    .onClick(() => {
                        this.close();
                        this.onSubmit(true);
                    }))
            .addButton((btn) =>
                btn
                    .setButtonText("No")
                    .onClick(() => {
                        this.close();
                        this.onSubmit(false);
                    }));
    }

    onClose() {
        let {contentEl} = this;
        contentEl.empty();
    }
} 