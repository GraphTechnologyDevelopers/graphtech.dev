# Graph Technology Developers — Hub

Static site powered by Eleventy (11ty), TypeScript (esbuild), and D3.js. The site delivers an SEO-friendly hub with a progressively-enhanced graph navigation experience.

## Prerequisites

- Node.js 22+
- npm 10+

## Setup

```sh
npm install
```

## Development

```sh
npm run dev
```

- Runs esbuild in watch mode and Eleventy dev server at `http://localhost:8080`.
- Source directories live in `src/`.

## Build

```sh
npm run build
```

- Outputs static site to `dist/` for deployment.

Preview the built site locally:

```sh
npm run preview
```

## Editing Content

- Homepage: `src/index.njk`
- Markdown pages: `src/content/*.md`
- Graph data: `src/data/graph.json`
- CSS: `src/css/base.css`, `src/css/graph.css`
- Scripts: `src/js/*.ts`

### Adding Nodes or Links

Edit `src/data/graph.json`:

```json
{
  "nodes": [
    {
      "id": "unique-id",
      "label": "Name",
      "type": "topic",
      "href": "/path/",
      "description": "Short description.",
      "tags": ["tag1", "tag2"],
      "pinned": false
    }
  ],
  "links": [
    { "source": "hub", "target": "unique-id", "kind": "relates" }
  ]
}
```

After updates, run `npm run build` to regenerate the site.

## Deployment

- GitHub Pages via `.github/workflows/pages.yml`
- Custom domain `graphtech.dev` configured via `CNAME`

Push to `main` to trigger the Pages workflow.

## Testing & Performance

- Run Lighthouse against `dist/` or deployed site (target ≥ 90 mobile Perf/Accessibility).
- JS bundle budget: ≤ 200KB gzipped (D3 + modules bundled via esbuild).
- Prefers-reduced-motion respected by graph interactions.

## Analytics

- Plausible (`data-domain="graphtech.dev"`) collects page views and custom events (`graph_node_hover`, `graph_node_click`, `graph_filter_used`).

## License

MIT


