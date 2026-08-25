import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  external: ['react'],
  // tsup strips the source directive, and without it every App Router consumer
  // renders this as a Server Component and throws on useState.
  banner: { js: '"use client";' },
});
