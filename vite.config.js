import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Keep chunks manageable for itch.io's file limits
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
});
