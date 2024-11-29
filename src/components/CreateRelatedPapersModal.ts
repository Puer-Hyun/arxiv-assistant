import { App, Modal, Setting } from 'obsidian';

export class CreateRelatedPapersModal extends Modal {
    private onSubmit: (result: boolean) => void;

    constructor(app: App, onSubmit: (result: boolean) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const {contentEl} = this;

        contentEl.createEl("h1", {text: "관련 논문 파일 생성"});

        new Setting(contentEl)
            .setName("연관된 인용 논문들을 새로운 파일로 작성하시겠습니까?")
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