import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// 앱에서 성능 측정을 시작하려면 함수를 전달하여
// 결과를 로그로 기록하거나 (예: reportWebVitals(console.log))
// 분석 엔드포인트로 전송하세요. 자세한 내용: https://bit.ly/CRA-vitals
// reportWebVitals();
