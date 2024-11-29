import { App, Notice, requestUrl, TFile } from 'obsidian';
import { normalizeArxivUrl, isValidArxivUrl } from '../utils/urlUtils';
import { PluginSettings } from '../types/settings';
import { PDFDownloadService } from './pdfDownloadService';
import { PDFExtractor } from './pdfExtractor';

export class SummaryService {
    private app: App;
    private settings: PluginSettings;
    private pdfDownloadService: PDFDownloadService;

    constructor(app: App, settings: PluginSettings) {
        this.app = app;
        this.settings = settings;
        this.pdfDownloadService = new PDFDownloadService(app, settings);
    }

    async summarizeFromClipboard() {
        try {
            const clipboardText = await navigator.clipboard.readText();
            const url = normalizeArxivUrl(clipboardText.trim());
            
            if (!isValidArxivUrl(url)) {
                throw new Error('클립보드의 내용이 유효한 Arxiv URL이 아닙니다.');
            }

            const activeFile = this.app.workspace.getActiveFile();
            if (!activeFile) {
                throw new Error('활성화된 마크다운 파일이 없습니다.');
            }

            // PDF 다운로드 및 텍스트 추출
            const pdfContent = await this.pdfDownloadService.getPDFContent(url);
            const extractedText = await this.extractTextFromPDF(pdfContent);
            
            // Gemini API를 사용하여 요약
            const summary = await this.summarizeWithGemini(extractedText);
            
            // 요약문 삽입
            await this.insertSummary(summary, activeFile);
            new Notice('요약이 성공적으로 삽입되었습니다.');

        } catch (error) {
            new Notice('오류: ' + error.message);
            console.error('요약 오류:', error);
        }
    }

    private async extractTextFromPDF(pdfContent: ArrayBuffer): Promise<string> {
        try {
            const pdfExtractor = new PDFExtractor();
            return await pdfExtractor.extractTextFromPDF(pdfContent);
        } catch (error) {
            throw new Error('PDF 텍스트 추출 실패: ' + error.message);
        }
    }

    private async summarizeWithGemini(text: string): Promise<string> {
        if (!this.settings.geminiApiKey) {
            throw new Error('Gemini API 키가 설정되지 않았습니다.');
        }

        const prompt = `You are a deep learning expert. You have received summaries of multiple pages from a long document. You need to create a comprehensive final summary based on these summaries. Please follow these steps:

        Step 1: Extract key keywords and technical terms from all summaries. Bold each keyword and add a brief explanation.
        Step 2: List the main points from all summaries. Include relevant keywords for each point.
        Step 3: Elaborate on each point in 5-10 sentences. Use the extracted keywords in your explanations.
        Step 4: Explain the relationships or connections between the points. Use keywords here as well.
        Step 5: Briefly discuss the importance or potential impact of this information. Mention why the key keywords are important.

        The final summary should faithfully reflect the essence of the entire document while being easy to read and informative.
        Avoid vague or general statements and provide specific, substantial information.
        Be sure to include and emphasize specific terms and content cited from other papers!
        Bold these keywords and add a brief explanation if possible.
        At the end of the summary, list all the main keywords once again.

        Text to summarize: ${text}`;

        const response = await requestUrl({
            url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${this.settings.geminiApiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (response.status !== 200) {
            throw new Error('Gemini API 요청 실패: ' + response.status);
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
        return `## Paper Summary\n\n${summary}\n\n---\n이 요약은 AI에 의해 생성되었으며, 부정확할 수 있습니다.`;
    }
} 