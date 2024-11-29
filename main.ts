import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { PDFExtractor } from './src/services/pdfExtractor';
import { ArxivMetadataService } from './src/services/arxivMetadataService';
import { PDFDownloadService } from './src/services/pdfDownloadService';
import { PluginSettings, DEFAULT_SETTINGS } from './src/types/settings';
import { SummaryService } from './src/services/summaryService';

// Remember to rename these classes and interfaces!

export default class MyPlugin extends Plugin {
	settings: PluginSettings;
	pdfExtractor: PDFExtractor;
	arxivMetadataService: ArxivMetadataService;
	pdfDownloadService: PDFDownloadService;
	summaryService: SummaryService;

	async onload() {
		await this.loadSettings();
		this.pdfExtractor = new PDFExtractor();
		this.arxivMetadataService = new ArxivMetadataService(this.app);
		this.pdfDownloadService = new PDFDownloadService(this.app, this.settings);
		this.summaryService = new SummaryService(this.app, this.settings);

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

		// PDF 텍스트 추출 명령어 수정
		this.addCommand({
			id: 'get-text-from-pdf',
			name: 'Get Text From PDF',
			callback: async () => {
				try {
					const filePath = '2404.16260v1.pdf';  // vault 루트의 PDF 파일
					const file = this.app.vault.getAbstractFileByPath(filePath);
					
					if (!file) {
						new Notice('PDF 파일을 찾을 수 없습니다.');
						return;
					}

					// TFile 타입 체크
					if (file instanceof TFile) {
						const arrayBuffer = await this.app.vault.readBinary(file);
						const extractedText = await this.pdfExtractor.extractTextFromPDF(arrayBuffer);
						
						// 새로운 마크다운 파일 이름
						const newFileName = '2404.16260v1-extracted.md';
						
						// 기존 파일 존재 여부 확인
						const existingFile = this.app.vault.getAbstractFileByPath(newFileName);
						if (existingFile) {
							// 기존 파일이 있으면 수정
							await this.app.vault.modify(existingFile as TFile, extractedText);
							new Notice('기존 파일이 업데이트되었습니다.');
						} else {
							// 새 파일 생성
							await this.app.vault.create(newFileName, extractedText);
							new Notice('새 파일이 생성되었습니다.');
						}
						
						// 디버깅용 로그
						console.log('추출된 텍스트:', extractedText);
					} else {
						new Notice('유효하지 않은 파일입니다.');
					}
				} catch (error) {
					new Notice('PDF 처리 중 오류가 발생했습니다.');
					console.error('PDF 처리 오류:', error);
				}
			}
		});

		// Arxiv 메타데이터 명령어 추가
		this.addCommand({
			id: 'fetch-arxiv-metadata',
			name: 'Arxiv 메타데이터 가져오기',
			callback: () => {
				this.arxivMetadataService.fetchMetadataFromClipboard();
			}
		});

		// PDF 다운로드 명령어 추가
		this.addCommand({
			id: 'download-arxiv-pdf',
			name: 'Arxiv PDF 다운로드',
			callback: () => {
				this.pdfDownloadService.downloadFromClipboard();
			}
		});

		// 요약 명령어 추가
		this.addCommand({
			id: 'summarize-arxiv-paper',
			name: 'Arxiv 논문 요약하기',
			callback: () => {
				this.summaryService.summarizeFromClipboard();
			}
		});
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Paper Download Paths')
			.setDesc('Specify the paths to download papers')
			.addText(text => text
				.setPlaceholder('path/to/papers')
				.setValue(this.plugin.settings.paperPaths)
				.onChange(async (value) => {
					this.plugin.settings.paperPaths = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Gemini API Key')
			.setDesc('Enter your Gemini API key')
			.addText(text => text
				.setPlaceholder('Enter your API key')
				.setValue(this.plugin.settings.geminiApiKey)
				.onChange(async (value) => {
					this.plugin.settings.geminiApiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Translate')
			.setDesc('Translate the summary')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.translate)
				.onChange(async (value) => {
					this.plugin.settings.translate = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		if (this.plugin.settings.translate) {
			new Setting(containerEl)
				.setName('Target Language')
				.setDesc('Select the language to translate to')
				.addDropdown(dropdown => dropdown
					.addOption('korean', '한국어')
					.addOption('japanese', '日本語')
					.addOption('chinese', '中文')
					.setValue(this.plugin.settings.targetLanguage)
					.onChange(async (value) => {
						this.plugin.settings.targetLanguage = value;
						await this.plugin.saveSettings();
					}));
		}
	}
}
