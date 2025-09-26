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
 * Search template keywords
 */
app.get('/api/template-suggestion', async (req, res) => {
  fs.readFile(path.join(__dirname, './json/templates.json'), 'utf8', (err, jsonString) => {
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
        // Load from local file
        const templatePathFull = path.join(__dirname, templatePath);
        const jsonString = fs.readFileSync(templatePathFull, 'utf8');
        templateData = JSON.parse(jsonString);
      }
    } catch (error) {
      return res.status(400).json({ error: 'Failed to load template file' });
    }

    // Apply text parameters if provided
    if (textParameters && Object.keys(textParameters).length > 0) {
      templateData.pages = templateData.pages.map(page => {
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

    // Apply image parameters if provided
    if (imageParameters && Object.keys(imageParameters).length > 0) {
      templateData.pages = templateData.pages.map(page => {
        const updatedPage = { ...page };
        Object.keys(updatedPage.layers).forEach(layerId => {
          const layer = updatedPage.layers[layerId];
          if (layer.type === 'ImageLayer' && layer.props.image) {
            const currentImageUrl = layer.props.image.url || layer.props.image.thumb;
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
    }

    // Persist imported/customized template
    const baseName = templateData.name
      || (templatePath.startsWith('http') ? `imported-${Date.now()}` : path.parse(templatePath).name)
      || `imported-${Date.now()}`;
    saveTemplateToDb(baseName, templateData);

    res.json({
      success: true,
      template: templateData,
      pathUrl: `/api/template/${encodeURIComponent(baseName)}.json`,
      downloadUrl: `/api/template/download/${encodeURIComponent(baseName)}`
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

    // Normalize response to a full template object
    const responseTemplate = Array.isArray(templateData)
      ? {
          name: templateName,
          description: '',
          thumbnail: '',
          pages: templateData,
          metadata: { version: '1.0.0', createdAt: new Date().toISOString() }
        }
      : templateData;

    res.json({ success: true, template: responseTemplate });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Failed to get template' });
  }
});
