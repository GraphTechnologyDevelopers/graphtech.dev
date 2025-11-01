export function isExternalLink(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://');
}

export function applyUtmParams(href: string): string {
  if (!isExternalLink(href)) {
    return href;
  }
  const separator = href.includes('?') ? '&' : '?';
  const utm = 'utm_source=hub&utm_medium=referral&utm_campaign=global_menu';
  if (href.includes('utm_source=')) {
    return href;
  }
  return `${href}${separator}${utm}`;
}

const PREFETCH_ATTRIBUTE = 'data-prefetch';

export function enablePrefetch(root: Document | HTMLElement): void {
  const links = root.querySelectorAll(`a[${PREFETCH_ATTRIBUTE}]`);
  for (let i = 0; i < links.length; i += 1) {
    const link = links[i];
    const href = link.getAttribute('href');
    if (!href || isExternalLink(href)) {
      if (href && isExternalLink(href)) {
        link.setAttribute('href', applyUtmParams(href));
      }
      continue;
    }
    let prefetchLink: HTMLLinkElement | null = null;
    const createPrefetch = () => {
      if (prefetchLink) {
        return;
      }
      prefetchLink = document.createElement('link');
      prefetchLink.rel = 'prefetch';
      prefetchLink.href = href;
      document.head.appendChild(prefetchLink);
    };
    link.addEventListener('mouseenter', createPrefetch, { passive: true });
    link.addEventListener('focus', createPrefetch, { passive: true });
  }
}

