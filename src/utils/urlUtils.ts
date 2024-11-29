export function normalizeArxivUrl(url: string): string {
    url = url.replace(/^http:/, 'https:');
    url = url.replace(/arxiv\.org\/pdf/, 'arxiv.org/abs');
    url = url.replace(/\.pdf$/, '');
    return url;
}

export function isValidArxivUrl(url: string): boolean {
    const urlPattern = /^https:\/\/arxiv\.org\/abs\/.+/i;
    return urlPattern.test(url);
}

export function extractArxivId(url: string): string | null {
    const match = url.match(/arxiv\.org\/abs\/(\d+\.\d+)/);
    return match ? match[1] : null;
} 