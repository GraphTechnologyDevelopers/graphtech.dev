import { build, context } from 'esbuild';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const watch = process.argv.includes('--watch');

const outdir = resolve('dist/assets/js');

async function prepareOutDir() {
  await rm(outdir, { recursive: true, force: true });
  await mkdir(outdir, { recursive: true });
}

const baseConfig = {
  entryPoints: ['src/js/graph.ts', 'src/js/search.ts', 'src/js/analytics.ts', 'src/js/glitch.ts'],
  outdir,
  bundle: true,
  sourcemap: true,
  format: 'esm',
  target: ['es2022'],
  splitting: true,
  chunkNames: 'chunks/[name]-[hash]',
  metafile: true,
  loader: {
    '.json': 'json',
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(watch ? 'development' : 'production'),
  },
  minify: !watch,
  entryNames: '[name]',
};

async function writeMetaFile(metafile) {
  const metaPath = resolve(outdir, 'meta.json');
  await writeFile(metaPath, JSON.stringify(metafile, null, 2), 'utf-8');
}

async function runBuild() {
  await prepareOutDir();

  if (watch) {
    const ctx = await context(baseConfig);
    await ctx.watch();
    console.log('🔁 esbuild is watching for changes');
  } else {
    const result = await build({
      entryPoints: ['src/js/graph.ts', 'src/js/search.ts', 'src/js/analytics.ts', 'src/js/glitch.ts'],
      outdir,
      bundle: true,
      sourcemap: true,
      format: 'esm',
      target: ['es2022'],
      splitting: true,
      chunkNames: 'chunks/[name]-[hash]',
      metafile: true,
      entryNames: '[name]',
      loader: {
        '.json': 'json',
      },
      define: {
        'process.env.NODE_ENV': JSON.stringify(watch ? 'development' : 'production'),
      },
      minify: !watch,
    });
    await writeMetaFile(result.metafile);
    console.log('✅ esbuild build complete');
  }
}

runBuild().catch((error) => {
  console.error(error);
  process.exit(1);
});

