import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'ReactjsInteractiveGraph',
      fileName: 'reactjs-interactive-graph',
    },
    rollupOptions: {
      external: (id) =>
        id === 'react' || id === 'react-dom' || id === '@cosmos.gl/graph' ||
        id.startsWith('react/') || id.startsWith('react-dom/'),
      output: {
        globals: {
          'react': 'React',
          'react/jsx-runtime': 'React',
          'react-dom': 'ReactDOM',
          '@cosmos.gl/graph': 'CosmosGL',
        },
      },
    },
  },
});