import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/KhaoSatMauSacCCMQ/', // Quan trọng: Để Electron load được file asset (css, js) từ ổ cứng
});
