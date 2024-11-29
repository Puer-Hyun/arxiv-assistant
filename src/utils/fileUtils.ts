export function sanitizeFileName(fileName: string): string {
    return fileName.replace(/[?:\/\\<>*|"]/g, '_')
                  .replace(/\s+/g, ' ')
                  .trim();
}

export function formatPaperContent(paper: any): string {
    let paperLink = '';
    let semanticScholarLink = paper.url || '#';

    if (paper.arxivId) {
        paperLink = `https://arxiv.org/abs/${paper.arxivId}`;
    }

    return `---
title: "${paper.title}"
authors: "${paper.authors || 'N/A'}"
year: ${paper.year || 'N/A'}
venue: "${paper.venue || 'N/A'}"
paper_link: "${paperLink}"
semanticscholar_link: "${semanticScholarLink}"
arxiv_id: "${paper.arxivId || 'N/A'}"
doi: "${paper.doi || 'N/A'}"
citations: ${paper.citationCount || 'N/A'}
intent: ${JSON.stringify(paper.intent || [])}
---`;
} 