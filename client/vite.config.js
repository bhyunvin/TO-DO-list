import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
  ],
  server: {
    // API 프록시 설정 (기존과 동일)
    proxy: {
      '/api': {
        target: 'http://192.168.60.118:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
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