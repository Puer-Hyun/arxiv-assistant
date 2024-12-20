import { App, Notice, TFile } from 'obsidian';
import { ArxivApi } from '../api/arxivApi';
import { ArxivMetadataType } from '../types/arxiv';
import { normalizeArxivUrl, isValidArxivUrl } from '../utils/urlUtils';
import { sanitizeFileName, formatPaperContent } from '../utils/fileUtils';
import { CreateRelatedPapersModal } from '../components/CreateRelatedPapersModal';

export class ArxivMetadataService {
    private app: App;
    private arxivApi: ArxivApi;
    private metadataCache: Map<string, string> = new Map();

    constructor(app: App) {
        this.app = app;
        this.arxivApi = new ArxivApi();
    }

    async fetchMetadataFromClipboard() {
        try {
            const clipboardText = await navigator.clipboard.readText();
            const url = normalizeArxivUrl(clipboardText.trim());
            
            if (!isValidArxivUrl(url)) {
                throw new Error('The content in the clipboard is not a valid Arxiv URL.');
            }

            let activeFile = this.app.workspace.getActiveFile();
            if (!activeFile) {
                const fileName = `Arxiv Paper - ${new Date().toISOString().split('T')[0]}.md`;
                activeFile = await this.app.vault.create(fileName, "");
                new Notice(`A new file has been created: ${fileName}`);
            }

            const metadata = await this.arxivApi.fetchArxivMetadata(url);
            await this.insertMetadata(metadata, activeFile);
            new Notice('Metadata has been successfully inserted.');
        } catch (error) {
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
} 