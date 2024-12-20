import { App, FuzzySuggestModal } from 'obsidian';

// PDF 파일 선택을 위한 FuzzyModal 클래스 추가
export class PDFSuggestModal extends FuzzySuggestModal<string> {
	constructor(app: App, private pdfFiles: string[]) {
		super(app);
	}

	getItems(): string[] {
		return this.pdfFiles;
	}

	getItemText(item: string): string {
		return item;
	}

	onChooseItem(item: string, evt: MouseEvent | KeyboardEvent): void {
		if (this.onChoose) {
			this.onChoose(item);
		}
	}

	onChoose: ((item: string) => void) | null = null;
}