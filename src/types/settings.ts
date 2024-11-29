export interface PluginSettings {
    geminiApiKey: string;
    paperPaths: string;
    translate: boolean;
    targetLanguage: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
    geminiApiKey: '',
    paperPaths: '',
    translate: false,
    targetLanguage: 'korean'
} 