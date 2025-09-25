# Template Export/Import System

This document describes the template export and import functionality implemented for the Canva Editor.

## Features

### 1. Template Export
- Export current editor state as JSON template
- Include metadata (name, description, author, tags)
- Download template as JSON file
- Save template to server via API

### 2. Template Import
- Import templates from JSON files
- Import templates from URLs
- Apply text and image parameter substitution
- Validate template structure

### 3. Template Customization
- Replace text placeholders with custom content
- Replace image placeholders with custom URLs
- Real-time preview of changes
- Apply customized templates to editor

## API Endpoints

### Export Template
```http
POST /api/template/export
Content-Type: application/json

{
  "templateName": "My Template",
  "description": "Template description",
  "pages": [...],
  "author": "Author Name",
  "tags": ["tag1", "tag2"]
}
```

### Import Template
```http
POST /api/template/import
Content-Type: application/json

{
  "templatePath": "./json/sample-template.json",
  "textParameters": {
    "title": "Custom Title",
    "subtitle": "Custom Subtitle"
  },
  "imageParameters": {
    "backgroundImage": "https://example.com/image.jpg"
  }
}
```

### Get Template with Parameters
```http
GET /api/template/{templateName}?textParameters={...}&imageParameters={...}
```

## Usage Examples

### 1. Export Template from Editor

```typescript
import { createTemplateFromEditor } from 'canva-editor/utils/templateExport';

// Export current editor state
const templateData = createTemplateFromEditor(
  currentPages,
  'My Template',
  {
    description: 'A beautiful template',
    author: 'John Doe',
    tags: ['business', 'modern'],
    download: true
  }
);
```

### 2. Import Template with Parameters

```typescript
import { loadTemplateFromFile, importTemplate } from 'canva-editor/utils/templateImport';

// Load template file
const templateData = await loadTemplateFromFile(file);

// Apply parameters
const customizedPages = importTemplate(templateData, {
  templatePath: './template.json',
  textParameters: {
    title: 'Welcome!',
    subtitle: 'Get started today'
  },
  imageParameters: {
    backgroundImage: 'https://example.com/bg.jpg'
  }
});
```

### 3. Use Template Manager Component

```tsx
import { TemplateManager } from 'canva-editor/components/template';

function MyEditor() {
  return (
    <div>
      <TemplateManager onClose={() => setShowManager(false)} />
    </div>
  );
}
```

### 4. Use Template Customizer Component

```tsx
import { TemplateCustomizer } from 'canva-editor/components/template';

function CustomizeTemplate({ templateData, onApply }) {
  return (
    <TemplateCustomizer
      templateData={templateData}
      onApply={(customizedPages) => {
        // Apply to editor
        customizedPages.forEach((page, index) => {
          actions.setPage(activePage + index, page);
        });
      }}
    />
  );
}
```

## Template Structure

### Template JSON Format

```json
{
  "name": "Template Name",
  "description": "Template description",
  "thumbnail": "https://example.com/thumbnail.jpg",
  "pages": [
    {
      "name": "Page Name",
      "layers": {
        "ROOT": {
          "type": { "resolvedName": "RootLayer" },
          "props": { ... }
        },
        "textLayer": {
          "type": { "resolvedName": "TextLayer" },
          "props": {
            "text": "<p>{{title}}</p>",
            ...
          }
        }
      }
    }
  ],
  "metadata": {
    "version": "1.0.0",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "author": "Author Name",
    "tags": ["tag1", "tag2"]
  }
}
```

## Parameter Substitution

### Text Parameters
Use `{{parameterName}}` syntax in text content:
```html
<p>{{title}}</p>
<p>{{subtitle}}</p>
```

### Image Parameters
Use `{{parameterName}}` syntax in image URLs:
```json
{
  "image": {
    "url": "{{backgroundImage}}",
    "thumb": "{{backgroundImage}}"
  }
}
```

## Testing

Run the test script to verify functionality:

```bash
cd canva-editor
node test-template-system.js
```

Make sure the API server is running:
```bash
cd canva-editor/api
npm start
```

## File Structure

```
canva-editor/
├── packages/editor/src/
│   ├── utils/
│   │   ├── templateExport.ts
│   │   └── templateImport.ts
│   └── components/template/
│       ├── TemplateManager.tsx
│       ├── TemplateCustomizer.tsx
│       └── index.ts
├── api/
│   ├── app.js (updated with new endpoints)
│   └── json/
│       └── sample-template.json
└── test-template-system.js
```

## Error Handling

The system includes comprehensive error handling:

- Invalid template file format
- Missing required parameters
- Network errors for URL imports
- Template validation failures

All errors are logged and user-friendly messages are displayed.

## Future Enhancements

- Template versioning
- Template sharing via URL
- Template marketplace
- Advanced parameter types (colors, fonts, etc.)
- Template preview thumbnails
- Batch template operations
