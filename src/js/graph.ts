import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  Simulation,
  SimulationNodeDatum,
} from 'd3-force';
import { drag } from 'd3-drag';
import { select, Selection } from 'd3-selection';
import { zoom } from 'd3-zoom';

import { applyUtmParams, isExternalLink } from './utils';

type NodeType = 'hub' | 'topic' | 'asset' | 'vendor' | 'library' | 'event';
type LinkKind = 'relates' | 'belongsTo' | 'poweredBy';

const PULSE_SCALE = {
  hub: 1.85,
  topic: 1.7,
  asset: 1.65,
  vendor: 1.6,
  library: 1.6,
  event: 1.7,
};

interface GraphNode extends SimulationNodeDatum {
  id: string;
  label: string;
  type: NodeType;
  href: string;
  description?: string;
  tags?: string[];
  pinned?: boolean;
  radius?: number;
  focusable?: boolean;
  chargeStrength?: number;
  color?: string;
  pulse?: {
    baseRadius: number;
    amplitude: number;
    speed: number;
    phase: number;
    baseCharge: number;
  };
  drift?: {
    amplitudeX: number;
    amplitudeY: number;
    speedX: number;
    speedY: number;
    phaseX: number;
    phaseY: number;
  };
  spin?: {
    speed: number;
    phase: number;
  };
  spinAngle?: number;
  displayX?: number;
  displayY?: number;
}

interface GraphLink {
  source: string;
  target: string;
  kind: LinkKind;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const TYPE_FORCE_TARGETS: Record<NodeType, number> = {
  hub: 0,
  topic: -120,
  asset: 120,
  vendor: 180,
  library: 220,
  event: -220,
};

const LINK_DISTANCE: Record<LinkKind, number> = {
  belongsTo: 250,
  relates: 320,
  poweredBy: 380,
};

const NODE_COLORS: Record<NodeType, string> = {
  hub: '#38f9d7',
  topic: '#8c5bfa',
  asset: '#ffb347',
  vendor: '#4db8ff',
  library: '#71d5ff',
  event: '#2ef2ff',
};

const NODE_RADIUS: Record<NodeType, number> = {
  hub: 18,
  topic: 12,
  asset: 10,
  vendor: 9,
  library: 9,
  event: 10,
};

const LINK_COLOR: Record<LinkKind, string> = {
  belongsTo: 'rgba(56, 249, 215, 0.45)',
  relates: 'rgba(140, 91, 250, 0.32)',
  poweredBy: 'rgba(113, 213, 255, 0.3)',
};

const LINK_WIDTH: Record<LinkKind, number> = {
  belongsTo: 2.2,
  relates: 1.6,
  poweredBy: 1.2,
};

const FOCUS_RING = '#C08A3E';

interface NodeDOMState {
  element: Selection<SVGGElement, GraphNode, SVGGElement, unknown>;
  node: GraphNode;
}

interface HashTarget {
  node: GraphNode;
  element: Selection<SVGGElement, GraphNode, SVGGElement, unknown>;
}

function initGlyphs(rootElement: Element, options?: { reduced?: boolean }): void {
  const glyphContainer = rootElement.querySelector('.graph-glyphs');
  if (!glyphContainer) {
    return;
  }

  const reduced = Boolean(options?.reduced);
  const glyphSets = [
    '∆ ƒ π λ ξ 0 1 2 3 5 8 A C E G H K',
    'β γ ζ ψ Ω 7 9 B D F J L N Q Z',
    '▮ ▯ ▰ ϟ ψ Ω ≡ ≣ ≠ ✶ ✷ ✸ ✹ ✺',
    '0 1 0 1 0 1 0 1 0 1 0 1 0 1',
  ];

  const totalClusters = reduced ? 6 : 16;
  const baseTimeout = reduced ? 2600 : 1500;
  const fragment = document.createDocumentFragment();
  const clusters: HTMLElement[] = [];

  for (let i = 0; i < totalClusters; i += 1) {
    const cluster = document.createElement('div');
    cluster.className = 'graph-glyphs__cluster';
    fragment.appendChild(cluster);
    clusters.push(cluster);
  }

  glyphContainer.textContent = '';
  glyphContainer.appendChild(fragment);

  function randomizeCluster(cluster: HTMLElement): void {
    const left = Math.random() * 100;
    const top = Math.random() * 100;
    const scale = reduced ? 0.8 + Math.random() * 0.8 : 0.6 + Math.random() * 1.4;
    const flicker = reduced ? `${4.5 + Math.random() * 2.5}s` : `${3.5 + Math.random() * 3}s`;
    const hue = reduced ? `${8 + Math.random() * 4}s` : `${6 + Math.random() * 5}s`;
    const text = glyphSets[Math.floor(Math.random() * glyphSets.length)];

    cluster.style.setProperty('left', `${left}%`);
    cluster.style.setProperty('top', `${top}%`);
    cluster.style.setProperty('--glyph-scale', scale.toString());
    cluster.style.setProperty('--glyph-flicker', flicker);
    cluster.style.setProperty('--glyph-hue', hue);
    cluster.style.opacity = '0';
    cluster.textContent = text;

    window.setTimeout(() => {
      cluster.style.transition = 'opacity 0.4s ease';
      cluster.style.opacity = '1';
    }, 30);
  }

  for (let i = 0; i < clusters.length; i += 1) {
    randomizeCluster(clusters[i]);
  }

  function loopCluster(index: number): void {
    const cluster = clusters[index];
    if (!cluster) {
      return;
    }
    cluster.style.transition = 'opacity 0.35s ease';
    cluster.style.opacity = '0';

    const timeout = baseTimeout + Math.random() * (reduced ? 2200 : 2500);

    window.setTimeout(() => {
      randomizeCluster(cluster);
      loopCluster(index);
    }, timeout);
  }

  for (let i = 0; i < clusters.length; i += 1) {
    const delay = reduced ? 0 : (i / clusters.length) * 2000;
    window.setTimeout(() => loopCluster(i), delay);
  }
}

export async function initGraph(containerSelector: string, dataUrl: string): Promise<void> {
  const rootElement = document.querySelector(containerSelector);
  if (!rootElement) {
    return;
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmallScreen = window.matchMedia('(max-width: 768px)').matches;
  const extendedNavigator = navigator as Navigator & { connection?: { saveData?: boolean } };
  const hasSaveDataPreference = Boolean(extendedNavigator.connection?.saveData);
  const isLowConcurrency = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4;
  const shouldReduceMotion = prefersReducedMotion || hasSaveDataPreference || isSmallScreen || isLowConcurrency;

  initGlyphs(rootElement, { reduced: shouldReduceMotion });

  const response = await fetch(dataUrl);
  if (!response.ok) {
    console.error('Failed to load graph data');
    return;
  }

  const data = (await response.json()) as GraphData;
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  for (let i = 0; i < data.nodes.length; i += 1) {
    const node = data.nodes[i];
    const radius = NODE_RADIUS[node.type] ?? 9;
    const chargeStrength = node.type === 'hub' ? -160 : -60;
    let customColor: string | undefined;
    switch (node.id) {
      case 'ext_community':
        customColor = '#38f9d7';
        break;
      case 'ext_rules':
        customColor = '#8c5bfa';
        break;
      case 'spaces':
        customColor = '#ffb347';
        break;
      case 'ext_hashtag':
        customColor = '#2ef2ff';
        break;
      case 'moderators':
        customColor = '#ff5af1';
        break;
      case 'mod_bronzeagecto':
        customColor = '#ffd166';
        break;
      case 'mod_money_illusion':
        customColor = '#06d6a0';
        break;
      case 'mod_theogcb405':
        customColor = '#118ab2';
        break;
      case 'mod_k0ncept':
        customColor = '#ef476f';
        break;
      case 'ext_github':
        customColor = '#71d5ff';
        break;
      default:
        customColor = NODE_COLORS[node.type];
    }
    const nodeEntry: GraphNode = {
      ...node,
      radius,
      chargeStrength,
      color: customColor,
      spinAngle: 0,
    };
    if (!shouldReduceMotion) {
      nodeEntry.pulse = {
        baseRadius: radius,
        amplitude: radius * ((PULSE_SCALE[node.type] ?? 1.7) - 1) * (0.6 + Math.random() * 1.2),
        speed: 0.003 + Math.random() * 0.005,
        phase: Math.random() * Math.PI * 2,
        baseCharge: chargeStrength,
      };
      nodeEntry.drift = {
        amplitudeX: 18 + Math.random() * 26,
        amplitudeY: 12 + Math.random() * 18,
        speedX: 0.00008 + Math.random() * 0.00012,
        speedY: 0.00008 + Math.random() * 0.00012,
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
      };
      nodeEntry.spin = {
        speed: 0.00012 + Math.random() * 0.00025,
        phase: Math.random() * Math.PI * 2,
      };
    }
    nodes.push(nodeEntry);
  }

  for (let i = 0; i < data.links.length; i += 1) {
    links.push(data.links[i]);
  }

  const container = select(rootElement as HTMLElement);
  const svg = container.select<SVGSVGElement>('svg');
  const tooltip = container.select<HTMLDivElement>('.graph-tooltip');
  const fallback = container.select<HTMLDivElement>('.graph-fallback');
  const filterInput = container.select<HTMLInputElement>('#graph-filter-input');
  const legendButtons = container.selectAll<HTMLButtonElement, null>('button[data-legend-filter]');
  const legendResetButton = container.select<HTMLButtonElement>('[data-legend-reset]');
  let activeLegendTypes: Record<NodeType, boolean> | null = null;

  const width = (rootElement as HTMLElement).clientWidth - 40;
  const height = 560;

  svg.attr('viewBox', `0 0 ${width} ${height}`);
  svg.style('background', 'transparent');

  const defs = svg.append('defs');

  const linkGradient = defs
    .append('linearGradient')
    .attr('id', 'link-gradient')
    .attr('gradientUnits', 'userSpaceOnUse');

  linkGradient.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(56, 249, 215, 0.65)');
  linkGradient.append('stop').attr('offset', '55%').attr('stop-color', 'rgba(113, 213, 255, 0.52)');
  linkGradient.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(140, 91, 250, 0.55)');

  if (!shouldReduceMotion) {
    const glowFilter = defs
      .append('filter')
      .attr('id', 'node-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    glowFilter.append('feGaussianBlur').attr('stdDeviation', 18).attr('result', 'coloredBlur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
  }

  const zoomBehavior = zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.5, 2])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

  svg.call(zoomBehavior as never);

  const g = svg.append('g');

  const linkSelection = g
    .append('g')
    .selectAll<SVGLineElement, GraphLink>('line')
    .data(links)
    .join('line')
    .attr('class', 'graph-link')
    .attr('data-kind', (d) => d.kind)
    .attr('stroke-width', (d) => LINK_WIDTH[d.kind])
    .attr('stroke-linecap', 'round')
    .attr('stroke-opacity', 0.72)
    .attr('stroke', 'url(#link-gradient)');

  const nodesGroup = g.append('g');
  if (!shouldReduceMotion) {
    nodesGroup.attr('filter', 'url(#node-glow)');
  }

  const nodeSelection = nodesGroup
    .selectAll<SVGGElement, GraphNode>('g')
    .data(nodes)
    .join('g')
    .attr('class', (d) => {
      if (d.pinned) {
        return 'graph-node graph-node--pinned';
      }
      return 'graph-node';
    })
    .attr('tabindex', (d) => (d.type === 'hub' || d.type === 'asset' || d.type === 'topic' ? '0' : '-1'))
    .call(
      drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) {
            simulation.alphaTarget(0.3).restart();
          }
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) {
            simulation.alphaTarget(0);
          }
          d.fx = null;
          d.fy = null;
        }) as never,
    );

  nodeSelection
    .append('circle')
    .attr('r', (d) => d.radius ?? NODE_RADIUS[d.type])
    .attr('fill', (d) => (d as GraphNode & { color?: string }).color ?? NODE_COLORS[d.type])
    .attr('stroke', '#02060d')
    .attr('stroke-width', 1.1)
    .attr('opacity', 0.92)
    .attr('data-node-id', (d) => d.id);

  if (!shouldReduceMotion) {
    nodeSelection
      .append('circle')
      .attr('r', (d) => (d.radius ?? NODE_RADIUS[d.type]) * 1.25)
      .attr('fill', 'none')
      .attr('stroke', (d) => (d as GraphNode & { color?: string }).color ?? NODE_COLORS[d.type])
      .attr('stroke-width', 3.5)
      .attr('opacity', 0.36)
      .attr('class', 'graph-node__glow');
  }

  nodeSelection
    .append('text')
    .attr('class', 'graph-node__label')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('y', (d) => -((d.radius ?? 12) + 14))
    .text((d) => d.label);

  const nodeCircles: Record<string, { inner?: SVGCircleElement; glow?: SVGCircleElement }> = {};
  nodeSelection.each(function (node) {
    const selection = select(this);
    const inner = selection.select('circle[data-node-id]').node() as SVGCircleElement | null;
    const glow = selection.select('circle.graph-node__glow').node() as SVGCircleElement | null;
    nodeCircles[node.id] = { inner: inner ?? undefined, glow: glow ?? undefined };
  });

  const startTime = performance.now();

  const simulation: Simulation<GraphNode, GraphLink> = forceSimulation(nodes)
    .force(
      'link',
      forceLink<GraphNode, GraphLink>(links)
        .id((d) => d.id)
        .distance((link) => LINK_DISTANCE[link.kind])
        .strength(0.65),
    )
    .force(
      'charge',
      forceManyBody<GraphNode>().strength((d) => {
        if (typeof d.chargeStrength === 'number') {
          return d.chargeStrength * 2.2;
        }
        return -160;
      }),
    )
    .force('center', forceCenter(width / 2, height / 2))
    .force('collision', forceCollide().radius((d) => (d.radius ?? 10) + (shouldReduceMotion ? 18 : 28)).strength(shouldReduceMotion ? 1 : 1.5))
    .force('x', forceX(width / 2).strength(0.008))
    .force('y', forceY(height / 2).strength(0.008))
    .alphaDecay(shouldReduceMotion ? 0.08 : 0.04);

  simulation
    .force('type-position', forceY<GraphNode>().strength(0.035).y((d) => TYPE_FORCE_TARGETS[d.type] ?? height / 2));
 
  simulation.on('tick', () => {
    const elapsed = performance.now() - startTime;
    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      const pulse = node.pulse;
      const drift = node.drift;
      const spin = node.spin;
 
       if (pulse) {
         const progress = (Math.sin(elapsed * pulse.speed + pulse.phase) + 1) / 2;
         const introFactor = Math.min(elapsed / 1000, 1);
         const introEased = introFactor < 1 ? (1 - Math.cos(introFactor * Math.PI * 0.5)) : 1;
         const amplitude = pulse.amplitude * introEased;
         const currentRadius = pulse.baseRadius + amplitude * progress;
         node.radius = currentRadius;
 
         const currentCharge = pulse.baseCharge * (1.4 + progress * 1.1 * introEased);
         node.chargeStrength = currentCharge;
 
         const circleRefs = nodeCircles[node.id];
         if (circleRefs?.inner) {
           circleRefs.inner.setAttribute('r', currentRadius.toString());
         }
         if (circleRefs?.glow) {
           const glowRadius = currentRadius * 1.12;
           circleRefs.glow.setAttribute('r', glowRadius.toString());
         }
       }
 
       if (drift) {
         const offsetX = Math.sin(elapsed * drift.speedX + drift.phaseX) * drift.amplitudeX;
         const offsetY = Math.cos(elapsed * drift.speedY + drift.phaseY) * drift.amplitudeY;
         node.displayX = (node.x ?? 0) + offsetX;
         node.displayY = (node.y ?? 0) + offsetY;
       }
 
       if (spin) {
         const angle = Math.sin(elapsed * spin.speed + spin.phase) * 0.35;
         node.spinAngle = angle;
       }
    }
 
    linkSelection
      .attr('x1', (d) => ((d.source as GraphNode).displayX ?? (d.source as GraphNode).x ?? 0))
      .attr('y1', (d) => ((d.source as GraphNode).displayY ?? (d.source as GraphNode).y ?? 0))
      .attr('x2', (d) => ((d.target as GraphNode).displayX ?? (d.target as GraphNode).x ?? 0))
      .attr('y2', (d) => ((d.target as GraphNode).displayY ?? (d.target as GraphNode).y ?? 0));
 
    nodeSelection.attr('transform', (d) => {
      const rotation = d.spinAngle ?? 0;
      const x = d.displayX ?? d.x ?? 0;
      const y = d.displayY ?? d.y ?? 0;
      return `translate(${x},${y}) rotate(${rotation * (180 / Math.PI)})`;
    });
  });

  const nodesMap: Record<string, GraphNode> = {};
  for (let i = 0; i < nodes.length; i += 1) {
    nodesMap[nodes[i].id] = nodes[i];
  }

  const neighborsMap: Record<string, string[]> = {};
  for (let i = 0; i < links.length; i += 1) {
    const { source, target } = links[i];
    const sourceId = typeof source === 'string' ? source : source.id;
    const targetId = typeof target === 'string' ? target : target.id;
    if (!neighborsMap[sourceId]) {
      neighborsMap[sourceId] = [];
    }
    neighborsMap[sourceId].push(targetId);
    if (!neighborsMap[targetId]) {
      neighborsMap[targetId] = [];
    }
    neighborsMap[targetId].push(sourceId);
  }

  const filteredNodes: Record<string, boolean> = {};

  function updateLegendButtons(state: Record<NodeType, boolean>): void {
    legendButtons.each(function () {
      const button = select(this);
      const type = button.attr('data-legend-filter') as NodeType | null;
      if (!type) {
        return;
      }
      const enabled = state[type];
      button.attr('aria-pressed', enabled ? 'true' : 'false');
      button.classed('legend__pill--inactive', !enabled);
    });
    if (!legendResetButton.empty()) {
      const allActive = Object.values(state).every(Boolean);
      legendResetButton.attr('disabled', allActive ? 'true' : null);
      legendResetButton.classed('legend__pill--inactive', allActive);
    }
  }

  function getLegendState(): Record<NodeType, boolean> {
    if (activeLegendTypes) {
      return activeLegendTypes;
    }
    const state: Record<NodeType, boolean> = {} as Record<NodeType, boolean>;
    for (let i = 0; i < LEGEND_ORDER.length; i += 1) {
      state[LEGEND_ORDER[i]] = true;
    }
    activeLegendTypes = state;
    updateLegendButtons(state);
    return state;
  }

  // Initialize legend UI state on load
  updateLegendButtons(getLegendState());
  updateVisibility();

  function showTooltip(event: MouseEvent, node: GraphNode) {
    tooltip.style('display', 'block');
    tooltip.attr('hidden', null);
    tooltip.select('.graph-tooltip__label').text(node.label);
    tooltip.select('.graph-tooltip__description').text(node.description ?? '');
    const tooltipEl = tooltip.node();
    if (!tooltipEl) {
      return;
    }
    const x = event.offsetX + 16;
    const y = event.offsetY + 16;
    tooltipEl.style.left = `${x}px`;
    tooltipEl.style.top = `${y}px`;
  }

  function hideTooltip() {
    tooltip.style('display', 'none');
    tooltip.attr('hidden', 'true');
  }

  function handleActivation(node: GraphNode) {
    const hrefWithUtm = applyUtmParams(node.href);
    if (isExternalLink(node.href)) {
      window.open(hrefWithUtm, '_blank', 'noopener');
      return;
    }
    window.location.href = node.href;
  }

  function updateVisibility() {
    const term = filterInput.property('value').toLowerCase();
    const legendState = getLegendState();
    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      let visible = true;
      if (!legendState[node.type]) {
        visible = false;
      }
      if (visible && term.length > 0) {
        const labelMatch = node.label.toLowerCase().includes(term);
        let tagMatch = false;
        if (node.tags) {
          for (let t = 0; t < node.tags.length; t += 1) {
            const tag = node.tags[t];
            if (tag.toLowerCase().includes(term)) {
              tagMatch = true;
              break;
            }
          }
        }
        visible = labelMatch || tagMatch;
      }
      filteredNodes[node.id] = visible;
    }

    nodeSelection.attr('display', (node) => (filteredNodes[node.id] ? null : 'none'));
    linkSelection.attr('display', (link) => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      if (!filteredNodes[sourceId]) {
        return 'none';
      }
      if (!filteredNodes[targetId]) {
        return 'none';
      }
      return null;
    });

    simulation.alpha(shouldReduceMotion ? 0.1 : 0.2).restart();
  }

  nodeSelection
    .on('mouseenter', function (event, node) {
      select(this).classed('graph-node--hover', true);
      showTooltip(event as MouseEvent, node);
      window.dispatchEvent(
        new CustomEvent('graph_node_hover', {
          detail: { id: node.id, label: node.label },
        }),
      );
    })
    .on('mouseleave', function () {
      select(this).classed('graph-node--hover', false);
      hideTooltip();
    })
    .on('focus', function (event, node) {
      const group = select(this);
      group.classed('graph-node--focused', true);
      group.select('circle').attr('stroke', FOCUS_RING).attr('stroke-width', 2);
      showTooltip(event as unknown as MouseEvent, node);
    })
    .on('blur', function () {
      const group = select(this);
      group.classed('graph-node--focused', false);
      group.select('circle').attr('stroke', 'rgba(10, 13, 22, 0.9)').attr('stroke-width', 1.5);
      hideTooltip();
    })
    .on('click', (_, node) => {
      handleActivation(node);
      window.dispatchEvent(
        new CustomEvent('graph_node_click', {
          detail: { id: node.id, label: node.label },
        }),
      );
    })
    .on('keydown', function (event, node) {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
        keyboardEvent.preventDefault();
        handleActivation(node);
        return;
      }
      if (keyboardEvent.key === 'Escape') {
        (this as SVGGElement).blur();
        hideTooltip();
        return;
      }
      if (keyboardEvent.key === 'ArrowRight' || keyboardEvent.key === 'ArrowLeft' || keyboardEvent.key === 'ArrowUp' || keyboardEvent.key === 'ArrowDown') {
        keyboardEvent.preventDefault();
        const neighbors = neighborsMap[node.id];
        if (!neighbors || neighbors.length === 0) {
          return;
        }
        const current = this as SVGGElement;
        const currentNode = select(current).datum();
        const currentX = currentNode.x ?? 0;
        const currentY = currentNode.y ?? 0;
        let bestNeighbor: GraphNode | null = null;
        let bestScore = -Infinity;
        for (let i = 0; i < neighbors.length; i += 1) {
          const candidateId = neighbors[i];
          const neighbor = nodesMap[candidateId];
          if (!neighbor || !filteredNodes[neighbor.id]) {
            continue;
          }
          const dx = (neighbor.x ?? 0) - currentX;
          const dy = (neighbor.y ?? 0) - currentY;
          let score = -10000;
          if (keyboardEvent.key === 'ArrowRight' && dx > 0) {
            score = dx - Math.abs(dy) * 0.5;
          } else if (keyboardEvent.key === 'ArrowLeft' && dx < 0) {
            score = -dx - Math.abs(dy) * 0.5;
          } else if (keyboardEvent.key === 'ArrowUp' && dy < 0) {
            score = -dy - Math.abs(dx) * 0.5;
          } else if (keyboardEvent.key === 'ArrowDown' && dy > 0) {
            score = dy - Math.abs(dx) * 0.5;
          }
          if (score > bestScore) {
            bestNeighbor = neighbor;
            bestScore = score;
          }
        }
        if (bestNeighbor) {
          const targetNode = nodeSelection.filter((d) => d.id === bestNeighbor?.id);
          const targetElement = targetNode.node();
          if (targetElement) {
            targetElement.focus();
          }
        }
      }
    });

  filterInput.on('input', () => {
    window.dispatchEvent(
      new CustomEvent('graph_filter_used', {
        detail: { term: filterInput.property('value') },
      }),
    );
    updateVisibility();
  });

  legendButtons.on('click', function () {
    const button = select(this);
    const type = button.attr('data-legend-filter');
    if (!type) {
      return;
    }
    const legendState = getLegendState();
    if (LEGEND_ORDER.includes(type as NodeType)) {
      legendState[type as NodeType] = !legendState[type as NodeType];
    }
    updateLegendButtons(legendState);
    updateVisibility();
  });

  if (!legendResetButton.empty()) {
    legendResetButton.on('click', () => {
      const legendState = getLegendState();
      for (let i = 0; i < LEGEND_ORDER.length; i += 1) {
        legendState[LEGEND_ORDER[i]] = true;
      }
      updateLegendButtons(legendState);
      updateVisibility();
    });
  }

  function focusHashTarget(targetId: string): void {
    const nodeEntry = nodeSelection.filter((node) => node.id === targetId);
    const element = nodeEntry.node();
    if (element) {
      element.focus({ preventScroll: true });
      element.classList.add('graph-node--pulse');
      window.setTimeout(() => {
        element.classList.remove('graph-node--pulse');
      }, 2000);
    }
  }

  if (window.location.hash.length > 1) {
    const nodeId = window.location.hash.substring(1);
    focusHashTarget(nodeId);
  }

  window.addEventListener('hashchange', () => {
    const nodeId = window.location.hash.substring(1);
    focusHashTarget(nodeId);
  });

  updateVisibility();
}

const LEGEND_ORDER: NodeType[] = ['hub', 'asset'];

