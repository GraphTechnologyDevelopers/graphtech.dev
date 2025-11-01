import { initGraph } from './graph';
import { enablePrefetch, applyUtmParams } from './utils';

async function main(): Promise<void> {
  document.addEventListener('DOMContentLoaded', async () => {
    enablePrefetch(document);
    await initGraph('[data-graph-root]', '/data/graph.json');
    const externalLinks = document.querySelectorAll('a[href^="http"]');
    for (let i = 0; i < externalLinks.length; i += 1) {
      const link = externalLinks[i] as HTMLAnchorElement;
      const href = link.getAttribute('href');
      if (!href) {
        continue;
      }
      link.setAttribute('href', applyUtmParams(href));
    }
  });
}

main().catch((error) => {
  console.error(error);
});

