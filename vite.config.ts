import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

// Case-insensitive file resolver plugin for Git/Vercel compatibility
const caseInsensitiveResolvePlugin = {
  name: 'case-insensitive-resolve',
  resolveId(id: string) {
    // If the path contains main.tsx or src/main.tsx, find the actual file casing
    if (id.includes('main.tsx')) {
      const possiblePaths = [
        path.resolve(process.cwd(), 'src/main.tsx'),
        path.resolve(process.cwd(), 'Src/main.tsx'),
        path.resolve(process.cwd(), 'src/Main.tsx'),
        path.resolve(process.cwd(), 'Src/Main.tsx'),
      ];
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          return p;
        }
      }
    }
    // General check for /src/ or /Src/ paths
    if (id.startsWith('/src/') || id.startsWith('/Src/')) {
      const relativePath = id.slice(1);
      const cleanedPath = relativePath.replace(/^[sS]rc\//, '');
      const possiblePaths = [
        path.resolve(process.cwd(), 'src', cleanedPath),
        path.resolve(process.cwd(), 'Src', cleanedPath),
      ];
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          return p;
        }
      }
    }
    return null;
  }
};

export default defineConfig(() => {
  return {
    plugins: [caseInsensitiveResolvePlugin, react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
