import { treaty } from '@elysiajs/eden';
import type { App } from '../../../src/src/main';

// 백엔드 주소 (Vite Proxy를 타거나 직접 호출)
// Proxy '/api' -> 'http://localhost:3000' 설정했으므로,
// Eden Treaty는 base url 없이 쓰거나, proxy를 안탄다면 localhost:3000 직접 명시.
// 여기서는 Proxy를 활용하기 위해 window.location.origin 또는 빈 문자열을 쓸 수도 있지만,
// Eden은 fetch 기반이므로 Proxy가 먹히려면 relative path여야 함.
// 하지만 Eden treaty init 시 url이 필요함.
// 'http://localhost:3000'으로 하면 CORS 필요. (백엔드에 CORS 플러그인 있음).
// Proxy를 쓰려면 '/api'로 설정해야 함? treaty<App>('/api') ?
// 백엔드 prefix가 '/api'가 아님. ('/todo', '/api/users' 등).
// userRoutes는 prefix '/api/users', todoRoutes는 '/todo'.
// 일관성이 없음.
// 일단 localhost:3000으로 직접 쏘는 게 CORS 설정 되어 있으니 편함.

export const api = treaty<App>('http://localhost:3000');
