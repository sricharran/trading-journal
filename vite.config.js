import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub project pages are hosted under /<repository-name>/.
  base: process.env.GITHUB_ACTIONS ? '/trading-journal/' : '/',
  plugins: [react()],
});

