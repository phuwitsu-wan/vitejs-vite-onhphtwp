import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' ให้ใช้ได้ทั้ง Vercel, Netlify, Cloudflare Pages และ GitHub Pages (โฟลเดอร์ย่อย)
export default defineConfig({ plugins: [react()], base: './' });
