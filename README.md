# Graph Technology Developers — Hub

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/badge/npm-%3E%3D10.0.0-blue.svg)](https://www.npmjs.com/)
[![Built with Eleventy](https://img.shields.io/badge/Built%20with-Eleventy-blueviolet.svg)](https://www.11ty.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)

Static site powered by Eleventy (11ty), TypeScript (esbuild), and D3.js. The site delivers an SEO-friendly hub with a progressively-enhanced graph navigation experience.

## Quick Start

Get up and running in minutes:

```sh
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:8080` to see your local site. The dev server watches for changes and rebuilds automatically.

## Prerequisites

- **Node.js** 22+ ([download](https://nodejs.org/))
- **npm** 10+ (comes with Node.js)

## Development Guide

### Project Structure

```
src/
├── _data/          # Site metadata and configuration
├── _includes/      # Nunjucks templates and partials
├── assets/         # Static assets (icons, images)
├── content/        # Markdown pages
├── css/            # Stylesheets
├── data/           # Graph data (nodes and links)
└── js/             # TypeScript source files
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build production site to `dist/` |
| `npm run preview` | Preview built site locally |
| `npm run lint` | Type-check TypeScript files |
| `npm run clean` | Remove build artifacts |

### Editing Content

**Homepage**
- Edit `src/index.njk` for the main page structure
- Modify the hero section and CTA buttons here

**Markdown Pages**
- All `.md` files in `src/content/` become pages
- Front matter controls metadata and layout

**Graph Data**
- Edit `src/data/graph.json` to add/remove nodes and links
- Run `npm run build` after changes to regenerate the site

**Styling**
- `src/css/base.css` - Base styles and typography
- `src/css/graph.css` - Graph-specific styles

**TypeScript**
- All scripts in `src/js/` are compiled via esbuild
- Changes trigger rebuilds in watch mode

### Adding Nodes or Links to the Graph

Edit `src/data/graph.json`:

```json
{
  "nodes": [
    {
      "id": "unique-id",
      "label": "Node Name",
      "type": "topic",
      "href": "/path/",
      "description": "Short description for tooltips.",
      "tags": ["tag1", "tag2"],
      "pinned": false
    }
  ],
  "links": [
    { "source": "hub", "target": "unique-id", "kind": "relates" }
  ]
}
```

**Node Types:**
- `hub` - Central navigation node
- `topic` - Topic or category
- `asset` - External resource or link

**Link Kinds:**
- `relates` - General relationship
- `belongs` - Hierarchical relationship
- `references` - Reference link

After editing graph data, rebuild with `npm run build`.

## Deployment

This site is deployed to **GitHub Pages**:

- Custom domain: `graphtech.dev` (configured via `CNAME`)
- Push to `main` branch to trigger deployment
- Built site output: `dist/`

## Performance & Testing

- **Lighthouse**: Target ≥ 90 mobile Performance/Accessibility
- **Bundle Size**: JS bundle budget ≤ 200KB gzipped
- **Accessibility**: Prefers-reduced-motion respected for graph interactions

## Analytics

Plausible Analytics tracks:
- Page views
- Custom events: `graph_node_hover`, `graph_node_click`, `graph_filter_used`

## Join the Community

Connect with fellow graph technology developers:

- **[Join the X Community](https://x.com/i/communities/1977449294861881612)** - Daily threads, pulses, and data drops. Share schemas, queries, datasets, and benchmarks.
- **[Follow @codegraphtheory](https://github.com/codegraphtheory)** - Personal GitHub profile with educational resources and projects
- **[Explore GraphTechnologyDevelopers](https://github.com/GraphTechnologyDevelopers)** - Organization hub for graph tech resources and templates

## License

MIT License - see [LICENSE](LICENSE) file for details.


