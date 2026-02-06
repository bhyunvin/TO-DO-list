import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { purgeCSSPlugin as purgecss } from '@fullhuman/postcss-purgecss';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
  ],
  css: {
    postcss: {
      plugins: [
        purgecss({
          content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
          defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
          safelist: {
            standard: [
              // Bootstrap dynamic classes and necessary classes
              /^modal/,
              /^fade/,
              /^show/,
              /^modal-backdrop/,
              /^btn/,
              /^alert/,
              /^card/,
              /^badge/,
              /^bg-/,
              /^text-/,
              'active',
              'disabled',
              'collapsed',
              /^react-datepicker/,
            ],
          },
        }),
      ],
    },
  },
  server: {
    // API 프록시 설정
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001', // 백엔드 포트 3001로 수정 (src/.env 설정과 동기화)
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
    host: true,
  },
  build: {
    minify: 'terser', // terser 사용 설정
    terserOptions: {
      compress: {
        drop_console: true, // 콘솔 로그 제거
        drop_debugger: true, // 디버거 제거
      },
      format: {
        comments: false, // 주석 제거
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('react-router-dom') ||
              id.includes('zustand')
            ) {
              return 'react-vendor';
            }

            if (id.includes('sweetalert2')) {
              return 'libs-sweetalert';
            }

            if (id.includes('bootstrap') || id.includes('react-bootstrap')) {
              return 'libs-bootstrap';
            }
          }
        },
      },
    },
  },
  // test config removed - using native bun test
});
