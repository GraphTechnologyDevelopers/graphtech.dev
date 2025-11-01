const ZALGO_UP = ['̍', '̎', '̄', '̅', '̿', '̑', '̆', '̐'];
const ZALGO_MID = ['̕', '̛', '̘', '̙', '̜', '̝', '̞', '̟', '̠', '̤', '̥', '̦', '̩', '̪', '̫', '̬', '̭', '̮', '̯'];
const ZALGO_DOWN = ['̖', '̗', '̘', '̙', '̚', '̜', '̝', '̞', '̟', '̠', '̤', '̥', '̦', '̩', '̪', '̫', '̬', '̭', '̮', '̯', '̰', '̱', '̲', '̳', '̹', '̺', '̻', '̼', '̽', 'ͅ', '͇', '͈', '͉', '͍', '͎', '͓', '͔', '͕', '͖', '͙', '͚', '͛', '͜', '͝', '͞', '͟', '͠', '͡', '͢', 'ͣ', 'ͤ', 'ͥ', 'ͦ', 'ͧ', 'ͨ', 'ͩ', 'ͪ', 'ͫ', 'ͬ', 'ͭ', 'ͮ', 'ͯ'];

function zalgofy(text: string, intensity = 8): string {
  let result = '';
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === ' ') {
      result += char;
      continue;
    }
    result += char;
    for (let z = 0; z < intensity; z += 1) {
      const pool = z % 3 === 0 ? ZALGO_UP : z % 3 === 1 ? ZALGO_MID : ZALGO_DOWN;
      const glyph = pool[Math.floor(Math.random() * pool.length)];
      result += glyph;
    }
  }
  return result;
}

function removeZalgo(element: HTMLElement, original: string): void {
  element.innerText = original;
}

function applyZalgo(element: HTMLElement, intensity: number): string {
  const original = element.innerText;
  element.innerText = zalgofy(original, intensity);
  return original;
}

function triggerGlitchCycle(duration = 300) {
  const glitchOverlay = document.querySelector('.global-glitch');
  if (!glitchOverlay) {
    return;
  }

  glitchOverlay.classList.add('glitch-obscure');

  const textTargets = Array.from(document.querySelectorAll('h1, h2, h3, p, a, li, span, .logo-wordmark__brand')) as HTMLElement[];
  const originals = new Map<HTMLElement, string>();

  for (let i = 0; i < textTargets.length; i += 1) {
    const element = textTargets[i];
    if (element.childElementCount > 0 && element.tagName.toLowerCase() !== 'a') {
      continue;
    }
    const originalText = element.textContent ?? '';
    if (originalText.trim().length === 0) {
      continue;
    }
    originals.set(element, originalText);
    element.textContent = zalgofy(originalText, 3 + Math.floor(Math.random() * 5));
  }

  window.setTimeout(() => {
    glitchOverlay.classList.remove('glitch-obscure');
    for (const [element, original] of originals.entries()) {
      element.textContent = original;
    }
  }, duration);
}

function initGlobalGlitch(): void {
  let lastTrigger = 0;
  let nextInterval = 10000;

  function loop(timestamp: number) {
    if (timestamp - lastTrigger >= nextInterval) {
      lastTrigger = timestamp;
      triggerGlitchCycle(300 + Math.random() * 150);
      nextInterval = 8000 + Math.random() * 5000;
    }
    window.requestAnimationFrame(loop);
  }

  window.requestAnimationFrame(loop);
}

if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initGlobalGlitch();
  });
}
