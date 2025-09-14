// Lightweight DOM polyfills for jsdom + MUI + virtualized lists
if (!(global as any).ResizeObserver) {
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
if (!(global as any).IntersectionObserver) {
  (global as any).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = '';
    thresholds = [];
  };
}
if (!(window as any).matchMedia) {
  (window as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  });
}
// Make raf/caf map to timers so React + MUI animations don't hang
if (!global.requestAnimationFrame) {
  (global as any).requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 0);
}
if (!global.cancelAnimationFrame) {
  (global as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
}
// Optional: silence i18next missing instance warnings in tests that don’t provide i18n
process.env.I18NEXT_SHOW_WARNINGS = 'false';
