import { App, Notice, TFile, requestUrl } from 'obsidian';
import { ArxivMetadataType, CitationInfo } from '../types/arxiv';
import { normalizeArxivUrl, isValidArxivUrl } from '../utils/urlUtils';
import { sanitizeFileName, formatPaperContent } from '../utils/fileUtils';
import { CreateRelatedPapersModal } from '../components/CreateRelatedPapersModal';

export class ArxivMetadataService {
    private app: App;
    private metadataCache: Map<string, string> = new Map();

    constructor(app: App) {
        this.app = app;
    }

    async fetchMetadataFromClipboard() {
        try {
            const clipboardText = await navigator.clipboard.readText();
            console.log('클립보드 내용:', clipboardText);
            
            const url = normalizeArxivUrl(clipboardText.trim());
            console.log('정규화된 URL:', url);
            
            if (!isValidArxivUrl(url)) {
                throw new Error('The content in the clipboard is not a valid Arxiv URL.');
            }

            let activeFile = this.app.workspace.getActiveFile();
            if (!activeFile) {
                const fileName = `Arxiv Paper - ${new Date().toISOString().split('T')[0]}.md`;
                activeFile = await this.app.vault.create(fileName, "");
                new Notice(`A new file has been created: ${fileName}`);
            }

            console.log('메타데이터 가져오기 시작...');
            const metadata = await this.fetchArxivMetadata(url);
            console.log('가져온 메타데이터:', metadata);
            
            await this.insertMetadata(metadata, activeFile);
            new Notice('Metadata has been successfully inserted.');
        } catch (error) {
            console.error('메타데이터 가져오기 실패:', error);
            new Notice('Error: ' + error.message);
        }
    }

    private async insertMetadata(metadata: ArxivMetadataType, file: TFile) {
        try {
            // @ts-ignore
            const metaedit = this.app.plugins.plugins['metaedit'];
            if (!metaedit) {
                new Notice('metaedit plugin is not installed');
                return;
            }

            await this.updateFrontmatter(file, metadata);
            await this.updateContent(file, metadata);
            await this.renameFile(file, metadata.title);

            new CreateRelatedPapersModal(this.app, async (result) => {
                await this.handleRelatedPapers(file, metadata, result);
            }).open();

        } catch (error) {
            console.error('Error inserting metadata:', error);
            new Notice('An error occurred during metadata insertion.');
        }
    }

    private async updateFrontmatter(file: TFile, metadata: ArxivMetadataType) {
        const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
        
        const updatedFrontmatter = {
            ...frontmatter,
            title: metadata.title || frontmatter.title,
            paper_link: metadata.paperLink || frontmatter.paper_link,
            publish_date: metadata.publishDate || frontmatter.publish_date,
            authors: metadata.authors || frontmatter.authors,
            num_cited_by: metadata.numCitedBy || 0,
            num_citing: metadata.numCiting || 0,
            checked: frontmatter.hasOwnProperty('checked') ? frontmatter.checked : false,
            interest: frontmatter.hasOwnProperty('interest') ? frontmatter.interest : null,
            rating: frontmatter.hasOwnProperty('rating') ? frontmatter.rating : null,
            tags: frontmatter.hasOwnProperty('tags') ? frontmatter.tags : null
        };

        await this.app.fileManager.processFrontMatter(file, fm => {
            Object.assign(fm, updatedFrontmatter);
        });
    }

    private async updateContent(file: TFile, metadata: ArxivMetadataType) {
        let content = await this.app.vault.read(file);

        if (!content.includes("## Abstract")) {
            const abstractContent = `## Abstract\n${metadata.abstract}\n`;
            content = content.trim() === "" 
                ? abstractContent.trim() 
                : content.trim() + "\n\n" + abstractContent;
        }

        content = content.replace(/^\n+/, '').replace(/\n+$/, '');
        await this.app.vault.modify(file, content);

        const finalContent = await this.app.vault.read(file);
        const cleanedContent = finalContent.replace(/^---\n([\s\S]*?)\n---\n\n+/, '---\n$1\n---\n');
        await this.app.vault.modify(file, cleanedContent);
    }

    private async handleRelatedPapers(file: TFile, metadata: ArxivMetadataType, createNewFiles: boolean) {
        let content = await this.app.vault.read(file);

        content = await this.addRelatedPapersSection(content, "## Influential Papers Cited By", 
            metadata.influentialCitations || [], createNewFiles, file);
        content = await this.addRelatedPapersSection(content, "## Influential Papers Citing", 
            metadata.influentialReferences || [], createNewFiles, file);

        await this.app.vault.modify(file, content);
    }

    private async addRelatedPapersSection(content: string, sectionTitle: string, papers: any[], createNewFiles: boolean, currentFile: TFile): Promise<string> {
        if (!content.includes(sectionTitle)) {
            content += `\n\n${sectionTitle}\n\n`;
            if (papers && papers.length > 0) {
                if (createNewFiles) {
                    content += await this.createLinksToInfluentialPapers(papers, currentFile);
                } else {
                    content += papers.map(paper => `- ${paper.title}\n`).join('');
                }
            } else {
                content += 'No information available.\n';
            }
        }
        return content;
    }

    private async createLinksToInfluentialPapers(papers: any[], currentFile: TFile): Promise<string> {
        if (!papers || papers.length === 0) {
            return 'No information available.\n';
        }

        let links = '';
        for (const paper of papers) {
            const sanitizedTitle = sanitizeFileName(paper.title);
            const newFileName = `${sanitizedTitle}.md`;
            const newFilePath = currentFile.parent 
                ? `${currentFile.parent.path}/${newFileName}`
                : newFileName;
            
            await this.createPaperFile(newFilePath, paper);
            links += `- [[${sanitizedTitle}]]\n`;
        }
        return links;
    }

    private async createPaperFile(filePath: string, paper: any) {
        const content = formatPaperContent(paper);
        await this.app.vault.create(filePath, content);
    }

    private async renameFile(file: TFile, newTitle: string) {
        if (!newTitle) return;

        const sanitizedTitle = sanitizeFileName(newTitle);
        const newPath = file.parent 
            ? `${file.parent.path}/${sanitizedTitle}.md`
            : `${sanitizedTitle}.md`;

        try {
            await this.app.fileManager.renameFile(file, newPath);
            new Notice('File name has been updated');
        } catch (error) {
            console.error('Error updating file name:', error);
            new Notice('An error occurred during file name update.');
        }
    }

    async fetchArxivMetadata(url: string): Promise<ArxivMetadataType> {
        url = normalizeArxivUrl(url);
        const arxivId = this.extractArxivId(url);
        if (!arxivId) {
            throw new Error('유효한 Arxiv URL이 아닙니다.');
        }

        const apiUrl = `https://export.arxiv.org/api/query?id_list=${arxivId}`;
        
        try {
            const response = await requestUrl({
                url: apiUrl,
                headers: {
                    'User-Agent': 'ObsidianArxivPlugin/1.0'
                }
            });

            if (response.status !== 200) {
                throw new Error(`Arxiv API 요청 실패: ${response.status}`);
            }

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(response.text, "text/xml");

            const entry = xmlDoc.querySelector('entry');
            if (!entry) {
                throw new Error('논문 정보를 찾을 수 없습니다.');
            }

            const metadata: ArxivMetadataType = {
                title: entry.querySelector('title')?.textContent?.trim() || '제목 없음',
                paperLink: entry.querySelector('id')?.textContent || url,
                publishDate: entry.querySelector('published')?.textContent?.split('T')[0] || '날짜 없음',
                authors: Array.from(entry.querySelectorAll('author name'))
                    .map(author => author.textContent)
                    .join(', '),
                abstract: entry.querySelector('summary')?.textContent?.trim() || 'Abstract 없음'
            };

            // Semantic Scholar API를 사용하여 인용 정보 가져오기
            const citationInfo: CitationInfo = await this.fetchCitationInfo(arxivId);
            metadata.numCitedBy = citationInfo.numCitedBy;
            metadata.numCiting = citationInfo.numCiting;
            metadata.influentialCitations = citationInfo.influentialCitations;
            metadata.influentialReferences = citationInfo.influentialReferences;

            return metadata;
        } catch (error) {
            console.error('Arxiv 메타데이터 가져오기 오류:', error);
            throw new Error('Arxiv 메타데이터를 가져오는 중 오류가 발생했습니다.');
        }
    }

    private extractArxivId(url: string): string | null {
        const match = url.match(/arxiv\.org\/abs\/(\d+\.\d+)/);
        return match ? match[1] : null;
    }

    async fetchCitationInfo(arxivId: string): Promise<CitationInfo> {
        const semanticScholarId = `arXiv:${arxivId}`;
        const url = `https://api.semanticscholar.org/v1/paper/${semanticScholarId}`;
        
        console.log(`Semantic Scholar API 호출: ${url}`);

        try {
            const response = await requestUrl({ url });
            console.log('Semantic Scholar 응답 상태:', response.status);
            
            if (response.status === 200) {
                const data = JSON.parse(response.text);
                console.log('Semantic Scholar 응답 데이터:', JSON.stringify(data, null, 2));
                
                console.log('전체 인용 논문 수:', data.citations?.length || 0);
                console.log('전체 참조 논문 수:', data.references?.length || 0);
                
                const influentialCitations = this.getInfluentialPapers(data.citations);
                const influentialReferences = this.getInfluentialPapers(data.references);
                
                console.log('영향력 있는 인용 논문 수:', influentialCitations.length);
                console.log('영향력 있는 참조 논문 수:', influentialReferences.length);

                return {
                    numCitedBy: data.numCitedBy || 0,
                    numCiting: data.numCiting || 0,
                    influentialCitations,
                    influentialReferences
                };
            }
        } catch (error) {
            console.error(`인용 정보 가져오기 오류 (arxivId: ${arxivId}):`, error);
            console.error('오류 상세:', {
                message: error.message,
                stack: error.stack
            });
        }

        return {
            numCitedBy: 0,
            numCiting: 0,
            influentialCitations: [],
            influentialReferences: []
        };
    }

    private getInfluentialPapers(papers: any[]): any[] {
        if (!papers || !Array.isArray(papers)) {
            console.log('papers가 유효하지 않음:', papers);
            return [];
        }

        console.log('전체 논문 데이터:', papers);
        
        const influentialPapers = papers
            .filter(paper => {
                console.log(`논문 "${paper.title}" 영향력 여부:`, paper.isInfluential);
                return paper.isInfluential;
            })
            .map(paper => {
                const result = {
                    paperId: paper.paperId,
                    title: paper.title,
                    url: paper.url,
                    venue: paper.venue,
                    year: paper.year,
                    authors: paper.authors?.map((author: any) => author.name).join(', ') || '',
                    arxivId: paper.arxivId,
                    doi: paper.doi,
                    isInfluential: paper.isInfluential,
                    citationCount: paper.citationCount,
                    intent: paper.intent
                };
                console.log('처리된 영향력 있는 논문:', result);
                return result;
            });

        console.log(`영향력 있는 논문 ${influentialPapers.length}개 발견`);
        return influentialPapers;
    }
} 