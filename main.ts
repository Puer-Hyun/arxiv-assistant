import { App, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder, FuzzySuggestModal } from 'obsidian';
import { PDFExtractor } from './src/services/pdfExtractor';
import { ArxivMetadataService } from './src/services/arxivMetadataService';
import { PDFDownloadService } from './src/services/pdfDownloadService';
import { PluginSettings, DEFAULT_SETTINGS } from './src/types/settings';
import { SummaryService } from './src/services/summaryService';
import { PDFSuggestModal } from './src/components/PDFSuggestModal';

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
					const filePath = '2404.16260v1.pdf';  // PDF file in vault root
					const file = this.app.vault.getAbstractFileByPath(filePath);
					
					if (!file) {
						new Notice('PDF file not found');
						return;
					}

					if (file instanceof TFile) {
						const arrayBuffer = await this.app.vault.readBinary(file);
						const extractedText = await this.pdfExtractor.extractTextFromPDF(arrayBuffer);
						
						const newFileName = '2404.16260v1-extracted.md';
						const existingFile = this.app.vault.getAbstractFileByPath(newFileName);
						
						if (existingFile instanceof TFile) {
							await this.app.vault.modify(existingFile, extractedText);
							new Notice('Existing file has been updated');
						} else {
							new Notice('Invalid file type');
						}
					} else {
						new Notice('Invalid file');
					}
				} catch (error) {
					new Notice('Error processing PDF');
					console.error('PDF processing error:', error);
				}
			}
		});

		// Arxiv 메타데이터 명령어
		this.addCommand({
			id: 'fetch-arxiv-metadata',
			name: 'Get Arxiv Metadata',
			callback: () => {
				this.arxivMetadataService.fetchMetadataFromClipboard();
			}
		});

		// PDF 다운로드 명령어
		this.addCommand({
			id: 'download-arxiv-pdf',
			name: 'Download Arxiv PDF',
			callback: () => {
				this.pdfDownloadService.downloadFromClipboard();
			}
		});

		// 요약 명령어
		this.addCommand({
			id: 'summarize-arxiv-paper',
			name: 'Summarize Arxiv Paper',
			callback: () => {
				this.summaryService.summarizeFromClipboard();
			}
		});

		// PDF 처리 명령어 추가
		this.addCommand({
			id: 'process-pdf-to-markdown',
			name: 'PDF를 마크다운으로 변환',
			callback: () => this.processPDF()
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

	async processPDF() {
		if (!this.settings.obsidianImagePath) {
			new Notice('이미지 저장 경로를 먼저 설정해주세요.');
			return;
		}

		// PDF 파일 선택을 위한 FuzzyModal
		const pdfFiles = this.getPDFFiles();
		const modal = new PDFSuggestModal(this.app, pdfFiles);
		
		modal.onChoose = async (pdfPath: string) => {
			try {
				const file = this.app.vault.getAbstractFileByPath(pdfPath);
				if (!(file instanceof TFile)) {
					throw new Error('PDF 파일을 찾을 수 없습니다.');
				}

				// vault 경로 가져오기
				const vaultPath = (this.app.vault.adapter as any).basePath;

				const formData = new FormData();
				const pdfFile = await this.app.vault.readBinary(file);
				const fileName = file.name;
				
				// FormData 설정
				formData.append('pdf_file', new Blob([pdfFile], { type: 'application/pdf' }), fileName);
				formData.append('path_client_image_path', this.settings.obsidianImagePath);
				formData.append('path_client_obsidian_vault_path', vaultPath);

				new Notice('PDF 처리 중...');

				const response = await fetch('http://localhost:9999/process-pdf', {
					method: 'POST',
					body: formData
				});

				if (!response.ok) {
					throw new Error(`서버 오류: ${response.status}`);
				}

				const result = await response.json();

				// 이미지 저장
				for (const [imgName, imgBase64] of Object.entries(result.images)) {
					const imgData = this.base64ToArrayBuffer(imgBase64 as string);
					const imagePath = `${this.settings.obsidianImagePath}/${imgName}`;
					
					// 이미지 디렉토리 생성
					await this.app.vault.createFolder(
						this.settings.obsidianImagePath
					).catch(() => {}); // 이미 존재하는 경우 무시
					
					await this.app.vault.createBinary(imagePath, imgData);
				}

				// 마크다운 내용을 클립보드에 복사
				await navigator.clipboard.writeText(result.markdown_content);
				
				// content_list 저장
				if (result.content_list) {
					const contentListPath = `${this.settings.obsidianImagePath}/${fileName.replace('.pdf', '_content_list.json')}`;
					await this.app.vault.create(
						contentListPath,
						JSON.stringify(result.content_list, null, 2)
					);
				}
				
				new Notice('PDF 처리가 완료되었습니다! 마크다운 내용이 클립보드에 복사되었습니다.');
			} catch (error) {
				console.error('PDF 처리 오류:', error);
				new Notice(`PDF 처리 실패: ${error.message}`);
			}
		};

		modal.open();
	}

	private getPDFFiles(): string[] {
		const files: string[] = [];
		const vault = this.app.vault;
		
		// 재귀적으로 PDF 파일 찾기
		const searchFiles = (folder: TFolder) => {
			folder.children.forEach(child => {
				if (child instanceof TFile && child.extension === 'pdf') {
					files.push(child.path);
				} else if (child instanceof TFolder) {
					searchFiles(child);
				}
			});
		};

		searchFiles(vault.getRoot());
		return files;
	}

	private base64ToArrayBuffer(base64: string): ArrayBuffer {
		const binaryString = window.atob(base64);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}
		return bytes.buffer;
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

		// 이미지 저장 경로 설정 추가
		new Setting(containerEl)
			.setName('이미지 저장 경로')
			.setDesc('PDF에서 추출된 이미지가 저장될 경로를 지정하세요')
			.addText(text => text
				.setPlaceholder('예: PDFImages')
				.setValue(this.plugin.settings.obsidianImagePath)
				.onChange(async (value) => {
					this.plugin.settings.obsidianImagePath = value;
					await this.plugin.saveSettings();
				}));

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
