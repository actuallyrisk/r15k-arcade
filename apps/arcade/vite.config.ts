// R15K Arcade – Vite config: relative base (Tauri asset protocol and file preview), no inlined assets
// (img/media stay 'self'), CSP meta tag only in mode 'e2e' (Tauri injects its own CSP; a meta CSP without
// Tauri's hashes would block its IPC scripts). Every Rollup warning fails the build (zero warnings).
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

type TauriCsp = Readonly<Record<string, string>>;

/** The production CSP of src-tauri/tauri.conf.json as a meta-tag value ("directive value; …"). */
function readCsp(): string {
  const text = readFileSync(new URL('./src-tauri/tauri.conf.json', import.meta.url), 'utf8');
  const config = JSON.parse(text) as {
    readonly app: { readonly security: { readonly csp: TauriCsp } };
  };
  return Object.entries(config.app.security.csp)
    .map(([directive, value]) => `${directive} ${value}`)
    .join('; ');
}

/** Injects the CSP meta tag in mode 'e2e' only; the config file is read only then. */
function cspMeta(mode: string): Plugin {
  return {
    name: 'r15k-csp-meta',
    transformIndexHtml() {
      if (mode !== 'e2e') {
        return [];
      }
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: readCsp() },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

export default defineConfig(({ mode }) => ({
  root: import.meta.dirname,
  base: './',
  server: { host: 'localhost', port: 5173, strictPort: true },
  preview: { host: 'localhost', port: 4173, strictPort: true },
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  build: {
    target: ['es2022', 'safari16', 'chrome110'],
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    modulePreload: { polyfill: false },
    sourcemap: mode !== 'production',
    reportCompressedSize: false,
    rollupOptions: {
      onwarn(warning) {
        throw new Error(`Build warning (${warning.code ?? 'unknown'}): ${warning.message}`);
      },
    },
  },
  plugins: [cspMeta(mode)],
}));
