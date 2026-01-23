/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import purgecss from '@fullhuman/postcss-purgecss';

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
        target: 'http://127.0.0.1:3000', // 백엔드 포트 3000으로 수정
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
  test: {
    globals: true, // describe, it, expect 등을 전역으로 사용 (Jest와 동일)
    environment: 'jsdom', // 'jsdom' 환경에서 테스트 실행
    setupFiles: './src/setupTests.ts', // js -> ts로 변경 예정
    css: true, // CSS 파일 import 시 오류 방지

    // 테스트 커버리지 설정
    coverage: {
      provider: 'v8', // v8 엔진 사용
      reporter: ['text', 'json', 'html'], // 리포트 형식
      enabled: true, // 'npm run coverage' 실행 시 활성화
    },
  },
});
