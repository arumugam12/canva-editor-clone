import React, { useCallback, useRef, useState } from 'react';
import { CanvaEditor } from 'canva-editor';
import { data } from './sampleData';

// Local type for editor configuration since canva-editor does not export EditorConfig
type EditorConfig = {
  apis: {
    url: string;
    searchFonts: string;
    searchTemplates: string;
    searchTexts: string;
    searchImages: string;
    searchShapes: string;
    searchFrames: string;
    templateKeywordSuggestion: string;
    textKeywordSuggestion: string;
    imageKeywordSuggestion: string;
    shapeKeywordSuggestion: string;
    frameKeywordSuggestion: string;
  };
  placeholders: {
    searchTemplate: string;
    searchText: string;
    searchImage: string;
    searchShape: string;
    searchFrame: string;
  };
  editorAssetsUrl: string;
  imageKeywordSuggestions: string;
  templateKeywordSuggestions: string;
};

const editorConfig: EditorConfig = {
  apis: {
    url: 'http://localhost:4000/api',
    searchFonts: '/fonts',
    searchTemplates: '/templates',
    searchTexts: '/texts',
    searchImages: '/images',
    searchShapes: '/shapes',
    searchFrames: '/frames',
    templateKeywordSuggestion: '/template-suggestion',
    textKeywordSuggestion: '/text-suggestion',
    imageKeywordSuggestion: '/image-suggestion',
    shapeKeywordSuggestion: '/shape-suggestion',
    frameKeywordSuggestion: '/frame-suggestion',
  },
  placeholders: {
    searchTemplate: 'Search templates',
    searchText: 'Search texts',
    searchImage: 'Search images',
    searchShape: 'Search shapes',
    searchFrame: 'Search frames',
  },
  editorAssetsUrl: 'http://localhost:4000/editor',
  imageKeywordSuggestions: 'animal,sport,love,scene,dog,cat,whale',
  templateKeywordSuggestions:
    'mother,sale,discount,fashion,model,deal,motivation,quote',
};

const Test = () => {
  const [saving, setSaving] = useState(false);
  const name = '';
  // Keep the latest editor state (pages) so Export buttons can send it to backend
  const latestPagesRef = useRef<any>(null);
  // Control the pages given to the editor on mount
  const [pagesForEditor, setPagesForEditor] = useState<any[]>(data as any[]);
  const [editorKey, setEditorKey] = useState<number>(0);

  const handleOnChanges = (changes: any) => {
    console.log('On changes');
    console.log(changes);

    setSaving(true);
    setTimeout(() => {
      setSaving(false);
    }, 1e3);

    // Cache latest pages/state if provided
    if (changes) {
      // Try common shapes
      if (Array.isArray(changes)) {
        latestPagesRef.current = changes; // pages array
      } else if (changes.pages) {
        latestPagesRef.current = changes.pages;
      } else {
        latestPagesRef.current = changes;
      }
    }
  };

  const handleOnDesignNameChanges = (newName: string) => {
    console.log('On name changes');
    console.log(newName);

    setSaving(true);
    setTimeout(() => {
      setSaving(false);
    }, 1e3);
  };
  
  // Backend base URL (from config below)
  const apiBase = editorConfig.apis.url;


  // const handleExportPNG = useCallback(async () => {
  //   try {
  //     const pages = latestPagesRef.current ?? [];
  //     const resp = await fetch(`${apiBase}/export/png`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ name: name || 'design', pages }),
  //     });
  //     if (!resp.ok) throw new Error('Failed to export PNG');
  //     const blob = await resp.blob();
  //     const url = URL.createObjectURL(blob);
  //     const a = document.createElement('a');
  //     a.href = url;
  //     a.download = `${(name || 'design').replace(/\s+/g, '_')}.png`;
  //     document.body.appendChild(a);
  //     a.click();
  //     document.body.removeChild(a);
  //     URL.revokeObjectURL(url);
  //   } catch (e) {
  //     console.error(e);
  //     alert('Export PNG failed');
  //   }
  // }, [apiBase, name]);

  const handleExportJSON = useCallback(async () => {
    try {
      const pages = latestPagesRef.current ?? [];
      const resp = await fetch(`${apiBase}/template/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateName: name || 'design', pages }),
      });
      if (!resp.ok) throw new Error('Failed to export JSON');
      const json = await resp.json();
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(name || 'design').replace(/\s+/g, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Export JSON failed');
    } finally {
      // Close the export button
      setSaving(false);
    }
  }, [apiBase, name]);
  const importJsonInputRef = useRef<HTMLInputElement>(null);
  const handleImportJSON = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      // Use backend import API with a path within api/json/
      const templatePath = `/json/${file.name}`;
      const resp = await fetch(`${apiBase}/template/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templatePath }),
      });
      if (!resp.ok) throw new Error('Failed to import template');
      const json = await resp.json();
      const template = json.template || json;
      const pages = template.pages || [];
      if (Array.isArray(pages) && pages.length > 0) {
        // Fill the empty page just added by the user (last page),
        // otherwise replace the first page if only one exists.
        const importedFirst = pages[0];
        const current = (latestPagesRef.current && Array.isArray(latestPagesRef.current))
          ? [...latestPagesRef.current]
          : [...pagesForEditor];
        if (current.length === 0) {
          current.push(importedFirst);
        } else {
          const targetIndex = Math.max(0, current.length - 1);
          current[targetIndex] = importedFirst;
        }
        setPagesForEditor(current as any[]);
        setEditorKey((k) => k + 1);
      } else {
        alert('No pages found in imported template');
      }
    } catch (err) {
      console.error(err);
      alert('Import failed');
    } finally {
      e.target.value = '';
    }
  }, [apiBase, pagesForEditor]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* External button positioned near native Export button */}
      <div
        style={{
          position: 'fixed',
          top: 27,
          right: 405,
          zIndex: 1000,
          display: 'flex',
        }}
      >
        {/* <button onClick={handleExportPNG} style={{ padding: '8px 12px' }}>Export PNG</button> */}
        <button onClick={handleExportJSON} style={{ padding: '6px 10px', borderRadius: 4 }}>Export JSON</button>
        <button onClick={() => importJsonInputRef.current?.click()} style={{ padding: '6px 10px', borderRadius: 4 }}>Import JSON</button>
      </div>
      <input
        ref={importJsonInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleImportJSON}
      />
      <div style={{ flex: 1, minHeight: 0 }}>
        <CanvaEditor
          key={editorKey}
          data={{
            name,
            editorConfig: pagesForEditor as any,
          }}
          config={editorConfig}
          saving={saving}
          onChanges={handleOnChanges}
          onDesignNameChanges={handleOnDesignNameChanges}
        />
      </div>
    </div>
  );
};

export default Test;
