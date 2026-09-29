import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
export default defineConfig({
  plugins:[react()],
  base:'/team-manager/',
  build:{rollupOptions:{input:resolve(__dirname,'app.html')}}
});
