const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    // API 요청을 위한 공통 경로 '/api'를 프록시 대상으로 지정합니다.
    '/api',
    createProxyMiddleware({
      target: 'http://192.168.30.179:3001', // 실제 백엔드 서버 주소
      changeOrigin: true,
      // '/api' 경로를 백엔드로 보낼 때 제거합니다.
      // 예: /api/user/login -> /user/login
      pathRewrite: { '^/api': '' },
    }),
  );
};