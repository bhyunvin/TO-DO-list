import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';

//npm run start:dev 으로 기동
async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter());

  // CORS 설정
  app.enableCors({
    // localhost 외에 다른 IP로 프론트엔드에 접속하는 경우, 해당 출처(Origin)도 명시적으로 추가해야 합니다.
    // 예: http://192.168.30.179:3000
    // credentials: true 사용 시, 브라우저는 Access-Control-Allow-Origin 헤더가 요청한 Origin과 정확히 일치해야 쿠키를 저장합니다.
    origin: ['http://localhost:3000', 'http://192.168.30.179:3000'],
    methods: 'GET,POST,PATCH,DELETE,OPTIONS',
    credentials: true,
  });

  // 서버 시작
  await app.listen(3001);
}

bootstrap();
