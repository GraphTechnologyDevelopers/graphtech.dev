import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const passthroughFiles = [
  { from: 'src/assets', to: 'assets' },
  { from: 'src/data/graph.json', to: 'data/graph.json' },
  { from: 'src/css', to: 'css' },
  { from: 'src/site.webmanifest', to: 'site.webmanifest' },
];

/** @param {import('@11ty/eleventy').UserConfig} eleventyConfig */
export default function (eleventyConfig) {
  eleventyConfig.setServerOptions({
    showAllHosts: true,
  });

  for (let i = 0; i < passthroughFiles.length; i += 1) {
    const entry = passthroughFiles[i];
    eleventyConfig.addPassthroughCopy({ [entry.from]: entry.to });
  }

  eleventyConfig.addWatchTarget('src/css/');
  eleventyConfig.addWatchTarget('src/js/');

  eleventyConfig.addNunjucksFilter('dateIso', (value) => {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toISOString().split('T')[0];
  });

  eleventyConfig.addNunjucksFilter('isExternalLink', (href) => {
    if (!href) {
      return false;
    }
    return href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//');
  });

  eleventyConfig.addNunjucksFilter('getNodeDepth', (nodeId, graphData) => {
    if (!graphData || !graphData.links) {
      return 0;
    }
    
    // Build parent map - include both belongsTo and relates links
    const parents = new Map();
    for (const link of graphData.links) {
      if (link.kind === 'belongsTo' || link.kind === 'relates') {
        parents.set(link.target, link.source);
      }
    }
    
    // Calculate depth
    let depth = 0;
    let current = nodeId;
    while (parents.has(current)) {
      current = parents.get(current);
      depth += 1;
    }
    
    return depth;
  });

  eleventyConfig.addNunjucksFilter('findNodeById', (nodes, nodeId) => {
    if (!nodes || !nodeId) {
      return null;
    }
    return nodes.find(node => node.id === nodeId) || null;
  });

  eleventyConfig.addGlobalData('graphData', async () => {
    const file = resolve('src/data/graph.json');
    const content = await readFile(file, 'utf-8');
    return JSON.parse(content);
  });

  return {
    dir: {
      input: 'src',
      includes: '_includes',
      data: '_data',
      output: 'dist',
    },
    templateFormats: ['njk', 'md', '11ty.js'],
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
  };
}

