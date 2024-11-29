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
                throw new Error('Invalid Arxiv URL in clipboard');
            }

            await this.downloadPDF(url);
            
        } catch (error) {
            new Notice('PDF download failed: ' + error.message);
            console.error('PDF download error:', error);
        }
    }

    private async downloadPDF(url: string) {
        const arxivId = extractArxivId(url);
        if (!arxivId) {
            throw new Error('Could not find valid ArXiv ID');
        }

        const paperPath = this.settings.paperPaths.trim();
        if (!paperPath) {
            throw new Error('Paper download path is not configured');
        }

        // PDF download
        const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;
        const response = await requestUrl({ 
            url: pdfUrl, 
            method: 'GET' 
        });

        if (response.status !== 200) {
            throw new Error(`PDF download failed: ${response.status}`);
        }

        // Create directory
        await this.app.vault.adapter.mkdir(paperPath);

        // Save PDF file
        const pdfFileName = `${arxivId}.pdf`;
        const pdfRelativePath = `${paperPath}/${pdfFileName}`;
        await this.app.vault.adapter.writeBinary(pdfRelativePath, response.arrayBuffer);
        
        new Notice(`Paper downloaded: ${pdfRelativePath}`);
        return pdfRelativePath;
    }

    async getPDFContent(url: string): Promise<ArrayBuffer> {
        const arxivId = extractArxivId(url);
        if (!arxivId) {
            throw new Error('Could not find valid ArXiv ID');
        }

        const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;
        const response = await requestUrl({ 
            url: pdfUrl, 
            method: 'GET' 
        });

        if (response.status !== 200) {
            throw new Error(`PDF download failed: ${response.status}`);
        }

        return response.arrayBuffer;
    }
} 