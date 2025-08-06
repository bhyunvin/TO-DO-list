import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';

//npm run start:dev 으로 기동
async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter());

  // CORS 설정
  app.enableCors({
    origin: 'http://localhost:3000',
    methods: 'GET,POST,DELETE',
    credentials: true,
  });

  // 서버 시작
  await app.listen(3001);
}

bootstrap();
