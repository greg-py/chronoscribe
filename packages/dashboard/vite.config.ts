import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: './',
    server: {
        port: 3211,
    },
    build: {
        // Build to root dist/dashboard for bundled CLI
        outDir: path.resolve(process.cwd(), '../../dist/dashboard'),
        emptyOutDir: true,
    },
});
