import React, { useState, useEffect, useCallback } from 'react';
import { SerializedPage } from '../../types';

interface TemplateCustomizerProps {
  templateData: {
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
  };
  onApply: (customizedPages: SerializedPage[]) => void;
  onClose?: () => void;
}

const TemplateCustomizer: React.FC<TemplateCustomizerProps> = ({
  templateData,
  onApply,
  onClose
}) => {
  const [textParameters, setTextParameters] = useState<Record<string, string>>({});
  const [imageParameters, setImageParameters] = useState<Record<string, string>>({});
  const [customizedPages, setCustomizedPages] = useState<SerializedPage[]>(templateData.pages);

  // Extract text placeholders from template
  const extractTextPlaceholders = useCallback((pages: SerializedPage[]): string[] => {
    const placeholders = new Set<string>();
    
    pages.forEach(page => {
      Object.values(page.layers).forEach(layer => {
        if (layer.type === 'TextLayer' && layer.props.text) {
          const text = layer.props.text;
          const matches = text.match(/\{\{([^}]+)\}\}/g);
          if (matches) {
            matches.forEach(match => {
              const placeholder = match.replace(/\{\{|\}\}/g, '');
              placeholders.add(placeholder);
            });
          }
        }
      });
    });
    
    return Array.from(placeholders);
  }, []);

  // Extract image placeholders from template
  const extractImagePlaceholders = useCallback((pages: SerializedPage[]): string[] => {
    const placeholders = new Set<string>();
    
    pages.forEach(page => {
      Object.values(page.layers).forEach(layer => {
        if (layer.type === 'ImageLayer' && layer.props.image) {
          const imageUrl = layer.props.image.url || layer.props.image.thumb || '';
          const matches = imageUrl.match(/\{\{([^}]+)\}\}/g);
          if (matches) {
            matches.forEach(match => {
              const placeholder = match.replace(/\{\{|\}\}/g, '');
              placeholders.add(placeholder);
            });
          }
        }
      });
    });
    
    return Array.from(placeholders);
  }, []);

  const textPlaceholders = extractTextPlaceholders(templateData.pages);
  const imagePlaceholders = extractImagePlaceholders(templateData.pages);

  // Apply parameters to template
  const applyParameters = useCallback(() => {
    let updatedPages = [...templateData.pages];

    // Apply text parameters
    if (Object.keys(textParameters).length > 0) {
      updatedPages = updatedPages.map(page => {
        const updatedPage = { ...page };
        Object.keys(updatedPage.layers).forEach(layerId => {
          const layer = updatedPage.layers[layerId];
          if (layer.type === 'TextLayer' && layer.props.text) {
            let updatedText = layer.props.text;
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
    }

    // Apply image parameters
    if (Object.keys(imageParameters).length > 0) {
      updatedPages = updatedPages.map(page => {
        const updatedPage = { ...page };
        Object.keys(updatedPage.layers).forEach(layerId => {
          const layer = updatedPage.layers[layerId];
          if (layer.type === 'ImageLayer' && layer.props.image) {
            const currentImageUrl = layer.props.image.url || layer.props.image.thumb;
            Object.keys(imageParameters).forEach(placeholder => {
              if (currentImageUrl.includes(`{{${placeholder}}}`)) {
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
    }

    setCustomizedPages(updatedPages);
  }, [templateData.pages, textParameters, imageParameters]);

  useEffect(() => {
    applyParameters();
  }, [applyParameters]);

  const handleTextParameterChange = (placeholder: string, value: string) => {
    setTextParameters(prev => ({
      ...prev,
      [placeholder]: value
    }));
  };

  const handleImageParameterChange = (placeholder: string, value: string) => {
    setImageParameters(prev => ({
      ...prev,
      [placeholder]: value
    }));
  };

  const handleApply = () => {
    onApply(customizedPages);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h2>Customize Template: {templateData.name}</h2>
      
      {templateData.description && (
        <p style={{ color: '#666', marginBottom: '20px' }}>
          {templateData.description}
        </p>
      )}

      {/* Text Parameters */}
      {textPlaceholders.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h3>Text Parameters</h3>
          {textPlaceholders.map(placeholder => (
            <div key={placeholder} style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                {placeholder}:
              </label>
              <input
                type="text"
                value={textParameters[placeholder] || ''}
                onChange={(e) => handleTextParameterChange(placeholder, e.target.value)}
                placeholder={`Enter text for ${placeholder}`}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Image Parameters */}
      {imagePlaceholders.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h3>Image Parameters</h3>
          {imagePlaceholders.map(placeholder => (
            <div key={placeholder} style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                {placeholder}:
              </label>
              <input
                type="url"
                value={imageParameters[placeholder] || ''}
                onChange={(e) => handleImageParameterChange(placeholder, e.target.value)}
                placeholder={`Enter image URL for ${placeholder}`}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* No parameters message */}
      {textPlaceholders.length === 0 && imagePlaceholders.length === 0 && (
        <div style={{
          padding: '20px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          textAlign: 'center',
          color: '#6c757d'
        }}>
          This template has no customizable parameters.
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleApply}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Apply Template
        </button>
      </div>
    </div>
  );
};

export default TemplateCustomizer;
