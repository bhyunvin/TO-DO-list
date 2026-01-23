import { treaty } from '@elysiajs/eden';
import type { App } from '../../../src/src/main';

// 백엔드 API 주소

export const api = treaty<App>('http://localhost:3001');
