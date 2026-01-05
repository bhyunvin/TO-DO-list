import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import purgecss from '@fullhuman/postcss-purgecss';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
    visualizer({
      filename: 'stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
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
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
    host: true,
  },
  build: {
    // 경고 기준을 1024kb로 설정
    chunkSizeWarningLimit: 1024,
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
            // UI 관련 라이브러리 먼저 체크 (더 구체적인 조건 우선)
            if (
              id.includes('bootstrap') ||
              id.includes('react-bootstrap') ||
              id.includes('@react-icons') ||
              id.includes('sweetalert2') ||
              id.includes('react-datepicker')
            ) {
              return 'ui-vendor';
            }

            // React 핵심 라이브러리 (정밀 매칭)
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/zustand/') ||
              id.includes('/scheduler/') ||
              id === 'react' ||
              id === 'react-dom' ||
              id === 'zustand'
            ) {
              return 'react-vendor';
            }

            // 유틸리티
            if (id.includes('date-fns') || id.includes('dompurify')) {
              return 'utils-vendor';
            }

            return 'vendor'; // 나머지
          }
        },
      },
    },
  },
  test: {
    globals: true, // describe, it, expect 등을 전역으로 사용 (Jest와 동일)
    environment: 'jsdom', // 'jsdom' 환경에서 테스트 실행
    setupFiles: './src/setupTests.js', // 테스트 실행 전 이 파일 로드
    css: true, // CSS 파일 import 시 오류 방지

    // 테스트 커버리지 설정
    coverage: {
      provider: 'v8', // v8 엔진 사용
      reporter: ['text', 'json', 'html'], // 리포트 형식
      enabled: true, // 'npm run coverage' 실행 시 활성화
    },
  },
});
