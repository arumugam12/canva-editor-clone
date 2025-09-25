import { unpack } from './minifier';
import { SerializedPage } from '../types';

export interface TemplateImportData {
  templatePath: string;
  textParameters: Record<string, string>;
  imageParameters: Record<string, string>;
}

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

/**
 * Parse template JSON file
 */
export const parseTemplateFile = (jsonString: string): TemplateExportData => {
  try {
    const templateData = JSON.parse(jsonString);
    return templateData;
  } catch (error) {
    throw new Error('Invalid template file format');
  }
};

/**
 * Unpack template data from storage/transmission
 */
export const unpackTemplate = (packedData: string): TemplateExportData => {
  try {
    const parsed = JSON.parse(packedData);
    return unpack(parsed);
  } catch (error) {
    throw new Error('Invalid packed template data');
  }
};

/**
 * Load template from file input
 */
export const loadTemplateFromFile = (file: File): Promise<TemplateExportData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string;
        const templateData = parseTemplateFile(jsonString);
        resolve(templateData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read template file'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Apply text parameters to template pages
 */
export const applyTextParameters = (
  pages: SerializedPage[],
  textParameters: Record<string, string>
): SerializedPage[] => {
  return pages.map(page => {
    const updatedPage = { ...page };
    
    // Find and replace text content in layers
    Object.keys(updatedPage.layers).forEach(layerId => {
      const layer = updatedPage.layers[layerId];
      
      if (layer.type === 'TextLayer' && layer.props.text) {
        let updatedText = layer.props.text;
        
        // Replace placeholders with actual text
        Object.keys(textParameters).forEach(placeholder => {
          const regex = new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g');
          updatedText = updatedText.replace(regex, textParameters[placeholder]);
        });
        
        updatedPage.layers[layerId] = {
          ...layer,
          props: {
            ...layer.props,
            text: updatedText
          }
        };
      }
    });
    
    return updatedPage;
  });
};

/**
 * Apply image parameters to template pages
 */
export const applyImageParameters = (
  pages: SerializedPage[],
  imageParameters: Record<string, string>
): SerializedPage[] => {
  return pages.map(page => {
    const updatedPage = { ...page };
    
    // Find and replace image URLs in layers
    Object.keys(updatedPage.layers).forEach(layerId => {
      const layer = updatedPage.layers[layerId];
      
      if (layer.type === 'ImageLayer' && layer.props.image) {
        const currentImageUrl = layer.props.image.url || layer.props.image.thumb;
        
        // Replace image if parameter matches
        Object.keys(imageParameters).forEach(placeholder => {
          if (currentImageUrl.includes(placeholder)) {
            updatedPage.layers[layerId] = {
              ...layer,
              props: {
                ...layer.props,
                image: {
                  ...layer.props.image,
                  url: imageParameters[placeholder],
                  thumb: imageParameters[placeholder]
                }
              }
            };
          }
        });
      }
    });
    
    return updatedPage;
  });
};

/**
 * Import template with parameter substitution
 */
export const importTemplate = (
  templateData: TemplateExportData,
  parameters: TemplateImportData
): SerializedPage[] => {
  let pages = [...templateData.pages];
  
  // Apply text parameters
  if (parameters.textParameters && Object.keys(parameters.textParameters).length > 0) {
    pages = applyTextParameters(pages, parameters.textParameters);
  }
  
  // Apply image parameters
  if (parameters.imageParameters && Object.keys(parameters.imageParameters).length > 0) {
    pages = applyImageParameters(pages, parameters.imageParameters);
  }
  
  return pages;
};

/**
 * Load template from URL
 */
export const loadTemplateFromURL = async (url: string): Promise<TemplateExportData> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.statusText}`);
    }
    
    const jsonString = await response.text();
    return parseTemplateFile(jsonString);
  } catch (error) {
    throw new Error(`Failed to load template from URL: ${error}`);
  }
};

/**
 * Validate template data structure
 */
export const validateTemplate = (templateData: any): templateData is TemplateExportData => {
  return (
    templateData &&
    typeof templateData === 'object' &&
    typeof templateData.name === 'string' &&
    typeof templateData.description === 'string' &&
    Array.isArray(templateData.pages) &&
    templateData.metadata &&
    typeof templateData.metadata.version === 'string' &&
    typeof templateData.metadata.createdAt === 'string'
  );
};
