import React, { useState, useCallback } from 'react';
import { useEditor } from '../../hooks';
import { exportTemplate, downloadTemplate, createTemplateFromEditor } from '../../utils/templateExport';
import { loadTemplateFromFile, importTemplate, validateTemplate } from '../../utils/templateImport';
import { SerializedPage } from '../../types';

interface TemplateManagerProps {
  onClose?: () => void;
}

const TemplateManager: React.FC<TemplateManagerProps> = ({ onClose }) => {
  const { actions, activePage, pages } = useEditor((state) => ({
    activePage: state.activePage,
    pages: state.pages,
  }));

  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [tags, setTags] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');

  const handleExport = useCallback(async () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    setIsExporting(true);
    try {
      const currentPages = pages.map(page => page.serialized);
      const templateData = createTemplateFromEditor(
        currentPages,
        templateName,
        {
          description,
          author: author || undefined,
          tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
          download: true,
          filename: `${templateName.replace(/\s+/g, '_')}.json`
        }
      );

      // Also send to API for storage
      try {
        const response = await fetch('/api/template/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            templateName,
            description,
            pages: currentPages,
            author: author || undefined,
            tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag)
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Template exported to server:', result);
        }
      } catch (error) {
        console.warn('Failed to save template to server:', error);
      }

      // Reset form
      setTemplateName('');
      setDescription('');
      setAuthor('');
      setTags('');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export template');
    } finally {
      setIsExporting(false);
    }
  }, [templateName, description, author, tags, pages]);

  const handleFileImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError('');

    try {
      const templateData = await loadTemplateFromFile(file);
      
      if (!validateTemplate(templateData)) {
        throw new Error('Invalid template file format');
      }

      // Apply template to editor
      if (templateData.pages && templateData.pages.length > 0) {
        templateData.pages.forEach((page, index) => {
          actions.setPage(activePage + index, page);
        });
      }

      alert(`Template "${templateData.name}" imported successfully!`);
      onClose?.();
    } catch (error) {
      console.error('Import failed:', error);
      setImportError(error instanceof Error ? error.message : 'Failed to import template');
    } finally {
      setIsImporting(false);
    }
  }, [actions, activePage, onClose]);

  const handleURLImport = useCallback(async () => {
    const url = prompt('Enter template URL:');
    if (!url) return;

    setIsImporting(true);
    setImportError('');

    try {
      const response = await fetch('/api/template/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templatePath: url
        })
      });

      if (!response.ok) {
        throw new Error('Failed to load template from URL');
      }

      const result = await response.json();
      const templateData = result.template;

      if (templateData.pages && templateData.pages.length > 0) {
        templateData.pages.forEach((page: SerializedPage, index: number) => {
          actions.setPage(activePage + index, page);
        });
      }

      alert(`Template "${templateData.name}" imported successfully!`);
      onClose?.();
    } catch (error) {
      console.error('URL import failed:', error);
      setImportError(error instanceof Error ? error.message : 'Failed to import template from URL');
    } finally {
      setIsImporting(false);
    }
  }, [actions, activePage, onClose]);

  return (
    <div style={{ padding: '20px', maxWidth: '500px' }}>
      <h2>Template Manager</h2>
      
      {/* Export Section */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Export Template</h3>
        <div style={{ marginBottom: '10px' }}>
          <label>Template Name:</label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Enter template name"
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label>Description:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter template description"
            style={{ width: '100%', padding: '8px', marginTop: '5px', height: '60px' }}
          />
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label>Author (optional):</label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Enter author name"
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label>Tags (comma-separated):</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Enter tags separated by commas"
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        
        <button
          onClick={handleExport}
          disabled={isExporting || !templateName.trim()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isExporting ? 'not-allowed' : 'pointer',
            opacity: isExporting ? 0.6 : 1
          }}
        >
          {isExporting ? 'Exporting...' : 'Export Template'}
        </button>
      </div>

      {/* Import Section */}
      <div>
        <h3>Import Template</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label>Import from File:</label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileImport}
            disabled={isImporting}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <button
            onClick={handleURLImport}
            disabled={isImporting}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isImporting ? 'not-allowed' : 'pointer',
              opacity: isImporting ? 0.6 : 1
            }}
          >
            {isImporting ? 'Importing...' : 'Import from URL'}
          </button>
        </div>

        {importError && (
          <div style={{
            padding: '10px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            marginTop: '10px'
          }}>
            Error: {importError}
          </div>
        )}
      </div>

      {onClose && (
        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default TemplateManager;
