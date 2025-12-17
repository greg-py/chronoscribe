import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['packages/cli/src/index.ts'],
    format: ['cjs'],
    target: 'node18',
    clean: true,
    // Bundle internal packages
    noExternal: ['@chronoscribe/shared', '@chronoscribe/server'],
    // Keep 3rd party deps external (installed via package.json)
    external: ['ws', 'commander'],
    outDir: 'dist',
    minify: true,
    sourcemap: true,
});
