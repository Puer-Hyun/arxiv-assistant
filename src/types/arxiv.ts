export interface ArxivMetadataType {
    title: string;
    paperLink: string;
    publishDate: string;
    authors: string;
    abstract: string;
    numCitedBy?: number;
    numCiting?: number;
    influentialCitations?: any[];
    influentialReferences?: any[];
}

export interface CitationInfo {
    numCitedBy: number;
    numCiting: number;
    influentialCitations: any[];
    influentialReferences: any[];
} 