export interface PluginSettings {
    paperPaths: string;
    geminiApiKey: string;
    translate: boolean;
    targetLanguage: string;
    obsidianImagePath: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
    paperPaths: '',
    geminiApiKey: '',
    translate: false,
    targetLanguage: 'korean',
    obsidianImagePath: 'PDFImages'
} 