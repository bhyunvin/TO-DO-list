import 'reflect-metadata';
import { config } from 'dotenv';
import path from 'node:path';

// 특정 테스트 파일에서 환경 변수 로드
// 이것은 앱 코드 임포트 전에 환경 변수를 사용 가능하게 함
config({ path: path.join(import.meta.dir, '../../.env.test') });
