declare global {
  interface WindowEventMap {
    graph_node_click: CustomEvent<{ id: string; label: string }>; // eslint-disable-line @typescript-eslint/naming-convention
    graph_node_hover: CustomEvent<{ id: string; label: string }>; // eslint-disable-line @typescript-eslint/naming-convention
    graph_filter_used: CustomEvent<{ term: string }>; // eslint-disable-line @typescript-eslint/naming-convention
  }
}

function sendEvent(name: string, props: Record<string, string | number>): void {
  const plausible = (window as unknown as { plausible?: (event: string, options?: { props?: Record<string, string | number> }) => void }).plausible;
  if (typeof plausible === 'function') {
    plausible(name, { props });
  }
}

window.addEventListener('graph_node_click', (event) => {
  sendEvent('graph_node_click', {
    id: event.detail.id,
    label: event.detail.label,
  });
});

window.addEventListener('graph_node_hover', (event) => {
  sendEvent('graph_node_hover', {
    id: event.detail.id,
    label: event.detail.label,
  });
});

window.addEventListener('graph_filter_used', (event) => {
  sendEvent('graph_filter_used', {
    term: event.detail.term,
  });
});

