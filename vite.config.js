import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';

function imageOptimizer() {
  return {
    name: 'image-optimizer',
    apply: 'build',
    buildStart() {
      console.log('[image-opt] Generating AVIF + JPEG...');
      execSync('node scripts/optimize-images.mjs', { stdio: 'inherit' });
    },
  };
}

export default defineConfig({
  plugins: [react(), imageOptimizer()],
});
