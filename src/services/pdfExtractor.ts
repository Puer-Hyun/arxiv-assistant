import { Notice } from 'obsidian';
import * as pdfjsLib from 'pdfjs-dist';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

export class PDFExtractor {
    constructor() {
        // PDF.js worker setup
        GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.9.179/pdf.worker.min.js`;
    }

    async extractTextFromPDF(file: ArrayBuffer): Promise<string> {
        try {
            const pdfData = new Uint8Array(file);
            const loadingTask = getDocument({
                data: pdfData,
                useWorkerFetch: false,
                isEvalSupported: false,
                useSystemFonts: true
            });
            
            const pdf = await loadingTask.promise;
            let fullText = '';
            
            // Extract text from all pages
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .filter((item: any) => 'str' in item)
                    .map((item: any) => item.str)
                    .join(' ');
                fullText += `\n--- Page ${i} ---\n${pageText}\n`;
            }

            return fullText;
        } catch (error) {
            new Notice('Error extracting text from PDF');
            console.error('PDF extraction error:', error);
            throw error;
        }
    }
} 