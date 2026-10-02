import { TextDecoder, TextEncoder } from "node:util";

// jsdom no trae TextEncoder (lo usa react-router)
Object.assign(globalThis, { TextEncoder, TextDecoder });

// jsdom no implementa matchMedia: se simula una pantalla de escritorio
window.matchMedia = (query) => ({
  matches: false,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
});
