import { App, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { PDFExtractor } from './src/services/pdfExtractor';
import { ArxivMetadataService } from './src/services/arxivMetadataService';
import { PDFDownloadService } from './src/services/pdfDownloadService';
import { PluginSettings, DEFAULT_SETTINGS } from './src/types/settings';
import { SummaryService } from './src/services/summaryService';

export default class ArxivAssistantPlugin extends Plugin {
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

		// 리본 아이콘 추가
		const ribbonIconEl = this.addRibbonIcon('book', 'Arxiv Assistant', (evt: MouseEvent) => {
			new Notice('Arxiv Assistant is ready!');
		});
		ribbonIconEl.addClass('arxiv-assistant-ribbon-class');

		// PDF 텍스트 추출 명령어
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

					if (file instanceof TFile) {
						const arrayBuffer = await this.app.vault.readBinary(file);
						const extractedText = await this.pdfExtractor.extractTextFromPDF(arrayBuffer);
						
						const newFileName = '2404.16260v1-extracted.md';
						const existingFile = this.app.vault.getAbstractFileByPath(newFileName);
						
						if (existingFile) {
							await this.app.vault.modify(existingFile as TFile, extractedText);
							new Notice('기존 파일이 업데이트되었습니다.');
						} else {
							await this.app.vault.create(newFileName, extractedText);
							new Notice('새 파일이 생성되었습니다.');
						}
					} else {
						new Notice('유효하지 않은 파일입니다.');
					}
				} catch (error) {
					new Notice('PDF 처리 중 오류가 발생했습니다.');
					console.error('PDF 처리 오류:', error);
				}
			}
		});

		// Arxiv 메타데이터 명령어
		this.addCommand({
			id: 'fetch-arxiv-metadata',
			name: 'Arxiv 메타데이터 가져오기',
			callback: () => {
				this.arxivMetadataService.fetchMetadataFromClipboard();
			}
		});

		// PDF 다운로드 명령어
		this.addCommand({
			id: 'download-arxiv-pdf',
			name: 'Arxiv PDF 다운로드',
			callback: () => {
				this.pdfDownloadService.downloadFromClipboard();
			}
		});

		// 요약 명령어
		this.addCommand({
			id: 'summarize-arxiv-paper',
			name: 'Arxiv 논문 요약하기',
			callback: () => {
				this.summaryService.summarizeFromClipboard();
			}
		});

		// 설정 탭 추가
		this.addSettingTab(new ArxivAssistantSettingTab(this.app, this));
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

class ArxivAssistantSettingTab extends PluginSettingTab {
	plugin: ArxivAssistantPlugin;

	constructor(app: App, plugin: ArxivAssistantPlugin) {
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
