import { App, Notice, requestUrl, TFile } from 'obsidian';
import { normalizeArxivUrl, isValidArxivUrl } from '../utils/urlUtils';
import { PluginSettings } from '../types/settings';
import { PDFDownloadService } from './pdfDownloadService';
import { PDFExtractor } from './pdfExtractor';
import { PromptInputModal } from '../components/PromptInputModal';

export class SummaryService {
    private app: App;
    private settings: PluginSettings;
    private pdfDownloadService: PDFDownloadService;
    private loadingIndicator: HTMLElement | null = null;

    private readonly DEFAULT_PROMPT = `You are a deep learning expert. You have received summaries of multiple pages from a long document. You need to create a comprehensive final summary based on these summaries. Please follow these steps:

        Step 1: Extract key keywords and technical terms from all summaries. Bold each keyword and add a brief explanation.
        Step 2: List the main points from all summaries. Include relevant keywords for each point.
        Step 3: Elaborate on each point in 5-10 sentences. Use the extracted keywords in your explanations.
        Step 4: Explain the relationships or connections between the points. Use keywords here as well.
        Step 5: Briefly discuss the importance or potential impact of this information. Mention why the key keywords are important.

        The final summary should faithfully reflect the essence of the entire document while being easy to read and informative.
        Avoid vague or general statements and provide specific, substantial information.
        Be sure to include and emphasize specific terms and content cited from other papers!
        Bold these keywords and add a brief explanation if possible.
        At the end of the summary, list all the main keywords once again.`;

    constructor(app: App, settings: PluginSettings) {
        this.app = app;
        this.settings = settings;
        this.pdfDownloadService = new PDFDownloadService(app, settings);
    }

    private showLoadingIndicator() {
        if (this.loadingIndicator) return;
        
        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.addClass('arxiv-summarization-loading');
        
        const spinner = this.loadingIndicator.createDiv('spinner');
        const message = this.loadingIndicator.createDiv('message');
        message.setText('Summarizing paper...');
        
        document.body.appendChild(this.loadingIndicator);
    }

    private hideLoadingIndicator() {
        if (this.loadingIndicator) {
            this.loadingIndicator.remove();
            this.loadingIndicator = null;
        }
    }

    async summarizeFromClipboard() {
        try {
            const clipboardText = await navigator.clipboard.readText();
            const url = normalizeArxivUrl(clipboardText.trim());
            
            if (!isValidArxivUrl(url)) {
                throw new Error('Invalid Arxiv URL in clipboard');
            }

            const activeFile = this.app.workspace.getActiveFile();
            if (!activeFile) {
                throw new Error('No active markdown file');
            }

            // 프롬프트 입력 모달 표시
            await new Promise<void>((resolve) => {
                new PromptInputModal(this.app, this.DEFAULT_PROMPT, async (customPrompt) => {
                    try {
                        this.showLoadingIndicator();  // 로딩 인디케이터 표시

                        // PDF 다운로드 및 텍스트 추출
                        const pdfContent = await this.pdfDownloadService.getPDFContent(url);
                        const extractedText = await this.extractTextFromPDF(pdfContent);
                        
                        // Gemini API를 사용하여 요약
                        const summary = await this.summarizeWithGemini(extractedText, customPrompt);
                        
                        // 요약문 삽입
                        await this.insertSummary(summary, activeFile);
                        new Notice('Summary successfully inserted');
                        resolve();
                    } catch (error) {
                        new Notice('Error: ' + error.message);
                        console.error('요약 오류:', error);
                        resolve();
                    } finally {
                        this.hideLoadingIndicator();  // 로딩 인디케이터 제거
                    }
                }).open();
            });

        } catch (error) {
            new Notice('Error: ' + error.message);
            console.error('요약 오류:', error);
            this.hideLoadingIndicator();  // 에러 발생 시에도 로딩 인디케이터 제거
        }
    }

    private async extractTextFromPDF(pdfContent: ArrayBuffer): Promise<string> {
        try {
            const pdfExtractor = new PDFExtractor();
            return await pdfExtractor.extractTextFromPDF(pdfContent);
        } catch (error) {
            throw new Error('PDF text extraction failed: ' + error.message);
        }
    }

    private async summarizeWithGemini(text: string, customPrompt: string | null): Promise<string> {
        if (!this.settings.geminiApiKey) {
            throw new Error('Gemini API key is not configured');
        }

        const prompt = customPrompt || this.DEFAULT_PROMPT;
        const finalPrompt = `${prompt}\n\nText to summarize: ${text}`;

        const response = await requestUrl({
            url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${this.settings.geminiApiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: finalPrompt
                    }]
                }]
            })
        });

        if (response.status !== 200) {
            throw new Error('Gemini API request failed: ' + response.status);
        }

        const result = JSON.parse(response.text);
        return result.candidates[0].content.parts[0].text;
    }

    private async insertSummary(summary: string, file: TFile) {
        const content = await this.app.vault.read(file);
        const formattedSummary = this.formatSummary(summary);
        await this.app.vault.modify(file, content + '\n\n' + formattedSummary);
    }

    private formatSummary(summary: string): string {
        return `## Paper Summary\n\n${summary}\n\n---\nThis summary was generated by AI and may contain inaccuracies.`;
    }
} 