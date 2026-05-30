import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Workaround: core-js@3.49 references internal files that don't exist in this install
const fixMissingCoreJs = {
  name: 'fix-missing-core-js',
  resolveId(id) {
    if (id.includes('?commonjs-external') || (id.includes('/internals/') && id.startsWith('../'))) {
      return '\0virtual:missing-core-js:' + id;
    }
  },
  load(id) {
    if (id.startsWith('\0virtual:missing-core-js:')) {
      return 'module.exports = function() {};';
    }
  }
};

export default defineConfig({
  plugins: [react(), fixMissingCoreJs],
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: true
  },
  define: {
    global: 'globalThis',
    'process.env': {}
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  build: {
    rollupOptions: {
      output: {
        format: 'iife',
        entryFileNames: 'assets/[name].[hash].js',
      },
    },
  }
})
