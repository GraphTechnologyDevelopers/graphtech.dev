import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const passthroughFiles = [
  { from: 'src/assets', to: 'assets' },
  { from: 'src/data/graph.json', to: 'data/graph.json' },
  { from: 'src/css', to: 'css' },
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

