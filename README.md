---
# Template Export/Import System and API
This repository contains a working Template Export/Import system and a REST API to manage templates and parameterized rendering. Use this guide to build locally, run demos, and explain the implementation during interviews.

## Quick Start

- Install Node 18+
- Open two terminals

Terminal A (API server on port 4000):

```bash
cd api
npm install
npm start
```

Terminal B (Vite dev server on port 5173):

```bash
npm install
npm run dev
```

Visit the app at: http://localhost:5173

## What Was Built (tasks 1 & 2)

- **Task 1 – Export/Import Templates as JSON**
  - `packages/editor/src/utils/templateExport.ts`
    - `createTemplateFromEditor(pages, name, options)`
  - `exportTemplate(...)` and `downloadTemplate(...)`
  - `packages/editor/src/utils/templateImport.ts`.
    - `loadTemplateFromFile(file)`
  - `importTemplate(templateData, { textParameters, imageParameters })`
  - `applyTextParameters(...)`, `applyImageParameters(...)`
  - React UI components:
    - `packages/editor/src/components/template/TemplateManager.tsx` (Export from editor, import from file/URL)
    - `packages/editor/src/components/template/TemplateCustomizer.tsx` (Detect placeholders and live preview)

- **Task 2 – API to accept template path/name + parameters**
  - `api/app.js` endpoints:
    - `POST /api/template/export`
    - `GET /api/template/download/:templateName`
    - `POST /api/template/import`
    - `GET /api/template/:templateName`
    - Plus search endpoints like `GET /api/templates`, `GET /api/images`, etc.
  - Sample data, including placeholders: `api/json/sample-template.json`

## How Parameter Substitution Works

- Text placeholders use `{{parameterName}}` within the layer `props.text` HTML.
- Image placeholders use `{{parameterName}}` within the layer image URL(s).
- Replacement is performed both in the front-end utilities and on the server:
  - Front-end: `applyTextParameters(...)`, `applyImageParameters(...)` in `templateImport.ts`.
  - Server: implemented inside the import and get-template endpoints in `api/app.js`

## Running the Automated Tests

With the API running on port 4000, from `/api` run:

```bash
npm install axios
API_BASE=http://localhost:4000 node test-template-system.js
```

This verifies:
- **Export** via `POST /api/template/export`
- **Import** with parameters via `POST /api/template/import`
- **Get** by name with parameters via `GET /api/template/:templateName`
- **Search** via `GET /api/templates`

## API Reference (Local base: `http://localhost:4000`)

- **POST `/api/template/export`**
  - Body:
    ```json
    {
      "templateName": "My Template",
      "description": "Template description",
      "pages": [...],
      "author": "Author Name",
      "tags": ["tag1", "tag2"]
    }
    ```
- **GET `/api/template/download/:templateName`**
  - Query: `template=<json>`; returns a downloadable JSON file.
- **POST `/api/template/import`**
  - Body:
    ```json
    {
      "templatePath": "./json/sample-template.json",
      "textParameters": { "title": "Custom Title", "subtitle": "Custom Subtitle" },
      "imageParameters": { "backgroundImage": "https://example.com/bg.jpg" }
    }
    ```
- **GET `/api/template/:templateName`**
  - Query: `textParameters=<json>&imageParameters=<json>`
  - Example:
    ```http
    GET /api/template/sample-template.json?textParameters={"title":"Custom"}&imageParameters={"backgroundImage":"https://example.com/bg.jpg"}
    ```

## Using the React Components

- **`TemplateManager`** (`packages/editor/src/components/template/TemplateManager.tsx`)
  - Export current editor pages to a JSON download and optionally POST to the API.
  - Import a template from a file input or a URL (delegating server-side fetch and parsing).
- **`TemplateCustomizer`** (`packages/editor/src/components/template/TemplateCustomizer.tsx`)
  - Automatically detects text and image placeholders.
  - Lets users input parameter values and previews the updated pages before applying.

## File Map (Where to Look)

- `packages/editor/src/utils/templateExport.ts`
- `packages/editor/src/utils/templateImport.ts`.
- `packages/editor/src/components/template/TemplateManager.tsx`
- `packages/editor/src/components/template/TemplateCustomizer.tsx`
- `api/app.js`
- `api/json/sample-template.json`
- `test-template-system.js`
- `demo-template-system.html`
- `TEMPLATE_SYSTEM.md` (in this folder) — deep-dive documentation


1. **Architecture**: A React editor (Vite) with a small Express API. Templates are JSON describing pages and layers.
2. **Export**: From the editor, `createTemplateFromEditor` builds a `TemplateExportData`, and `downloadTemplate` saves it as a `.json`. Optionally it POSTS to `/api/template/export`.
3. **Import**: Import from file or URL. Parameter substitution is applied for text and images using `{{placeholder}}` syntax, implemented both client and server side for parity.
4. **API**: The API supports export, import with parameters, get by name with parameters, and basic search endpoints for templates/assets.
5. **Testing**: `test-template-system.js` runs four checks (export, import, get, search) against the local API.
6. **Demo**: Show `demo-template-system.html` which documents endpoints and includes a small connectivity test.

## Notes

- Local dev ports: API `4000`, Vite `5173`.
- Replace placeholders safely using RegExp for text; image replacement matches placeholder tokens in URLs.
- Error handling returns friendly messages for invalid files or missing params.
