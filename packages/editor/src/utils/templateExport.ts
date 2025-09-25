import { pack } from './minifier';
import { SerializedPage } from '../types';

export interface TemplateExportData {
  name: string;
  description: string;
  thumbnail: string;
  pages: SerializedPage[];
  metadata: {
    version: string;
    createdAt: string;
    author?: string;
    tags?: string[];
  };
}

export interface TemplateImportData {
  templatePath: string;
  textParameters: Record<string, string>;
  imageParameters: Record<string, string>;
}

/**
 * Export current editor state as a template JSON file
 */
export const exportTemplate = (
  pages: SerializedPage[],
  templateName: string,
  description: string = '',
  thumbnail: string = '',
  author?: string,
  tags: string[] = []
): TemplateExportData => {
  const now = new Date().toISOString();
  
  return {
    name: templateName,
    description,
    thumbnail,
    pages,
    metadata: {
      version: '1.0.0',
      createdAt: now,
      author,
      tags
    }
  };
};

/**
 * Pack template data for storage/transmission
 */
export const packTemplate = (templateData: TemplateExportData): string => {
  const packedData = pack(templateData);
  return JSON.stringify(packedData);
};

/**
 * Download template as JSON file
 */
export const downloadTemplate = (
  templateData: TemplateExportData,
  filename?: string
): void => {
  const jsonString = JSON.stringify(templateData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${templateData.name.replace(/\s+/g, '_')}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export template with packed data (for API storage)
 */
export const exportTemplateForAPI = (
  pages: SerializedPage[],
  templateName: string,
  description: string = '',
  thumbnail: string = '',
  author?: string,
  tags: string[] = []
): string => {
  const templateData = exportTemplate(pages, templateName, description, thumbnail, author, tags);
  return packTemplate(templateData);
};

/**
 * Create template from current editor state
 */
export const createTemplateFromEditor = (
  editorPages: SerializedPage[],
  templateName: string,
  options: {
    description?: string;
    thumbnail?: string;
    author?: string;
    tags?: string[];
    download?: boolean;
    filename?: string;
  } = {}
): TemplateExportData => {
  const templateData = exportTemplate(
    editorPages,
    templateName,
    options.description,
    options.thumbnail,
    options.author,
    options.tags
  );

  if (options.download) {
    downloadTemplate(templateData, options.filename);
  }

  return templateData;
};
