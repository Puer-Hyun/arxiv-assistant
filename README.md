# Arxiv Assistant for Obsidian

Arxiv Assistant is an Obsidian plugin that helps you manage and analyze arXiv papers efficiently. It provides automated tools for downloading PDFs, extracting metadata, and generating AI-powered summaries.

## Features

### 1. PDF Management
- **Download PDFs**: Automatically download arXiv papers to your specified vault location
- **Text Extraction**: Extract text content from PDF files
- **Configurable Storage**: Set custom paths for paper downloads

### 2. Metadata Integration
- **Automatic Metadata Fetching**: Extract paper metadata from arXiv URLs
- **Frontmatter Generation**: Create structured frontmatter with paper details
- **Citation Information**: Include citation counts and related papers

### 3. AI-Powered Summarization
- **Paper Summarization**: Generate comprehensive summaries using Gemini AI
- **Customizable Prompts**: Modify summarization instructions to suit your needs
- **Translation Support**: Translate summaries to different languages (Korean, Japanese, Chinese)

## How to Use

1. **Install the Plugin**
   - Install from Obsidian Community Plugins or manually install the release files

2. **Configure Settings**
   - Set your Gemini API key
   - Configure paper download location
   - Set translation preferences (optional)

3. **Use Commands**
   - `Get Text From PDF`: Extract text from a PDF file
   - `Arxiv 메타데이터 가져오기`: Fetch paper metadata
   - `Arxiv PDF 다운로드`: Download paper PDF
   - `Arxiv 논문 요약하기`: Generate AI summary

## Usage Examples

1. **Download and Summarize a Paper**
   - Copy an arXiv paper URL
   - Use the "Arxiv PDF 다운로드" command to download the PDF
   - Use "Arxiv 논문 요약하기" to generate a summary

2. **Metadata Management**
   - Copy an arXiv paper URL
   - Use "Arxiv 메타데이터 가져오기" to create a new note with metadata
   - Metadata includes title, authors, publication date, and more

## Requirements

- Obsidian v0.15.0 or higher
- Gemini API key for summarization features
- Internet connection for downloading papers and fetching metadata

## Installation

1. Download the latest release
2. Extract files to your vault's `.obsidian/plugins/arxiv-assistant/` folder
3. Enable the plugin in Obsidian settings
4. Configure the plugin settings

## Development

To build the plugin:
1. Clone this repository
2. `npm i` or `yarn` to install dependencies
3. `npm run dev` to start compilation in watch mode

## Support

If you encounter any issues or have suggestions, please:
1. Check the existing issues on GitHub
2. Create a new issue with detailed information if needed

## License

This project is licensed under the MIT License.
