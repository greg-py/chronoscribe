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
        // Resolve relative to CWD (packages/dashboard)
        outDir: path.resolve(process.cwd(), '../server/dist/dashboard'),
        emptyOutDir: true,
    },
});
