import { App, Notice, requestUrl } from 'obsidian';
import { normalizeArxivUrl, isValidArxivUrl, extractArxivId } from '../utils/urlUtils';
import { PluginSettings } from '../types/settings';

export class PDFDownloadService {
    private app: App;
    private settings: PluginSettings;

    constructor(app: App, settings: PluginSettings) {
        this.app = app;
        this.settings = settings;
    }

    async downloadFromClipboard() {
        try {
            const clipboardText = await navigator.clipboard.readText();
            const url = normalizeArxivUrl(clipboardText.trim());
            
            if (!isValidArxivUrl(url)) {
                throw new Error('클립보드의 내용이 유효한 Arxiv URL이 아닙니다.');
            }

            await this.downloadPDF(url);
            
        } catch (error) {
            new Notice('PDF 다운로드 중 오류가 발생했습니다: ' + error.message);
            console.error('PDF 다운로드 오류:', error);
        }
    }

    private async downloadPDF(url: string) {
        const arxivId = extractArxivId(url);
        if (!arxivId) {
            throw new Error('유효한 ArXiv ID를 찾을 수 없습니다.');
        }

        const paperPath = this.settings.paperPaths.trim();
        if (!paperPath) {
            throw new Error('Paper download path가 설정되지 않았습니다.');
        }

        // PDF 다운로드
        const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;
        const response = await requestUrl({ 
            url: pdfUrl, 
            method: 'GET' 
        });

        if (response.status !== 200) {
            throw new Error(`PDF 다운로드 실패: ${response.status}`);
        }

        // 디렉토리 생성
        await this.app.vault.adapter.mkdir(paperPath);

        // PDF 파일 저장
        const pdfFileName = `${arxivId}.pdf`;
        const pdfRelativePath = `${paperPath}/${pdfFileName}`;
        await this.app.vault.adapter.writeBinary(pdfRelativePath, response.arrayBuffer);
        
        new Notice(`논문이 다운로드되었습니다: ${pdfRelativePath}`);
        return pdfRelativePath;
    }

    async getPDFContent(url: string): Promise<ArrayBuffer> {
        const arxivId = extractArxivId(url);
        if (!arxivId) {
            throw new Error('유효한 ArXiv ID를 찾을 수 없습니다.');
        }

        const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;
        const response = await requestUrl({ 
            url: pdfUrl, 
            method: 'GET' 
        });

        if (response.status !== 200) {
            throw new Error(`PDF 다운로드 실패: ${response.status}`);
        }

        return response.arrayBuffer;
    }
} 