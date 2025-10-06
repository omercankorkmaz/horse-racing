import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173', // projenin çalıştığı port
    supportFile: 'cypress/support/e2e.ts', // buraya support dosyanın yolu
  },
  component: {
    devServer: {
      framework: 'vue',
      bundler: 'vite',
    },
    supportFile: 'cypress/support/component.ts',
  },
});
