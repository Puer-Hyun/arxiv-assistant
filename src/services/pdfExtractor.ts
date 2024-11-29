import { Notice } from 'obsidian';
import * as pdfjsLib from 'pdfjs-dist';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

export class PDFExtractor {
    constructor() {
        // PDF.js 워커 설정
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
            
            // 모든 페이지의 텍스트 추출
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
            new Notice('PDF 텍스트 추출 중 오류가 발생했습니다.');
            console.error('PDF 추출 오류:', error);
            throw error;
        }
    }
} 