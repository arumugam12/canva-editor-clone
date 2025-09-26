const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
app.use(cors());
// Parse JSON and urlencoded bodies for API endpoints
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const fs = require('fs');

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server has started on port ${PORT}! Open https://canva-editor-api.vercel.app`);
});
app.use(express.static(__dirname + '/public')); //Serves resources from public folder

// ---------------------------
// Template DB (file-based)
// ---------------------------
const TEMPLATES_DIR = path.join(__dirname, 'json', 'custom-templates');

function ensureDirExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function sanitizeFileName(name) {
  return String(name).replace(/[^a-z0-9_\-\. ]/gi, '_');
}

function templateFilePath(name) {
  const fileName = sanitizeFileName(name).endsWith('.json')
    ? sanitizeFileName(name)
    : `${sanitizeFileName(name)}.json`;
  return path.join(TEMPLATES_DIR, fileName);
}

function saveTemplateToDb(name, templateData) {
  ensureDirExists(TEMPLATES_DIR);
  const filePath = templateFilePath(name);
  fs.writeFileSync(filePath, JSON.stringify(templateData, null, 2), 'utf8');
  return filePath;
}

function loadTemplateFromDbByName(name) {
  ensureDirExists(TEMPLATES_DIR);
  const candidates = [name, `${name}.json`];
  for (const c of candidates) {
    const p = templateFilePath(c);
    if (fs.existsSync(p)) {
      try {
        const json = JSON.parse(fs.readFileSync(p, 'utf8'));
        return { json, path: p };
      } catch (_) {
        return null;
      }
    }
  }
  return null;
}

function paginateArrayWithFilter(array, size = 30, index = 0, keyword = '') {
  const startIndex = index * size;
  const endIndex = startIndex + size;
  let filteredArray = array;
  if (keyword && keyword !== '') {
    const lowerCaseKeyword = keyword.toLowerCase();
    filteredArray = array.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(lowerCaseKeyword)
    );
  }

  return filteredArray.slice(startIndex, endIndex);
}

function handleFontStyleName(fontName, style) {
  if (style === 'regular') return fontName + ' Regular';

  const fontStrong = parseInt(style);
  if (style.includes('italic')) {
    return fontName + (fontStrong ? ` Italic Bold ${fontStrong}` : ' Italic');
  }

  if (!fontStrong) return fontName + ' Regular';
  return fontName + ` Bold ${fontStrong}`;
}

function searchKeywords(query, data) {
  if (!query) return [];
  const lowerCaseQuery = query.toLowerCase();
  const uniqueKeywords = new Set();

  data.forEach((item) => {
    const lowerCaseDesc = item.desc.toLowerCase();
    const keywords = lowerCaseDesc.split(' ');

    keywords.forEach((keyword) => {
      if (keyword.includes(lowerCaseQuery)) {
        uniqueKeywords.add(keyword);
      }
    });
  });

  return Array.from(uniqueKeywords);
}

/**
 * Get draft fonts
 */
app.get('/api/draft-fonts', async (req, res) => {
  console.log(req.query);
  fs.readFile(path.join(__dirname, './json/draft-fonts.json'), 'utf8', (err, jsonString) => {
    if (err) {
      console.error(err);
      res.send(null);
      return;
    }
    const filtered = JSON.parse(jsonString).items.map((font) => {
      return {
        family: font.family,
        styles: Object.keys(font.files).map((style) => {
          return {
            name: handleFontStyleName(font.family, style),
            style,
            url: font.files[style],
          };
        }),
      };
    });
    res.send({ data: filtered });
  });
});

/**
 * Get fonts
 */
app.get('/api/fonts', async (req, res) => {
  fs.readFile(path.join(__dirname, './json/fonts.json'), 'utf8', (err, jsonString) => {
    if (err) {
      console.error(err);
      res.send(null);
      return;
    }
    const { ps, pi, kw } = req.query;
    res.send(
      paginateArrayWithFilter(JSON.parse(jsonString).data, +ps, +pi, kw)
    );
  });
});

/**
 * Search templates
 */
app.get('/api/templates', async (req, res) => {
  fs.readFile(path.join(__dirname, './json/templates.json'), 'utf8', (err, jsonString) => {
    if (err) {
      console.error(err);
      res.send(null);
      return;
    }
    const { ps, pi, kw } = req.query;
    res.send(
      paginateArrayWithFilter(JSON.parse(jsonString).data, +ps, +pi, kw)
    );
  });
});

/**
 * Append an imported template to templates.json in existing format
 * Body: { name: string, pages: any[], img?: string, desc?: string }
 */
app.post('/api/templates/import-local', async (req, res) => {
  try {
    const { name, pages, img = '', desc = '' } = req.body || {};
    if (!name || !Array.isArray(pages)) {
      return res.status(400).json({ error: 'name and pages are required' });
    }

    const filePath = path.join(__dirname, './json/templates.json');
    let jsonObj = { data: [] };
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      jsonObj = JSON.parse(raw);
      if (!Array.isArray(jsonObj.data)) jsonObj.data = [];
    } catch (_) {
      jsonObj = { data: [] };
    }

    const item = {
      img,
      data: JSON.stringify(pages),
      desc,
      pages: pages.length || 0,
    };
    // Prepend to show newest first (like existing lists)
    jsonObj.data.unshift(item);

    fs.writeFileSync(filePath, JSON.stringify(jsonObj, null, 2), 'utf8');
    return res.json({ success: true, inserted: 1 });
  } catch (error) {
    console.error('templates/import-local error:', error);
    return res.status(500).json({ error: 'Failed to append template' });
  }
});

/**
 * Search text templates
 */
app.get('/api/texts', async (req, res) => {
  fs.readFile(path.join(__dirname, './json/texts.json'), 'utf8', (err, jsonString) => {
    if (err) {
      console.error(err);
      res.send(null);
      return;
    }
    const { ps, pi, kw } = req.query;
    res.send(
      paginateArrayWithFilter(JSON.parse(jsonString).data, +ps, +pi, kw)
    );
  });
});

/**
 * Search text keywords
 */
app.get('/api/text-suggestion', async (req, res) => {
  fs.readFile(path.join(__dirname, './json/texts.json'), 'utf8', (err, jsonString) => {
    if (err) {
      console.error(err);
      res.send(null);
      return;
    }
    const rs = searchKeywords(req.query.kw, JSON.parse(jsonString).data);
    res.send(rs.map((kw, idx) => ({ id: idx + 1, name: kw })));
  });
});

/**
 * Search frames
 */
app.get('/api/frames', async (req, res) => {
  fs.readFile(path.join(__dirname, './json/frames.json'), 'utf8', (err, jsonString) => {
    if (err) {
      console.error(err);
      res.send(null);
      return;
    }
    const { ps, pi, kw } = req.query;
    res.send(
      paginateArrayWithFilter(JSON.parse(jsonString).data, +ps, +pi, kw)
    );
  });
});

/**
 * Search frame keywords
 */
app.get('/api/frame-suggestion', async (req, res) => {
  fs.readFile(path.join(__dirname, './json/frames.json'), 'utf8', (err, jsonString) => {
    if (err) {
      console.error(err);
      res.send(null);
      return;
    }
    const rs = searchKeywords(req.query.kw, JSON.parse(jsonString).data);
    res.send(rs.map((kw, idx) => ({ id: idx + 1, name: kw })));
  });
});

/**
 * Search shapes
 */
app.get('/api/shapes', async (req, res) => {
  fs.readFile(path.join(__dirname, './json/shapes.json'), 'utf8', (err, jsonString) => {
    if (err) {
      console.error(err);
      res.send(null);
      return;
    }
    const { ps, pi, kw } = req.query;
    res.send(
      paginateArrayWithFilter(JSON.parse(jsonString).data, +ps, +pi, kw)
    );
  });
});

/**
 * Search shape keywords
 */
app.get('/api/shape-suggestion', async (req, res) => {
  fs.readFile(path.join(__dirname, './json/shapes.json'), 'utf8', (err, jsonString) => {
    if (err) {
      console.error(err);
      res.send(null);
      return;
    }
    const rs = searchKeywords(req.query.kw, JSON.parse(jsonString).data);
    res.send(rs.map((kw, idx) => ({ id: idx + 1, name: kw })));
  });
});

/**
 * Search images
 */
app.get('/api/images', async (req, res) => {
  fs.readFile(path.join(__dirname, './json/images.json'), 'utf8', (err, jsonString) => {
    if (err) {
      console.error(err);
      res.send(null);
      return;
    }
    const { ps, pi, kw } = req.query;
    res.send(
      paginateArrayWithFilter(JSON.parse(jsonString).data, +ps, +pi, kw)
    );
  });
});

/**
 * Search image keywords
 */
app.get('/api/image-suggestion', async (req, res) => {
  fs.readFile(path.join(__dirname, './json/images.json'), 'utf8', (err, jsonString) => {
    if (err) {
      console.error(err);
      res.send(null);
      return;
    }
    const rs = searchKeywords(req.query.kw, JSON.parse(jsonString).data);
    res.send(rs.map((kw, idx) => ({ id: idx + 1, name: kw })));
  });
});

/**
 * Export template as JSON
 */
app.post('/api/template/export', async (req, res) => {
  try {
    const { templateName, description, pages, author, tags } = req.body;
    
    if (!templateName || !pages) {
      return res.status(400).json({ error: 'Template name and pages are required' });
    }

    const templateData = {
      name: templateName,
      description: description || '',
      thumbnail: '',
      pages: pages,
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        author: author || '',
        tags: tags || []
      }
    };

    // Persist to DB (file-based)
    saveTemplateToDb(templateName, templateData);

    res.json({
      success: true,
      template: templateData,
      // Clean URLs that work without resending the template
      pathUrl: `/api/template/${encodeURIComponent(templateName)}.json`,
      downloadUrl: `/api/template/download/${encodeURIComponent(templateName)}`
    });
  } catch (error) {
    console.error('Template export error:', error);
    res.status(500).json({ error: 'Failed to export template' });
  }
});

/**
 * Download template as JSON file
 */
app.get('/api/template/download/:templateName', async (req, res) => {
  try {
    const { templateName } = req.params;
    // Resolve from local store only (no query/body expected)
    let dataObj = null;
    // 1) Custom DB (api/json/custom-templates)
    const fromDb = loadTemplateFromDbByName(templateName);
    if (fromDb) {
      dataObj = fromDb.json;
    } else {
      // 2) Bundled api/json directory
      const candidates = [templateName, `${templateName}.json`].filter(Boolean);
      let resolved = null;
      for (const fname of candidates) {
        const p = path.isAbsolute(fname) ? fname : path.join(__dirname, './json/', fname);
        if (fs.existsSync(p)) { resolved = p; break; }
      }
      if (!resolved) {
        return res.status(404).json({ error: 'Template file not found' });
      }
      dataObj = JSON.parse(fs.readFileSync(resolved, 'utf8'));
    }

    const jsonString = JSON.stringify(dataObj, null, 2);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${templateName}.json"`);
    res.send(jsonString);
  } catch (error) {
    console.error('Template download error:', error);
    res.status(500).json({ error: 'Failed to download template' });
  }
});

/**
 * Import template with parameters
 */
app.post('/api/template/import', async (req, res) => {
  try {
    const { templatePath, textParameters, imageParameters } = req.body;
    
    if (!templatePath) {
      return res.status(400).json({ error: 'Template path is required' });
    }

    // Load template from the provided path
    let templateData;
    try {
      if (templatePath.startsWith('http')) {
        // Load from URL
        const response = await fetch(templatePath);
        if (!response.ok) {
          throw new Error(`Failed to load template: ${response.statusText}`);
        }
        const jsonString = await response.text();
        templateData = JSON.parse(jsonString);
      } else {
        // Load from local file (support leading '/' by resolving relative to __dirname)
        const normalizedPath = templatePath.startsWith('/')
          ? path.join(__dirname, `.${templatePath}`)
          : path.join(__dirname, templatePath);
        const templatePathFull = normalizedPath;
        const jsonString = fs.readFileSync(templatePathFull, 'utf8');
        templateData = JSON.parse(jsonString);
      }
    } catch (error) {
      return res.status(400).json({ error: 'Failed to load template file' });
    }

    // Normalize legacy/list item format to full template object
    // Support files like: { img, data: stringifiedPages, desc, pages }
    if (!templateData || (typeof templateData === 'object' && !Array.isArray(templateData.pages))) {
      try {
        let parsedPages = [];
        if (Array.isArray(templateData)) {
          parsedPages = templateData;
          templateData = {};
        } else if (templateData && typeof templateData.data === 'string') {
          parsedPages = JSON.parse(templateData.data);
        } else if (templateData && Array.isArray(templateData.data)) {
          parsedPages = templateData.data;
        } else if (templateData && Array.isArray(templateData.pages)) {
          parsedPages = templateData.pages;
        }

        if (Array.isArray(parsedPages) && parsedPages.length > 0) {
          const inferredName = (templateData && (templateData.name || templateData.title))
            || (templatePath.startsWith('http') ? '' : path.parse(templatePath).name)
            || `imported-${Date.now()}`;
          templateData = {
            name: inferredName,
            description: (templateData && (templateData.desc || templateData.description)) || '',
            thumbnail: (templateData && (templateData.img || templateData.thumbnail)) || '',
            pages: parsedPages,
            metadata: {
              version: '1.0.0',
              createdAt: new Date().toISOString(),
            },
          };
        }
      } catch (_) {
        // ignore, will validate below
      }
    }

    // Validate we have pages array now
    if (!templateData || !Array.isArray(templateData.pages)) {
      return res.status(400).json({ error: 'Template format invalid: missing pages' });
    }

    // Normalize parameters to safe objects
    const textParams = (textParameters && typeof textParameters === 'object') ? textParameters : {};
    const imageParams = (imageParameters && typeof imageParameters === 'object') ? imageParameters : {};

    // Apply text parameters if provided
    if (Object.keys(textParams).length > 0) {
      templateData.pages = templateData.pages.map((page) => {
        const updatedPage = { ...page };
        const layers = (updatedPage && updatedPage.layers && typeof updatedPage.layers === 'object')
          ? { ...updatedPage.layers }
          : {};
        Object.keys(layers).forEach((layerId) => {
          const layer = layers[layerId];
          if (!layer || layer.type !== 'TextLayer') return;
          const props = layer.props || {};
          if (typeof props.text !== 'string') return;
          let updatedText = props.text;
          Object.keys(textParams).forEach((placeholder) => {
            try {
              const regex = new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g');
              updatedText = updatedText.replace(regex, String(textParams[placeholder] ?? ''));
            } catch (_) {}
          });
          layers[layerId] = {
            ...layer,
            props: {
              ...props,
              text: updatedText,
            },
          };
        });
        updatedPage.layers = layers;
        return updatedPage;
      });
    }

    // Apply image parameters if provided
    if (Object.keys(imageParams).length > 0) {
      templateData.pages = templateData.pages.map((page) => {
        const updatedPage = { ...page };
        const layers = (updatedPage && updatedPage.layers && typeof updatedPage.layers === 'object')
          ? { ...updatedPage.layers }
          : {};
        Object.keys(layers).forEach((layerId) => {
          const layer = layers[layerId];
          if (!layer || layer.type !== 'ImageLayer') return;
          const props = layer.props || {};
          const img = props.image || {};
          const currentImageUrl = String(img.url || img.thumb || '');
          Object.keys(imageParams).forEach((placeholder) => {
            const replacement = String(imageParams[placeholder] ?? '');
            if (placeholder && currentImageUrl.includes(placeholder)) {
              layers[layerId] = {
                ...layer,
                props: {
                  ...props,
                  image: {
                    ...img,
                    url: replacement,
                    thumb: replacement,
                  },
                },
              };
            }
          });
        });
        updatedPage.layers = layers;
        return updatedPage;
      });
    }

    // Persist imported/customized template as list-item JSON under api/json with a unique name
    const listImg = (req.body && (req.body.listImage || req.body.img)) || templateData.thumbnail || '';
    const listDesc = (req.body && (req.body.listDesc || req.body.desc)) || templateData.description || '';
    const pagesArr = Array.isArray(templateData.pages) ? templateData.pages : [];
    const uniqueBase = (templateData.name && String(templateData.name).trim())
      || (templatePath && !templatePath.startsWith('http') ? path.parse(templatePath).name : '')
      || `imported-${Date.now()}`;
    const safeBase = String(uniqueBase).replace(/[^a-z0-9_\-. ]/gi, '_');
    const fileName = `${safeBase}-${Date.now()}.json`;
    const importedDir = path.join(__dirname, './json/imported-templates');
    ensureDirExists(importedDir);
    const outPath = path.join(importedDir, fileName);
    const listItem = {
      img: listImg,
      data: JSON.stringify(pagesArr),
      desc: listDesc,
      pages: pagesArr.length,
    };
    try {
      fs.writeFileSync(outPath, JSON.stringify(listItem, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to write list-item JSON:', e);
    }

    res.json({
      success: true,
      template: templateData,
      pathUrl: `/api/template/${encodeURIComponent('imported-templates/' + fileName)}`,
      downloadUrl: `/api/template/download/${encodeURIComponent('imported-templates/' + fileName)}`
    });
  } catch (error) {
    console.error('Template import error:', error);
    res.status(500).json({ error: 'Failed to import template' });
  }
});

/**
 * Get template by name/path
 */
app.get('/api/template/:templateName', async (req, res) => {
  try {
    const { templateName: rawName } = req.params;
    const templateName = decodeURIComponent(rawName);

    // 0) Try custom DB first (api/json/custom-templates)
    let templateData;
    const fromDb = loadTemplateFromDbByName(templateName);
    if (fromDb) {
      templateData = fromDb.json;
    } else {
      // 1) Try to resolve a local JSON file by name (api/json)
      const candidateFilenames = [
        templateName,
        `${templateName}.json`,
      ].filter(Boolean);

      let resolvedLocalPath = null;
      for (const fname of candidateFilenames) {
        const p = path.isAbsolute(fname) ? fname : path.join(__dirname, './json/', fname);
        if (fs.existsSync(p)) { resolvedLocalPath = p; break; }
      }

      if (resolvedLocalPath) {
        const jsonString = fs.readFileSync(resolvedLocalPath, 'utf8');
        templateData = JSON.parse(jsonString);
      } else {
        return res.status(404).json({ error: 'Template not found' });
      }
    }

    // Normalize to an object with pages
    let normalized = Array.isArray(templateData)
      ? {
          name: templateName,
          description: '',
          thumbnail: '',
          pages: templateData,
          metadata: { version: '1.0.0', createdAt: new Date().toISOString() }
        }
      : templateData;

    // Optionally apply text/image parameters from query
    const qp = req.query || {};
    const parseMaybeJson = (v) => {
      if (v == null) return null;
      if (typeof v !== 'string') return v;
      try { return JSON.parse(v); } catch (_) { return null; }
    };
    const textParameters = parseMaybeJson(qp.textParams) || parseMaybeJson(qp.textParameters) || {};
    const imageParameters = parseMaybeJson(qp.imageParams) || parseMaybeJson(qp.imageParameters) || {};
    const hasTextParams = textParameters && Object.keys(textParameters).length > 0;
    const hasImageParams = imageParameters && Object.keys(imageParameters).length > 0;

    if (normalized && Array.isArray(normalized.pages) && (hasTextParams || hasImageParams)) {
      const textKeys = Object.keys(textParameters || {});
      const imageKeys = Object.keys(imageParameters || {});
      normalized.pages = normalized.pages.map((page) => {
        const updatedPage = { ...page };
        const layers = { ...(updatedPage.layers || {}) };
        Object.keys(layers).forEach((layerId) => {
          const layer = layers[layerId];
          if (!layer || !layer.type || !layer.props) return;

          if (hasTextParams && layer.type === 'TextLayer') {
            let newText = layer.props.text || '';
            if (textParameters[layerId]) {
              newText = textParameters[layerId];
            } else if (typeof newText === 'string' && textKeys.length > 0) {
              textKeys.forEach((ph) => {
                const val = textParameters[ph];
                if (typeof val !== 'string') return;
                try {
                  const regex = new RegExp(`\\{\\{${ph}\\}\\}`, 'g');
                  newText = newText.replace(regex, val);
                } catch (_) {}
              });
            }
            layers[layerId] = { ...layer, props: { ...layer.props, text: newText } };
          }

          if (hasImageParams && layer.type === 'ImageLayer' && layer.props.image) {
            let newImageUrl = layer.props.image.url || layer.props.image.thumb || '';
            if (imageParameters[layerId]) {
              newImageUrl = imageParameters[layerId];
            } else if (imageKeys.length > 0 && typeof newImageUrl === 'string') {
              imageKeys.forEach((ph) => {
                const val = imageParameters[ph];
                if (typeof val !== 'string') return;
                if (newImageUrl.includes(ph)) {
                  newImageUrl = val;
                }
              });
            }
            layers[layerId] = {
              ...layer,
              props: { ...layer.props, image: { ...layer.props.image, url: newImageUrl, thumb: newImageUrl } },
            };
          }
        });
        updatedPage.layers = layers;
        return updatedPage;
      });
    }

    // Optionally append to templates.json if requested
    const append = String(qp.append || '').toLowerCase();
    if (append === '1' || append === 'true' || append === 'yes') {
      try {
        const filePath = path.join(__dirname, './json/templates.json');
        let jsonObj = { data: [] };
        try {
          const raw = fs.readFileSync(filePath, 'utf8');
          jsonObj = JSON.parse(raw);
          if (!Array.isArray(jsonObj.data)) jsonObj.data = [];
        } catch (_) {
          jsonObj = { data: [] };
        }
        const listImage = qp.listImage || '';
        const listDesc = qp.listDesc || '';
        const item = {
          img: String(listImage || ''),
          data: JSON.stringify(normalized.pages || []),
          desc: String(listDesc || ''),
          pages: Array.isArray(normalized.pages) ? normalized.pages.length : 0,
        };
        jsonObj.data.unshift(item);
        fs.writeFileSync(filePath, JSON.stringify(jsonObj, null, 2), 'utf8');
      } catch (e) {
        console.warn('GET /api/template append failed:', e);
      }
    }

    res.json({ success: true, template: normalized });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Failed to get template' });
  }
});
